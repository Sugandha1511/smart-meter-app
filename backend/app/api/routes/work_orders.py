from fastapi import APIRouter, HTTPException
from app.schemas.work_order import EditStepRequest, StepAnswerRequest
from app.services.workflow_service import get_first_step, get_next_step, get_step_by_id, load_workflow
from app.services.validation_service import validate_value
from app.services.masterdata_service import (
    load_consumer_master_slice,
    load_unique_dcs,
    ivrs_belongs_to_dc,
)
router = APIRouter()

# Demo in-memory session store. Replace with database-backed state.
SESSION_STORE: dict[str, dict] = {}

@router.get('/assigned')
def get_assigned_work_orders(type: str, limit: int = 50, offset: int = 0) -> list[dict]:
    # Your frontend passes type=meter_installation, but we keep it unused for now.
    rows = load_consumer_master_slice(limit=limit, offset=offset)
    out: list[dict] = []
    for i, r in enumerate(rows, start=offset + 1):
        ivrs = str(r.get("ivrs", "")).strip()
        dc_name = str(r.get("dc_name", "")).strip()
        if not ivrs:
            continue
        out.append(
            {
                "id": ivrs,  # Treat IVRS as work_order_id
                "workOrderNumber": f"WO{i:04d}",
                "customerName": ivrs,
                "address": dc_name,
                "status": "pending",
            }
        )
    return out

@router.get('/{work_order_id}/workflow')
def get_workflow(work_order_id: str) -> dict:
    session = SESSION_STORE.get(work_order_id, {})
    current_step_id = session.get('current_step_id')
    current_step = get_step_by_id(current_step_id) if current_step_id else get_first_step()

    steps = load_workflow()

    # Replace DC dropdown options from Consumer Master (Column D).
    dc_options = load_unique_dcs(limit=200)
    for step in steps:
        if step.get("id") == "dc":
            step["options"] = [{"labelEn": dc, "labelHi": dc, "value": dc} for dc in dc_options]
            break

    # IMPORTANT: the frontend renders the input using `currentStep`, not the matching entry in `steps`.
    # So if currentStep is `dc`, keep it in sync with the updated options.
    if current_step and current_step.get("id") == "dc":
        current_step = next((s for s in steps if s.get("id") == "dc"), current_step)

    return {
        'workOrderId': work_order_id,
        'currentStep': current_step,
        'steps': steps,
        'workOrderMeta': {
            'consumerName': str(session.get('answers', {}).get("consumer_ivrs", "")) if session else "",
            'consumerIvrs': str(session.get('answers', {}).get("consumer_ivrs", "")) if session else "",
            'address': str(session.get('answers', {}).get("dc", "")) if session else "",
            'vendor': 'Masterdata Provider',
        },
        'answers': session.get('answers', {})
    }

@router.post('/{work_order_id}/edit')
def edit_step(work_order_id: str, payload: EditStepRequest) -> dict:
    step = get_step_by_id(payload.step_id)
    if not step:
        raise HTTPException(status_code=404, detail='Step not found')

    session = SESSION_STORE.setdefault(work_order_id, {'answers': {}})
    session['current_step_id'] = payload.step_id

    answers = session.get('answers', {})
    steps = load_workflow()
    dc_value_for_ui = str(answers.get("dc", "") or "").strip()
    if dc_value_for_ui:
        for s in steps:
            if s.get("id") == "dc":
                opts = s.setdefault("options", [])
                if not any(str(o.get("value")) == dc_value_for_ui for o in opts):
                    opts.append({"labelEn": dc_value_for_ui, "labelHi": dc_value_for_ui, "value": dc_value_for_ui})
                break

    if step.get("id") == "dc":
        step = next((s for s in steps if s.get("id") == "dc"), step)

    return {
        'workOrderId': work_order_id,
        'currentStep': step,
        'steps': steps,
        'workOrderMeta': {
            'consumerName': str(answers.get('consumer_ivrs', '')),
            'consumerIvrs': str(answers.get('consumer_ivrs', '')),
            'address': str(answers.get('dc', '')),
            'vendor': 'Masterdata Provider'
        },
        'answers': session.get('answers', {})
    }

@router.post('/{work_order_id}/steps/{step_id}/answer')
def answer_step(work_order_id: str, step_id: str, payload: StepAnswerRequest) -> dict:
    step = get_step_by_id(step_id)
    if not step:
        raise HTTPException(status_code=404, detail='Step not found')

    session = SESSION_STORE.setdefault(work_order_id, {'answers': {}})

    # Consumer Master validation: IVRS must exist and belong to selected DC.
    if step.get("fieldKey") == "consumer_ivrs":
        selected_dc = str(session.get("answers", {}).get("dc", "") or "").strip()
        if not selected_dc:
            raise HTTPException(status_code=422, detail="Please select DC first.")
        candidate = str(payload.value).strip()
        value = validate_value(step, candidate)
        if not ivrs_belongs_to_dc(value, selected_dc):
            raise HTTPException(
                status_code=422,
                detail=f"IVRS '{value}' is not valid for DC '{selected_dc}'.",
            )
    else:
        value = validate_value(step, payload.value)

    session['answers'][step['fieldKey']] = value

    next_step = get_next_step(step_id, value)
    session['current_step_id'] = next_step['id'] if next_step else 'preview_submit'

    return {
        'accepted': True,
        'normalized_value': value,
        'next_step_id': session['current_step_id'],
        'bot_message': next_step['labelEn'] if next_step else 'Please review and submit.'
    }
