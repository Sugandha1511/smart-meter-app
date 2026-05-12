import re
from typing import Any
from fastapi import HTTPException


def validate_value(step: dict, value: Any) -> Any:
    validation = step.get('validation') or {}

    if step.get('required') and value in [None, '', []]:
        raise HTTPException(status_code=422, detail='This field is required')

    regex = validation.get('regex')
    if regex and isinstance(value, str) and not re.match(regex, value):
        raise HTTPException(status_code=422, detail='Invalid field format')

    return value
