"""
FastAPI backend for Troi Tidal Downloader
"""
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import sys
from pathlib import Path
import time
import aiofiles
import re
import requests

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))

from tidal_client import TidalAPIClient
from troi_integration import TroiIntegration, TroiTrack

app = FastAPI(title="Troi Tidal Downloader API")

# CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Tidal client
tidal_client = TidalAPIClient()

# Request/Response Models
class TroiGenerateRequest(BaseModel):
    username: str
    playlist_type: str = "periodic-jams"

class TrackSearchResult(BaseModel):
    id: int
    title: str
    artist: str
    album: Optional[str] = None
    duration: Optional[int] = None
    cover: Optional[str] = None
    quality: Optional[str] = None

class TroiTrackResponse(BaseModel):
    title: str
    artist: str
    mbid: Optional[str]
    tidal_id: Optional[int]
    tidal_exists: bool
    album: Optional[str]

# Add request model at top with other models
class DownloadTrackRequest(BaseModel):
    track_id: int
    artist: str
    title: str
    quality: str = "LOSSLESS"

# Helper function to extract items from API response
def extract_items(result, key: str) -> List:
    """
    Extract items from API response, handling different formats.
    The API can return:
    - List with dict containing nested data: [{'artists': {'items': [...]}}]
    - Dict with nested structure: {'artists': {'items': [...]}}
    - Direct list: [...]
    """
    if not result:
        return []
    
    # If it's a list, check if first element contains our data
    if isinstance(result, list):
        if len(result) > 0 and isinstance(result[0], dict):
            # Try to extract from first element
            first_elem = result[0]
            if key in first_elem:
                nested = first_elem[key]
                if isinstance(nested, dict) and 'items' in nested:
                    return nested['items']
                elif isinstance(nested, list):
                    return nested
        # Otherwise treat as direct list
        return result
    
    # If it's a dict
    if isinstance(result, dict):
        # Try nested structure first (e.g., artists.items)
        if key in result and isinstance(result[key], dict):
            return result[key].get('items', [])
        
        # Try direct items
        if 'items' in result:
            return result['items']
    
    return []

def extract_track_data(track_response) -> List:
    """
    Extract track data from album API response.
    The API returns: [album_metadata, {'items': [tracks]}]
    """
    if not track_response:
        return []
    
    if isinstance(track_response, list):
        # Look for the dict with 'items' key
        for item in track_response:
            if isinstance(item, dict) and 'items' in item:
                return item['items']
        return []
    
    if isinstance(track_response, dict):
        return track_response.get('items', [])
    
    return []

# Routes
@app.get("/")
async def root():
    return {"status": "ok", "message": "Troi Tidal Downloader API"}

@app.post("/api/troi/generate")
async def generate_troi_playlist(request: TroiGenerateRequest):
    """Generate Troi playlist and validate tracks on Tidal"""
    try:
        # Generate playlist
        print(f"Generating Troi playlist for {request.username}...")
        tracks = TroiIntegration.generate_playlist(
            request.username,
            request.playlist_type
        )
        print(f"Generated {len(tracks)} tracks from Troi")
        
        # Validate each track on Tidal
        validated_tracks = []
        for i, track in enumerate(tracks, 1):
            print(f"[{i}/{len(tracks)}] Validating: {track.artist} - {track.title}")
            
            # Search on Tidal
            query = f"{track.artist} {track.title}"
            result = tidal_client.search_tracks(query)
            
            if result:
                # Extract tracks from response
                tidal_tracks = extract_items(result, 'tracks')
                
                if tidal_tracks and len(tidal_tracks) > 0:
                    first_track = tidal_tracks[0]
                    track.tidal_id = first_track.get('id')
                    track.tidal_exists = True
                    
                    # Get album info
                    album_data = first_track.get('album', {})
                    track.album = album_data.get('title') if isinstance(album_data, dict) else None
                    
                    print(f"  ✓ Found on Tidal - ID: {track.tidal_id}")
                else:
                    print(f"  ✗ Not found on Tidal")
            else:
                print(f"  ✗ API returned None")
            
            validated_tracks.append(TroiTrackResponse(
                title=track.title,
                artist=track.artist,
                mbid=track.mbid,
                tidal_id=track.tidal_id,
                tidal_exists=track.tidal_exists,
                album=track.album
            ))
            
            # Rate limit protection
            time.sleep(0.1)
        
        found_count = sum(1 for t in validated_tracks if t.tidal_exists)
        print(f"\nValidation complete: {found_count}/{len(validated_tracks)} found on Tidal")
        
        return {
            "tracks": validated_tracks,
            "count": len(validated_tracks),
            "found_on_tidal": found_count
        }
        
    except Exception as e:
        print(f"Error generating playlist: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/search/tracks")
async def search_tracks(q: str):
    """Search for tracks on Tidal"""
    try:
        result = tidal_client.search_tracks(q)
        
        if not result:
            return {"items": []}
        
        # Extract tracks from response
        tracks = extract_items(result, 'tracks')
        
        return {
            "items": [
                TrackSearchResult(
                    id=track['id'],
                    title=track['title'],
                    artist=track.get('artist', {}).get('name', 'Unknown'),
                    album=track.get('album', {}).get('title'),
                    duration=track.get('duration'),
                    cover=track.get('album', {}).get('cover'),
                    quality=track.get('audioQuality')
                )
                for track in tracks
            ]
        }
    except Exception as e:
        print(f"Error searching tracks: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/search/albums")
async def search_albums(q: str):
    """Search for albums on Tidal"""
    try:
        result = tidal_client.search_albums(q)
        
        if not result:
            return {"items": []}
        
        # Extract albums from response
        albums = extract_items(result, 'albums')
        
        return {"items": albums}
    except Exception as e:
        print(f"Error searching albums: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/search/artists")
async def search_artists(q: str):
    """Search for artists on Tidal"""
    try:
        print(f"Searching for artist: {q}")
        result = tidal_client.search_artists(q)
        
        if not result:
            print("No results from API")
            return {"items": []}
        
        print(f"API response type: {type(result)}")
        
        # Extract artists from response
        artists = extract_items(result, 'artists')
        
        print(f"Found {len(artists)} artists")
        if artists:
            print(f"First artist: {artists[0].get('name', 'Unknown')} (ID: {artists[0].get('id')})")
        
        return {"items": artists}
    except Exception as e:
        print(f"Error searching artists: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/album/{album_id}/tracks")
async def get_album_tracks(album_id: int):
    """Get tracks for an album"""
    try:
        print(f"Fetching tracks for album {album_id}...")
        result = tidal_client.get_album(album_id)
        
        if not result:
            raise HTTPException(status_code=404, detail="Album not found")
        
        print(f"Album API response type: {type(result)}")
        
        # Extract raw items - API returns [album_metadata, {'items': [track_wrappers]}]
        raw_items = extract_track_data(result)
        
        print(f"Found {len(raw_items)} raw items")
        if raw_items and len(raw_items) > 0:
            print(f"First raw item keys: {list(raw_items[0].keys())}")
        
        # Extract actual tracks from wrapper objects
        # Each item can be: {'item': track_data, 'type': 'track'} or just track_data
        tracks = []
        for raw_item in raw_items:
            if not raw_item or not isinstance(raw_item, dict):
                continue
            
            # Check if track data is nested under 'item' key
            if 'item' in raw_item and isinstance(raw_item['item'], dict):
                tracks.append(raw_item['item'])
            else:
                # Direct track object
                tracks.append(raw_item)
        
        print(f"Extracted {len(tracks)} tracks from wrappers")
        if tracks:
            print(f"First track keys: {list(tracks[0].keys())[:15]}")
        
        # Build response with error handling
        track_results = []
        for track in tracks:
            try:
                # Get track ID
                track_id = track.get('id')
                
                if not track_id:
                    print(f"Warning: Track missing ID: {track.get('title', 'Unknown')}")
                    continue
                
                # Handle artist data
                artist_name = "Unknown"
                if 'artist' in track:
                    if isinstance(track['artist'], dict):
                        artist_name = track['artist'].get('name', 'Unknown')
                    elif isinstance(track['artist'], str):
                        artist_name = track['artist']
                elif 'artists' in track and track['artists']:
                    first_artist = track['artists'][0]
                    if isinstance(first_artist, dict):
                        artist_name = first_artist.get('name', 'Unknown')
                
                # Handle album data
                album_title = None
                album_cover = None
                if 'album' in track and isinstance(track['album'], dict):
                    album_title = track['album'].get('title')
                    album_cover = track['album'].get('cover')
                
                track_results.append(TrackSearchResult(
                    id=track_id,
                    title=track.get('title', 'Unknown'),
                    artist=artist_name,
                    album=album_title,
                    duration=track.get('duration'),
                    cover=album_cover or track.get('cover'),
                    quality=track.get('audioQuality')
                ))
            except Exception as e:
                print(f"Error processing track: {e}")
                print(f"Track data keys: {list(track.keys()) if isinstance(track, dict) else 'not a dict'}")
                continue
        
        print(f"Successfully processed {len(track_results)} tracks")
        return {"items": track_results}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error getting album tracks: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/download/start")
async def start_download(background_tasks: BackgroundTasks):
    """Start processing the download queue"""
    # TODO: Implement queue processing
    return {"status": "started"}

@app.get("/api/download/stream/{track_id}")
async def get_stream_url(track_id: int, quality: str = "LOSSLESS"):
    """Get stream URL for a track"""
    try:
        print(f"Getting stream URL for track {track_id} at {quality} quality...")
        
        # Get track data with stream info
        track_data = tidal_client.get_track(track_id, quality)
        
        if not track_data:
            raise HTTPException(status_code=404, detail="Track not found")
        
        # Extract stream URL
        stream_url = extract_stream_url(track_data)
        
        if not stream_url:
            raise HTTPException(status_code=404, detail="Stream URL not found")
        
        print(f"Found stream URL: {stream_url[:50]}...")
        
        return {
            "stream_url": stream_url,
            "track_id": track_id,
            "quality": quality
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error getting stream URL: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/download/track")
async def download_track_server_side(request: DownloadTrackRequest):
    """Download track to server-side music directory"""
    try:
        print(f"\n{'='*60}")
        print(f"Download Request:")
        print(f"  Track ID: {request.track_id}")
        print(f"  Artist: {request.artist}")
        print(f"  Title: {request.title}")
        print(f"  Quality: {request.quality}")
        print(f"{'='*60}\n")
        
        # Get stream URL
        print(f"[1/3] Getting stream URL...")
        track_data = tidal_client.get_track(request.track_id, request.quality)
        if not track_data:
            raise HTTPException(status_code=404, detail="Track not found")
        
        stream_url = extract_stream_url(track_data)
        if not stream_url:
            raise HTTPException(status_code=404, detail="Stream URL not found")
        
        print(f"✓ Stream URL: {stream_url[:60]}...")
        
        # Sanitize filename
        filename = f"{request.artist} - {request.title}.flac"
        filename = re.sub(r'[<>:"/\\|?*]', '_', filename)
        filepath = DOWNLOAD_DIR / filename
        
        print(f"\n[2/3] Target file: {filepath}")
        
        # Check if already exists
        if filepath.exists():
            print(f"⚠️  File already exists, skipping download")
            return {
                "status": "exists",
                "filename": filename,
                "path": str(filepath),
                "message": f"File already exists: {filename}"
            }
        
        # Download synchronously (not in background) for better error handling
        print(f"[3/3] Downloading...")
        
        response = requests.get(stream_url, stream=True, timeout=30)
        
        if response.status_code != 200:
            error_msg = f"HTTP {response.status_code}"
            print(f"✗ Download failed: {error_msg}")
            raise HTTPException(status_code=response.status_code, detail=error_msg)
        
        # Download with progress
        total_size = int(response.headers.get('content-length', 0))
        downloaded = 0
        
        with open(filepath, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                if chunk:
                    f.write(chunk)
                    downloaded += len(chunk)
                    if total_size > 0:
                        progress = (downloaded / total_size) * 100
                        print(f"  Progress: {progress:.1f}%", end='\r')
        
        file_size_mb = filepath.stat().st_size / 1024 / 1024
        print(f"\n✓ Downloaded: {filename} ({file_size_mb:.2f} MB)")
        print(f"  Location: {filepath}")
        print(f"{'='*60}\n")
        
        return {
            "status": "completed",
            "filename": filename,
            "path": str(filepath),
            "size_mb": round(file_size_mb, 2),
            "message": f"Successfully downloaded: {filename}"
        }
        
    except HTTPException:
        raise
    except requests.exceptions.Timeout:
        error_msg = "Download timed out after 30 seconds"
        print(f"✗ {error_msg}")
        raise HTTPException(status_code=504, detail=error_msg)
    except requests.exceptions.RequestException as e:
        error_msg = f"Network error: {str(e)}"
        print(f"✗ {error_msg}")
        raise HTTPException(status_code=500, detail=error_msg)
    except Exception as e:
        print(f"✗ Download error: {e}")
        import traceback
        traceback.print_exc()
        
        # Clean up partial file
        if 'filepath' in locals() and filepath.exists():
            try:
                filepath.unlink()
                print(f"  Cleaned up partial file: {filename}")
            except Exception:
                pass
        
        raise HTTPException(status_code=500, detail=str(e))

def extract_stream_url(track_data) -> Optional[str]:
    """Extract stream URL from track data"""
    # Handle array response
    if isinstance(track_data, list):
        entries = track_data
    else:
        entries = [track_data]
    
    # Try OriginalTrackUrl first
    for entry in entries:
        if isinstance(entry, dict) and 'OriginalTrackUrl' in entry:
            return entry['OriginalTrackUrl']
    
    # Try manifest
    for entry in entries:
        if isinstance(entry, dict) and 'manifest' in entry:
            manifest = entry['manifest']
            try:
                import base64
                decoded = base64.b64decode(manifest).decode('utf-8')
                
                # Try JSON parse
                try:
                    import json
                    manifest_json = json.loads(decoded)
                    if 'urls' in manifest_json and manifest_json['urls']:
                        return manifest_json['urls'][0]
                except json.JSONDecodeError:
                    pass
                
                # Try regex
                import re
                url_match = re.search(r'https?://[^\s"]+', decoded)
                if url_match:
                    return url_match.group(0)
            except Exception as e:
                print(f"Failed to decode manifest: {e}")
    
    return None

# Add at top
DOWNLOAD_DIR = Path(__file__).parent.parent / "downloads"
DOWNLOAD_DIR.mkdir(exist_ok=True)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)