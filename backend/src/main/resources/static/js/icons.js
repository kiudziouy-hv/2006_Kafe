/* Bộ icon nội tuyến (nét 1.8) dùng chung toàn ứng dụng */
window.Icons = (() => {
  const P = {
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    check: '<path d="M5 12l5 5L20 7"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
    warn: '<path d="M12 3l10 18H2L12 3z"/><path d="M12 10v5M12 18h.01"/>',
    error: '<circle cx="12" cy="12" r="9"/><path d="M9 9l6 6M15 9l-6 6"/>',
    success: '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l3 3 5-6"/>',
    loader: '<path d="M12 3a9 9 0 019 9"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/>',
    eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    eyeOff: '<path d="M3 3l18 18M10.6 6.2A9.6 9.6 0 0112 6c6 0 10 6 10 6a17 17 0 01-3.2 3.7M6.5 7.6A16 16 0 002 12s4 7 10 7a9.5 9.5 0 004-.9"/>',
    chevR: '<path d="M9 6l6 6-6 6"/>',
    bell: '<path d="M6 16V11a6 6 0 0112 0v5l2 2H4l2-2z"/><path d="M10 21h4"/>',
    logout: '<path d="M10 4H5v16h5M15 8l4 4-4 4M19 12H9"/>',
    chart: '<path d="M4 20V10M10 20V4M16 20v-8M22 20H2"/>',
    receipt: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3z"/><path d="M9 8h6M9 12h6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    cup: '<path d="M5 8h12v5a5 5 0 01-5 5h-2a5 5 0 01-5-5V8z"/><path d="M17 9h2a2 2 0 010 4h-2M8 3v2M12 3v2"/>',
    box: '<path d="M3 8l9-5 9 5v8l-9 5-9-5V8z"/><path d="M3 8l9 5 9-5M12 13v8"/>',
    people: '<circle cx="9" cy="8" r="3.5"/><path d="M2 20c0-3.5 3-5.5 7-5.5s7 2 7 5.5M17 5a3.5 3.5 0 010 7M22 20c0-2.5-1.5-4-4-4.8"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    list: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    minus: '<path d="M5 12h14"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
    print: '<path d="M7 9V3h10v6M7 17H4v-7h16v7h-3M7 14h10v7H7z"/>',
    back: '<path d="M15 6l-6 6 6 6"/>'
  };
  return (n, cls = '') => `<svg class="icon ${cls}" viewBox="0 0 24 24" aria-hidden="true">${P[n] || ''}</svg>`;
})();
