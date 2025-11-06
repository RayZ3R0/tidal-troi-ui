"""
Configuration for download paths
"""
import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env file
load_dotenv()

def get_music_dir() -> Path:
    """Get music directory from environment or default"""
    music_dir_str = os.getenv('MUSIC_DIR')
    
    if music_dir_str:
        music_dir = Path(music_dir_str)
    else:
        # Default: downloads folder in backend directory
        music_dir = Path(__file__).parent / "downloads"
    
    # Create directory if it doesn't exist
    music_dir.mkdir(parents=True, exist_ok=True)
    
    return music_dir

# Export
MUSIC_DIR = get_music_dir()