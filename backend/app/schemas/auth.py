from pydantic import BaseModel

class LoginRequest(BaseModel):
    employee_id: str
    pin: str

class LoginResponse(BaseModel):
    access_token: str
    user: dict
