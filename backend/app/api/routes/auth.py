from datetime import datetime, timedelta, UTC
from fastapi import APIRouter, HTTPException
from jose import jwt
from app.schemas.auth import LoginRequest
from app.core.config import JWT_SECRET, JWT_ALGORITHM, JWT_EXPIRE_MINUTES

router = APIRouter()

DEMO_USERS: dict[str, dict] = {
    'ENG12345': {'pin': '1234', 'name': 'Rajesh Kumar'},
    'ENG12346': {'pin': '5678', 'name': 'Priya Singh'},
    'ENG12347': {'pin': '9999', 'name': 'Amit Verma'},
}


@router.post('/login')
def login(payload: LoginRequest) -> dict:
    user = DEMO_USERS.get(payload.employee_id)
    if not user or user['pin'] != payload.pin:
        raise HTTPException(status_code=401, detail='Invalid employee ID or PIN')

    expire = datetime.now(UTC) + timedelta(minutes=JWT_EXPIRE_MINUTES)
    token_data = {
        'sub': payload.employee_id,
        'name': user['name'],
        'exp': expire
    }
    token = jwt.encode(token_data, JWT_SECRET, algorithm=JWT_ALGORITHM)

    return {
        'access_token': token,
        'user': {
            'id': payload.employee_id,
            'name': user['name'],
            'language': 'en'
        }
    }
