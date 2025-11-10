import { h } from "preact";
import { useState, useEffect, useRef } from "preact/hooks";
import { useDownloadStore } from "../stores/downloadStore";
import { downloadManager } from "../utils/downloadManager";

export function DownloadQueuePopout() {
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const [showHoverTray, setShowHoverTray] = useState(false);
  const hoverTimeoutRef = useRef(null);

  const queue = useDownloadStore((state) => state.queue);
  const downloading = useDownloadStore((state) => state.downloading);
  const completed = useDownloadStore((state) => state.completed);
  const failed = useDownloadStore((state) => state.failed);
  const removeFromQueue = useDownloadStore((state) => state.removeFromQueue);
  const retryFailed = useDownloadStore((state) => state.retryFailed);
  const clearCompleted = useDownloadStore((state) => state.clearCompleted);
  const clearFailed = useDownloadStore((state) => state.clearFailed);

  const totalInQueue = queue.length + downloading.length;
  const totalActivity = totalInQueue + completed.length + failed.length;
  const currentDownload = downloading[0];
  const currentProgress = currentDownload?.progress || 0;

  // Check if downloads are running based on downloading array
  useEffect(() => {
    setIsRunning(downloading.length > 0 || downloadManager.isProcessing);
  }, [downloading.length]);

  const handleStart = async () => {
    setIsRunning(true);
    downloadManager.start().catch((err) => {
      console.error("Download manager error:", err);
      setIsRunning(false);
    });
  };

  const handleStop = () => {
    downloadManager.stop();
    setIsRunning(false);
  };

  const handleToggleDownloads = () => {
    if (isRunning) {
      handleStop();
    } else {
      handleStart();
    }
  };

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsOpen(false);
      setIsClosing(false);
    }, 300);
  };

  const handleMouseEnter = () => {
    if (!isOpen && currentDownload) {
      hoverTimeoutRef.current = setTimeout(() => {
        setShowHoverTray(true);
      }, 300);
    }
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    setShowHoverTray(false);
  };

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  return (
    <>
      {!isOpen && (
        <div
          class="fixed bottom-6 right-6 z-40 flex items-center gap-3"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {showHoverTray && currentDownload && (
            <div
              class="absolute right-0 bottom-20 bg-surface rounded-xl shadow-xl border border-border-light p-4 w-[320px] animate-slide-in-tray"
              style={{ transformOrigin: "bottom right" }}
            >
              <div class="flex items-start gap-3">
                <div class="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <svg
                    class="w-5 h-5 text-primary"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
                    />
                  </svg>
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-xs text-text-muted mb-1">
                    Currently Downloading
                  </p>
                  <p class="text-sm font-medium text-text truncate">
                    {currentDownload.title}
                  </p>
                  <p class="text-xs text-text-muted truncate">
                    {currentDownload.artist}
                  </p>
                  <div class="mt-3">
                    <div class="flex items-center justify-between mb-1">
                      <span class="text-xs font-medium text-primary">
                        {currentProgress}%
                      </span>
                    </div>
                    <div class="w-full bg-border rounded-full h-1.5 overflow-hidden">
                      <div
                        class="h-full bg-gradient-to-r from-primary to-primary-light transition-all duration-300"
                        style={{ width: `${currentProgress}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {totalInQueue > 0 && (
            <button
              onClick={handleToggleDownloads}
              class="w-12 h-12 rounded-full bg-surface hover:bg-surface-alt border-2 border-border text-text shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center"
              title={isRunning ? "Pause Downloads" : "Start Downloads"}
            >
              {isRunning ? (
                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fill-rule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z"
                    clip-rule="evenodd"
                  />
                </svg>
              ) : (
                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fill-rule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                    clip-rule="evenodd"
                  />
                </svg>
              )}
            </button>
          )}

          <button
            onClick={() => setIsOpen(true)}
            class="relative w-16 h-16 rounded-full bg-primary hover:bg-primary-dark text-white shadow-xl hover:shadow-2xl transition-all duration-200 flex items-center justify-center group"
          >
            {currentDownload && (
              <svg
                class="absolute inset-0 w-full h-full -rotate-90"
                viewBox="0 0 100 100"
              >
                <circle
                  cx="50"
                  cy="50"
                  r="46"
                  fill="none"
                  stroke="rgba(255, 255, 255, 0.2)"
                  stroke-width="4"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="46"
                  fill="none"
                  stroke="white"
                  stroke-width="4"
                  stroke-linecap="round"
                  stroke-dasharray={`${2 * Math.PI * 46}`}
                  stroke-dashoffset={`${
                    2 * Math.PI * 46 * (1 - currentProgress / 100)
                  }`}
                  class="transition-all duration-300"
                />
              </svg>
            )}

            <div class="relative z-10">
              <svg
                class="w-7 h-7"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              {totalActivity > 0 && (
                <span class="absolute -top-2 -right-2 min-w-[20px] h-5 px-1.5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-lg">
                  {totalActivity > 99 ? "99+" : totalActivity}
                </span>
              )}
            </div>
          </button>
        </div>
      )}

      {isOpen && (
        <div class="fixed bottom-6 right-6 z-50">
          <div
            class={`w-[540px] bg-surface rounded-2xl shadow-2xl border border-border-light max-h-[calc(100vh-10rem)] flex flex-col ${
              isClosing ? "animate-popout-close" : "animate-popout-open"
            }`}
          >
            <button
              onClick={handleClose}
              class="flex items-center justify-between p-5 border-b border-border-light flex-shrink-0 hover:bg-surface-alt transition-colors rounded-t-2xl group w-full text-left"
            >
              <h2 class="text-lg font-bold text-text">Download Queue</h2>
              <div class="p-2 rounded-lg group-hover:bg-background-alt transition-colors">
                <svg
                  class="w-5 h-5 text-text-muted group-hover:text-text transition-colors"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </div>
            </button>

            <div class="flex-1 overflow-y-auto p-5 space-y-4">
              <div class="flex flex-wrap gap-3 text-xs text-text-muted p-3 bg-surface-alt rounded-lg border border-border-light">
                <div class="flex items-center gap-1.5">
                  <div class="w-2 h-2 rounded-full bg-secondary"></div>
                  <span>Queued: {queue.length}</span>
                </div>
                <div class="flex items-center gap-1.5">
                  <div class="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
                  <span>Downloading: {downloading.length}</span>
                </div>
                <div class="flex items-center gap-1.5">
                  <div class="w-2 h-2 rounded-full bg-primary-dark"></div>
                  <span>Completed: {completed.length}</span>
                </div>
                {failed.length > 0 && (
                  <div class="flex items-center gap-1.5">
                    <div class="w-2 h-2 rounded-full bg-red-500"></div>
                    <span>Failed: {failed.length}</span>
                  </div>
                )}
              </div>

              <div class="flex gap-2">
                {!isRunning ? (
                  <button
                    onClick={handleStart}
                    disabled={totalInQueue === 0}
                    class="btn-primary flex items-center gap-2 flex-1 justify-center"
                  >
                    <svg
                      class="w-4 h-4"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                    </svg>
                    Start Downloads
                  </button>
                ) : (
                  <button
                    onClick={handleStop}
                    class="bg-red-500 hover:bg-red-600 text-white font-medium px-4 py-2 rounded-lg transition-colors duration-200 flex items-center gap-2 flex-1 justify-center"
                  >
                    <svg
                      class="w-4 h-4"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fill-rule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z"
                        clip-rule="evenodd"
                      />
                    </svg>
                    Stop Downloads
                  </button>
                )}
              </div>

              {queue.length > 0 && (
                <div>
                  <h3 class="text-xs font-semibold text-text-muted mb-2 uppercase tracking-wide">
                    Queued ({queue.length})
                  </h3>
                  <div class="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                    {queue.map((track) => (
                      <div
                        key={track.id}
                        class="flex items-center justify-between p-3 bg-surface-alt rounded-lg border border-border-light hover:bg-background-alt hover:border-primary/30 transition-all group"
                      >
                        <div class="flex-1 min-w-0">
                          <p class="text-sm font-medium text-text truncate">
                            {track.title}
                          </p>
                          <p class="text-xs text-text-muted truncate">
                            {track.artist}
                          </p>
                        </div>
                        <button
                          class="ml-3 p-1.5 opacity-0 group-hover:opacity-100 hover:bg-red-50 rounded-lg transition-all duration-200 flex-shrink-0"
                          onClick={() => removeFromQueue(track.id)}
                          title="Remove from queue"
                        >
                          <svg
                            class="w-4 h-4 text-red-500"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              stroke-width="2"
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {downloading.length > 0 && (
                <div>
                  <h3 class="text-xs font-semibold text-text-muted mb-2 uppercase tracking-wide">
                    Downloading ({downloading.length})
                  </h3>
                  <div class="space-y-2">
                    {downloading.map((track) => (
                      <div
                        key={track.id}
                        class="p-3 bg-primary/5 rounded-lg border border-primary/30 shadow-sm"
                      >
                        <div class="flex items-center justify-between mb-2">
                          <div class="flex-1 min-w-0">
                            <p class="text-sm font-medium text-text truncate">
                              {track.title}
                            </p>
                            <p class="text-xs text-text-muted truncate">
                              {track.artist}
                            </p>
                          </div>
                          <span class="text-xs font-bold text-primary ml-3 flex-shrink-0">
                            {track.progress || 0}%
                          </span>
                        </div>
                        <div class="w-full bg-border rounded-full h-2 overflow-hidden">
                          <div
                            class="h-full bg-gradient-to-r from-primary via-primary-light to-primary transition-all duration-300 ease-out"
                            style={{ width: `${track.progress || 0}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {failed.length > 0 && (
                <div>
                  <div class="flex items-center justify-between mb-2">
                    <h3 class="text-xs font-semibold text-text-muted uppercase tracking-wide">
                      Failed ({failed.length})
                    </h3>
                    <button
                      class="text-xs text-red-500 hover:text-red-600 font-medium transition-colors"
                      onClick={clearFailed}
                    >
                      Clear All
                    </button>
                  </div>
                  <div class="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                    {failed.map((track) => (
                      <div
                        key={track.id}
                        class="p-3 bg-red-50 rounded-lg border border-red-200"
                      >
                        <div class="flex items-start justify-between">
                          <div class="flex-1 min-w-0">
                            <p class="text-sm font-medium text-text truncate">
                              {track.title}
                            </p>
                            <p class="text-xs text-text-muted truncate">
                              {track.artist}
                            </p>
                            <p class="text-xs text-red-500 mt-1">
                              {track.error}
                            </p>
                          </div>
                          <button
                            class="ml-3 p-1.5 hover:bg-red-100 rounded-lg transition-colors duration-200 flex-shrink-0"
                            onClick={() => retryFailed(track.id)}
                            title="Retry download"
                          >
                            <svg
                              class="w-4 h-4 text-primary"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                              />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {completed.length > 0 && (
                <div>
                  <button
                    onClick={() => setShowCompleted(!showCompleted)}
                    class="w-full p-3 bg-primary/10 rounded-lg border border-primary/30 hover:bg-primary/15 transition-colors"
                  >
                    <div class="flex items-center justify-between">
                      <div class="flex items-center gap-2">
                        <svg
                          class="w-4 h-4 text-primary"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        <span class="text-sm font-semibold text-primary">
                          Completed: {completed.length}
                        </span>
                      </div>
                      <div class="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            clearCompleted();
                          }}
                          class="text-xs text-text-muted hover:text-text font-medium px-2 py-1 hover:bg-primary/20 rounded transition-colors"
                        >
                          Clear
                        </button>
                        <svg
                          class={`w-4 h-4 text-primary transition-transform duration-200 ${
                            showCompleted ? "rotate-180" : ""
                          }`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </div>
                    </div>
                  </button>

                  {showCompleted && (
                    <div class="mt-2 space-y-2 max-h-64 overflow-y-auto custom-scrollbar animate-slide-down">
                      {completed.map((track) => (
                        <div
                          key={track.id}
                          class="p-3 bg-primary/5 rounded-lg border border-primary/20"
                        >
                          <div class="flex items-center gap-2">
                            <svg
                              class="w-4 h-4 text-primary flex-shrink-0"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fill-rule="evenodd"
                                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                clip-rule="evenodd"
                              />
                            </svg>
                            <div class="flex-1 min-w-0">
                              <p class="text-sm font-medium text-text truncate">
                                {track.title}
                              </p>
                              <p class="text-xs text-text-muted truncate">
                                {track.artist}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {totalInQueue === 0 &&
                completed.length === 0 &&
                failed.length === 0 && (
                  <div class="text-center py-12">
                    <svg
                      class="w-16 h-16 mx-auto text-border mb-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
                      />
                    </svg>
                    <p class="text-text-muted text-sm">
                      No tracks in queue. Add some tracks to get started!
                    </p>
                  </div>
                )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
