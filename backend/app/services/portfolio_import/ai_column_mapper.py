import asyncio
import json
import logging
import os
import re
from typing import Any

import requests
from dotenv import find_dotenv, load_dotenv

load_dotenv(find_dotenv())
logger = logging.getLogger(__name__)

TARGET_FIELDS = ["ticker", "shares", "avg_price", "sector", "take_profit", "stop_loss"]

# Extensive Dictionary for Rule-based & Fuzzy Fallback Mapping
RULES_DICTIONARY: dict[str, list[str]] = {
    "ticker": [
        "ticker",
        "symbol",
        "stock",
        "stock symbol",
        "sym",
        "ticker symbol",
        "instrument",
        "asset",
        "code",
        "isin",
        "ric",
        "security",
        "security id",
        "identifier",
        "סמל",
        "סימול",
        "טיקר",
        "נייר",
        "מספר נייר",
        "שם נייר",
        "מניה",
        "שם מניה",
        "סמל מניה",
        "קוד נייר",
        "נכס",
        "שם נכס",
        "קוד מניה",
        "שם נייר ערך",
        "מספר נייר ערך",
    ],
    "shares": [
        "shares",
        "quantity",
        "qty",
        "units",
        "amount",
        "volume",
        "held",
        "position size",
        "count",
        "total shares",
        "number of shares",
        "no of shares",
        "holding qty",
        "כמות",
        "מספר מניות",
        "יחידות",
        "כמות יחידות",
        "יתרה",
        "כמות נוכחית",
        "גודל פוזיציה",
        "כמות ניירות",
        "כמות מניה",
        "סהכ כמות",
        'סה"כ כמות',
    ],
    "avg_price": [
        "avg price",
        "average price",
        "avg_price",
        "avg cost",
        "average cost",
        "cost basis",
        "cost price",
        "purchase price",
        "buy price",
        "unit cost",
        "price paid",
        "cost_basis",
        "open price",
        "entry price",
        "avg buy price",
        "cost/share",
        "price per share",
        "מחיר ממוצע",
        "שער ממוצע",
        "עלות ממוצעת",
        "מחיר קניה",
        "שער קניה",
        "מחיר עלות",
        "עלות",
        "מחיר יחידה",
        "שער רכישה",
        "מחיר רכישה",
        "שער כניסה",
        "שער פתיחה",
        "עלות ליחידה",
    ],
    "sector": [
        "sector",
        "industry",
        "category",
        "segment",
        "asset class",
        "מגזר",
        "ענף",
        "תחום",
        "סקטור",
        "תעשייה",
        "סיווג",
    ],
    "take_profit": [
        "take profit",
        "take_profit",
        "tp",
        "target price",
        "target",
        "profit target",
        "exit target",
        "price target",
        "יעד רווח",
        "רווח מטרה",
        "יעד",
        "טייק פרופיט",
        "מחיר יעד",
        "יעד מכירה",
    ],
    "stop_loss": [
        "stop loss",
        "stop_loss",
        "sl",
        "stop price",
        "stop limit",
        "cut loss",
        "stop",
        "סטופ לוס",
        "עצור הפסד",
        "הגבלת הפסד",
        "מחיר חסימה",
        "סטופ",
    ],
}


def _normalize_text(text: str) -> str:
    """Normalize text by converting to lowercase and stripping punctuation/extra spaces."""
    if not text:
        return ""
    text = text.lower().strip()
    text = re.sub(r"[\'\"_.,\-\(\)\/\\]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def _is_probable_ticker_value(val: Any) -> bool:
    """Heuristic check if a sample value looks like a stock ticker (e.g. AAPL, NVDA, TEVA.TA)."""
    if not val or not isinstance(val, str):
        return False
    s = val.strip().upper()
    if 1 <= len(s) <= 8 and re.match(r"^[A-Z0-9.\-]+$", s) and not s.replace(".", "").isdigit():
        return True
    return False


def _clean_env_key(var_name: str) -> str | None:
    """Helper to safely fetch and strip whitespace from env variables."""
    val = os.getenv(var_name)
    if val:
        val = val.strip()
        if val and val != "":
            return val
    return None


class AIColumnMapperService:
    """
    Intelligent Column Mapper with strict priority:
    1. Groq / Grok (1st Priority)
    2. Google Gemini (2nd Priority)
    3. OpenRouter (3rd Priority)
    With seamless automatic fallback to rule-based / fuzzy dictionary mapping.
    """

    def __init__(self):
        self._refresh_keys()

    def _refresh_keys(self):
        """Loads and sanitizes API keys from environment variables."""
        # 1. Groq / Grok (Priority 1)
        self.groq_api_key = (
            _clean_env_key("GROQ_API_KEY") or _clean_env_key("GROK_API_KEY") or _clean_env_key("XAI_API_KEY")
        )
        # 2. Google Gemini (Priority 2)
        self.gemini_api_key = _clean_env_key("GEMINI_API_KEY")
        # 3. OpenRouter (Priority 3)
        self.openrouter_api_key = _clean_env_key("OPENROUTER_API_KEY") or _clean_env_key("OPEN_ROUTER_API_KEY")

    def _build_prompt(self, columns: list[str], preview_rows: list[dict[str, Any]]) -> str:
        """
        Builds a structured prompt containing schema targets, user columns, and sample cell values.
        """
        column_samples: dict[str, list[Any]] = {}
        for col in columns:
            samples = []
            for row in preview_rows[:4]:
                v = row.get(col)
                if v is not None and str(v).strip() != "":
                    samples.append(str(v)[:40])
            column_samples[col] = samples

        sample_summary = []
        for col, samples in column_samples.items():
            sample_str = ", ".join(repr(s) for s in samples[:3]) if samples else "empty"
            sample_summary.append(f'- Column "{col}": Sample values -> [{sample_str}]')

        samples_text = "\n".join(sample_summary)

        prompt = f"""You are an expert financial data engineer specializing in stock portfolio ingestion.
Given a list of column headers and sample data from a user's uploaded spreadsheet (which may be in English, Hebrew, or mixed), map each header to our standardized stock portfolio schema.

### TARGET SCHEMA FIELDS:
1. "ticker": Stock symbol/ticker (e.g., AAPL, MSFT, TEVA, 005930.KS). (REQUIRED)
2. "shares": Quantity / number of shares / units held. (REQUIRED)
3. "avg_price": Average purchase cost per share / cost basis. (REQUIRED)
4. "sector": Industry or sector category. (OPTIONAL)
5. "take_profit": Target take-profit price. (OPTIONAL)
6. "stop_loss": Stop-loss limit price. (OPTIONAL)
7. null: Any irrelevant column (such as row index, current market price, market value, unrealized P/L, change %, currency, date, exchange, notes).

### UPLOADED COLUMNS & SAMPLE VALUES:
{samples_text}

### OUTPUT REQUIREMENTS:
Respond ONLY with a valid JSON object strictly conforming to this schema (no markdown fences, no explanatory prelude):
{{
  "mapping": {{
    "<user_header_1>": "ticker" | "shares" | "avg_price" | "sector" | "take_profit" | "stop_loss" | null,
    "<user_header_2>": ...
  }},
  "confidence": 0.95,
  "notes": "Short description of mapping rationale"
}}
"""
        return prompt

    # =========================================================================
    # OPTION 1: Groq / Grok (1st Priority)
    # =========================================================================
    def _call_groq_sync(self, prompt: str) -> dict | None:
        """Call Groq or xAI Grok API (OpenAI-compatible) via HTTPS endpoint."""
        if not self.groq_api_key:
            return None

        # Check if xAI Grok or Groq
        if self.groq_api_key.startswith("xai-"):
            url = "https://api.x.ai/v1/chat/completions"
            models_to_try = ["grok-2-latest", "grok-beta"]
        else:
            url = "https://api.groq.com/openai/v1/chat/completions"
            models_to_try = ["openai/gpt-oss-120b", "openai/gpt-oss-20b", "llama-3.3-70b-versatile", "qwen/qwen3.6-27b"]

        for model in models_to_try:
            try:
                payload = {
                    "model": model,
                    "messages": [
                        {
                            "role": "system",
                            "content": "You are a specialized financial data parsing assistant. Output strictly valid JSON.",
                        },
                        {"role": "user", "content": prompt},
                    ],
                    "response_format": {"type": "json_object"},
                    "temperature": 0.1,
                }
                resp = requests.post(
                    url,
                    headers={"Content-Type": "application/json", "Authorization": f"Bearer {self.groq_api_key}"},
                    json=payload,
                    timeout=7.0,
                )
                if resp.status_code == 200:
                    res_json = resp.json()
                    choices = res_json.get("choices", [])
                    if choices:
                        raw_text = choices[0].get("message", {}).get("content", "")
                        parsed = self._parse_llm_json(raw_text)
                        if parsed:
                            return parsed
            except Exception as e:
                logger.debug(f"Groq attempt with model {model} failed: {e}")
                continue

        return None

    # =========================================================================
    # OPTION 2: Google Gemini (2nd Priority)
    # =========================================================================
    def _call_gemini_sync(self, prompt: str) -> dict | None:
        """Call Google Gemini API via standard HTTPS endpoint."""
        if not self.gemini_api_key:
            return None

        models_to_try = ["gemini-1.5-flash", "gemini-2.0-flash", "gemini-1.5-pro"]
        for model in models_to_try:
            try:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={self.gemini_api_key}"
                payload = {
                    "contents": [{"parts": [{"text": prompt}]}],
                    "generationConfig": {"response_mime_type": "application/json", "temperature": 0.1},
                }
                resp = requests.post(url, json=payload, timeout=7.0)
                if resp.status_code == 200:
                    res_json = resp.json()
                    candidates = res_json.get("candidates", [])
                    if candidates:
                        content = candidates[0].get("content", {})
                        parts = content.get("parts", [])
                        if parts:
                            raw_text = parts[0].get("text", "")
                            parsed = self._parse_llm_json(raw_text)
                            if parsed:
                                return parsed
            except Exception as e:
                logger.debug(f"Gemini attempt with model {model} failed: {e}")
                continue

        return None

    # =========================================================================
    # OPTION 3: OpenRouter (3rd Priority)
    # =========================================================================
    def _call_openrouter_sync(self, prompt: str) -> dict | None:
        """Call OpenRouter API via standard HTTPS endpoint."""
        if not self.openrouter_api_key:
            return None

        url = "https://openrouter.ai/api/v1/chat/completions"
        models_to_try = ["meta-llama/llama-3.3-70b-instruct", "openai/gpt-4o-mini", "anthropic/claude-3.5-haiku"]

        for model in models_to_try:
            try:
                payload = {
                    "model": model,
                    "messages": [
                        {
                            "role": "system",
                            "content": "You are a specialized financial data parsing assistant. Output strictly valid JSON.",
                        },
                        {"role": "user", "content": prompt},
                    ],
                    "response_format": {"type": "json_object"},
                    "temperature": 0.1,
                }
                resp = requests.post(
                    url,
                    headers={
                        "Content-Type": "application/json",
                        "Authorization": f"Bearer {self.openrouter_api_key}",
                        "HTTP-Referer": "https://tomervest.app",
                        "X-Title": "TomerVest Portfolio Importer",
                    },
                    json=payload,
                    timeout=7.0,
                )
                if resp.status_code == 200:
                    res_json = resp.json()
                    choices = res_json.get("choices", [])
                    if choices:
                        raw_text = choices[0].get("message", {}).get("content", "")
                        parsed = self._parse_llm_json(raw_text)
                        if parsed:
                            return parsed
            except Exception as e:
                logger.debug(f"OpenRouter attempt with model {model} failed: {e}")
                continue

        return None

    def _parse_llm_json(self, raw_text: str) -> dict | None:
        """Extracts and parses JSON object from LLM response text."""
        raw_text = raw_text.strip()
        if raw_text.startswith("```"):
            raw_text = re.sub(r"^```(?:json)?\s*", "", raw_text)
            raw_text = re.sub(r"\s*```$", "", raw_text)
        try:
            return json.loads(raw_text)
        except Exception as e:
            logger.warning(f"Failed to parse LLM JSON: {e}. Raw text: {raw_text[:100]}")
            return None

    def _rule_based_mapping(self, columns: list[str], preview_rows: list[dict[str, Any]]) -> dict[str, Any]:
        """
        Robust heuristic rule-based & fuzzy dictionary mapping fallback.
        """
        mapping: dict[str, str | None] = {col: None for col in columns}
        assigned_targets: set[str] = set()

        # Step 1: Exact and substring matching on header names
        for col in columns:
            normalized_col = _normalize_text(col)

            for target in ["ticker", "shares", "avg_price", "take_profit", "stop_loss", "sector"]:
                if target in assigned_targets:
                    continue

                keywords = RULES_DICTIONARY.get(target, [])
                matched = False

                for kw in keywords:
                    normalized_kw = _normalize_text(kw)
                    if normalized_col == normalized_kw or f" {normalized_kw} " in f" {normalized_col} ":
                        mapping[col] = target
                        assigned_targets.add(target)
                        matched = True
                        break

                if matched:
                    break

        # Step 2: Sample value validation & disambiguation for unassigned required targets
        if "ticker" not in assigned_targets:
            for col in columns:
                if mapping[col] is None:
                    samples = [row.get(col) for row in preview_rows if row.get(col) is not None]
                    if samples and sum(1 for s in samples if _is_probable_ticker_value(s)) >= max(1, len(samples) // 2):
                        mapping[col] = "ticker"
                        assigned_targets.add("ticker")
                        break

        # Step 3: Check remaining numeric columns for shares and avg_price
        if "shares" not in assigned_targets or "avg_price" not in assigned_targets:
            for col in columns:
                if mapping[col] is None:
                    normalized_col = _normalize_text(col)
                    for kw in RULES_DICTIONARY["shares"]:
                        if kw in normalized_col and "shares" not in assigned_targets:
                            mapping[col] = "shares"
                            assigned_targets.add("shares")
                            break
                    for kw in RULES_DICTIONARY["avg_price"]:
                        if kw in normalized_col and "avg_price" not in assigned_targets:
                            mapping[col] = "avg_price"
                            assigned_targets.add("avg_price")
                            break

        has_required = all(t in assigned_targets for t in ["ticker", "shares", "avg_price"])
        confidence = 0.88 if has_required else (0.65 if "ticker" in assigned_targets else 0.40)

        return {"mapping": mapping, "confidence": confidence, "notes": "Rule-based heuristic mapping applied."}

    async def map_columns(self, columns: list[str], preview_rows: list[dict[str, Any]]) -> dict[str, Any]:
        """
        Attempts LLM-based structured mapping with strict priority cascade:
        1. Groq / Grok (1st Priority)
        2. Google Gemini (2nd Priority)
        3. OpenRouter (3rd Priority)
        4. Rule-based / Fuzzy Dictionary Fallback
        """
        self._refresh_keys()

        has_llm_key = bool(self.groq_api_key or self.gemini_api_key or self.openrouter_api_key)

        if has_llm_key:
            prompt = self._build_prompt(columns, preview_rows)

            def _try_llm_cascade() -> dict | None:
                # --- PRIORITY 1: Groq / Grok ---
                if self.groq_api_key:
                    try:
                        res = self._call_groq_sync(prompt)
                        if res and "mapping" in res:
                            logger.info("Successfully mapped columns using Groq/Grok LLM (Priority 1).")
                            return res
                    except Exception as e:
                        logger.warning(f"Groq/Grok column mapping failed: {e}")

                # --- PRIORITY 2: Google Gemini ---
                if self.gemini_api_key:
                    try:
                        res = self._call_gemini_sync(prompt)
                        if res and "mapping" in res:
                            logger.info("Successfully mapped columns using Gemini LLM (Priority 2).")
                            return res
                    except Exception as e:
                        logger.warning(f"Gemini column mapping failed: {e}")

                # --- PRIORITY 3: OpenRouter ---
                if self.openrouter_api_key:
                    try:
                        res = self._call_openrouter_sync(prompt)
                        if res and "mapping" in res:
                            logger.info("Successfully mapped columns using OpenRouter LLM (Priority 3).")
                            return res
                    except Exception as e:
                        logger.warning(f"OpenRouter column mapping failed: {e}")

                return None

            try:
                llm_result = await asyncio.to_thread(_try_llm_cascade)
                if llm_result and isinstance(llm_result.get("mapping"), dict):
                    raw_map = llm_result["mapping"]
                    cleaned_map: dict[str, str | None] = {}
                    for col in columns:
                        target = raw_map.get(col)
                        if target in TARGET_FIELDS:
                            cleaned_map[col] = target
                        else:
                            cleaned_map[col] = None

                    conf = float(llm_result.get("confidence", 0.95))
                    notes = llm_result.get("notes", "AI-powered column mapping")
                    return {"mapping": cleaned_map, "confidence": min(max(conf, 0.0), 1.0), "notes": notes}
            except Exception as e:
                logger.warning(f"LLM cascade execution error: {e}. Falling back to rule-based.")

        # Fallback to rule-based dictionary
        logger.info("Executing rule-based column mapping fallback.")
        return self._rule_based_mapping(columns, preview_rows)


ai_column_mapper = AIColumnMapperService()
