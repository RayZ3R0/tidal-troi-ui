Collecting workspace information# Tidaloader - Troi Tidal Downloader

A full-stack web application for downloading high-quality music from Tidal with intelligent playlist generation via ListenBrainz/Troi integration. Features automatic metadata tagging, lyrics fetching, and organized file management.

## Features

### Core Functionality

- **Tidal Music Downloads**: Download tracks in FLAC (lossless/hi-res) or AAC (320kbps/96kbps) formats
- **Smart Playlist Generation**: Generate personalized playlists using ListenBrainz listening history via Troi
- **Automatic Organization**: Files organized by Artist/Album with proper track numbering
- **Rich Metadata**: Automatic ID3 tags, album artwork, and MusicBrainz IDs
- **Lyrics Integration**: Synced (.lrc) and plain text (.txt) lyrics via LrcLib API
- **Download Queue Management**: Concurrent downloads with progress tracking
- **Endpoint Failover**: Automatic rotation across multiple Tidal API endpoints

### User Interface

- **Modern Web UI**: Clean, responsive Preact-based interface
- **Real-time Progress**: Live download progress with percentage indicators
- **Search Capabilities**: Search tracks, albums, and artists
- **Batch Operations**: Download entire albums or artist discographies
- **Quality Selection**: Choose audio quality per download
- **Authentication**: Secure login with credential management

## Project Structure

```
squidloader-troi/
├── backend/
│   ├── api/
│   │   ├── __init__.py
│   │   ├── auth.py           # Authentication middleware
│   │   └── main.py           # FastAPI application
│   ├── downloads/            # Downloaded music files
│   ├── .env                  # Environment configuration
│   ├── .env.example          # Example configuration
│   ├── config.py             # Configuration loader
│   ├── lyrics_client.py      # LrcLib API client
│   ├── requirements.txt      # Python dependencies
│   ├── tidal_client.py       # Tidal API client
│   └── troi_integration.py   # Troi playlist generator
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── api/              # API client
│   │   ├── components/       # UI components
│   │   ├── stores/           # State management (Zustand)
│   │   ├── utils/            # Utilities
│   │   ├── app.jsx           # Main app component
│   │   ├── main.jsx          # Entry point
│   │   └── style.css         # Tailwind styles
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.js
├── automate-troi-download.py  # Standalone CLI tool
└── api_endpoints.json          # Tidal API endpoint list
```

## Prerequisites

### Common Requirements

- Python 3.8+
- Node.js 16+ and npm
- Git

### Platform-Specific

#### Windows

- PowerShell or Command Prompt
- Windows 10/11

#### Linux

- Bash shell
- systemd (optional, for service management)

#### Android/Termux

- Termux app from F-Droid
- Termux:Boot (optional, for auto-start)

## Installation

### Windows Setup

1. **Clone the repository**

   ```powershell
   git clone https://github.com/RayZ3R0/tidaloader.git
   cd tidaloader
   ```

2. **Backend setup**

   ```powershell
   cd backend
   python -m venv venv
   .\venv\Scripts\Activate.ps1
   pip install -r requirements.txt
   ```

3. **Configure environment**

   ```powershell
   cp .env.example .env
   ```

   Edit .env and set your configuration:

   ```env
   MUSIC_DIR=C:\Users\YourName\Music
   AUTH_USERNAME=your_username
   AUTH_PASSWORD=your_secure_password
   ```

4. **Frontend setup**

   ```powershell
   cd ..\frontend
   npm install
   npm run build
   ```

5. **Start the server**

   ```powershell
   cd ..\backend
   .\start.ps1
   ```

6. **Access the application**

   Open your browser to `http://localhost:8001`

### Linux Setup

1. **Clone the repository**

   ```bash
   git clone https://github.com/RayZ3R0/tidaloader.git
   cd tidaloader
   ```

2. **Backend setup**

   ```bash
   cd backend
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```

3. **Configure environment**

   ```bash
   cp .env.example .env
   nano .env  # or use your preferred editor
   ```

   Edit .env:

   ```env
   MUSIC_DIR=/home/yourname/Music
   AUTH_USERNAME=your_username
   AUTH_PASSWORD=your_secure_password
   ```

4. **Frontend setup**

   ```bash
   cd ../frontend
   npm install
   npm run build
   ```

5. **Start the server**

   ```bash
   cd ../backend
   source venv/bin/activate
   python -m uvicorn api.main:app --host 0.0.0.0 --port 8001
   ```

6. **Access the application**

   Open your browser to `http://localhost:8001`

### Android/Termux Setup

1. **Install Termux**

   Download from F-Droid: https://f-droid.org/en/packages/com.termux/

2. **Run setup script**

   ```bash
   curl -O https://raw.githubusercontent.com/RayZ3R0/tidaloader/main/backend/termux-setup.sh
   bash termux-setup.sh
   ```

3. **Configure environment**

   ```bash
   cd ~/tidaloader/backend
   nano .env
   ```

   The default configuration uses:

   ```env
   MUSIC_DIR=/data/data/com.termux/files/home/music/tidal-downloads
   ```

4. **Start the service**

   ```bash
   cd ~/tidaloader
   ./start-service.sh
   ```

5. **Optional: Auto-start on boot**

   ```bash
   ./install-termux-service.sh
   ```

6. **Access the application**

   On your device: `http://localhost:8001`

   From network: `http://[device-ip]:8001`

## Configuration

### Environment Variables

All configuration is done via .env:

```env
# Music directory - where files will be downloaded
MUSIC_DIR=/path/to/music

# Authentication credentials
AUTH_USERNAME=admin
AUTH_PASSWORD=your-secure-password-here
```

### Download Organization

Files are automatically organized in the following structure:

```
MUSIC_DIR/
└── Artist Name/
    └── Album Name/
        ├── 01 - Track Title.flac
        ├── 01 - Track Title.lrc  (synced lyrics if available)
        ├── 02 - Track Title.flac
        ├── 02 - Track Title.txt  (plain lyrics if available)
        └── ...
```

### Quality Settings

Available quality options (configurable per download):

- `HI_RES_LOSSLESS`: Up to 24-bit/192kHz FLAC
- `LOSSLESS`: 16-bit/44.1kHz FLAC (default)
- `HIGH`: 320kbps AAC
- `LOW`: 96kbps AAC

## Usage

### Web Interface

1. **Login**

   Use the credentials you set in .env

2. **Search for Music**

   - Switch to "Search" tab
   - Search by track, album, or artist
   - Select tracks to download
   - Add to queue

3. **Generate Troi Playlists**

   - Switch to "Troi Playlist" tab
   - Enter your ListenBrainz username
   - Choose "Daily Jams" or "Periodic Jams"
   - Review generated tracks
   - Download selected tracks

4. **Manage Downloads**

   - View queue in the download popout (bottom-right)
   - Start/pause downloads
   - Monitor progress
   - Review completed and failed downloads

### Command-Line Tool

The standalone CLI tool automate-troi-download.py can be used independently:

```bash
# Activate backend virtual environment
cd backend
source venv/bin/activate  # Linux/Mac
# or
.\venv\Scripts\Activate.ps1  # Windows

# Run the tool
cd ..
python automate-troi-download.py your-listenbrainz-username

# Options
python automate-troi-download.py --help
```

Options:

- `--download-dir PATH`: Specify download directory (default: ./downloads)
- `--no-debug`: Disable debug output
- `--no-test-mode`: Download all tracks (default: first 5 only)

## API Endpoints

The backend provides a REST API documented at `http://localhost:8001/docs` (FastAPI Swagger UI).

### Public Endpoints

- `GET /api`: API status
- `GET /api/health`: Health check

### Protected Endpoints (require authentication)

- `POST /api/troi/generate`: Generate Troi playlist
- `GET /api/search/tracks`: Search tracks
- `GET /api/search/albums`: Search albums
- `GET /api/search/artists`: Search artists
- `GET /api/album/{album_id}/tracks`: Get album tracks
- `GET /api/artist/{artist_id}`: Get artist details
- `POST /api/download/track`: Download a track
- `GET /api/download/progress/{track_id}`: Stream download progress

## Development

### Running in Development Mode

**Backend:**

```bash
cd backend
source venv/bin/activate
python -m uvicorn api.main:app --reload --host 0.0.0.0 --port 8001
```

**Frontend:**

```bash
cd frontend
npm run dev
```

The frontend dev server runs on `http://localhost:5173` and proxies API requests to the backend.

### Project Dependencies

**Backend** (`backend/requirements.txt`):

- fastapi: Web framework
- uvicorn: ASGI server
- aiohttp: Async HTTP client
- mutagen: Audio metadata handling
- lrclibapi: Lyrics fetching
- python-jose: JWT authentication
- passlib: Password hashing
- pydantic: Data validation

**Frontend** (`frontend/package.json`):

- preact: Lightweight React alternative
- zustand: State management
- tailwindcss: Utility-first CSS
- vite: Build tool

## Troubleshooting

### Backend won't start

- Ensure Python virtual environment is activated
- Check .env file exists and is properly configured
- Verify all dependencies are installed: `pip install -r requirements.txt`

### Frontend build fails

- Delete `node_modules` and `package-lock.json`
- Run `npm install` again
- Ensure Node.js version is 16+

### Downloads fail

- Check internet connection
- Verify Tidal API endpoints are accessible
- Review backend logs for specific errors
- Try different quality settings

### Authentication errors

- Verify `AUTH_USERNAME` and `AUTH_PASSWORD` in .env
- Clear browser cache and cookies
- Check backend logs for authentication failures

### Missing metadata/lyrics

- LrcLib API may not have lyrics for all tracks
- Some tracks may have incomplete Tidal metadata
- Album artwork requires internet access during download

## Advanced Configuration

### Adding Custom Tidal Endpoints

Edit `api_endpoints.json`:

```json
{
  "endpoints": [
    {
      "name": "custom-endpoint",
      "url": "https://your-endpoint.example.com",
      "priority": 1
    }
  ]
}
```

Lower priority numbers are tried first.

### Service Management (Linux)

Create systemd service at `/etc/systemd/system/tidaloader.service`:

```ini
[Unit]
Description=Tidaloader Tidal Downloader
After=network.target

[Service]
Type=simple
User=youruser
WorkingDirectory=/path/to/tidaloader/backend
Environment="PATH=/path/to/tidaloader/backend/venv/bin"
ExecStart=/path/to/tidaloader/backend/venv/bin/python -m uvicorn api.main:app --host 0.0.0.0 --port 8001

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl enable tidaloader
sudo systemctl start tidaloader
```

## Credits

- Tidal API endpoints via community projects
- Lyrics from LrcLib API
- Troi playlist generation via ListenBrainz
- MusicBrainz metadata integration

## License

This project is for educational purposes only. Ensure you comply with Tidal's Terms of Service and respect copyright laws in your jurisdiction.

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## Support

For issues, questions, or feature requests, please open an issue on GitHub.
