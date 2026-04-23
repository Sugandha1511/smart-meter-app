from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.api.routes import auth, work_orders, uploads, extraction, submission, masterdata
from app.core.config import MASTERDATA_DIR

app = FastAPI(title="Yukti Smart Meter API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(work_orders.router, prefix="/api/v1/work-orders", tags=["work-orders"])
app.include_router(uploads.router, prefix="/api/v1/uploads", tags=["uploads"])
app.include_router(extraction.router, prefix="/api/v1/extraction", tags=["extraction"])
app.include_router(submission.router, prefix="/api/v1/work-orders", tags=["submission"])
app.include_router(masterdata.router, prefix="/api/v1/masterdata", tags=["masterdata"])

if MASTERDATA_DIR.exists():
    # Serve master Excel/media so the frontend/extraction endpoints can use stable URLs.
    app.mount("/masterdata", StaticFiles(directory=str(MASTERDATA_DIR)), name="masterdata")

@app.get('/health')
def health_check() -> dict:
    return {"status": "ok"}
