/* chrome.storage.local wrapper. Never throws (an orphaned content script
   after an extension reload would otherwise spam errors). */
(() => {
  const NS = (globalThis.YTUR = globalThis.YTUR || {});
  const { STORAGE_KEY, SETTINGS_KEY, DEFAULT_SETTINGS, MAX_VIDEOS } = NS.CONFIG;

  const area = () => {
    try { return chrome?.storage?.local || null; } catch { return null; }
  };

  async function readAll() {
    try {
      const r = await area()?.get(STORAGE_KEY);
      return r?.[STORAGE_KEY] || {};
    } catch { return {}; }
  }

  NS.Store = {
    async loadHistory(videoId) {
      return (await readAll())[videoId] || null;
    },

    async saveHistory(videoId, json) {
      try {
        const all = await readAll();
        if (!all[videoId] && Object.keys(all).length >= MAX_VIDEOS) {
          const oldest = Object.keys(all).reduce((a, b) =>
            (all[a].savedAt || 0) <= (all[b].savedAt || 0) ? a : b);
          delete all[oldest];
        }
        all[videoId] = { ...json, savedAt: Date.now() };
        await area()?.set({ [STORAGE_KEY]: all });
      } catch { /* extension context gone – nothing to do */ }
    },

    async loadSettings() {
      try {
        const r = await area()?.get(SETTINGS_KEY);
        return { ...DEFAULT_SETTINGS, ...(r?.[SETTINGS_KEY] || {}) };
      } catch { return { ...DEFAULT_SETTINGS }; }
    },

    /** Calls cb(settings) whenever the popup changes settings. */
    onSettingsChanged(cb) {
      try {
        chrome.storage.onChanged.addListener((changes, areaName) => {
          if (areaName === 'local' && changes[SETTINGS_KEY]) {
            cb({ ...DEFAULT_SETTINGS, ...(changes[SETTINGS_KEY].newValue || {}) });
          }
        });
      } catch { /* ignore */ }
    }
  };
})();
