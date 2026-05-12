from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.api.routes import auth, work_orders, uploads, extraction, submission
from app.core.config import UPLOAD_DIR

UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI(title="Yukti Smart Meter API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(work_orders.router, prefix="/api/v1/work-orders", tags=["work-orders"])
app.include_router(uploads.router, prefix="/api/v1/uploads", tags=["uploads"])
app.include_router(extraction.router, prefix="/api/v1/extraction", tags=["extraction"])
app.include_router(submission.router, prefix="/api/v1/work-orders", tags=["submission"])

app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

@app.get('/health')
def health_check() -> dict:
    return {"status": "ok"}
