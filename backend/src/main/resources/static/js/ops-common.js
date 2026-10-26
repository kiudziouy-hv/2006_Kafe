/* Tiện ích dùng chung cho các màn nghiệp vụ (Đợt 2) */
window.O = (() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = n => (Number(n) || 0).toLocaleString('vi-VN') + 'đ';
  const time = iso => iso ? new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '';
  const dt = iso => iso ? new Date(iso).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '';
  const TEMP = { HOT: 'Nóng', COLD: 'Lạnh' }, ICE = { NONE: 'Không đá', LESS: 'Ít đá', NORMAL: 'Đá bình thường', '-': '' };
  const LSTAT = { NEW: 'Mới', MAKING: 'Đang pha', DONE: 'Hoàn thành', CANCELLED: 'Đã hủy' };
  const optText = l => l.cake ? l.size : [l.size, TEMP[l.temp], l.sugar + '% đường', ICE[l.ice], ...(l.toppings || [])].filter(Boolean).join(' · ');

  /** Báo lỗi API bằng toast; lỗi cùng loại không hiện lặp. */
  function fail(e, title = 'Không thể thực hiện thao tác') {
    if (e && e.network) return Toast.error('Không thể kết nối máy chủ', 'Vui lòng thử lại.', { key: 'net' });
    if (e && (e.status === 401 || e.code === 'NO_SESSION')) { Toast.error('Phiên đã hết hạn', 'Vui lòng đăng nhập lại.', { key: 'nosession' }); setTimeout(() => { location.hash = '#/login'; location.reload(); }, 600); return; }
    Toast.error(title, e && e.message || 'Vui lòng thử lại.', { key: 'err:' + title + ':' + (e && e.code) });
  }

  /** Chống bấm trùng: vô hiệu nút + hiện loading cho đến khi thao tác xong. */
  async function guard(btn, fn) {
    if (btn.dataset.busy) return;
    btn.dataset.busy = '1'; const was = btn.disabled; btn.disabled = true; btn.classList.add('loading');
    try { return await fn(); } finally { delete btn.dataset.busy; btn.classList.remove('loading'); btn.disabled = was; }
  }

  /** Làm mới định kỳ khi màn còn hiện; chỉ vẽ lại khi dữ liệu đổi. */
  function poll(root, fn, ms = 3000) {
    let stop = false, last = null, busy = false;
    const tick = async () => {
      if (stop || !document.body.contains(root) || busy || document.hidden) return;
      busy = true;
      try { const d = await fn(); const j = JSON.stringify(d); if (j !== last) { last = j; await tick.render(d); } } catch (e) { tick.error && tick.error(e); } finally { busy = false; }
    };
    const id = setInterval(tick, ms);
    return { start: (render, error) => { tick.render = render; tick.error = error; return tick(); }, stop: () => { stop = true; clearInterval(id); }, force: () => { last = null; return tick(); } };
  }

  const moneyInput = el => { el.addEventListener('input', () => { const d = el.value.replace(/\D/g, ''); el.value = d ? Number(d).toLocaleString('vi-VN') : ''; }); };
  const moneyVal = el => Number(String(el.value).replace(/\D/g, '')) || 0;

  /** Bảng chọn tùy chọn món (S11b). opts.takeaway: chỉ lạnh. Trả về dòng món hoặc null. */
  function optionSheet(item, toppings, { takeaway = false } = {}) {
    return new Promise(resolve => {
      const prev = document.activeElement;
      const st = { size: item.sizes[0].code, temp: item.hotOnly ? 'HOT' : 'COLD', sugar: '50', ice: 'NORMAL', tops: new Set(), qty: 1 };
      const scrim = document.createElement('div'); scrim.className = 'scrim sheet-scrim';
      const sheet = document.createElement('div'); sheet.className = 'sheet'; sheet.setAttribute('role', 'dialog'); sheet.setAttribute('aria-modal', 'true'); sheet.setAttribute('aria-label', item.name);
      scrim.appendChild(sheet);
      const chip = (grp, val, label, on, dis) => `<button type="button" class="chip" data-g="${grp}" data-v="${esc(val)}" aria-pressed="${on}" ${dis ? 'disabled' : ''}>${esc(label)}</button>`;
      const paint = () => {
        const sz = item.sizes.find(s => s.code === st.size);
        const price = sz.price + [...st.tops].reduce((a, id) => a + toppings.find(t => t.id === id).price, 0);
        sheet.innerHTML = `<div style="display:flex;gap:12px;align-items:center"><div class="thumb">${Icons('cup')}</div><div style="flex:1"><h3>${esc(item.name)}</h3><small class="muted">${esc(item.group)}</small></div><button class="icon-btn" data-x aria-label="Đóng">${Icons('close')}</button></div>
          ${item.sizes.length > 1 ? `<div class="grp"><label>Kích thước</label><div class="chips">${item.sizes.map(s => chip('size', s.code, `${s.label} — ${money(s.price)}`, st.size === s.code)).join('')}</div></div>` : ''}
          ${item.cake ? '' : `<div class="grp"><label>Nóng / Lạnh</label><div class="chips">${chip('temp', 'HOT', 'Nóng', st.temp === 'HOT', item.coldOnly || takeaway)}${chip('temp', 'COLD', 'Lạnh', st.temp === 'COLD', item.hotOnly)}</div></div>
          <div class="grp"><label>Mức đường</label><div class="chips">${['0', '30', '50', '70', '100'].map(v => chip('sugar', v, v + '%', st.sugar === v)).join('')}</div></div>
          ${st.temp === 'COLD' ? `<div class="grp"><label>Mức đá</label><div class="chips">${[['NONE', 'Không đá'], ['LESS', 'Ít đá'], ['NORMAL', 'Bình thường']].map(([v, l]) => chip('ice', v, l, st.ice === v)).join('')}</div></div>` : ''}
          <div class="grp"><label>Topping (phụ phí)</label>${toppings.map(t => `<label class="checkbox" style="${t.status !== 'ACTIVE' ? 'opacity:.5' : ''}"><input type="checkbox" data-top="${t.id}" ${st.tops.has(t.id) ? 'checked' : ''} ${t.status !== 'ACTIVE' ? 'disabled' : ''}> ${esc(t.name)} (+${money(t.price)})${t.status !== 'ACTIVE' ? ' — Hết hàng' : ''}</label>`).join('')}</div>`}
          <div style="display:flex;align-items:center;justify-content:space-between"><b>Số lượng</b><div class="stepper"><button type="button" data-q="-1" aria-label="Giảm" ${st.qty <= 1 ? 'disabled' : ''}>${Icons('minus')}</button><span aria-live="polite">${st.qty}</span><button type="button" data-q="1" aria-label="Tăng" ${st.qty >= 20 ? 'disabled' : ''}>${Icons('plus')}</button></div></div>
          <button class="btn btn-primary btn-block" data-ok>Thêm vào đơn · ${money(price * st.qty)}</button>`;
        sheet.querySelector('[data-ok]').focus();
      };
      const close = v => { document.removeEventListener('keydown', key); scrim.classList.add('closing'); setTimeout(() => { scrim.remove(); prev && prev.focus && prev.focus(); resolve(v); }, 170); };
      const key = e => { if (e.key === 'Escape') close(null); };
      sheet.addEventListener('click', e => {
        const c = e.target.closest('.chip'); if (c && !c.disabled) { st[c.dataset.g] = c.dataset.v; paint(); return; }
        const q = e.target.closest('[data-q]'); if (q) { st.qty = Math.min(20, Math.max(1, st.qty + Number(q.dataset.q))); paint(); return; }
        if (e.target.closest('[data-x]')) return close(null);
        if (e.target.closest('[data-ok]')) {
          const sz = item.sizes.find(s => s.code === st.size);
          const tops = [...st.tops];
          close({ itemId: item.id, name: item.name, cake: item.cake, size: st.size, sizeLabel: sz.label, temp: item.cake ? null : st.temp, sugar: st.sugar, ice: st.temp === 'COLD' ? st.ice : '-', toppings: tops, toppingNames: tops.map(id => toppings.find(t => t.id === id).name), qty: st.qty,
            unitPrice: sz.price + tops.reduce((a, id) => a + toppings.find(t => t.id === id).price, 0) });
        }
      });
      sheet.addEventListener('change', e => { const t = e.target.closest('[data-top]'); if (t) { const id = Number(t.dataset.top); t.checked ? st.tops.add(id) : st.tops.delete(id); paint(); } });
      scrim.addEventListener('click', e => { if (e.target === scrim) close(null); });
      document.addEventListener('keydown', key);
      document.getElementById('dialog-root').appendChild(scrim); paint();
    });
  }

  const cartKey = k => 'cart.' + k;
  const cart = {
    load: k => { try { return JSON.parse(sessionStorage.getItem(cartKey(k))) || { lines: [] }; } catch (e) { return { lines: [] }; } },
    save: (k, c) => { try { sessionStorage.setItem(cartKey(k), JSON.stringify(c)); } catch (e) { /* bỏ qua */ } },
    clear: k => { try { sessionStorage.removeItem(cartKey(k)); } catch (e) { /* bỏ qua */ } }
  };
  const toPayload = l => ({ itemId: l.itemId, size: l.size, temp: l.temp, sugar: l.sugar, ice: l.ice, toppings: l.toppings, qty: l.qty });
  const lineDesc = l => l.cake ? l.sizeLabel : [l.sizeLabel, TEMP[l.temp], l.sugar + '% đường', ICE[l.ice], ...(l.toppingNames || [])].filter(Boolean).join(' · ');
  const roundTo500 = n => Math.floor(n / 500 + 0.5) * 500;

  return { $, $$, esc, money, time, dt, TEMP, LSTAT, optText, fail, guard, poll, moneyInput, moneyVal, optionSheet, cart, toPayload, lineDesc, roundTo500 };
})();
window.OpsScreens = {};
window.OpsMeta = {};
