import asyncio
import io
import logging
import math
import re
from datetime import date, datetime
from decimal import Decimal
from typing import Any

import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)


class ExcelParserError(Exception):
    """Base exception for file parsing errors."""


class UnsupportedFileFormatError(ExcelParserError):
    """Raised when the uploaded file format is not supported."""


class EmptyFileError(ExcelParserError):
    """Raised when the uploaded file has no rows or is empty."""


def _sanitize_value(val: Any) -> Any:
    """
    Recursively converts pandas/numpy/datetime/Decimal types to JSON-serializable Python native types.
    """
    if val is None:
        return None
    if isinstance(val, (float, np.floating)):
        if math.isnan(val) or math.isinf(val):
            return None
        return float(val)
    if isinstance(val, (int, np.integer)):
        return int(val)
    if isinstance(val, (bool, np.bool_)):
        return bool(val)
    if isinstance(val, (pd.Timestamp, datetime, date)):
        return val.isoformat()
    if isinstance(val, Decimal):
        return float(val)
    if isinstance(val, str):
        val = val.strip()
        # Clean non-printable characters or weird Excel zero-width spaces
        val = re.sub(r"[\u200b\u200e\u200f\ufeff]", "", val)
        return val if val else None
    if pd.isna(val):
        return None
    return str(val).strip()


def _sanitize_columns(columns: list[Any]) -> list[str]:
    """
    Cleans raw column header names to make them clean, unique, and JSON-safe strings.
    """
    sanitized: list[str] = []
    seen: dict[str, int] = {}

    for idx, col in enumerate(columns):
        if col is None or pd.isna(col):
            col_name = f"Column_{idx + 1}"
        else:
            col_str = str(col).strip()
            # Remove zero-width spaces and normalize newlines/tabs to space
            col_str = re.sub(r"[\u200b\u200e\u200f\ufeff]", "", col_str)
            col_str = re.sub(r"\s+", " ", col_str).strip()
            if not col_str or col_str.lower().startswith("unnamed:"):
                col_name = f"Column_{idx + 1}"
            else:
                col_name = col_str

        # Ensure uniqueness if duplicate headers exist
        if col_name in seen:
            seen[col_name] += 1
            col_name = f"{col_name}_{seen[col_name]}"
        else:
            seen[col_name] = 1

        sanitized.append(col_name)

    return sanitized


def _detect_and_read_csv(file_bytes: bytes) -> pd.DataFrame:
    """
    Safely reads CSV content testing common encodings and separators.
    """
    encodings = ["utf-8-sig", "utf-8", "cp1255", "iso-8859-8", "latin1", "windows-1252"]
    last_error: Exception | None = None

    for enc in encodings:
        try:
            # First try with python engine which autodetects delimiters (comma, semicolon, tab)
            bio = io.BytesIO(file_bytes)
            df = pd.read_csv(bio, encoding=enc, sep=None, engine="python", on_bad_lines="skip")
            if not df.empty or len(df.columns) > 0:
                return df
        except Exception as e:
            last_error = e
            continue

    # Fallback to explicit comma with utf-8 or latin1
    for enc in ["utf-8", "latin1"]:
        try:
            bio = io.BytesIO(file_bytes)
            return pd.read_csv(bio, encoding=enc, sep=",", on_bad_lines="skip")
        except Exception as e:
            last_error = e

    raise ExcelParserError(f"Failed to decode CSV file with supported encodings: {last_error}")


def _detect_and_read_excel(file_bytes: bytes, filename: str) -> pd.DataFrame:
    """
    Reads Excel file (.xlsx, .xls, .xlsm) safely.
    """
    bio = io.BytesIO(file_bytes)
    ext = filename.lower().rsplit(".", 1)[-1] if "." in filename else ""

    if ext in ["xlsx", "xlsm"]:
        try:
            return pd.read_excel(bio, engine="openpyxl")
        except Exception as e:
            logger.warning(f"Failed to read with openpyxl: {e}. Retrying without explicit engine.")
            bio.seek(0)
            return pd.read_excel(bio)
    elif ext == "xls":
        try:
            return pd.read_excel(bio)
        except Exception as e:
            # Sometimes .xls is actually an HTML or CSV table
            logger.warning(f"Reading .xls failed ({e}), attempting CSV/HTML fallback.")
            try:
                bio.seek(0)
                return pd.read_html(bio)[0]
            except Exception:
                bio.seek(0)
                return _detect_and_read_csv(file_bytes)
    else:
        # Generic attempt
        try:
            return pd.read_excel(bio)
        except Exception:
            bio.seek(0)
            return _detect_and_read_csv(file_bytes)


def _find_header_and_trim(df: pd.DataFrame) -> pd.DataFrame:
    """
    Detects if the first few rows are title/metadata banners and resets the header accordingly.
    Also drops completely empty rows and columns.
    """
    # Drop rows and cols that are all NaN
    df = df.dropna(how="all").dropna(axis=1, how="all")

    if df.empty:
        return df

    # If first row looks like title banner (e.g., only 1 non-null column while subsequent rows have many),
    # search top 5 rows for the true header row
    cols_count = len(df.columns)
    if cols_count > 1:
        # Check if columns are mostly 'Unnamed' or if first row has header candidates
        unnamed_ratio = sum(1 for c in df.columns if str(c).lower().startswith("unnamed:")) / cols_count
        if unnamed_ratio > 0.5:
            # Let's inspect first few rows to find the best header candidate row
            best_row_idx = None
            max_non_null = 0
            for r_idx in range(min(5, len(df))):
                row_vals = df.iloc[r_idx]
                non_null_count = sum(1 for v in row_vals if pd.notna(v) and str(v).strip())
                if non_null_count > max_non_null and non_null_count >= 2:
                    max_non_null = non_null_count
                    best_row_idx = r_idx

            if best_row_idx is not None:
                new_headers = df.iloc[best_row_idx].tolist()
                df = df.iloc[best_row_idx + 1 :].copy().reset_index(drop=True)
                df.columns = new_headers

    return df


def _sync_parse_file(
    file_bytes: bytes, filename: str, preview_only: bool = False, max_preview_rows: int = 5
) -> tuple[list[str], list[dict[str, Any]], int]:
    """
    Synchronous parsing logic executed in worker thread.
    Returns: (sanitized_column_names, parsed_row_dicts, total_row_count)
    """
    if not file_bytes or len(file_bytes) == 0:
        raise EmptyFileError("Uploaded file is empty (0 bytes).")

    ext = filename.lower().rsplit(".", 1)[-1] if "." in filename else ""
    if ext not in ["csv", "xlsx", "xls", "xlsm"]:
        raise UnsupportedFileFormatError(f"Unsupported file format: '.{ext}'. Supported formats: .csv, .xlsx, .xls")

    try:
        if ext == "csv":
            df = _detect_and_read_csv(file_bytes)
        else:
            df = _detect_and_read_excel(file_bytes, filename)
    except (ExcelParserError, UnsupportedFileFormatError, EmptyFileError):
        raise
    except Exception as e:
        logger.exception(f"Unexpected error parsing file {filename}: {e}")
        raise ExcelParserError(f"Could not parse file '{filename}': {e!s}")

    df = _find_header_and_trim(df)

    if df.empty or len(df.columns) == 0:
        raise EmptyFileError("File contains no valid data or columns.")

    # Sanitize column names
    sanitized_cols = _sanitize_columns(list(df.columns))
    df.columns = sanitized_cols

    # Filter out empty rows (where all values are NaN or whitespace)
    df = df.dropna(how="all").reset_index(drop=True)
    total_rows = len(df)

    if total_rows == 0:
        raise EmptyFileError("File contains headers but 0 data rows.")

    target_df = df.head(max_preview_rows) if preview_only else df

    # Convert to sanitized list of dicts
    records: list[dict[str, Any]] = []
    for _, row in target_df.iterrows():
        row_dict: dict[str, Any] = {}
        is_empty_row = True
        for col_name in sanitized_cols:
            val = _sanitize_value(row.get(col_name))
            row_dict[col_name] = val
            if val is not None and str(val).strip() != "":
                is_empty_row = False
        if not is_empty_row:
            records.append(row_dict)

    return sanitized_cols, records, total_rows


class ExcelParserService:
    """
    Asynchronous wrapper for parsing Excel and CSV files without blocking the main event loop.
    """

    @staticmethod
    async def parse_preview(
        file_bytes: bytes, filename: str, max_preview_rows: int = 5
    ) -> tuple[list[str], list[dict[str, Any]], int]:
        """
        Parses column headers and first N rows as preview in a worker thread.
        """
        return await asyncio.to_thread(
            _sync_parse_file,
            file_bytes=file_bytes,
            filename=filename,
            preview_only=True,
            max_preview_rows=max_preview_rows,
        )

    @staticmethod
    async def parse_all_rows(file_bytes: bytes, filename: str) -> tuple[list[str], list[dict[str, Any]], int]:
        """
        Parses all rows in a worker thread.
        """
        return await asyncio.to_thread(_sync_parse_file, file_bytes=file_bytes, filename=filename, preview_only=False)


excel_parser = ExcelParserService()
