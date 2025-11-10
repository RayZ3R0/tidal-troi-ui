import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useDownloadStore = create(
  persist(
    (set, get) => ({
      queue: [],
      downloading: [],
      completed: [],
      failed: [],
      quality: "LOSSLESS",
      maxConcurrent: 3,

      addToQueue: (tracks) =>
        set((state) => {
          const existingIds = new Set([
            ...state.queue.map((t) => t.tidal_id),
            ...state.downloading.map((t) => t.tidal_id),
            ...state.completed.map((t) => t.tidal_id),
          ]);

          const newTracks = tracks
            .filter((track) => !existingIds.has(track.tidal_id))
            .map((track) => ({
              ...track,
              id: `${track.tidal_id}-${Date.now()}`,
              status: "queued",
              progress: 0,
              addedAt: Date.now(),
            }));

          if (newTracks.length === 0) {
            console.log("All tracks already in queue");
            return state;
          }

          console.log(
            `Adding ${newTracks.length} new tracks to queue (${
              tracks.length - newTracks.length
            } duplicates skipped)`
          );

          return {
            queue: [...state.queue, ...newTracks],
          };
        }),

      removeFromQueue: (trackId) =>
        set((state) => ({
          queue: state.queue.filter((t) => t.id !== trackId),
        })),

      startDownload: (trackId) =>
        set((state) => {
          const track = state.queue.find((t) => t.id === trackId);
          if (!track) return state;

          return {
            queue: state.queue.filter((t) => t.id !== trackId),
            downloading: [
              ...state.downloading,
              { ...track, status: "downloading", startedAt: Date.now() },
            ],
          };
        }),

      updateProgress: (trackId, progress) =>
        set((state) => ({
          downloading: state.downloading.map((t) =>
            t.id === trackId ? { ...t, progress } : t
          ),
        })),

      completeDownload: (trackId, filename) =>
        set((state) => {
          const track = state.downloading.find((t) => t.id === trackId);
          if (!track) return state;

          return {
            downloading: state.downloading.filter((t) => t.id !== trackId),
            completed: [
              ...state.completed,
              {
                ...track,
                status: "completed",
                progress: 100,
                completedAt: Date.now(),
                filename,
              },
            ],
          };
        }),

      failDownload: (trackId, error) =>
        set((state) => {
          const track = state.downloading.find((t) => t.id === trackId);
          if (!track) return state;

          return {
            downloading: state.downloading.filter((t) => t.id !== trackId),
            failed: [
              ...state.failed,
              {
                ...track,
                status: "failed",
                error,
                failedAt: Date.now(),
              },
            ],
          };
        }),

      retryFailed: (trackId) =>
        set((state) => {
          const track = state.failed.find((t) => t.id === trackId);
          if (!track) return state;

          return {
            failed: state.failed.filter((t) => t.id !== trackId),
            queue: [
              ...state.queue,
              { ...track, status: "queued", error: undefined, progress: 0 },
            ],
          };
        }),

      clearCompleted: () => set({ completed: [] }),

      clearFailed: () => set({ failed: [] }),

      setQuality: (quality) => set({ quality }),

      getStats: () => {
        const state = get();
        return {
          queued: state.queue.length,
          downloading: state.downloading.length,
          completed: state.completed.length,
          failed: state.failed.length,
          total:
            state.queue.length +
            state.downloading.length +
            state.completed.length +
            state.failed.length,
        };
      },
    }),
    {
      name: "troi-download-queue",
      partialize: (state) => ({
        queue: state.queue,
        downloading: state.downloading,
        completed: state.completed,
        failed: state.failed,
        quality: state.quality,
        maxConcurrent: state.maxConcurrent,
      }),
    }
  )
);
