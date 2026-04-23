from datetime import datetime, UTC
from fastapi import APIRouter, HTTPException
from app.api.routes.work_orders import SESSION_STORE

router = APIRouter()

REQUIRED_FIELDS = [
    'dc',
    'consumer_ivrs',
    'gps_location',
    'old_meter_condition',
    'old_meter_video',
    'new_meter_video',
    'meter_body_seal_photo',
    'nic_seal_photo',
    'terminal_seal_photo',
    'box_seal_photo',
    'service_cable_type'
]

@router.post('/{work_order_id}/submit')
def submit_work_order(work_order_id: str) -> dict:
    session = SESSION_STORE.get(work_order_id)
    if not session:
        raise HTTPException(status_code=400, detail='No work order session found')

    answers = session.get('answers', {})
    missing = [field for field in REQUIRED_FIELDS if field not in answers]
    if missing:
        raise HTTPException(
            status_code=422,
            detail={
                'message': 'Submission blocked. Required fields are missing.',
                'missing_fields': missing,
            }
        )

    return {
        'status': 'submitted',
        'submission_id': f'sub_{work_order_id}',
        'submitted_at': datetime.now(UTC).isoformat()
    }
