from __future__ import annotations

import uuid
from enum import Enum
from tinydb import Query, TinyDB
from typing import Dict, List, Optional
from dataclasses import asdict, dataclass, field

from .utils import get_utc_now_iso


class JobStatus(Enum):
    """An enumeration representing the status of a job."""

    Running = "Running"
    Completed = "Completed"
    Failed = "Failed"
    Queued = "Queued"
    DataTransfer = "Data Transfer"

    def __str__(self) -> str:
        return self.value


@dataclass
class JobData:
    """A dataclass representing a job."""
    # The filename of the file being processed, not the path
    filename: str
    # The current status of the job
    status: JobStatus
    # The user ID of the user who submitted the job
    user_id: str = ""
    # Unique identifier for the job
    job_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    # The time when the job was started, in ISO 8601 format
    started_at: str = field(default_factory=get_utc_now_iso)
    # The represents the general progress of the job, from 0 to 100
    # This is not the upload progress, but the overall job progress
    progress: int = 0
    # The file transfer progress of the job, from 0 to 100
    # This is the progress of the file upload, not the job processing
    upload_progress: int = 0
    # A description of the job, e.g., "Uploading started..."
    description: str = ""
    # An error message if the job failed
    error_message: str = ""
    # The filename of the file after processing, if applicable
    processed_filename: Optional[str] = None

    @property
    def is_complete(self) -> bool:
        """Check if the job is complete."""
        return self.status in {JobStatus.Completed, JobStatus.Failed}


class JobStore:
    """A persistent in-memory store for jobs, backed by TinyDB."""

    def __init__(self, db_path: str):
        self._db = TinyDB(db_path)
        self._job_table = self._db.table("jobs")
        self._jobs: Dict[str, JobData] = self._load_jobs_from_db()

        self._has_changed = False

    def _serialize_job(self, job: JobData) -> Dict:
        """Convert a JobData instance to a dictionary for storage."""
        data = asdict(job)
        data["status"] = str(job.status)
        return data

    def _deserialize_job(self, data: Dict) -> JobData:
        """Convert a dictionary back to a JobData instance."""
        data["status"] = JobStatus(data["status"])
        return JobData(**data)

    def _load_jobs_from_db(self) -> Dict[str, JobData]:
        """Load all jobs from the TinyDB database into memory."""
        jobs = {}
        for record in self._job_table.all():
            job = self._deserialize_job(record)
            jobs[job.job_id] = job
        return jobs

    def save(self, job: JobData):
        """Save or update a job in TinyDB and memory."""
        self._jobs[job.job_id] = job
        serialized_job = self._serialize_job(job)
        self._job_table.upsert(serialized_job, Query().job_id == job.job_id)

    def delete(self, job_id: str):
        """Remove a job from memory and TinyDB."""
        if job_id in self._jobs:
            del self._jobs[job_id]
            self._job_table.remove(Query().job_id == job_id)
        else:
            raise KeyError(f"Job with ID {job_id} does not exist.")
        
    def add_job(self, filename: str, user_id: str, description: str = "") -> JobData:
        """Add a new job to the store."""
        job = JobData(
            filename=filename,
            user_id=user_id,
            status=JobStatus.Queued,
            description=description
        )
        self.save(job)
        return job

    def get(self, job_id: str) -> Optional[JobData]:
        """Get a job by ID."""
        return self._jobs.get(job_id)   
    
    def to_list(self) -> List[Dict]:
        """Return all jobs as a list of dictionaries."""
        return [self._serialize_job(job) for job in self._jobs.values()]
    
    def reset(self):
        """Clear all jobs from memory and TinyDB (for testing/debugging)."""
        self._jobs.clear()
        self._job_table.truncate()

    def __contains__(self, job_id: str) -> bool:
        """Check if a job exists in the store."""
        return job_id in self._jobs
    
    def __getitem__(self, job_id: str) -> JobData:
        """Get a job by ID."""
        if job_id not in self._jobs:
            raise KeyError(f"Job with ID {job_id} does not exist.")
        return self._jobs[job_id]
    
    def __len__(self) -> int:
        """Return the number of jobs in the store."""
        return len(self._jobs)
    
    @property
    def has_changed(self) -> bool:
        """Check if any job has changed since the last update."""
        return self._has_changed
    
    @has_changed.setter
    def has_changed(self, value: bool):
        """Set the changed state of the job store."""
        self._has_changed = value

    def update(self, job: JobData, **kwargs) -> JobData:
        """Update a job's attributes."""
        if job.job_id not in self._jobs:
            raise KeyError(f"Job with ID {job.job_id} does not exist.")
        
        for key, value in kwargs.items():
            if hasattr(job, key):
                setattr(job, key, value)
            else:
                raise AttributeError(f"JobData has no attribute '{key}'")
        
        self.save(job)
        self._has_changed = True
        return job
