import json
from pathlib import Path
from typing import Any

WORKFLOW_PATH = Path(__file__).resolve().parent.parent / 'workflows' / 'meter_installation.json'


def load_workflow() -> list[dict[str, Any]]:
    with open(WORKFLOW_PATH, 'r', encoding='utf-8') as file:
        return json.load(file)


def get_step_by_id(step_id: str) -> dict[str, Any] | None:
    workflow = load_workflow()
    return next((step for step in workflow if step['id'] == step_id), None)


def get_first_step() -> dict[str, Any]:
    return load_workflow()[0]


def get_next_step(current_step_id: str, value: Any = None) -> dict[str, Any] | None:
    workflow = load_workflow()
    current = next((step for step in workflow if step['id'] == current_step_id), None)
    if not current:
        return None

    next_node = current.get('next')
    if isinstance(next_node, dict):
        next_step_id = next_node.get(str(value).lower())
    else:
        next_step_id = next_node

    if not next_step_id:
        return None

    return next((step for step in workflow if step['id'] == next_step_id), None)
