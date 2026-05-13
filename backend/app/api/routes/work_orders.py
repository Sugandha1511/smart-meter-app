from fastapi import APIRouter, Depends, HTTPException
from app.schemas.work_order import StepAnswerRequest
from app.services.workflow_service import get_first_step, get_next_step, get_step_by_id, load_workflow
from app.services.validation_service import validate_value
from app.services.extraction_service import extract_old_meter_data, extract_new_meter_data
from app.core.security import get_current_user

router = APIRouter()

# ---------------------------------------------------------------------------
# In-memory session store
# ---------------------------------------------------------------------------
SESSION_STORE: dict[str, dict] = {}

# ---------------------------------------------------------------------------
# DC master data – auto-populated when engineer selects DC
# ---------------------------------------------------------------------------
DC_MASTER: dict[str, dict] = {
    'katara_hills': {
        'dc_code': '2304265',
        'circle': 'City Circle Bhopal',
        'division': 'Bhopal West',
    },
    'shahpura_zone': {
        'dc_code': '2304202',
        'circle': 'City Circle Bhopal',
        'division': 'Bhopal West',
    },
    'shakti_nagar': {
        'dc_code': '2304201',
        'circle': 'City Circle Bhopal',
        'division': 'Bhopal West',
    },
    'vallabh_nagar_zone': {
        'dc_code': '2304204',
        'circle': 'City Circle Bhopal',
        'division': 'Bhopal West',
    },
    'vidhya_nagar_zone': {
        'dc_code': '2304203',
        'circle': 'City Circle Bhopal',
        'division': 'Bhopal West',
    },
}

# ---------------------------------------------------------------------------
# Consumer master data – auto-populated when engineer enters IVRS
# ---------------------------------------------------------------------------
CONSUMER_MASTER: dict[str, dict] = {
    '1234567890': {
        'consumer_uid': 'UID-10001',
        'consumer_name': 'Amit Sharma',
        'consumer_mobile': '9876543210',
        'sanctioned_load': '5 kW',
        'consumer_type': 'Domestic',
        'tariff_category': 'LT-Domestic',
        'consumer_address': 'H-45, Sector 12, Noida - 201301',
        'old_meter_class': '0.5',
        'previous_month_reading_kwh': 4200,
        'ci_exception_status': 'No Exception',
        'consumer_mi_possible': 'Yes',
        'is_old_meter_available': 'Yes',
        'old_meter_height': '3m-6m',
        'service_line_visible': 'Yes',
        'new_meter_location': 'Outside',
    },
    '9876543210': {
        'consumer_uid': 'UID-10002',
        'consumer_name': 'Neha Verma',
        'consumer_mobile': '8765432109',
        'sanctioned_load': '10 kW',
        'consumer_type': 'Commercial',
        'tariff_category': 'LT-Commercial',
        'consumer_address': 'Plot 22, Gamma Sector, Greater Noida - 201308',
        'old_meter_class': '1.0',
        'previous_month_reading_kwh': 8500,
        'ci_exception_status': 'No Exception',
        'consumer_mi_possible': 'Yes',
        'is_old_meter_available': 'Yes',
        'old_meter_height': '3m-6m',
        'service_line_visible': 'Yes',
        'new_meter_location': 'Outside',
    },
    '5555555555': {
        'consumer_uid': 'UID-10003',
        'consumer_name': 'Suresh Patel',
        'consumer_mobile': '7654321098',
        'sanctioned_load': '7.5 kW',
        'consumer_type': 'Domestic',
        'tariff_category': 'LT-Domestic',
        'consumer_address': 'C-12, Sector 45, Gurgaon - 122003',
        'old_meter_class': '1.0',
        'previous_month_reading_kwh': 6100,
        'ci_exception_status': 'No Exception',
        'consumer_mi_possible': 'Yes',
        'is_old_meter_available': 'Yes',
        'old_meter_height': '3m-6m',
        'service_line_visible': 'Yes',
        'new_meter_location': 'Outside',
    },
}

# ---------------------------------------------------------------------------
# Demo work orders
# ---------------------------------------------------------------------------
DEMO_WORK_ORDERS = [
    {
        'id': 'wo_1',
        'workOrderNumber': 'WO1001',
        'customerName': 'Sumukh Mishra',
        'address': 'Amrit Home Phase-1, Katara Hills, Bhopal',
        'status': 'pending',
        'scheduledDate': '2026-05-13',
        'meterType': 'Three Phase',
        'consumerIvrs': '1234567890',
        'dcCode': 'katara_hills',
        'type': 'meter_installation',
    },
    {
        'id': 'wo_2',
        'workOrderNumber': 'WO1002',
        'customerName': 'Dinesh Sahu',
        'address': 'Swami Vivekanand Nagar, Katara Hills, Bhopal',
        'status': 'pending',
        'scheduledDate': '2026-05-13',
        'meterType': 'Three Phase',
        'consumerIvrs': '9876543210',
        'dcCode': 'katara_hills',
        'type': 'meter_installation',
    },
    {
        'id': 'wo_3',
        'workOrderNumber': 'WO1003',
        'customerName': 'Vijay Singh',
        'address': 'Rameshwaram C Sector, Shakti Nagar, Bhopal',
        'status': 'in_progress',
        'scheduledDate': '2026-05-14',
        'meterType': 'Single Phase',
        'consumerIvrs': '5555555555',
        'dcCode': 'shakti_nagar',
        'type': 'meter_installation',
    },
]


@router.get('/assigned')
def get_assigned_work_orders(
    type: str,
    _user: dict = Depends(get_current_user)
) -> list[dict]:
    filtered = [wo for wo in DEMO_WORK_ORDERS if wo.get('type') == type]
    return [
        {**wo, 'status': SESSION_STORE.get(wo['id'], {}).get('status', wo['status'])}
        for wo in filtered
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
        'workOrderNumber': wo['workOrderNumber'] if wo else '',
        'consumerName': wo['customerName'] if wo else 'Unknown',
        'consumerIvrs': wo.get('consumerIvrs', '') if wo else '',
        'address': wo['address'] if wo else '',
        'vendor': 'Demo Vendor Pvt Ltd',
        'meterType': wo['meterType'] if wo else '',
    }

    return {
        'workOrderId': work_order_id,
        'currentStep': current_step,
        'steps': load_workflow(),
        'workOrderMeta': meta,
        'answers': session.get('answers', {}),
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

    # ----- Auto-populate master data -----
    if step_id == 'dc':
        dc_data = DC_MASTER.get(str(value), {})
        session['answers'].update(dc_data)

    elif step_id == 'consumer_ivrs':
        consumer_data = CONSUMER_MASTER.get(str(value))
        if consumer_data:
            session['answers'].update(consumer_data)

    elif step_id == 'gps_location' and isinstance(value, dict):
        session['answers']['latitude'] = value.get('lat')
        session['answers']['longitude'] = value.get('lng')

    elif step_id == 'old_meter_video':
        file_url = value.get('file_url', '') if isinstance(value, dict) else str(value)
        extracted = extract_old_meter_data(file_url)
        for k, v in extracted.items():
            if k not in ('source', 'confidence'):
                session['answers'][k] = v
        # Calculate consumption = old kWh - previous month reading
        prev = session['answers'].get('previous_month_reading_kwh')
        kwh = extracted.get('old_meter_kwh_reading')
        if prev is not None and kwh is not None:
            session['answers']['consumption_kwh'] = int(kwh) - int(prev)

    elif step_id == 'new_meter_video':
        file_url = value.get('file_url', '') if isinstance(value, dict) else str(value)
        extracted = extract_new_meter_data(file_url)
        for k, v in extracted.items():
            if k not in ('source', 'confidence'):
                session['answers'][k] = v

    next_step = get_next_step(step_id, value)
    session['current_step_id'] = next_step['id'] if next_step else 'preview_submit'

    return {
        'accepted': True,
        'normalized_value': value,
        'next_step_id': session['current_step_id'],
        'bot_message': next_step['labelEn'] if next_step else 'Please review all details and submit.',
    }


@router.delete('/{work_order_id}/session')
def reset_session(
    work_order_id: str,
    _user: dict = Depends(get_current_user)
) -> dict:
    SESSION_STORE.pop(work_order_id, None)
    return {'reset': True}
