import os
import shutil
from datetime import datetime, timezone


def clear_folder(folder_path: str) -> None:
    """Deletes all contents of the folder but keeps the folder itself."""
    for filename in os.listdir(folder_path):
        file_path = os.path.join(folder_path, filename)
        try:
            if os.path.isfile(file_path) or os.path.islink(file_path):
                os.unlink(file_path)
            elif os.path.isdir(file_path):
                shutil.rmtree(file_path)
        except Exception as e:  # noqa: BLE001
            print(f"Failed to delete {file_path}. Reason: {e}")


def format_size(bytes_val: int) -> str:
    """Convert byte count into human-readable size."""
    for unit in ["B", "KB", "MB", "GB"]:
        if bytes_val < 1024:
            return f"{bytes_val:.1f} {unit}"
        bytes_val /= 1024
    return f"{bytes_val:.1f} TB"


def get_utc_now_iso() -> str:
    """Get the current UTC time in ISO 8601 format."""
    return datetime.now(timezone.utc).isoformat()