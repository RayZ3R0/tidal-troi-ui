import { api } from "../api/client";
import { useDownloadStore } from "../stores/downloadStore";

// Configuration
const DOWNLOAD_MODE = "server"; // "client" or "server"
const API_BASE = "http://localhost:8001/api"; // Backend API base URL

class DownloadManager {
  constructor() {
    this.isProcessing = false;
    this.activeDownloads = new Map();
  }

  async start() {
    if (this.isProcessing) {
      console.log("Download manager already running");
      return;
    }

    this.isProcessing = true;
    console.log("🎵 Download manager started");

    while (this.isProcessing) {
      const state = useDownloadStore.getState();
      const { queue, downloading, maxConcurrent } = state;

      if (downloading.length < maxConcurrent && queue.length > 0) {
        const track = queue[0];
        await this.downloadTrack(track);
      } else if (downloading.length === 0 && queue.length === 0) {
        await this.sleep(1000);
      } else {
        await this.sleep(500);
      }
    }

    console.log("🛑 Download manager stopped");
  }

  stop() {
    this.isProcessing = false;
    this.activeDownloads.forEach((controller) => {
      controller.abort();
    });
    this.activeDownloads.clear();
  }

  async downloadTrack(track) {
    if (DOWNLOAD_MODE === "server") {
      return this.downloadTrackServerSide(track);
    } else {
      return this.downloadTrackClientSide(track);
    }
  }

  /**
   * Download track server-side (saves to backend/downloads/ or custom path)
   */
  async downloadTrackServerSide(track) {
    const { startDownload, completeDownload, failDownload, quality } =
      useDownloadStore.getState();

    startDownload(track.id);

    try {
      console.log(`⬇️ Downloading (server): ${track.artist} - ${track.title}`);
      console.log(`  Track ID: ${track.tidal_id || track.id}`);
      console.log(`  Quality: ${quality}`);

      // Ensure we have the correct track ID
      const trackId = track.tidal_id || track.id;
      if (!trackId) {
        throw new Error("Track ID is missing");
      }

      const requestBody = {
        track_id: Number(trackId),
        artist: String(track.artist || "Unknown Artist"),
        title: String(track.title || "Unknown Title"),
        quality: String(quality),
      };

      console.log("Request body:", JSON.stringify(requestBody, null, 2));

      const response = await fetch(`${API_BASE}/download/track`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      console.log(`Response status: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Error response body:", errorText);

        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { detail: errorText || response.statusText };
        }

        throw new Error(errorData.detail || `HTTP ${response.status}`);
      }

      const result = await response.json();
      console.log("Download result:", result);

      completeDownload(track.id, result.filename);
      console.log(`✓ Downloaded: ${result.filename}`);
      if (result.path) {
        console.log(`  Location: ${result.path}`);
      }
    } catch (error) {
      console.error(`✗ Download failed: ${track.title}`, error);
      failDownload(track.id, error.message);
    }

    await this.sleep(1000);
  }

  /**
   * Download track client-side (browser Downloads folder)
   */
  async downloadTrackClientSide(track) {
    const {
      startDownload,
      completeDownload,
      failDownload,
      updateProgress,
      quality,
    } = useDownloadStore.getState();

    startDownload(track.id);

    const controller = new AbortController();
    this.activeDownloads.set(track.id, controller);

    try {
      console.log(`⬇️ Downloading: ${track.artist} - ${track.title}`);

      const streamData = await api.get(`/download/stream/${track.tidal_id}`, {
        quality,
      });

      if (!streamData.stream_url) {
        throw new Error("No stream URL returned");
      }

      const response = await fetch(streamData.stream_url, {
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const totalBytes = parseInt(
        response.headers.get("content-length") || "0"
      );
      let receivedBytes = 0;

      const reader = response.body.getReader();
      const chunks = [];

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        chunks.push(value);
        receivedBytes += value.length;

        if (totalBytes > 0) {
          const progress = Math.round((receivedBytes / totalBytes) * 100);
          updateProgress(track.id, progress);
        }
      }

      const blob = new Blob(chunks, {
        type: response.headers.get("content-type") || "audio/flac",
      });

      const filename = this.sanitizeFilename(
        `${track.artist} - ${track.title}.flac`
      );

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      completeDownload(track.id, filename);
      console.log(
        `✓ Downloaded: ${filename} (${(receivedBytes / 1024 / 1024).toFixed(
          2
        )} MB)`
      );
    } catch (error) {
      if (error.name === "AbortError") {
        console.log(`⏹️ Download cancelled: ${track.title}`);
        failDownload(track.id, "Download cancelled");
      } else {
        console.error(`✗ Download failed: ${track.title}`, error);
        failDownload(track.id, error.message);
      }
    } finally {
      this.activeDownloads.delete(track.id);
    }

    await this.sleep(1000);
  }

  sanitizeFilename(filename) {
    const invalid = /[<>:"/\\|?*]/g;
    return filename.replace(invalid, "_").trim();
  }

  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export const downloadManager = new DownloadManager();
