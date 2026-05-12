from pathlib import Path
import os

BASE_DIR = Path(__file__).resolve().parent.parent.parent
UPLOAD_DIR = BASE_DIR / 'uploads'

JWT_SECRET = os.getenv('JWT_SECRET', 'yukti-dev-secret-change-in-production')
JWT_ALGORITHM = 'HS256'
JWT_EXPIRE_MINUTES = 480  # 8 hours
