/* Bounded undo/redo stack of {from, to} seeks. No DOM, no storage. */
(() => {
  const NS = (globalThis.YTUR = globalThis.YTUR || {});
  const { MAX_HISTORY, MIN_DELTA_S } = NS.CONFIG;

  const round2 = n => Math.round(n * 100) / 100;

  class SeekHistory {
    constructor() { this.clear(); }

    clear() { this._stack = []; this._idx = -1; }

    get size() { return this._stack.length; }

    /** Record a user seek. Drops the redo branch; evicts the oldest when full. */
    record(from, to) {
      if (!Number.isFinite(from) || !Number.isFinite(to)) return false;
      if (Math.abs(to - from) < MIN_DELTA_S) return false;

      this._stack.splice(this._idx + 1);
      if (this._stack.length >= MAX_HISTORY) this._stack.shift();
      this._stack.push({ from: round2(from), to: round2(to), at: Date.now() });
      this._idx = this._stack.length - 1;
      return true;
    }

    canUndo() { return this._idx >= 0; }
    canRedo() { return this._idx < this._stack.length - 1; }

    undoTarget() { return this.canUndo() ? this._stack[this._idx].from : null; }
    redoTarget() { return this.canRedo() ? this._stack[this._idx + 1].to : null; }

    /** Step back; returns the time to seek to (or null). */
    undo() {
      const t = this.undoTarget();
      if (t !== null) this._idx--;
      return t;
    }

    /** Step forward; returns the time to seek to (or null). */
    redo() {
      const t = this.redoTarget();
      if (t !== null) this._idx++;
      return t;
    }

    toJSON() { return { stack: this._stack, idx: this._idx }; }

    fromJSON(data) {
      const entries = Array.isArray(data?.stack) ? data.stack : [];
      this._stack = entries
        .filter(e => Number.isFinite(e?.from) && Number.isFinite(e?.to))
        .slice(-MAX_HISTORY)
        .map(e => ({
          from: round2(e.from),
          to: round2(e.to),
          at: Number.isFinite(e.at) ? e.at : Date.now()
        }));
      const last = this._stack.length - 1;
      this._idx = Math.max(-1, Math.min(Number.isInteger(data?.idx) ? data.idx : last, last));
    }
  }

  NS.SeekHistory = SeekHistory;
})();
