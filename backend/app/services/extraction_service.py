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
