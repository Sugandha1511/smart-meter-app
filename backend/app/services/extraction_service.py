"""
Mocked extraction responses. Replace internals with real OCR/VLM later.
All responses include per-field confidence and source trace for traceability.
"""


def extract_meter_reading(file_url: str) -> dict:
    """
    Returns a rich meter extraction payload for both old & new meter videos/photos.
    Consumers in the frontend pick the fields they need per step.
    """
    return {
        "value": "004532",  # kWh reading legacy field
        "confidence": 0.91,
        "source": "ocr_then_vlm",
        "requires_confirmation": True,
        "file_url": file_url,
        "fields": {
            "meter_serial_number": "SM-2024-07-00123",
            "current_rating": "10-60A",
            "meter_type": "Whole Current (WC)",
            "meter_class": "1.0",
            "kwh_reading": 4532.7,
            "kw_reading": 2.14,
            "avg_pf_reading": 0.97,
            "manufacturing_year": "2022",
            "make": "GenusPower",
            "phase": "Single Phase",
            "communication_module": "NIC (RF Mesh)",
        },
        "confidences": {
            "meter_serial_number": 0.94,
            "current_rating": 0.89,
            "meter_type": 0.86,
            "kwh_reading": 0.92,
            "kw_reading": 0.87,
            "avg_pf_reading": 0.83,
            "manufacturing_year": 0.9,
            "make": 0.93,
            "phase": 0.95,
            "communication_module": 0.82,
        },
    }


def extract_seal_number(file_url: str) -> dict:
    """
    Returns extracted seal numbers from a seal photo. We return a primary value and
    a list of all detected values (in case the photo shows multiple seals).
    """
    return {
        "value": "SL10293",
        "values": ["SL10293", "SL10294"],
        "confidence": 0.88,
        "source": "ocr",
        "requires_confirmation": True,
        "file_url": file_url,
    }
