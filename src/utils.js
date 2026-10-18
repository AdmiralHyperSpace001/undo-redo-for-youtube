/* Small pure helpers. Loaded by the content script AND the popup. */
(() => {
  const NS = (globalThis.YTUR = globalThis.YTUR || {});

  /** 125 -> "2:05", 8254 -> "2:17:34", bad input -> "--:--" */
  NS.fmtTime = function fmtTime(s) {
    if (s == null || !isFinite(s)) return '--:--';
    s = Math.max(0, Math.floor(s));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const ss = String(s % 60).padStart(2, '0');
    return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
  };

  NS.isAdPlaying = () => !!document.querySelector(
    '.ad-showing, .ad-interrupting, .ytp-ad-player-overlay'
  );

  NS.isLive = video => !!video && !isFinite(video.duration);

  /** Video id on a /watch page, otherwise null. */
  NS.getVideoId = () =>
    location.pathname === '/watch'
      ? new URLSearchParams(location.search).get('v')
      : null;

  NS.isTypingTarget = el =>
    !!el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName));

  /**
   * KeyboardEvent -> "Ctrl+Alt+Shift+Meta+Key" (null for a bare modifier).
   * Uses event.code for letters/digits so Alt+Z still works on layouts
   * (e.g. macOS) where Alt+Z types a different character.
   */
  NS.shortcutFromEvent = function shortcutFromEvent(e) {
    if (['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) return null;
    let key = e.key;
    if (/^Key[A-Z]$/.test(e.code || '')) key = e.code.slice(3);
    else if (/^Digit[0-9]$/.test(e.code || '')) key = e.code.slice(5);
    else if (key === ' ') key = 'Space';
    else if (key.length === 1) key = key.toUpperCase();

    const parts = [];
    if (e.ctrlKey) parts.push('Ctrl');
    if (e.altKey) parts.push('Alt');
    if (e.shiftKey) parts.push('Shift');
    if (e.metaKey) parts.push('Meta');
    parts.push(key);
    return parts.join('+');
  };
})();
