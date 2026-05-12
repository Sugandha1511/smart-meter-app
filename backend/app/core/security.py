from fastapi import Depends, Header, HTTPException
from jose import jwt, JWTError
from app.core.config import JWT_SECRET, JWT_ALGORITHM


def get_current_user(authorization: str = Header(default='')) -> dict:
    token = authorization.replace('Bearer ', '').strip()
    if not token:
        raise HTTPException(status_code=401, detail='Not authenticated')
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(status_code=401, detail='Invalid or expired token')
