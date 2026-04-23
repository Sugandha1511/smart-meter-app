from typing import Any
from pydantic import BaseModel

class StepAnswerRequest(BaseModel):
    value: Any
    input_mode: str = 'text'


class EditStepRequest(BaseModel):
    step_id: str
