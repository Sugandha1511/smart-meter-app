from pathlib import Path
from uuid import uuid4
from fastapi import APIRouter, File, UploadFile
from app.core.config import UPLOAD_DIR

router = APIRouter()
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

@router.post('')
async def upload_file(file: UploadFile = File(...)) -> dict:
    suffix = Path(file.filename).suffix
    file_id = f'{uuid4()}{suffix}'
    file_path = UPLOAD_DIR / file_id

    with open(file_path, 'wb') as output_file:
        output_file.write(await file.read())

    return {
        'file_id': file_id,
        'file_name': file.filename,
        'url': f'/uploads/{file_id}',
        'mime_type': file.content_type
    }
