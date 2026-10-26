/**
 * Toast dùng chung cho toàn ứng dụng (một store duy nhất).
 * - Tối đa 3 toast hiện cùng lúc, phần còn lại xếp hàng chờ và lần lượt hiện ra.
 * - Cùng `key` thì không hiện lặp (chỉ làm mới thời gian).
 * - Success tự đóng 4s, Warning/Info 5s, Error 8s, Loading giữ đến khi được thay bằng kết quả.
 * - Vùng chứa có aria-live; lỗi dùng role="alert".
 */
window.Toast = (() => {
  const MAX = 3;
  const TTL = { success: 4000, info: 5000, warning: 5000, error: 8000, loading: 0 };
  const ICON = { success: 'success', error: 'error', warning: 'warn', info: 'info', loading: 'loader' };
  const region = () => document.getElementById('toast-region');
  let seq = 0;
  const visible = [];  // {id,key,el,timer,opts}
  const queue = [];

  function show(type, title, desc, opts = {}) {
    const key = opts.key || `${type}:${title}:${desc || ''}`;
    const dup = visible.find(t => t.key === key);
    if (dup) { // cùng sự kiện: không hiện lặp, chỉ cập nhật nội dung mới nhất và làm mới thời gian
      if (dup.desc !== desc || dup.title !== title || dup.type !== type) { Object.assign(dup, { type, title, desc, opts }); fill(dup.el, dup); dup.el.setAttribute('role', type === 'error' ? 'alert' : 'status'); }
      refresh(dup); return dup.id;
    }
    const q = queue.find(t => t.key === key);
    if (q) return q.id;
    const item = { id: ++seq, key, type, title, desc, opts };
    if (visible.length < MAX) mount(item); else { queue.push(item); renderQueue(); }
    return item.id;
  }

  function mount(item) {
    const el = document.createElement('div');
    el.className = `toast ${item.type}`;
    el.setAttribute('role', item.type === 'error' ? 'alert' : 'status');
    el.dataset.id = item.id;
    fill(el, item);
    const q = region().querySelector('.toast-queue');
    region().insertBefore(el, q || null);
    item.el = el;
    visible.push(item);
    arm(item);
    renderQueue();
  }

  function fill(el, item) {
    el.className = `toast ${item.type}`;
    el.innerHTML = `<span class="t-ic">${Icons(ICON[item.type])}</span>
      <div class="t-body"><div class="t-title"></div>${item.desc ? '<div class="t-desc"></div>' : ''}</div>
      <button class="t-close" aria-label="Đóng thông báo">${Icons('close')}</button>`;
    el.querySelector('.t-title').textContent = item.title;
    if (item.desc) el.querySelector('.t-desc').textContent = item.desc;
    el.querySelector('.t-close').onclick = () => dismiss(item.id);
    if (item.opts.undo) {
      const b = document.createElement('button');
      b.className = 't-undo'; b.textContent = 'Hoàn tác';
      b.onclick = () => { item.opts.undo(); dismiss(item.id); };
      el.querySelector('.t-body').appendChild(b);
    }
    el.onmouseenter = () => clearTimeout(item.timer);
    el.onmouseleave = () => arm(item);
  }

  function arm(item) {
    clearTimeout(item.timer);
    const ms = item.opts.duration ?? TTL[item.type];
    if (ms > 0) item.timer = setTimeout(() => dismiss(item.id), ms);
  }
  function refresh(item) { arm(item); item.el.classList.remove('leaving'); }

  function dismiss(id) {
    const qi = queue.findIndex(t => t.id === id);
    if (qi >= 0) { queue.splice(qi, 1); renderQueue(); return; }
    const i = visible.findIndex(t => t.id === id);
    if (i < 0) return;
    const item = visible[i];
    clearTimeout(item.timer);
    visible.splice(i, 1);
    item.el.classList.add('leaving');
    const done = () => { item.el.remove(); next(); };
    item.el.addEventListener('animationend', done, { once: true });
    setTimeout(() => item.el.isConnected && done(), 400);
  }

  function next() {
    while (visible.length < MAX && queue.length) mount(queue.shift());
    renderQueue();
  }

  function renderQueue() {
    let q = region().querySelector('.toast-queue');
    if (!queue.length) { q && q.remove(); return; }
    if (!q) { q = document.createElement('div'); q.className = 'toast-queue'; region().appendChild(q); }
    q.textContent = `+${queue.length} thông báo đang chờ`;
  }

  /** Thay toast loading bằng kết quả thật (chỉ gọi khi thao tác đã xong). */
  function update(id, type, title, desc, opts = {}) {
    const item = visible.find(t => t.id === id);
    if (!item) return show(type, title, desc, opts);
    Object.assign(item, { type, title, desc, opts: { ...item.opts, ...opts } });
    fill(item.el, item);
    item.el.setAttribute('role', type === 'error' ? 'alert' : 'status');
    arm(item);
    return id;
  }

  function dismissKey(key) { const t = visible.find(x => x.key === key) || queue.find(x => x.key === key); if (t) dismiss(t.id); }

  function clear() { [...visible].forEach(t => dismiss(t.id)); queue.length = 0; renderQueue(); }

  return {
    success: (t, d, o) => show('success', t, d, o),
    error: (t, d, o) => show('error', t, d, o),
    warning: (t, d, o) => show('warning', t, d, o),
    info: (t, d, o) => show('info', t, d, o),
    loading: (t, d, o) => show('loading', t, d, o),
    update, dismiss, dismissKey, clear
  };
})();
