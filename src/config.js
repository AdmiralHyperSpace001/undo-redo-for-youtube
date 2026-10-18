/* Shared constants. Loaded by the content script AND the popup. */
(() => {
  const NS = (globalThis.YTUR = globalThis.YTUR || {});

  NS.CONFIG = Object.freeze({
    MAX_HISTORY: 50,          // seek entries kept per video (oldest evicted)
    MAX_VIDEOS: 100,          // videos kept in storage (least recently saved evicted)
    MIN_DELTA_S: 1.5,         // ignore seeks smaller than this (buffering jitter)
    SETTLE_MS: 350,           // quiet time after "seeked" before a scrub counts as ONE entry
    SEEK_WATCHDOG_MS: 4000,   // give up on a "seeking" that never gets a "seeked"
    INTENT_WINDOW_MS: 1500,   // how long after a click/key a seek counts as user-made
    PROGRAMMATIC_TIMEOUT_MS: 1500,
    SAVE_DELAY_MS: 600,
    SYNC_DELAY_MS: 200,       // throttle for DOM re-checks
    STORAGE_KEY: 'ytUndoRedo_v1',
    SETTINGS_KEY: 'ytUndoRedo_settings_v1',
    DEFAULT_SETTINGS: Object.freeze({
      enabled: true,
      shortcutsEnabled: true,
      undoShortcut: 'Alt+Z',
      redoShortcut: 'Alt+X'
    })
  });
})();
