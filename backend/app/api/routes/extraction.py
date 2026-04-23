from fastapi import APIRouter
from app.schemas.extraction import ExtractionRequest
from app.services.extraction_service import extract_meter_reading, extract_seal_number

router = APIRouter()

@router.post('/meter-reading')
def meter_reading(payload: ExtractionRequest) -> dict:
    return extract_meter_reading(payload.file_url)

@router.post('/seal-number')
def seal_number(payload: ExtractionRequest) -> dict:
    return extract_seal_number(payload.file_url)
