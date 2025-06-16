from __future__ import annotations

import json
import time
import shutil
import logging
import asyncio

from pathlib import Path
from fastapi.responses import FileResponse
from contextlib import asynccontextmanager
from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI, HTTPException, Query, Request, WebSocket

from .job_store import JobStatus, JobStore, JobData
from .utils import clear_folder, format_size

from pathlib import Path


# File directory where uploads will be saved
UPLOAD_DIR_NAME = str(Path(__file__).resolve().parent / "uploads")
DESTINATION_DIR_NAME = str(Path(__file__).resolve().parent / "results")

# Global job store and active WebSocket connections
JOBS = JobStore(db_path="taskbridge_db.json")
WEB_SOCKET_CONNECTIONS = set()

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_: FastAPI):
    """Ensure upload directory exists and reload job history from DB."""
    Path(UPLOAD_DIR_NAME).mkdir(parents=True, exist_ok=True)
    Path(DESTINATION_DIR_NAME).mkdir(parents=True, exist_ok=True)
    yield


app = FastAPI(lifespan=lifespan)

# Allow frontend to communicate with backend (CORS setup)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/start_job_upload/")
async def start_job_upload(request: Request, filename: str = Query(...), job_id: str = Query(None)):
    user_id = request.headers.get("X-User-ID")

    job = JOBS.add_job(filename=filename, description="Uploading started...", user_id=user_id if user_id else "")
    file_path = Path(UPLOAD_DIR_NAME) / job.filename

    total_size = request.headers.get("content-length")
    try:
        total_size = int(total_size)
    except (TypeError, ValueError):
        total_size = None

    total = 0
    last_update = time.monotonic()
    JOBS.update(job, status=JobStatus.DataTransfer)

    with open(file_path, "wb") as out_file:
        async for chunk in request.stream():
            await asyncio.to_thread(out_file.write, chunk)
            total += len(chunk)
            now = time.monotonic()

            # Update after one second only to avoid overloading the event loop
            if now - last_update > 1.0:
                if total_size:
                    progress_text = f"Uploading ({format_size(total)} / {format_size(total_size)})"
                    progress_percent = min(10, int((total / total_size) * 10))
                    upload_progress = int((total / total_size) * 100)
                else:
                    progress_text = f"Uploading ({format_size(total)})"
                    progress_percent = min(10, int(total / 1_000_000))
                    upload_progress = None

                JOBS.update(job, progress = progress_percent, upload_progress = upload_progress, description = progress_text)
                last_update = now

    JOBS.update(job, progress=100, upload_progress = 100, description = "Upload complete. Starting processing...")

    asyncio.create_task(process_file(job, file_path))
    return {"job_id": job.job_id, "status": "upload_complete"}


async def process_file(job: JobData, job_file: str):
    """Simulate a processing pipeline."""
    JOBS.update(job, status = JobStatus.Running, progress = 50, description =  "Processing file...")

    # Simulate processing time
    for i in range(5):
        await asyncio.sleep(2)

        if i == 0:
            shutil.copy(job_file, Path(DESTINATION_DIR_NAME) / job.filename)
            JOBS.update(job, processed_filename = job.filename)
        JOBS.update(job, progress = 50 + (i + 1) * 10, description = f"Processing step {i + 1} of 5")

    JOBS.update(job, status = JobStatus.Completed, progress = 100, description = "Processing complete")

@app.get("/get_jobs/")
async def get_jobs():
    """Returns all jobs as JSON list."""
    return JOBS.to_list()


@app.get("/download/{job_id}")
async def download(job_id: str):
    """Download the result file of a completed job."""
    job = JOBS.get(job_id)

    if not job:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")

    if not job.is_complete:
        raise HTTPException(status_code=403, detail="Job not completed")

    file_path = Path(DESTINATION_DIR_NAME) / job.processed_filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail=f"File {file_path} not found")

    return FileResponse(file_path, media_type="application/octet-stream", filename=job.processed_filename)


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """Keep WebSocket connection alive and push updates periodically."""
    await websocket.accept()
    WEB_SOCKET_CONNECTIONS.add(websocket)
    logger.debug(f"WebSocket connected: {websocket.client}")
    try:
        while True:
            await asyncio.sleep(1)
            await send_websocket_update()
    except Exception as e:
        logger.warning(f"WebSocket error: {e}")
    finally:
        WEB_SOCKET_CONNECTIONS.discard(websocket)
        logger.debug(f"WebSocket disconnected: {websocket.client}")


async def send_websocket_update():
    """Send current job states to all connected WebSocket clients."""
    if not JOBS.has_changed:
        logger.debug("No changes in jobs, skipping WebSocket update.")
        return
    
    logger.debug("Sending WebSocket update to all clients")
    data = json.dumps(JOBS.to_list())
    for ws in list(WEB_SOCKET_CONNECTIONS):
        try:
            await ws.send_text(data)
        except Exception:
            WEB_SOCKET_CONNECTIONS.discard(ws)
    JOBS.has_changed = False


@app.delete("/clear_jobs/")
async def clear_jobs():
    """Clear all jobs from memory and persistent storage."""
    JOBS.reset()
    clear_folder(folder_path=DESTINATION_DIR_NAME)
    clear_folder(folder_path=UPLOAD_DIR_NAME)
    return {"status": "cleared"}


