import asyncio
import logging
import re
import uuid
from typing import Any

from app.models.portfolio import Portfolio
from app.models.transaction import Transaction
from app.schemas.import_schema import (
    ImportItemResult,
    ImportPreviewResponse,
    ImportResultResponse,
)
from app.services.cache_service import (
    delete_cached_data,
    get_cached_data,
    set_cached_data,
)
from app.services.stock_service import get_sector_from_yfinance
from sqlalchemy import select
from sqlalchemy.orm import Session

from .ai_column_mapper import ai_column_mapper
from .excel_parser import excel_parser

logger = logging.getLogger(__name__)


def _clean_ticker(raw_val: Any) -> str | None:
    """
    Cleans raw ticker string by stripping whitespace, converting to uppercase,
    and trimming common brokerage prefixes/suffixes (e.g. 'NASDAQ:AAPL' -> 'AAPL', 'AAPL.US' -> 'AAPL').
    """
    if raw_val is None:
        return None
    val_str = str(raw_val).strip().upper()
    if not val_str or val_str in ["NONE", "NULL", "NAN", "-"]:
        return None

    # Remove exchange prefix like "NASDAQ:" or "NYSE:" or "BATS:"
    if ":" in val_str:
        val_str = val_str.split(":")[-1].strip()

    # Remove common country/currency suffixes like ".US" (while preserving valid dotted tickers like BRK.B or TEVA.TA)
    val_str = val_str.removesuffix(".US")

    # Clean any quotes or extraneous symbols
    val_str = re.sub(r"[\'\"`]", "", val_str).strip()

    # Validate ticker contains reasonable characters (letters, numbers, dot, hyphen)
    if re.match(r"^[A-Z0-9.\-]{1,12}$", val_str):
        return val_str
    return None


def _clean_numeric(raw_val: Any) -> float | None:
    """
    Cleans strings with currency symbols ($ , ₪ , € , £), commas (1,234.56), percentages,
    or parentheses ((100.0) -> -100.0) and converts to float.
    """
    if raw_val is None:
        return None
    if isinstance(raw_val, (int, float)):
        return float(raw_val)

    s = str(raw_val).strip()
    if not s or s in ["-", "--", "N/A", "n/a", "None", "NaN", "null"]:
        return None

    # Check for accounting parentheses e.g. (1,234.50) -> negative
    is_negative = False
    if s.startswith("(") and s.endswith(")"):
        is_negative = True
        s = s[1:-1]

    # Remove currency symbols, commas, spaces, percentage signs
    cleaned = re.sub(r"[$,₪€£\s%]", "", s).replace(",", "")

    try:
        val = float(cleaned)
        return -val if is_negative else val
    except (ValueError, TypeError):
        return None


class PortfolioImportService:
    """
    High-performance business logic service for portfolio spreadsheet ingestion,
    schema previewing, data normalization, AI-assisted column mapping, and database upsert.
    """

    async def preview_import(self, file_bytes: bytes, filename: str) -> ImportPreviewResponse:
        """
        Parses uploaded file bytes, extracts columns and sample rows,
        triggers AI column mapping, caches full rows for the confirmation step,
        and generates data validation warnings.
        """
        # 1. Parse file in worker thread
        columns, full_rows, total_rows = await excel_parser.parse_all_rows(file_bytes, filename)
        preview_rows = full_rows[:5]

        # 2. Run AI/Rule column mapper
        mapping_result = await ai_column_mapper.map_columns(columns, preview_rows)
        suggested_mapping = mapping_result["mapping"]
        confidence = mapping_result["confidence"]
        notes = mapping_result.get("notes")

        # 3. Cache full parsed rows for fast session retrieval
        session_token = uuid.uuid4().hex
        cache_key = f"import_session:{session_token}"
        try:
            await set_cached_data(cache_key, full_rows, ttl_seconds=1800)  # 30 minutes TTL
        except Exception as e:
            logger.warning(f"Failed to cache import session in Redis: {e}")

        # 4. Generate helpful validation warnings
        warnings: list[str] = []
        mapped_targets = set(v for v in suggested_mapping.values() if v is not None)

        if "ticker" not in mapped_targets:
            warnings.append("⚠️ Missing required field: 'ticker' (Stock symbol). Please select the correct column.")
        if "shares" not in mapped_targets:
            warnings.append("⚠️ Missing required field: 'shares' (Quantity). Please select the correct column.")
        if "avg_price" not in mapped_targets:
            warnings.append(
                "⚠️ Missing required field: 'avg_price' (Average purchase cost). Please select the correct column."
            )

        if confidence < 0.70:
            warnings.append(
                "ℹ️ Some column headers had lower matching confidence. Please review the suggested mapping carefully."
            )

        return ImportPreviewResponse(
            filename=filename,
            columns=columns,
            suggested_mapping=suggested_mapping,
            confidence=confidence,
            notes=notes,
            preview_rows=preview_rows,
            total_rows=total_rows,
            session_token=session_token,
            warnings=warnings,
        )

    async def confirm_and_bulk_import(
        self,
        db: Session,
        user_id: int,
        mapping: dict[str, str | None],
        rows: list[dict[str, Any]] | None = None,
        session_token: str | None = None,
        overwrite_existing: bool = True,
    ) -> ImportResultResponse:
        """
        Validates user-confirmed column mapping, retrieves raw rows (from payload or session cache),
        cleans and normalizes values, enriches missing sectors via Yahoo Finance,
        and atomically upserts positions into the Portfolio database model.
        """
        # 1. Resolve rows: prioritize session cache (which contains full dataset)
        resolved_rows: list[dict[str, Any]] = []
        if session_token:
            cache_key = f"import_session:{session_token}"
            cached = await get_cached_data(cache_key)
            if cached and isinstance(cached, list) and len(cached) > 0:
                resolved_rows = cached
                logger.info(
                    f"Successfully retrieved {len(resolved_rows)} full rows from session cache ({session_token})."
                )

        # Fallback to direct payload rows if session_token was not provided or expired
        if not resolved_rows and rows and len(rows) > 0:
            resolved_rows = rows
            logger.info(f"Using {len(resolved_rows)} rows provided directly in request payload.")

        if not resolved_rows:
            return ImportResultResponse(
                success=False,
                total_processed=0,
                imported_count=0,
                updated_count=0,
                failed_count=0,
                errors=["No data rows found in session cache or payload. Please re-upload your file."],
                items=[],
            )

        # 2. Invert mapping to find user header for each target field
        # mapping is: { "user_header": "target_field" }
        target_to_col: dict[str, str] = {}
        for col_name, target in mapping.items():
            if target:
                target_to_col[target] = col_name

        # Verify required fields are mapped
        missing_required = [req for req in ["ticker", "shares", "avg_price"] if req not in target_to_col]
        if missing_required:
            return ImportResultResponse(
                success=False,
                total_processed=len(resolved_rows),
                imported_count=0,
                updated_count=0,
                failed_count=len(resolved_rows),
                errors=[
                    f"Cannot proceed with import. Missing mapping for required fields: {', '.join(missing_required)}"
                ],
                items=[],
            )

        ticker_col = target_to_col["ticker"]
        shares_col = target_to_col["shares"]
        avg_price_col = target_to_col["avg_price"]
        sector_col = target_to_col.get("sector")
        tp_col = target_to_col.get("take_profit")
        sl_col = target_to_col.get("stop_loss")

        # 3. Clean and parse raw rows
        cleaned_candidates: list[dict[str, Any]] = []
        results: list[ImportItemResult] = []
        errors: list[str] = []

        for idx, row in enumerate(resolved_rows, start=1):
            raw_ticker = row.get(ticker_col)
            ticker = _clean_ticker(raw_ticker)

            if not ticker:
                err_msg = f"Row {idx}: Invalid or empty ticker symbol '{raw_ticker}'."
                errors.append(err_msg)
                results.append(
                    ImportItemResult(
                        ticker=str(raw_ticker or "UNKNOWN"), shares=0.0, avg_price=0.0, status="failed", message=err_msg
                    )
                )
                continue

            raw_shares = row.get(shares_col)
            shares = _clean_numeric(raw_shares)
            if shares is None or shares <= 0:
                err_msg = f"Row {idx} ({ticker}): Invalid shares quantity '{raw_shares}'. Must be a positive number."
                errors.append(err_msg)
                results.append(
                    ImportItemResult(ticker=ticker, shares=0.0, avg_price=0.0, status="failed", message=err_msg)
                )
                continue

            raw_avg_price = row.get(avg_price_col)
            avg_price = _clean_numeric(raw_avg_price)
            if avg_price is None or avg_price < 0:
                err_msg = f"Row {idx} ({ticker}): Invalid average purchase price '{raw_avg_price}'."
                errors.append(err_msg)
                results.append(
                    ImportItemResult(ticker=ticker, shares=shares, avg_price=0.0, status="failed", message=err_msg)
                )
                continue

            # Optional sector
            sector = None
            if sector_col and row.get(sector_col):
                sec_val = str(row[sector_col]).strip()
                if sec_val and sec_val.lower() not in ["none", "null", "nan", "-", "unknown"]:
                    sector = sec_val

            # Optional Take Profit and Stop Loss
            tp = _clean_numeric(row.get(tp_col)) if tp_col else None
            sl = _clean_numeric(row.get(sl_col)) if sl_col else None

            cleaned_candidates.append(
                {
                    "row_idx": idx,
                    "ticker": ticker,
                    "shares": round(shares, 4),
                    "avg_price": round(avg_price, 2),
                    "sector": sector,
                    "take_profit": round(tp, 2) if tp is not None else None,
                    "stop_loss": round(sl, 2) if sl is not None else None,
                }
            )

        if not cleaned_candidates:
            return ImportResultResponse(
                success=False,
                total_processed=len(resolved_rows),
                imported_count=0,
                updated_count=0,
                failed_count=len(resolved_rows),
                errors=errors or ["No valid rows could be parsed."],
                items=results,
            )

        # 4. Enrich missing sectors via Yahoo Finance concurrently
        tickers_needing_sector = list(set(item["ticker"] for item in cleaned_candidates if not item["sector"]))

        if tickers_needing_sector:
            logger.info(f"Enriching sectors for {len(tickers_needing_sector)} tickers via Yahoo Finance.")
            sector_results = await asyncio.gather(
                *[get_sector_from_yfinance(t) for t in tickers_needing_sector], return_exceptions=True
            )
            sector_map = {}
            for t, s in zip(tickers_needing_sector, sector_results):
                if isinstance(s, str) and s != "Unknown":
                    sector_map[t] = s
                else:
                    sector_map[t] = "Other"

            for item in cleaned_candidates:
                if not item["sector"]:
                    item["sector"] = sector_map.get(item["ticker"], "Other")

        # 5. Atomic Database Upsert wrapped in worker thread
        def _sync_db_upsert() -> tuple[int, int, list[ImportItemResult]]:
            imported_cnt = 0
            updated_cnt = 0
            db_results: list[ImportItemResult] = []

            try:
                for candidate in cleaned_candidates:
                    ticker = candidate["ticker"]
                    shares = candidate["shares"]
                    avg_price = candidate["avg_price"]
                    sector = candidate["sector"] or "Other"
                    tp = candidate["take_profit"]
                    sl = candidate["stop_loss"]

                    # Check for existing portfolio position
                    existing = db.scalars(
                        select(Portfolio).where(Portfolio.user_id == user_id, Portfolio.ticker == ticker)
                    ).first()

                    if existing:
                        if overwrite_existing:
                            existing.shares = shares
                            existing.avg_price = avg_price
                            if sector and sector != "Other":
                                existing.sector = sector
                            if tp is not None:
                                existing.take_profit = tp
                                existing.tp_triggered = False
                            if sl is not None:
                                existing.stop_loss = sl
                                existing.sl_triggered = False
                            status_action = "updated"
                            msg = "Position updated with new import values."
                        else:
                            # Blend positions: weighted average cost basis
                            old_shares = float(existing.shares)
                            old_avg = float(existing.avg_price)
                            total_shares = old_shares + shares
                            blended_avg = (
                                ((old_shares * old_avg) + (shares * avg_price)) / total_shares
                                if total_shares > 0
                                else avg_price
                            )

                            existing.shares = round(total_shares, 4)
                            existing.avg_price = round(blended_avg, 2)
                            status_action = "updated"
                            msg = f"Blended with existing position (Total shares: {existing.shares}, Avg Price: {existing.avg_price})."

                        updated_cnt += 1
                    else:
                        new_pos = Portfolio(
                            user_id=user_id,
                            ticker=ticker,
                            shares=shares,
                            avg_price=avg_price,
                            sector=sector,
                            take_profit=tp,
                            stop_loss=sl,
                        )
                        db.add(new_pos)
                        imported_cnt += 1
                        status_action = "created"
                        msg = "New position added to portfolio."

                    # Record transaction log entry for auditing
                    audit_tx = Transaction(
                        user_id=user_id,
                        ticker=ticker,
                        type="BUY",
                        shares=shares,
                        price=avg_price,
                        realized_pl=0.0,
                        cashflow=-(shares * avg_price),
                    )
                    db.add(audit_tx)

                    db_results.append(
                        ImportItemResult(
                            ticker=ticker,
                            shares=shares,
                            avg_price=avg_price,
                            sector=sector,
                            take_profit=tp,
                            stop_loss=sl,
                            status=status_action,
                            message=msg,
                        )
                    )

                db.commit()
                return imported_cnt, updated_cnt, db_results

            except Exception as e:
                db.rollback()
                logger.exception(f"Database transaction error during portfolio import: {e}")
                raise e

        try:
            imported_count, updated_count, upsert_results = await asyncio.to_thread(_sync_db_upsert)
            results.extend(upsert_results)
        except Exception as e:
            return ImportResultResponse(
                success=False,
                total_processed=len(resolved_rows),
                imported_count=0,
                updated_count=0,
                failed_count=len(resolved_rows),
                errors=[f"Database transaction failed: {e!s}"],
                items=results,
            )

        # 6. Invalidate caches for this user
        if session_token:
            await delete_cached_data(f"import_session:{session_token}")
        await delete_cached_data(f"portfolio_history_retro:{user_id}")

        return ImportResultResponse(
            success=True,
            total_processed=len(resolved_rows),
            imported_count=imported_count,
            updated_count=updated_count,
            failed_count=len(results) - (imported_count + updated_count),
            errors=errors,
            items=results,
        )


import_service = PortfolioImportService()
