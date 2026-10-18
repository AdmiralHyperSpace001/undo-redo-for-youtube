/* Glue: settings, navigation, history, persistence, shortcuts, button state. */
(() => {
  const NS = (globalThis.YTUR = globalThis.YTUR || {});
  if (NS.started) return;          // never run twice in the same page
  NS.started = true;

  const C = NS.CONFIG;
  const { Store, SeekHistory, SeekTracker, Controls, fmtTime, getVideoId,
          isTypingTarget, shortcutFromEvent } = NS;

  class YTUndoRedo {
    constructor() {
      this.settings = { ...C.DEFAULT_SETTINGS };
      this.history = new SeekHistory();
      this.videoId = null;
      this._saveTimer = null;
      this._syncTimer = null;

      this.tracker = new SeekTracker({
        isEnabled: () => this.settings.enabled,
        onSeek: (from, to) => { if (this.history.record(from, to)) this._scheduleSave(); },
        onSettled: () => this._refresh()
      });
      this.controls = new Controls({
        onUndo: () => this.undo(),
        onRedo: () => this.redo()
      });
    }

    async start() {
      this.settings = await Store.loadSettings();
      Store.onSettingsChanged(s => { this.settings = s; this._sync(); this._refresh(); });

      // YouTube is a single-page app: these fire on every in-site navigation.
      document.addEventListener('yt-navigate-finish', () => this._onNavigate());
      window.addEventListener('pagehide', () => this._saveNow());
      window.addEventListener('keydown', e => this._onKey(e), true);

      // YouTube rebuilds the player bar from time to time; re-check (throttled,
      // not debounced, so constant DOM churn can't starve it).
      new MutationObserver(() => this._requestSync())
        .observe(document.body, { childList: true, subtree: true });

      this._onNavigate();
    }

    // ── navigation ──────────────────────────────────────────
    _onNavigate() {
      const id = getVideoId();
      if (id !== this.videoId) {
        this._saveNow();
        this.videoId = id;
        this.history.clear();
        this.tracker.detach();
        if (id) {
          Store.loadHistory(id).then(data => {
            if (id !== this.videoId) return;
            if (data && this.history.size === 0) this.history.fromJSON(data);
            this._refresh();
          });
        }
      }
      this._sync();
    }

    // ── keep DOM + tracker in sync with the page ────────────
    _requestSync() {
      if (this._syncTimer) return;
      this._syncTimer = setTimeout(() => { this._syncTimer = null; this._sync(); }, C.SYNC_DELAY_MS);
    }

    _sync() {
      if (!this.settings.enabled || !this.videoId) {
        this.controls.remove();
        this.tracker.detach();
        return;
      }
      const video = document.querySelector('video.html5-main-video') || document.querySelector('video');
      if (video) this.tracker.attach(video);
      this.controls.mount();
    }

    // ── actions ─────────────────────────────────────────────
    undo() { this._step(this.history.undo()); }
    redo() { this._step(this.history.redo()); }

    _step(target) {
      if (target === null) return;
      this.tracker.seekTo(target);
      this._scheduleSave();
      this._refresh();
    }

    _refresh() {
      const h = this.history;
      const { undoShortcut, redoShortcut } = this.settings;
      this.controls.update({
        canUndo: h.canUndo(),
        canRedo: h.canRedo(),
        undoText: h.canUndo() ? `Undo to ${fmtTime(h.undoTarget())} (${undoShortcut})` : `Undo (${undoShortcut})`,
        redoText: h.canRedo() ? `Redo to ${fmtTime(h.redoTarget())} (${redoShortcut})` : `Redo (${redoShortcut})`
      });
    }

    // ── keyboard ────────────────────────────────────────────
    _onKey(e) {
      const s = this.settings;
      if (!s.enabled || !s.shortcutsEnabled || !this.videoId || e.repeat) return;
      if (isTypingTarget(e.target)) return;

      const combo = shortcutFromEvent(e);
      const action = combo === s.undoShortcut ? 'undo' : combo === s.redoShortcut ? 'redo' : null;
      if (!action) return;
      e.preventDefault();
      e.stopPropagation();
      this[action]();
    }

    // ── persistence ─────────────────────────────────────────
    _scheduleSave() {
      clearTimeout(this._saveTimer);
      this._saveTimer = setTimeout(() => this._saveNow(), C.SAVE_DELAY_MS);
    }

    _saveNow() {
      clearTimeout(this._saveTimer);
      this._saveTimer = null;
      if (this.videoId && this.history.size) Store.saveHistory(this.videoId, this.history.toJSON());
    }
  }

  NS.app = new YTUndoRedo();
  NS.app.start();
})();
