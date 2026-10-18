// Minimal chrome.storage.local backed by localStorage, so the REAL extension scripts run in a normal page.
(() => {
  const read = () => JSON.parse(localStorage.getItem('__stub') || '{}');
  const write = o => localStorage.setItem('__stub', JSON.stringify(o));
  const listeners = [];
  window.chrome = {
    runtime: {},
    storage: {
      local: {
        async get(key) { const d = read(); return key ? (key in d ? { [key]: d[key] } : {}) : d; },
        async set(obj) {
          const d = read(), changes = {};
          for (const k in obj) { changes[k] = { oldValue: d[k], newValue: obj[k] }; d[k] = obj[k]; }
          write(d); listeners.forEach(l => l(changes, 'local'));
        },
        async remove(key) { const d = read(); delete d[key]; write(d); }
      },
      onChanged: { addListener: fn => listeners.push(fn) }
    }
  };
})();
