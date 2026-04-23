from fastapi import APIRouter, HTTPException

from app.services.masterdata_service import (
    get_full_consumer_row,
    load_headers,
    load_unique_dcs,
)

router = APIRouter()


@router.get("/dcs")
def list_dcs() -> dict:
    return {"dcs": load_unique_dcs()}


@router.get("/headers")
def list_headers() -> dict:
    return {"headers": load_headers()}


@router.get("/consumer/{ivrs}")
def get_consumer(ivrs: str) -> dict:
    row = get_full_consumer_row(ivrs)
    if row is None:
        raise HTTPException(status_code=404, detail=f"No consumer found for IVRS {ivrs}")
    return {"ivrs": ivrs, "row": row}
