"""FastAPI Main Application for VidyutSetu AMI Interoperability Testing Workbench."""

import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from backend.db.database import init_db
from backend.api.routes import router as api_router

app = FastAPI(
    title="VidyutSetu — AMI Data Exchange Interoperability Testing Workbench",
    description=(
        "Contract-and-conformance testing workbench for smart meter HES↔MDMS "
        "data exchange. Validates, normalizes and asserts interoperability at the "
        "data-exchange layer.\n\n"
        "**Supported standards scope:**\n"
        "- IEC 61968-9 (MeterReadings, EndDeviceEvents, Controls)\n"
        "- DLMS/COSEM (IEC 62056) OBIS register mapping\n"
        "- IS 15959 / IS 16444 Indian companion specifications\n\n"
        "**Not in scope:** DLMS/COSEM transport protocol conformance, "
        "IEC 61850 substation automation, certification authority claims."
    ),
    version="1.1.0",
)

# Enable CORS for utility integrations
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize SQLite database schema
init_db()

# Mount API routes
app.include_router(api_router)

# Mount Static UI
STATIC_DIR = os.path.join(os.path.dirname(__file__), "static")
if os.path.exists(STATIC_DIR):
    app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

@app.get("/")
def serve_dashboard():
    index_path = os.path.join(STATIC_DIR, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {
        "message": "VidyutSetu API is running. Build static UI in backend/static/index.html to view dashboard."
    }
