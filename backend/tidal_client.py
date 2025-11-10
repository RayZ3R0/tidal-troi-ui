import json
import time
from pathlib import Path
from typing import List, Dict, Optional
import requests

class TidalAPIClient:
    
    def __init__(self, endpoints_file: Optional[Path] = None):
        if endpoints_file is None:
            endpoints_file = Path(__file__).parent / "api_endpoints.json"
        
        self.endpoints_file = endpoints_file
        self.endpoints = self._load_endpoints()
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        })
        self.success_history = {}
        self.download_status_cache = {}
    
    def _load_endpoints(self) -> List[Dict]:
        default_endpoints = [
            {"name": "kraken", "url": "https://kraken.squid.wtf", "priority": 1},
            {"name": "triton", "url": "https://triton.squid.wtf", "priority": 1},
            {"name": "zeus", "url": "https://zeus.squid.wtf", "priority": 1},
            {"name": "aether", "url": "https://aether.squid.wtf", "priority": 1},
            {"name": "phoenix", "url": "https://phoenix.squid.wtf", "priority": 1},
            {"name": "shiva", "url": "https://shiva.squid.wtf", "priority": 1},
            {"name": "chaos", "url": "https://chaos.squid.wtf", "priority": 1},
            {"name": "hund", "url": "https://hund.qqdl.site", "priority": 2},
            {"name": "katze", "url": "https://katze.qqdl.site", "priority": 2},
            {"name": "maus", "url": "https://maus.qqdl.site", "priority": 2},
            {"name": "vogel", "url": "https://vogel.qqdl.site", "priority": 2},
            {"name": "wolf", "url": "https://wolf.qqdl.site", "priority": 2},
        ]
        
        if self.endpoints_file.exists():
            try:
                with open(self.endpoints_file, 'r') as f:
                    data = json.load(f)
                    return data.get('endpoints', default_endpoints)
            except Exception:
                pass
        
        return default_endpoints
    
    def _sort_endpoints_by_priority(self, operation: Optional[str] = None) -> List[Dict]:
        endpoints = self.endpoints.copy()
        
        if operation and operation in self.success_history:
            last_success = self.success_history[operation]
            for ep in endpoints:
                if ep['name'] == last_success['name']:
                    ep = ep.copy()
                    ep['priority'] = 0
        
        return sorted(endpoints, key=lambda x: (x.get('priority', 999), x['name']))
    
    def _record_success(self, endpoint: Dict, operation: str):
        self.success_history[operation] = {
            'name': endpoint['name'],
            'url': endpoint['url'],
            'timestamp': time.time()
        }
    
    def _make_request(self, path: str, params: Optional[Dict] = None, operation: Optional[str] = None) -> Optional[Dict]:
        sorted_endpoints = self._sort_endpoints_by_priority(operation)
        
        for endpoint in sorted_endpoints:
            url = f"{endpoint['url']}{path}"
            
            try:
                response = self.session.get(url, params=params, timeout=10)
                
                if response.status_code == 429:
                    time.sleep(2)
                    continue
                
                if response.status_code in [500, 404]:
                    continue
                
                if response.status_code == 200:
                    self._record_success(endpoint, operation or path)
                    return response.json()
                
            except requests.exceptions.RequestException:
                continue
        
        return None
    
    def search_tracks(self, query: str) -> Optional[Dict]:
        return self._make_request("/search/", {"s": query}, operation="search_tracks")
    
    def search_albums(self, query: str) -> Optional[Dict]:
        return self._make_request("/search/", {"al": query}, operation="search_albums")
    
    def search_artists(self, query: str) -> Optional[Dict]:
        return self._make_request("/search/", {"a": query}, operation="search_artists")
    
    def get_track(self, track_id: int, quality: str = "LOSSLESS") -> Optional[Dict]:
        return self._make_request("/track/", {"id": track_id, "quality": quality}, operation="get_track")
    
    def get_album(self, album_id: int) -> Optional[Dict]:
        return self._make_request("/album/", {"id": album_id}, operation="get_album")
    
    def get_album_tracks(self, album_id: int) -> Optional[Dict]:
        return self._make_request("/album/tracks", {"id": album_id}, operation="get_album_tracks")
    
    def get_artist(self, artist_id: int) -> Optional[Dict]:
        return self._make_request("/artist/", {"f": artist_id}, operation="get_artist")
    
    def get_download_status(self, track_id: int) -> Optional[Dict]:
        if track_id in self.download_status_cache:
            cached = self.download_status_cache[track_id]
            if time.time() - cached['timestamp'] < 300:
                return cached['status']
        return None
    
    def set_download_status(self, track_id: int, status: Dict):
        self.download_status_cache[track_id] = {
            'status': status,
            'timestamp': time.time()
        }
    
    def clear_download_status(self, track_id: int):
        if track_id in self.download_status_cache:
            del self.download_status_cache[track_id]
    
    def cleanup_old_status_cache(self):
        current_time = time.time()
        expired_keys = [
            track_id for track_id, data in self.download_status_cache.items()
            if current_time - data['timestamp'] > 300
        ]
        for track_id in expired_keys:
            del self.download_status_cache[track_id]