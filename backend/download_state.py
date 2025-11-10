import json
import time
from pathlib import Path
from typing import Dict, Optional
from datetime import datetime, timedelta

class DownloadStateManager:
    
    def __init__(self, state_file: Optional[Path] = None):
        if state_file is None:
            state_file = Path(__file__).parent / "download_state.json"
        
        self.state_file = state_file
        self.state = self._load_state()
        self._cleanup_old_entries()
    
    def _load_state(self) -> Dict:
        if self.state_file.exists():
            try:
                with open(self.state_file, 'r') as f:
                    return json.load(f)
            except Exception:
                pass
        return {
            "active": {},
            "completed": {},
            "failed": {}
        }
    
    def _save_state(self):
        try:
            self.state_file.parent.mkdir(parents=True, exist_ok=True)
            with open(self.state_file, 'w') as f:
                json.dump(self.state, f, indent=2)
        except Exception as e:
            print(f"Failed to save download state: {e}")
    
    def _cleanup_old_entries(self):
        current_time = time.time()
        max_age = 3600
        
        for category in ["completed", "failed"]:
            expired_keys = [
                track_id for track_id, data in self.state[category].items()
                if current_time - data.get("timestamp", 0) > max_age
            ]
            for track_id in expired_keys:
                del self.state[category][track_id]
        
        if expired_keys:
            self._save_state()
    
    def get_download_state(self, track_id: int) -> Optional[Dict]:
        track_id_str = str(track_id)
        
        if track_id_str in self.state["active"]:
            return {
                "status": "downloading",
                **self.state["active"][track_id_str]
            }
        
        if track_id_str in self.state["completed"]:
            return {
                "status": "completed",
                **self.state["completed"][track_id_str]
            }
        
        if track_id_str in self.state["failed"]:
            return {
                "status": "failed",
                **self.state["failed"][track_id_str]
            }
        
        return None
    
    def set_downloading(self, track_id: int, progress: int = 0, metadata: Optional[Dict] = None):
        track_id_str = str(track_id)
        
        self.state["active"][track_id_str] = {
            "progress": progress,
            "timestamp": time.time(),
            "metadata": metadata or {}
        }
        self._save_state()
    
    def update_progress(self, track_id: int, progress: int):
        track_id_str = str(track_id)
        
        if track_id_str in self.state["active"]:
            self.state["active"][track_id_str]["progress"] = progress
            self.state["active"][track_id_str]["timestamp"] = time.time()
            self._save_state()
    
    def set_completed(self, track_id: int, filename: str, metadata: Optional[Dict] = None):
        track_id_str = str(track_id)
        
        if track_id_str in self.state["active"]:
            del self.state["active"][track_id_str]
        
        self.state["completed"][track_id_str] = {
            "filename": filename,
            "timestamp": time.time(),
            "metadata": metadata or {}
        }
        self._save_state()
    
    def set_failed(self, track_id: int, error: str, metadata: Optional[Dict] = None):
        track_id_str = str(track_id)
        
        if track_id_str in self.state["active"]:
            del self.state["active"][track_id_str]
        
        self.state["failed"][track_id_str] = {
            "error": error,
            "timestamp": time.time(),
            "metadata": metadata or {}
        }
        self._save_state()
    
    def clear_download(self, track_id: int):
        track_id_str = str(track_id)
        
        for category in ["active", "completed", "failed"]:
            if track_id_str in self.state[category]:
                del self.state[category][track_id_str]
        
        self._save_state()
    
    def get_all_active(self) -> Dict:
        return self.state["active"].copy()
    
    def get_all_completed(self) -> Dict:
        return self.state["completed"].copy()
    
    def get_all_failed(self) -> Dict:
        return self.state["failed"].copy()

download_state_manager = DownloadStateManager()