import os
import json
import re
import logging
import asyncio
from typing import List, Optional
from pydantic import BaseModel, Field
import google.generativeai as genai
import openai
from openai import AsyncOpenAI, APITimeoutError, APIConnectionError, APIError

from app.services.cache_service import get_cached_data, set_cached_data
from app.services.portfolio.portfolio_analytics_service import get_stock_details

logger = logging.getLogger(__name__)

# --- Configuration Constants ---
AI_TIMEOUT_SECONDS: float = 15.0
AI_CACHE_TTL_SECONDS: int = 14400  # 4 Hours (14,400s)

# --- Pydantic Schema Definitions ---

class StockScore(BaseModel):
    growth: int = Field(ge=0, le=100, description="ציון צמיחה מ-0 עד 100")
    valuation: int = Field(ge=0, le=100, description="ציון תמחור ושוויוניות מ-0 עד 100")
    profitability: int = Field(ge=0, le=100, description="ציון רווחיות מ-0 עד 100")
    overall_score: int = Field(ge=0, le=100, description="ציון משוקלל סופי מ-0 עד 100")

class StockResearchReport(BaseModel):
    ticker: str = Field(description="סימול המניה")
    company_name: Optional[str] = Field(default="", description="שם החברה")
    summary: str = Field(description="תקציר אנליטי מקיף על מצב המניה")
    score: StockScore = Field(description="ציוני ביצועים כמותיים")
    bull_case: List[str] = Field(description="3-5 נקודות חוזקה והזדמנויות מרכזיות (Bullish)")
    bear_case: List[str] = Field(description="3-5 סיכונים ואיומים מרכזיים (Bearish)")
    what_to_monitor: str = Field(description="אינדיקטור / זרז מרכזי שחובה לעקוב אחריו")
    target_recommendation: Optional[str] = Field(default="HOLD", description="המלצת פעולה: BUY, HOLD, או SELL")

# Schema instructions for OpenAI-compatible providers (Groq & OpenRouter)
SCHEMA_INSTRUCTIONS = f"""
You MUST return ONLY a valid JSON object matching this exact schema:
{json.dumps(StockResearchReport.model_json_schema(), ensure_ascii=False, indent=2)}
"""

# --- JSON Sanitization Helper ---

def clean_json_response(text: str) -> dict:
    """Extract and parse JSON cleanly even if wrapped in markdown codeblocks."""
    if not text or not text.strip():
        raise ValueError("Empty response from AI provider")
    
    cleaned = text.strip()
    # Remove markdown ```json ... ``` wrappers if present
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
        cleaned = re.sub(r"\s*```$", "", cleaned)
    
    # Locate outer curly braces
    first_brace = cleaned.find("{")
    last_brace = cleaned.rfind("}")
    if first_brace != -1 and last_brace != -1:
        cleaned = cleaned[first_brace:last_brace + 1]
        
    return json.loads(cleaned)

# --- AI Provider Implementations with Strict Timeouts ---

async def call_gemini(prompt: str) -> str:
    """
    Call Google Gemini 1.5 Flash asynchronously with a strict timeout.
    """
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY is not configured in environment.")

    genai.configure(api_key=api_key)
    model = genai.GenerativeModel("gemini-1.5-flash")
    
    generation_coroutine = model.generate_content_async(
        prompt,
        generation_config=genai.GenerationConfig(
            response_mime_type="application/json",
            response_schema=StockResearchReport,
            temperature=0.2
        )
    )
    
    # Enforce strict 15.0s timeout
    response = await asyncio.wait_for(generation_coroutine, timeout=AI_TIMEOUT_SECONDS)
    
    if not response or not response.text:
        raise ValueError("Empty response from Gemini")
    return response.text

async def call_groq(prompt: str) -> str:
    """
    Call Groq Cloud (Llama-3.3-70b-versatile) asynchronously with a strict timeout.
    """
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise ValueError("GROQ_API_KEY is not configured in environment.")

    client = AsyncOpenAI(
        api_key=api_key,
        base_url="https://api.groq.com/openai/v1",
        timeout=AI_TIMEOUT_SECONDS
    )
    
    response = await client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {
                "role": "system",
                "content": "You are a senior equity research analyst. Return responses in valid JSON adhering strictly to the schema provided."
            },
            {
                "role": "user",
                "content": prompt + "\n\n" + SCHEMA_INSTRUCTIONS
            }
        ],
        response_format={"type": "json_object"},
        temperature=0.2,
        timeout=AI_TIMEOUT_SECONDS
    )
    return response.choices[0].message.content

async def call_openrouter(prompt: str) -> str:
    """
    Call OpenRouter (Meta Llama 3.3 Free Tier) asynchronously with a strict timeout.
    """
    api_key = os.getenv("OPENROUTER_API_KEY")
    if not api_key:
        raise ValueError("OPENROUTER_API_KEY is not configured in environment.")

    client = AsyncOpenAI(
        api_key=api_key,
        base_url="https://openrouter.ai/api/v1",
        timeout=AI_TIMEOUT_SECONDS
    )
    
    response = await client.chat.completions.create(
        model="meta-llama/llama-3.3-70b-instruct:free",
        messages=[
            {
                "role": "system",
                "content": "You are an expert Wall Street equity research analyst. Output strictly valid JSON matching the schema."
            },
            {
                "role": "user",
                "content": prompt + "\n\n" + SCHEMA_INSTRUCTIONS
            }
        ],
        response_format={"type": "json_object"},
        temperature=0.2,
        timeout=AI_TIMEOUT_SECONDS
    )
    return response.choices[0].message.content

# --- Roulette / Multi-Provider Fallback Mechanism ---

async def run_ai_roulette(prompt: str) -> dict:
    """
    Executes AI requests across providers with strict 15.0s timeouts and graceful failover:
    1. Groq (Ultra-fast Llama-3.3-70b)
    2. Gemini (Google Native Flash)
    3. OpenRouter (Multi-model free tier)
    """
    providers = [
        {"name": "Groq", "func": call_groq},
        {"name": "Gemini", "func": call_gemini},
        {"name": "OpenRouter", "func": call_openrouter}
    ]
    
    last_errors = []
    
    for provider in providers:
        provider_name = provider["name"]
        try:
            logger.info(f"🎲 Attempting AI analysis with provider: {provider_name} (timeout={AI_TIMEOUT_SECONDS}s)")
            result_text = await provider["func"](prompt)
            parsed_json = clean_json_response(result_text)
            
            # Validate output against Pydantic model for complete type safety
            validated_report = StockResearchReport.model_validate(parsed_json)
            logger.info(f"✅ AI research successfully generated via {provider_name}")
            return validated_report.model_dump()
            
        except (asyncio.TimeoutError, APITimeoutError) as e:
            logger.warning(f"⏱️ Provider '{provider_name}' timed out after {AI_TIMEOUT_SECONDS}s: {e}")
            last_errors.append(f"{provider_name} (Timeout after {AI_TIMEOUT_SECONDS}s)")
            continue
        except (APIConnectionError, APIError) as e:
            logger.warning(f"🌐 Provider '{provider_name}' API connection error: {e}")
            last_errors.append(f"{provider_name} (API Error: {str(e)})")
            continue
        except Exception as e:
            logger.warning(f"⚠️ Provider '{provider_name}' failed: {e}")
            last_errors.append(f"{provider_name}: {str(e)}")
            continue
            
    error_summary = "; ".join(last_errors)
    raise RuntimeError(f"🚨 All AI providers failed or timed out. Details: {error_summary}")

# --- Primary Business Function with Multi-Layer Redis Caching ---

async def generate_stock_research(ticker: str, language: str = "he") -> dict:
    """
    Generates an institutional-grade AI research report for a stock:
    
    Step 1: Check Redis / In-Memory cache first. If found, return immediately in 0ms.
    Step 2: On cache miss, fetch real-time market data & fundamental valuation metrics.
    Step 3: Execute AI Roulette with 15.0s per-provider timeouts.
    Step 4: Validate and enrich the resulting report.
    Step 5: Persist the result in Redis with 4-hour TTL (14,400s).
    """
    clean_ticker = ticker.strip().upper()
    cache_key = f"ai_stock_research:{clean_ticker}:{language}"
    
    # 1. Check multi-layer Redis / Memory cache
    cached_report = await get_cached_data(cache_key)
    if cached_report and isinstance(cached_report, dict):
        logger.info(f"⚡ [CACHE HIT] Returning cached AI research report for {clean_ticker} ({cache_key})")
        return cached_report

    logger.info(f"🔍 [CACHE MISS] Fetching fresh market data & generating AI research for {clean_ticker}")

    # 2. Fetch live market & fundamental details
    stock_details = await get_stock_details(clean_ticker)
    if not stock_details:
        raise ValueError(f"Could not fetch market data for ticker {clean_ticker}")
    
    company_name = stock_details.get("company_name", clean_ticker)
    current_price = stock_details.get("current_price")
    market_cap = stock_details.get("market_cap")
    pe_ratio = stock_details.get("pe_ratio")
    forward_pe = stock_details.get("forward_pe")
    peg_ratio = stock_details.get("peg_ratio")
    fifty_two_week_high = stock_details.get("fifty_two_week_high")
    fifty_two_week_low = stock_details.get("fifty_two_week_low")
    profit_margins = stock_details.get("profit_margins")
    revenue = stock_details.get("total_revenue")
    recommendation = stock_details.get("recommendation")

    financial_context = {
        "ticker": clean_ticker,
        "company_name": company_name,
        "current_price": current_price,
        "market_cap": market_cap,
        "pe_ratio": pe_ratio,
        "forward_pe": forward_pe,
        "peg_ratio": peg_ratio,
        "52_week_high": fifty_two_week_high,
        "52_week_low": fifty_two_week_low,
        "profit_margins": profit_margins,
        "revenue": revenue,
        "analyst_consensus": recommendation
    }

    # 3. Construct structured prompt
    lang_instruction = (
        "Write the analysis (summary, bull_case, bear_case, what_to_monitor) in professional Hebrew (עברית מקצועית וקולחת לשוק ההון)."
        if language == "he"
        else "Write the analysis in professional English."
    )

    prompt = f"""
You are a senior equity research analyst at a top tier investment firm.
Analyze the following financial and valuation data for the stock {clean_ticker} ({company_name}):

{json.dumps(financial_context, ensure_ascii=False, indent=2)}

Instructions:
1. Provide an executive summary of the business model, valuation, and current market sentiment.
2. Grade the stock with integer scores from 0-100 on Growth, Valuation, Profitability, and Overall Score.
3. Formulate 3-4 bullet points for the Bull Case (reasons to buy/upside potential).
4. Formulate 3-4 bullet points for the Bear Case (key risks, headwinds, valuation risks).
5. Specify one key catalyst or metric that investors MUST monitor closely (what_to_monitor).
6. State the final target recommendation (BUY, HOLD, or SELL).
7. {lang_instruction}
"""

    # 4. Run through AI Roulette with fallback
    research_report = await run_ai_roulette(prompt)
    research_report["ticker"] = clean_ticker
    research_report["company_name"] = company_name

    # 5. Persist result in Redis / In-Memory cache with configured TTL (4 hours)
    await set_cached_data(cache_key, research_report, expiration=AI_CACHE_TTL_SECONDS)
    logger.info(f"💾 [CACHE STORE] Persisted AI research for {clean_ticker} with TTL={AI_CACHE_TTL_SECONDS}s")
    
    return research_report