from datetime import datetime, UTC
from fastapi import APIRouter, Depends, HTTPException
from app.api.routes.work_orders import SESSION_STORE
from app.core.security import get_current_user

router = APIRouter()

REQUIRED_FIELDS = [
    'dc',
    'consumer_ivrs',
    'gps_location',
    'old_meter_condition',
    'old_meter_video',
    'new_meter_video',
    'meter_body_seal_1_photo',
    'meter_body_seal_2_photo',
    'nic_seal_photo',
    'terminal_seal_1_photo',
    'terminal_seal_2_photo',
    'box_seal_photo',
    'service_cable_type',
]

SUBMISSION_LOG: dict[str, dict] = {}


@router.post('/{work_order_id}/submit')
def submit_work_order(
    work_order_id: str,
    _user: dict = Depends(get_current_user)
) -> dict:
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

    submitted_at = datetime.now(UTC).isoformat()
    submission_id = f'sub_{work_order_id}_{int(datetime.now(UTC).timestamp())}'

    SUBMISSION_LOG[work_order_id] = {
        'submission_id': submission_id,
        'work_order_id': work_order_id,
        'submitted_by': _user.get('sub', 'unknown'),
        'submitted_at': submitted_at,
        'answers': answers,
    }

    # Mark session as submitted
    session['status'] = 'submitted'

    return {
        'status': 'submitted',
        'submission_id': submission_id,
        'submitted_at': submitted_at
    }


@router.get('/submitted')
def get_submission_history(_user: dict = Depends(get_current_user)) -> list[dict]:
    return [
        {
            'submission_id': r['submission_id'],
            'work_order_id': r['work_order_id'],
            'submitted_by': r['submitted_by'],
            'submitted_at': r['submitted_at'],
        }
        for r in SUBMISSION_LOG.values()
    ]
