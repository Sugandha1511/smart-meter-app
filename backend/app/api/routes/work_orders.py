from fastapi import APIRouter, Depends, HTTPException
from app.schemas.work_order import StepAnswerRequest
from app.services.workflow_service import get_first_step, get_next_step, get_step_by_id, load_workflow
from app.services.validation_service import validate_value
from app.core.security import get_current_user

router = APIRouter()

# Demo in-memory session store. Replace with database-backed state.
SESSION_STORE: dict[str, dict] = {}

DEMO_WORK_ORDERS = [
    {
        'id': 'wo_1',
        'workOrderNumber': 'WO1001',
        'customerName': 'Amit Sharma',
        'address': 'Sector 12, Noida',
        'status': 'pending',
        'scheduledDate': '2026-05-12',
        'meterType': 'Single Phase'
    },
    {
        'id': 'wo_2',
        'workOrderNumber': 'WO1002',
        'customerName': 'Neha Verma',
        'address': 'Greater Noida',
        'status': 'pending',
        'scheduledDate': '2026-05-12',
        'meterType': 'Three Phase'
    },
    {
        'id': 'wo_3',
        'workOrderNumber': 'WO1003',
        'customerName': 'Suresh Patel',
        'address': 'Sector 45, Gurgaon',
        'status': 'in_progress',
        'scheduledDate': '2026-05-13',
        'meterType': 'Single Phase'
    }
]


@router.get('/assigned')
def get_assigned_work_orders(
    type: str,
    _user: dict = Depends(get_current_user)
) -> list[dict]:
    return [
        {**wo, 'status': SESSION_STORE.get(wo['id'], {}).get('status', wo['status'])}
        for wo in DEMO_WORK_ORDERS
    ]


@router.get('/{work_order_id}/workflow')
def get_workflow(
    work_order_id: str,
    _user: dict = Depends(get_current_user)
) -> dict:
    session = SESSION_STORE.get(work_order_id, {})
    current_step_id = session.get('current_step_id')
    current_step = get_step_by_id(current_step_id) if current_step_id else get_first_step()

    wo = next((w for w in DEMO_WORK_ORDERS if w['id'] == work_order_id), None)
    meta = {
        'consumerName': wo['customerName'] if wo else 'Unknown',
        'consumerIvrs': '1234567890',
        'address': wo['address'] if wo else '',
        'vendor': 'Demo Vendor Pvt Ltd',
        'meterType': wo['meterType'] if wo else ''
    }

    return {
        'workOrderId': work_order_id,
        'currentStep': current_step,
        'steps': load_workflow(),
        'workOrderMeta': meta,
        'answers': session.get('answers', {})
    }


@router.post('/{work_order_id}/steps/{step_id}/answer')
def answer_step(
    work_order_id: str,
    step_id: str,
    payload: StepAnswerRequest,
    _user: dict = Depends(get_current_user)
) -> dict:
    step = get_step_by_id(step_id)
    if not step:
        raise HTTPException(status_code=404, detail='Step not found')

    value = validate_value(step, payload.value)
    session = SESSION_STORE.setdefault(work_order_id, {'answers': {}})
    session['answers'][step['fieldKey']] = value

    next_step = get_next_step(step_id, value)
    session['current_step_id'] = next_step['id'] if next_step else 'preview_submit'

    return {
        'accepted': True,
        'normalized_value': value,
        'next_step_id': session['current_step_id'],
        'bot_message': next_step['labelEn'] if next_step else 'Please review and submit.'
    }


@router.delete('/{work_order_id}/session')
def reset_session(
    work_order_id: str,
    _user: dict = Depends(get_current_user)
) -> dict:
    SESSION_STORE.pop(work_order_id, None)
    return {'reset': True}
