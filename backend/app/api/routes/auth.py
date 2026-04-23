from fastapi import APIRouter
from app.schemas.auth import LoginRequest

router = APIRouter()

@router.post('/login')
def login(payload: LoginRequest) -> dict:
    return {
        'access_token': 'demo-token',
        'user': {
            'id': 'u_1',
            'name': 'Field Engineer',
            'language': 'en'
        }
    }
