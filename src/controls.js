/* Undo / Redo buttons in the YouTube player bar.

   Design rules (these keep YouTube's own layout untouched):
   - the buttons live in OUR OWN group, a sibling of `.ytp-right-controls`;
     nothing is ever inserted inside YouTube's control pill (that is what used
     to cover the Autoplay toggle)
   - the group is absolutely positioned just LEFT of the right-hand pill, using
     the pill's measured left edge, and re-measured whenever it resizes
   - it copies the pill's background / radius so it looks native
   - the tooltip is a single element owned by the PLAYER (never clipped) */
(() => {
  const NS = (globalThis.YTUR = globalThis.YTUR || {});

  const IDS = { group: 'ytundo-group', undo: 'ytundo-undo-btn', redo: 'ytundo-redo-btn', tip: 'ytundo-tooltip' };
  const GAP = 8; // px between our group and YouTube's right-hand controls

  /** Alpha of a computed CSS colour: 'rgba(0,0,0,.3)' -> .3, 'transparent' -> 0 */
  function cssAlpha(c) {
    if (!c || c === 'transparent') return 0;
    const m = c.match(/rgba?\(([^)]+)\)/);
    if (!m) return 0;
    const p = m[1].split(/[\s,\/]+/).filter(Boolean);
    return p.length >= 4 ? parseFloat(p[3]) : 1;
  }
  const SVG_NS = 'http://www.w3.org/2000/svg';
  // Undo arrow: Eva Icons "undo-outline" (MIT, (c) Akveo) — see THIRD_PARTY_NOTICES.md
  const ICON_PATH = 'M20.22 21a1 1 0 0 1-1-.76 8.91 8.91 0 0 0-7.8-6.69v1.12a1.78 1.78 0 0 1-1.09 1.64A2 2 0 0 1 8.18 16l-5.06-4.41a1.76 1.76 0 0 1 0-2.68l5.06-4.42a2 2 0 0 1 2.18-.3 1.78 1.78 0 0 1 1.09 1.64V7A10.89 10.89 0 0 1 21.5 17.75a10.29 10.29 0 0 1-.31 2.49 1 1 0 0 1-1 .76zm-9.77-9.5a11.07 11.07 0 0 1 8.81 4.26A9 9 0 0 0 10.45 9a1 1 0 0 1-1-1V6.08l-4.82 4.17 4.82 4.21v-2a1 1 0 0 1 1-.96z';

  function makeIcon(flip) {
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('class', 'ytundo-icon');
    svg.setAttribute('viewBox', '0 0 36 36');
    svg.setAttribute('aria-hidden', 'true');
    const g = document.createElementNS(SVG_NS, 'g');
    // 24x24 glyph centred in YouTube's 36x36 icon box; redo = mirrored undo
    g.setAttribute('transform', flip ? 'translate(30 6) scale(-1 1)' : 'translate(6 6)');
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', ICON_PATH);
    g.appendChild(path);
    svg.appendChild(g);
    return svg;
  }

  class Controls {
    /** @param {{onUndo:()=>void,onRedo:()=>void}} handlers */
    constructor({ onUndo, onRedo }) {
      this.state = { canUndo: false, canRedo: false, undoText: 'Undo', redoText: 'Redo' };
      this.undoBtn = this._makeButton(IDS.undo, makeIcon(false), onUndo, 'undo');
      this.redoBtn = this._makeButton(IDS.redo, makeIcon(true), onRedo, 'redo');
      this.group = document.createElement('div');
      this.group.id = IDS.group;
      this.group.className = 'ytundo-group';
      this.group.append(this.undoBtn, this.redoBtn);
      this.tip = null;
      this.tipOwner = null; // which button the tooltip is currently showing for
      this._ro = null;
      this._watched = null;
      this._relayout = () => this._layout();
    }

    // ── public API ──────────────────────────────────────────
    /** Make sure the group is in the player bar and positioned. Idempotent. */
    mount() {
      const rc = document.querySelector('.ytp-right-controls');
      const host = rc?.parentElement;
      if (!rc || !host) return false;

      if (this.group.parentNode !== host) host.insertBefore(this.group, rc);
      this._watch(rc);
      this._layout();
      this._render();
      return true;
    }

    remove() {
      this._hideTip();
      this._ro?.disconnect();
      this._watched = null;
      window.removeEventListener('resize', this._relayout);
      this.group.remove();
      this.tip?.remove();
      this.tip = null;
    }

    update(state) {
      this.state = state;
      this._render();
    }

    // ── placement ───────────────────────────────────────────
    /** Re-measure whenever the pill (or its bar) changes size. */
    _watch(rc) {
      if (this._watched === rc) return;
      this._ro?.disconnect();
      this._watched = rc;
      if (typeof ResizeObserver === 'function') {
        this._ro = new ResizeObserver(this._relayout);
        this._ro.observe(rc);
        for (const c of rc.children) this._ro.observe(c);
        if (rc.parentElement) this._ro.observe(rc.parentElement);
      }
      window.addEventListener('resize', this._relayout);
    }

    /** Park the group GAP px to the left of YouTube's right-hand controls. */
    _layout() {
      const rc = this._watched;
      const g = this.group;
      if (!rc || !rc.isConnected || g.parentNode !== rc.parentElement) return;

      const parts = [rc, ...rc.children]
        .map(el => ({ el, r: el.getBoundingClientRect() }))
        .filter(x => x.r.width > 0 && x.r.height > 0);
      if (!parts.length) { g.style.visibility = 'hidden'; return; }

      const ref = parts[0].r;                                   // the pill itself (or first child)
      const left = Math.min(...parts.map(x => x.r.left));       // its true left edge
      const skin = parts.find(x => cssAlpha(getComputedStyle(x.el).backgroundColor) > 0);

      // Size to the pill: icon ~24px glyph, button wide enough to click comfortably.
      const icon = Math.max(24, Math.min(36, Math.round(ref.height * 0.8)));
      g.style.setProperty('--ytundo-icon', `${icon}px`);
      g.style.setProperty('--ytundo-btn-w', `${Math.round(icon * 1.25)}px`);
      g.style.height = `${ref.height}px`;

      // Copy YouTube's pill look when it has one (new layout); flat layouts get nothing.
      if (skin) {
        const cs = getComputedStyle(skin.el);
        g.style.backgroundColor = cs.backgroundColor;
        g.style.borderRadius = cs.borderRadius;
        g.style.backdropFilter = g.style.webkitBackdropFilter = cs.backdropFilter || cs.webkitBackdropFilter || '';
      } else {
        g.style.backgroundColor = g.style.borderRadius = g.style.backdropFilter = g.style.webkitBackdropFilter = '';
      }

      const op = g.offsetParent;
      if (!op) return;
      const o = op.getBoundingClientRect();
      g.style.left = `${left - GAP - g.offsetWidth - o.left - op.clientLeft}px`;
      g.style.top = `${ref.top - o.top - op.clientTop}px`;
      g.style.visibility = 'visible';
    }

    // ── buttons ─────────────────────────────────────────────
    _makeButton(id, icon, onClick, kind) {
      const btn = document.createElement('button');
      btn.id = id;
      btn.type = 'button';
      btn.className = 'ytundo-btn ytundo-disabled';
      btn.appendChild(icon);

      btn.addEventListener('click', e => {
        e.stopPropagation();
        if (btn.getAttribute('aria-disabled') !== 'true') onClick();
      });
      btn.addEventListener('mouseenter', () => this._showTip(btn, kind));
      btn.addEventListener('focus', () => this._showTip(btn, kind));
      btn.addEventListener('mouseleave', () => this._hideTip());
      btn.addEventListener('blur', () => this._hideTip());
      return btn;
    }

    _render() {
      const { canUndo, canRedo, undoText, redoText } = this.state;
      this._paint(this.undoBtn, canUndo, undoText);
      this._paint(this.redoBtn, canRedo, redoText);
      if (this.tipOwner) this._showTip(this.tipOwner.btn, this.tipOwner.kind); // live-refresh text
    }

    _paint(btn, enabled, text) {
      btn.classList.toggle('ytundo-disabled', !enabled);
      btn.setAttribute('aria-disabled', String(!enabled));
      btn.setAttribute('aria-label', text);
    }

    // ── tooltip (lives inside the player so it is never clipped) ──
    _showTip(btn, kind) {
      const player = btn.closest('.html5-video-player') || document.getElementById('movie_player');
      if (!player) return;
      if (!this.tip || this.tip.parentNode !== player) {
        this.tip?.remove();
        this.tip = document.createElement('div');
        this.tip.id = IDS.tip;
        this.tip.className = 'ytundo-tooltip';
        this.tip.setAttribute('role', 'tooltip');
        player.appendChild(this.tip);
      }
      this.tipOwner = { btn, kind };
      this.tip.textContent = kind === 'undo' ? this.state.undoText : this.state.redoText;
      this.tip.classList.add('ytundo-tooltip--visible');

      const p = player.getBoundingClientRect();
      const b = btn.getBoundingClientRect();
      const half = this.tip.offsetWidth / 2;
      const center = b.left + b.width / 2 - p.left;
      this.tip.style.left = `${Math.max(half + 4, Math.min(center, p.width - half - 4))}px`;
      this.tip.style.bottom = `${p.bottom - b.top + 8}px`;
    }

    _hideTip() {
      this.tipOwner = null;
      this.tip?.classList.remove('ytundo-tooltip--visible');
    }
  }

  NS.Controls = Controls;
})();
