'use strict';

const { STORAGE_KEY, SETTINGS_KEY, DEFAULT_SETTINGS } = YTUR.CONFIG;
const $ = id => document.getElementById(id);

const els = {
  enabled: $('extension-enabled'),
  shortcuts: $('shortcuts-enabled'),
  undo: $('undo-shortcut'),
  redo: $('redo-shortcut'),
  clear: $('clear-history'),
  status: $('status')
};

function save() {
  chrome.storage.local.set({
    [SETTINGS_KEY]: {
      enabled: els.enabled.checked,
      shortcutsEnabled: els.shortcuts.checked,
      undoShortcut: els.undo.value,
      redoShortcut: els.redo.value
    }
  });
}

chrome.storage.local.get(SETTINGS_KEY, r => {
  const s = { ...DEFAULT_SETTINGS, ...(r?.[SETTINGS_KEY] || {}) };
  els.enabled.checked = s.enabled;
  els.shortcuts.checked = s.shortcutsEnabled;
  els.undo.value = s.undoShortcut;
  els.redo.value = s.redoShortcut;
});

els.enabled.addEventListener('change', save);
els.shortcuts.addEventListener('change', save);

for (const input of [els.undo, els.redo]) {
  input.addEventListener('keydown', e => {
    e.preventDefault();
    const combo = YTUR.shortcutFromEvent(e);
    if (!combo) return;           // bare modifier key
    input.value = combo;
    save();
  });
}

els.clear.addEventListener('click', () => {
  chrome.storage.local.remove(STORAGE_KEY, () => {
    els.status.textContent = chrome.runtime.lastError
      ? 'Could not clear history.'
      : 'Saved history cleared.';
  });
});
