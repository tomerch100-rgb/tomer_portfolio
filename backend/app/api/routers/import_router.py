import logging
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status
from sqlalchemy.orm import Session

from app.core import security
from app.db.session import get_db
from app.schemas.import_schema import (
    ImportPreviewResponse,
    ImportConfirmRequest,
    ImportResultResponse,
)
from app.services.portfolio_import.import_service import import_service
from app.services.portfolio_import.excel_parser import (
    ExcelParserError,
    UnsupportedFileFormatError,
    EmptyFileError,
)

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/portfolio/import",
    tags=["portfolio-import"]
)

# Supported extensions and maximum upload file size (10 MB)
ALLOWED_EXTENSIONS = {".csv", ".xlsx", ".xls", ".xlsm"}
MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB


@router.post(
    "/preview",
    response_model=ImportPreviewResponse,
    summary="Upload and preview spreadsheet with AI-powered column mapping"
)
async def preview_portfolio_import(
    file: UploadFile = File(..., description="Stock portfolio spreadsheet (.csv, .xlsx, .xls)"),
    user_id: int = Depends(security.get_current_user_id)
):
    """
    Ingests an uploaded portfolio file (.csv, .xlsx, .xls), analyzes structure and sample data rows,
    invokes the AI column mapper (Gemini / Groq / OpenAI with rule-based fallback)
    and returns suggested mappings with preview rows and data validation warnings.
    """
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Filename cannot be empty."
        )

    # Validate file extension
    ext = "." + file.filename.lower().rsplit(".", 1)[-1] if "." in file.filename else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format '{ext}'. Allowed formats: {', '.join(ALLOWED_EXTENSIONS)}"
        )

    # Read uploaded bytes with size limit check
    try:
        file_bytes = await file.read()
    except Exception as e:
        logger.error(f"Error reading uploaded file: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to read uploaded file."
        )

    if not file_bytes or len(file_bytes) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The uploaded file is empty (0 bytes)."
        )

    if len(file_bytes) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File size exceeds the 10MB limit (Uploaded size: {len(file_bytes) / (1024 * 1024):.2f}MB)."
        )

    try:
        preview_response = await import_service.preview_import(
            file_bytes=file_bytes,
            filename=file.filename
        )
        return preview_response

    except EmptyFileError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except UnsupportedFileFormatError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except ExcelParserError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Failed to parse file: {str(e)}")
    except Exception as e:
        logger.exception(f"Unexpected error during import preview: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal error processing import preview: {str(e)}"
        )


@router.post(
    "/confirm",
    response_model=ImportResultResponse,
    summary="Confirm column mapping and bulk upsert positions into portfolio"
)
async def confirm_portfolio_import(
    payload: ImportConfirmRequest,
    user_id: int = Depends(security.get_current_user_id),
    db: Session = Depends(get_db)
):
    """
    Applies the user-confirmed column mapping, normalizes stock tickers, quantities,
    average prices, enriches missing sectors via Yahoo Finance, and executes atomic bulk
    upsert into the Portfolio database.
    """
    if not payload.mapping:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Column mapping dictionary is required."
        )

    try:
        result = await import_service.confirm_and_bulk_import(
            db=db,
            user_id=user_id,
            mapping=payload.mapping,
            rows=payload.rows,
            session_token=payload.session_token,
            overwrite_existing=payload.overwrite_existing
        )
        return result

    except Exception as e:
        logger.exception(f"Unexpected error during import confirmation: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal error during import confirmation: {str(e)}"
        )
