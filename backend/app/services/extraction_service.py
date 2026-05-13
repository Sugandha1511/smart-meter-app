def extract_old_meter_data(file_url: str) -> dict:
    """Simulate OCR/VLM extraction from old meter video."""
    # In production this calls an AI vision model; here we return demo values.
    suffix = abs(hash(file_url)) % 100000
    return {
        'old_meter_serial_number': f'OM{suffix:06d}',
        'old_meter_current_rating': '10-60A',
        'old_meter_type': 'Electronic',
        'old_meter_kwh_reading': 4532,
        'old_meter_kw_reading': 1.2,
        'old_meter_avg_pf_reading': 0.93,
        'old_meter_manufacturing_year': 2018,
        'source': 'video_extraction',
        'confidence': 0.89,
    }


def extract_new_meter_data(file_url: str) -> dict:
    """Simulate OCR/VLM extraction from new meter video."""
    suffix = abs(hash(file_url)) % 100000
    return {
        'new_meter_make': 'Genus Power',
        'new_meter_serial_number': f'NM{suffix:06d}',
        'new_meter_phase': 'Single Phase',
        'new_meter_kwh_reading': 0,
        'new_meter_kw_reading': 0,
        'communication_module': 'RF-DLMS',
        'source': 'video_extraction',
        'confidence': 0.91,
    }


def extract_meter_reading(file_url: str) -> dict:
    return {
        'value': '004532',
        'confidence': 0.91,
        'source': 'ocr_then_vlm',
        'requires_confirmation': True,
        'file_url': file_url,
    }


def extract_seal_number(file_url: str) -> dict:
    return {
        'values': ['SL10293'],
        'confidence': 0.88,
        'source': 'ocr',
        'requires_confirmation': True,
        'file_url': file_url,
    }
