/* Watches a <video> and reports each *user* seek as ONE (from -> to) pair.

   A seek only counts when it follows a user gesture (click/drag on the
   progress bar, or a native YouTube seek key). That filters out ads,
   buffering and YouTube's own resume-position jumps.

   Also performs Undo/Redo seeks without recording them (seekTo). */
(() => {
  const NS = (globalThis.YTUR = globalThis.YTUR || {});
  const C = NS.CONFIG;
  const { isAdPlaying, isLive, isTypingTarget } = NS;

  const PROGRESS_SELECTOR = '.ytp-progress-bar, .ytp-progress-bar-container, .ytp-chapter-hover-container';
  const SEEK_KEYS = new Set(['j', 'l', 'ArrowLeft', 'ArrowRight', 'Home', 'End']);

  class SeekTracker {
    /**
     * @param {object} o
     * @param {(from:number,to:number)=>void} o.onSeek    a user seek has settled
     * @param {()=>void} o.onSettled                      lastStable/programmatic state changed
     * @param {()=>boolean} o.isEnabled
     */
    constructor({ onSeek, onSettled, isEnabled }) {
      this.onSeek = onSeek;
      this.onSettled = onSettled;
      this.isEnabled = isEnabled;

      this.video = null;
      this.lastStable = 0;      // last known "calm" playback position
      this.seekFrom = 0;        // position when the current seek sequence began
      this.active = false;      // a user seek sequence is in progress
      this.programmatic = false;// we are performing an undo/redo seek
      this.scrubbing = false;   // pointer held down on the progress bar
      this.intentAt = 0;        // time of last seek-ish gesture
      this._timer = null;
      this._progTimer = null;

      this._onTime = () => {
        const v = this.video;
        if (v && !v.seeking && !this.active && !this.programmatic) this.lastStable = v.currentTime;
      };
      this._onSeeking = this._seeking.bind(this);
      this._onSeeked = this._seeked.bind(this);

      this._installIntentListeners();
    }

    // ── video attach / detach ───────────────────────────────
    attach(video) {
      if (video === this.video) return;
      this.detach();
      this.video = video;
      this.lastStable = Number.isFinite(video.currentTime) ? video.currentTime : 0;
      video.addEventListener('timeupdate', this._onTime);
      video.addEventListener('seeking', this._onSeeking);
      video.addEventListener('seeked', this._onSeeked);
    }

    detach() {
      const v = this.video;
      if (v) {
        v.removeEventListener('timeupdate', this._onTime);
        v.removeEventListener('seeking', this._onSeeking);
        v.removeEventListener('seeked', this._onSeeked);
      }
      this.video = null;
      this.reset();
    }

    /** Forget any half-finished sequence (e.g. when the video changes). */
    reset() {
      clearTimeout(this._timer);
      clearTimeout(this._progTimer);
      this._timer = this._progTimer = null;
      this.active = false;
      this.programmatic = false;
    }

    // ── user-intent detection ───────────────────────────────
    _installIntentListeners() {
      document.addEventListener('pointerdown', e => {
        if (e.target.closest?.(PROGRESS_SELECTOR)) {
          this.scrubbing = true;
          this.intentAt = Date.now();
        }
      }, true);
      const release = () => {
        if (this.scrubbing) { this.scrubbing = false; this.intentAt = Date.now(); }
      };
      window.addEventListener('pointerup', release, true);
      window.addEventListener('pointercancel', release, true);

      window.addEventListener('keydown', e => {
        if (e.altKey || e.ctrlKey || e.metaKey || isTypingTarget(e.target)) return;
        if (SEEK_KEYS.has(e.key) || /^[0-9]$/.test(e.key)) this.intentAt = Date.now();
      }, true);
    }

    _hasIntent() {
      return this.scrubbing || Date.now() - this.intentAt <= C.INTENT_WINDOW_MS;
    }

    _canTrack() {
      return !!this.video && !this.programmatic && this.isEnabled() && !isAdPlaying();
    }

    // ── native event handling ───────────────────────────────
    _seeking() {
      if (!this._canTrack()) return;
      if (!this.active) {
        if (!this._hasIntent()) return;
        this.seekFrom = this.lastStable;
        this.active = true;
      }
      // Safety net: if "seeked" never arrives, drop the sequence.
      clearTimeout(this._timer);
      this._timer = setTimeout(() => { this.active = false; this._timer = null; }, C.SEEK_WATCHDOG_MS);
    }

    _seeked() {
      if (!this.active || !this._canTrack()) return;
      clearTimeout(this._timer);
      this._timer = setTimeout(() => {
        this._timer = null;
        this.active = false;
        const v = this.video;
        if (!v) return;
        const to = v.currentTime;
        if (!isLive(v)) this.onSeek(this.seekFrom, to);
        this.lastStable = to;
        this.onSettled();
      }, C.SETTLE_MS);
    }

    // ── undo/redo seeks (not recorded) ──────────────────────
    seekTo(time) {
      const v = this.video;
      if (!v) return;
      this.reset();
      this.programmatic = true;

      const finish = () => {
        if (!this.programmatic) return;
        this.programmatic = false;
        v.removeEventListener('seeked', finish);
        clearTimeout(this._progTimer);
        this._progTimer = null;
        this.lastStable = v.currentTime;
        this.onSettled();
      };
      v.addEventListener('seeked', finish);
      this._progTimer = setTimeout(finish, C.PROGRAMMATIC_TIMEOUT_MS);
      v.currentTime = time;
      if (!v.seeking) queueMicrotask(finish); // no-op seek: nothing will fire "seeked"
    }
  }

  NS.SeekTracker = SeekTracker;
})();
