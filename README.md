# Smart Meter App Boilerplate

A starter repository for a **chat-first React PWA** and **FastAPI backend** for smart meter installation work orders.

## What is included
- React + TypeScript + Vite frontend
- Chat-style guided work order flow
- FastAPI backend with mocked APIs
- Config-driven workflow JSON
- Media upload endpoint
- Extraction stubs for OCR / VLM integration
- Preview and submit flow
- **No draft support**

## Project structure
- `frontend/` - mobile-friendly PWA-style app shell
- `backend/` - FastAPI application

## Frontend setup
```bash
cd frontend
npm install
npm run dev
```
Frontend runs on `http://localhost:5173`

## Backend setup
```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
Backend runs on `http://localhost:8000`

## Demo login
- Employee ID: `ENG12345`
- PIN: `1234`

## Current behavior
- Select assigned work order
- Answer each step in a guided way
- Upload images/videos to local folder storage
- Review captured values at preview
- Choose **Edit** or **Submit**

## Production hardening still needed
- Real authentication and JWT verification
- Database-backed session and work order state
- Real media storage (S3/Azure/GCS)
- GPS capture from device
- Hindi localization with i18next
- Web Speech API integration for actual speech-to-text
- OCR and VLM integrations
- Section-level edit loops from preview
- Better validation and audit logging

## Important product assumption
This starter is aligned to your updated product decision:
- no draft
- no offline draft recovery
- preview then edit or submit
