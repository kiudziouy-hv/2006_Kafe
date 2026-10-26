/* Thu ngân: S20 mở ca, S21 đơn mang đi, S22 đơn tại quán, S23 thanh toán, S26 đơn nháp, S27 hóa đơn, S28 chốt ca */
(() => {
  const { $, $$, esc, money, time, dt, fail, guard, poll, optionSheet, cart, toPayload, lineDesc, moneyInput, moneyVal, roundTo500, optText, LSTAT } = O;
  const TABS = [['S22', 'Đơn tại quán'], ['S21', 'Đơn mang đi'], ['S26', 'Đơn nháp'], ['S28', 'Chốt ca']];
  OpsMeta.S20 = () => ({ title: 'Mở ca thu ngân' });
  OpsMeta.S21 = () => ({ title: 'Đơn mang đi' });
  OpsMeta.S22 = () => ({ title: 'Đơn tại quán' });
  OpsMeta.S23 = p => ({ title: 'Thanh toán', back: '#/s22' });
  OpsMeta.S26 = () => ({ title: 'Đơn nháp chờ xác nhận' });
  OpsMeta.S27 = () => ({ title: 'Hóa đơn' });
  OpsMeta.S28 = () => ({ title: 'Chốt ca thu ngân' });

  const tabs = (active, n) => `<nav class="tabs" aria-label="Thu ngân">${TABS.map(([id, t]) => `<button class="chip" data-go="${id}" aria-pressed="${id === active}">${t}${id === 'S26' && n ? ` (${n})` : ''}</button>`).join('')}</nav>`;
  const wireTabs = (root, ctx) => root.addEventListener('click', e => { const g = e.target.closest('[data-go]'); if (g) ctx.nav('#/' + g.dataset.go.toLowerCase()); });
  const noShift = (root, ctx) => { root.innerHTML = `<div class="card empty"><div class="badge-ic">${Icons('lock')}</div><h2>Chưa mở ca thu ngân</h2><p class="muted" style="margin:0">Hãy mở ca trước khi tạo đơn hoặc thanh toán.</p><button class="btn btn-primary" id="o">Mở ca</button></div>`; $('#o', root).onclick = () => ctx.nav('#/s20'); };
  const shiftOf = async () => Api.get('/api/ops/shift');

  /* ---- S20 ---- */
  OpsScreens.S20 = (root, ctx) => {
    root.innerHTML = '<div class="m-wrap" id="w"><div class="skel"></div></div>'; const w = $('#w', root);
    const label = t => t === 'MORNING' ? 'Ca sáng (07:00 – 14:30)' : 'Ca tối (14:30 – 22:00)';
    shiftOf().then(s => {
      if (s.open) {
        w.innerHTML = `<div class="card" style="display:flex;flex-direction:column;gap:10px"><h2>Ca đang mở</h2><span class="badge ok">${label(s.shift.type)}</span>
          <div class="sum"><span>Mở lúc</span><b>${time(s.shift.openedAt)}</b></div><div class="sum"><span>Tiền mặt đầu ca</span><b>${money(s.shift.openingCash)}</b></div>
          <button class="btn btn-primary" data-go="S22">Vào làm việc</button><button class="btn btn-secondary" data-go="S28">Chốt ca</button></div>`;
        return;
      }
      const last = s.lastClosed;
      w.innerHTML = `<form class="card" id="f" style="display:flex;flex-direction:column;gap:14px" novalidate><h2>Mở phiên ca thu ngân</h2>
        <div class="grp"><div class="note ok-dot">✓ Không có phiên ca nào đang mở</div>${last ? `<div class="note ok-dot">✓ ${last.type === 'MORNING' ? 'Ca sáng' : 'Ca tối'} trước đã chốt</div>` : ''}</div>
        <div class="chips" role="radiogroup" aria-label="Ca làm việc"><button type="button" class="chip" data-t="MORNING" aria-pressed="true">Ca sáng</button><button type="button" class="chip" data-t="EVENING" aria-pressed="false">Ca tối</button></div>
        <div class="field" id="fc"><label for="cash">Tiền mặt đầu ca (đ)</label><div class="input-wrap" style="height:48px"><input id="cash" inputmode="numeric" value="500.000"></div><div class="field-error"></div></div>
        <div class="note">Kiểm đếm và nhập số tiền mặt có trong két.</div>
        <div style="display:flex;gap:10px"><button type="button" class="btn btn-secondary" id="out" style="flex:1">Đăng xuất</button><button class="btn btn-primary" id="go" style="flex:2">Mở ca</button></div></form>`;
      let type = 'MORNING'; const cash = $('#cash', w); moneyInput(cash);
      w.addEventListener('click', e => { const c = e.target.closest('[data-t]'); if (c) { type = c.dataset.t; $$('[data-t]', w).forEach(x => x.setAttribute('aria-pressed', String(x === c))); } if (e.target.closest('#out')) $('#um').click(); });
      cash.oninput = () => $('#fc', w).classList.remove('invalid');
      $('#f', w).onsubmit = e => { e.preventDefault(); const v = moneyVal(cash), f = $('#fc', w);
        if (!cash.value.trim()) { f.classList.add('invalid'); $('.field-error', f).textContent = 'Vui lòng nhập tiền mặt đầu ca.'; return; }
        guard($('#go', w), async () => { try { await Api.post('/api/ops/shift/open', { type, openingCash: v }); Toast.success('Đã mở ca', label(type), { key: 'shiftopen' }); ctx.nav('#/s22'); } catch (er) { fail(er, 'Không thể mở ca'); } }); };
    }).catch(e => { fail(e, 'Không tải được ca'); w.innerHTML = '<div class="card empty"><button class="btn btn-primary" id="rt">Thử lại</button></div>'; $('#rt', w).onclick = () => ctx.rerender(); });
    root.addEventListener('click', e => { const g = e.target.closest('[data-go]'); if (g) ctx.nav('#/' + g.dataset.go.toLowerCase()); });
    return () => {};
  };

  /* ---- S22 ---- */
  OpsScreens.S22 = (root, ctx) => {
    let tab = 'wait', list = [];
    root.innerHTML = '<div class="page" id="w"><div class="skel"></div></div>'; const w = $('#w', root);
    const p = poll(root, async () => { const s = await shiftOf(); return { s, o: s.open ? await Api.get('/api/ops/pending') : [] }; }, 4000);
    const draw = d => {
      if (!d.s.open) return noShift(w, ctx);
      list = d.o; const wait = list.filter(o => o.waitingPay), serve = list.filter(o => !o.waitingPay);
      const rows = (tab === 'wait' ? wait : serve);
      w.innerHTML = `${tabs('S22', d.s.drafts)}<div class="tabs"><button class="chip" data-tab="wait" aria-pressed="${tab === 'wait'}">Chờ thanh toán (${wait.length})</button><button class="chip" data-tab="serve" aria-pressed="${tab === 'serve'}">Đang phục vụ (${serve.length})</button>${tab === 'serve' ? '<span class="lbadge">Chỉ đọc</span>' : ''}</div>
        ${rows.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Bàn</th><th class="num">Số món</th><th>Trạng thái đơn</th><th>Tạm tính</th><th>Thao tác</th></tr></thead><tbody>${rows.map(o => {
          const act = o.lines.filter(l => l.status !== 'CANCELLED');
          return `<tr><td>Bàn ${o.tableNo}</td><td class="num">${act.reduce((a, l) => a + l.qty, 0)}</td><td>${o.waitingPay ? '<span class="lbadge DONE">Mọi món Done</span>' : '<span class="lbadge SERVING">Đang phục vụ</span>'}</td><td>${money(o.total)}</td>
          <td>${o.waitingPay ? `<button class="btn btn-primary btn-sm" data-pay="${o.id}">Thanh toán</button>` : `<button class="btn btn-secondary btn-sm" data-view="${o.id}">Xem / hủy món</button>`}</td></tr>`; }).join('')}</tbody></table></div>`
        : `<div class="card empty-sm">${tab === 'wait' ? 'Chưa có bàn nào chờ thanh toán.' : 'Chưa có bàn nào đang phục vụ.'}</div>`}`;
    };
    p.start(draw, e => { fail(e, 'Không tải được danh sách đơn'); if (!$('.tabs', w)) w.innerHTML = '<div class="card empty"><button class="btn btn-primary" id="rt">Thử lại</button></div>', $('#rt', w).onclick = () => p.force(); });
    wireTabs(root, ctx);
    w.addEventListener('click', async e => {
      const t = e.target.closest('[data-tab]'); if (t) { tab = t.dataset.tab; return p.force(); }
      const pay = e.target.closest('[data-pay]'); if (pay) return ctx.nav('#/s23?o=' + pay.dataset.pay);
      const v = e.target.closest('[data-view]'); if (!v) return;
      const o = list.find(x => x.id === Number(v.dataset.view)); if (!o) return;
      // Thu ngân chỉ hủy được dòng Mới (UC-15)
      const lines = o.lines.filter(l => l.status !== 'CANCELLED');
      const scrim = document.createElement('div'); scrim.className = 'scrim sheet-scrim';
      scrim.innerHTML = `<div class="sheet" role="dialog" aria-modal="true" aria-label="Đơn Bàn ${o.tableNo}"><div style="display:flex;justify-content:space-between"><h3>Đơn Bàn ${o.tableNo}</h3><button class="icon-btn" data-x aria-label="Đóng">${Icons('close')}</button></div>
        ${lines.map(l => `<div class="lrow"><div class="top"><div><b>${l.qty}× ${esc(l.name)}</b><div class="muted-s">${esc(optText(l))}</div></div><span class="lbadge ${l.status}">${LSTAT[l.status]}</span></div>${l.status === 'NEW' ? `<button class="btn btn-danger-text btn-sm" data-c="${l.id}">Hủy món</button>` : ''}</div>`).join('')}</div>`;
      const close = () => { scrim.classList.add('closing'); setTimeout(() => scrim.remove(), 170); };
      scrim.addEventListener('click', async ev => {
        if (ev.target === scrim || ev.target.closest('[data-x]')) return close();
        const c = ev.target.closest('[data-c]'); if (!c) return;
        const l = lines.find(x => x.id === Number(c.dataset.c));
        if (!await Dialog.confirm({ title: 'Hủy món này?', text: `${l.qty}× ${l.name} (Mới).`, ok: 'Hủy món', cancel: 'Không', danger: true, icon: 'warn' })) return;
        guard(c, async () => { try { await Api.post(`/api/ops/orders/${o.id}/lines/${l.id}/cancel`, {}); Toast.success('Đã hủy ' + l.name, null, { key: 'cx' + l.id }); close(); } catch (er) { fail(er, 'Không thể hủy món'); } p.force(); });
      });
      $('#dialog-root').appendChild(scrim);
    });
    return () => p.stop();
  };

  /* ---- S21 ---- */
  OpsScreens.S21 = (root, ctx) => {
    root.innerHTML = '<div class="page" id="w"><div class="skel"></div></div>'; const w = $('#w', root);
    let menu = null, group = 'Đồ uống lạnh', method = 'CASH';
    const save = c => cart.save('take', c);
    shiftOf().then(async s => {
      if (!s.open) return noShift(w, ctx);
      menu = await Api.get('/api/ops/menu'); draw(s);
    }).catch(e => { fail(e, 'Không tải được dữ liệu'); w.innerHTML = '<div class="card empty"><button class="btn btn-primary" id="rt">Thử lại</button></div>'; $('#rt', w).onclick = () => ctx.rerender(); });
    function draw(s) {
      const c = cart.load('take'); const total = c.lines.reduce((a, l) => a + l.unitPrice * l.qty, 0), rounded = roundTo500(total);
      const items = menu.items.filter(i => i.takeaway && (group === 'Bánh' ? i.cake : !i.cake));
      const keep = $('#recv', w) ? $('#recv', w).value : '';
      w.innerHTML = `${tabs('S21', s.drafts)}<div class="two"><div style="display:flex;flex-direction:column;gap:12px"><div class="chips"><button class="chip" data-g="Đồ uống lạnh" aria-pressed="${group === 'Đồ uống lạnh'}">Đồ uống lạnh</button><button class="chip" data-g="Bánh" aria-pressed="${group === 'Bánh'}">Bánh</button></div>
        <div class="pick">${items.map(i => { const off = i.status !== 'ACTIVE'; return `<div class="mrow ${off ? 'off' : ''}"><div class="thumb">${Icons('cup')}</div><div class="grow"><b>${esc(i.name)}</b><small>từ ${money(i.sizes[0].price)}</small>${off ? '<div><span class="lbadge CANCELLED">Hết hàng</span></div>' : ''}</div><button class="add-btn" data-i="${i.id}" ${off ? 'disabled' : ''} aria-label="Thêm ${esc(i.name)}">${Icons('plus')}</button></div>`; }).join('')}</div>
        <div class="note">Đơn mang đi chỉ bán đồ uống lạnh và bánh.</div></div>
        <aside class="card" style="display:flex;flex-direction:column;gap:10px"><h3>Giỏ đơn (${c.lines.reduce((a, l) => a + l.qty, 0)})</h3>
        ${c.lines.length ? c.lines.map((l, i) => `<div class="lrow"><div class="top"><div><b>${esc(l.name)}</b><div class="muted-s">${esc(lineDesc(l))}</div></div><b>${money(l.unitPrice * l.qty)}</b></div><div style="display:flex;justify-content:space-between"><div class="stepper"><button data-q="-1" data-i="${i}" aria-label="Giảm" ${l.qty <= 1 ? 'disabled' : ''}>${Icons('minus')}</button><span>${l.qty}</span><button data-q="1" data-i="${i}" aria-label="Tăng">${Icons('plus')}</button></div><button class="btn btn-ghost btn-sm" data-rm="${i}" style="color:var(--destructive)">Xóa</button></div></div>`).join('') : '<div class="empty-sm">Chưa có món nào.</div>'}
        <div class="sum"><span>Tạm tính</span><b>${money(total)}</b></div><div class="sum big"><span>Khách trả (làm tròn 500đ)</span><span>${money(rounded)}</span></div>
        <div class="chips"><button class="chip" data-m="CASH" aria-pressed="${method === 'CASH'}">Tiền mặt</button><button class="chip" data-m="TRANSFER" aria-pressed="${method === 'TRANSFER'}">Chuyển khoản / QR</button></div>
        ${method === 'CASH' ? `<div class="field" id="fr"><label for="recv">Tiền khách đưa (đ)</label><div class="input-wrap" style="height:48px"><input id="recv" inputmode="numeric" value="${keep}" placeholder="0"></div><div class="field-error"></div></div><div class="chips">${[rounded, 50000, 100000, 200000, 500000].filter((v, i, a) => v > 0 && a.indexOf(v) === i).map(v => `<button class="chip btn-sm" data-q2="${v}">${money(v)}</button>`).join('')}</div><div class="sum"><span>Tiền thối</span><b id="chg">—</b></div>`
          : '<div class="note">Chuyển khoản/QR: tạo đơn nháp, chờ bạn xác nhận đã nhận đủ tiền ở tab Đơn nháp. Đơn nháp chưa hiện ở màn hình pha chế.</div>'}
        <button class="btn btn-primary btn-block" id="ok" style="min-height:52px" ${c.lines.length ? '' : 'disabled'}>${method === 'CASH' ? 'Xác nhận đơn · Thanh toán' : 'Tạo đơn nháp chuyển khoản/QR'}</button></aside></div>`;
      if (method === 'CASH') { const r = $('#recv', w); moneyInput(r); const upd = () => { const v = moneyVal(r); $('#chg', w).textContent = v >= rounded && rounded ? money(v - rounded) : '—'; $('#fr', w).classList.remove('invalid'); }; r.oninput = upd; r.addEventListener('input', upd); upd(); }
    }
    root.addEventListener('click', async e => {
      if (!menu) return;
      const g = e.target.closest('[data-g]'); if (g) { group = g.dataset.g; return shiftOf().then(draw); }
      const m = e.target.closest('[data-m]'); if (m) { method = m.dataset.m; return shiftOf().then(draw); }
      const a = e.target.closest('.add-btn'); if (a && !a.disabled) {
        const item = menu.items.find(i => i.id === Number(a.dataset.i)); const line = await optionSheet(item, menu.toppings, { takeaway: true });
        if (line) { const c = cart.load('take'); c.lines.push(line); save(c); shiftOf().then(draw); } return; }
      const q = e.target.closest('[data-q]'); if (q) { const c = cart.load('take'); const l = c.lines[q.dataset.i]; l.qty = Math.min(20, Math.max(1, l.qty + Number(q.dataset.q))); save(c); return shiftOf().then(draw); }
      const rm = e.target.closest('[data-rm]'); if (rm) { const c = cart.load('take'); c.lines.splice(rm.dataset.rm, 1); save(c); return shiftOf().then(draw); }
      const q2 = e.target.closest('[data-q2]'); if (q2) { const r = $('#recv', w); r.value = Number(q2.dataset.q2).toLocaleString('vi-VN'); r.dispatchEvent(new Event('input')); return; }
      const ok = e.target.closest('#ok'); if (!ok) return;
      const c = cart.load('take'); const rounded = roundTo500(c.lines.reduce((a, l) => a + l.unitPrice * l.qty, 0));
      let received = null;
      if (method === 'CASH') { received = moneyVal($('#recv', w)); if (received < rounded) { const f = $('#fr', w); f.classList.add('invalid'); $('.field-error', f).textContent = `Tiền khách đưa chưa đủ ${money(rounded)}.`; $('#recv', w).focus(); return; } }
      if (!await Dialog.confirm({ title: method === 'CASH' ? 'Xác nhận thanh toán?' : 'Tạo đơn nháp?', text: method === 'CASH' ? `Thu ${money(rounded)} bằng tiền mặt.` : `Đơn ${money(rounded)} sẽ chờ bạn xác nhận đã nhận chuyển khoản/QR.`, ok: 'Xác nhận', cancel: 'Xem lại', icon: 'check' })) return;
      guard(ok, async () => { try {
        const o = await Api.post('/api/ops/takeaway', { lines: c.lines.map(toPayload), method, received });
        cart.clear('take');
        if (o.status === 'DRAFT') { Toast.success('Đã tạo đơn nháp', 'Hãy xác nhận khi đã nhận đủ tiền.', { key: 'draft' + o.id }); ctx.nav('#/s26'); }
        else { Toast.success('Đã thanh toán ' + o.invoiceNo, `Đơn #${String(o.seq).padStart(3, '0')} đã chuyển cho pha chế.`, { key: 'paid' + o.id }); ctx.nav('#/s27?o=' + o.id); }
      } catch (er) { fail(er, 'Không thể tạo đơn'); } });
    });
    return () => {};
  };

  /* ---- S23 ---- */
  OpsScreens.S23 = (root, ctx) => {
    const id = Number(ctx.params.get('o')); let method = 'CASH', order = null;
    root.innerHTML = '<div class="page" id="w"><div class="skel"></div></div>'; const w = $('#w', root);
    Promise.all([shiftOf(), Api.get('/api/ops/orders/' + id)]).then(([s, o]) => { order = o; if (!s.open) return noShift(w, ctx); draw(); }).catch(e => { fail(e, 'Không tải được đơn'); w.innerHTML = '<div class="card empty"><h3>Không tìm thấy đơn</h3><button class="btn btn-primary" id="b">Về danh sách</button></div>'; $('#b', w).onclick = () => ctx.nav('#/s22'); });
    function draw() {
      const o = order; const act = o.lines.filter(l => l.status !== 'CANCELLED'); const diff = o.rounded - o.total;
      if (o.status !== 'OPEN' || !o.waitingPay) { w.innerHTML = '<div class="card empty"><h3>Đơn này không còn chờ thanh toán</h3><button class="btn btn-primary" id="b">Về danh sách</button></div>'; $('#b', w).onclick = () => ctx.nav('#/s22'); return; }
      const keep = $('#recv', w) ? $('#recv', w).value : '';
      w.innerHTML = `<div class="two"><div class="card" style="display:flex;flex-direction:column;gap:8px"><h3>Chi tiết đơn · Bàn ${o.tableNo}</h3>${act.map(l => `<div class="sum"><span>${l.qty}× ${esc(l.name)}<div class="muted-s">${esc(optText(l))}</div></span><span>${money(l.total ?? l.unitPrice * l.qty)}</span></div>`).join('')}
        <div class="sum"><span>Tạm tính</span><b>${money(o.total)}</b></div><div class="sum"><span>Làm tròn 500đ</span><b>${diff >= 0 ? '+' : '−'}${money(Math.abs(diff))}</b></div><div class="sum big"><span>Khách trả</span><span>${money(o.rounded)}</span></div></div>
        <div class="card" style="display:flex;flex-direction:column;gap:12px"><h3>Phương thức thanh toán</h3><div class="chips"><button class="chip" data-m="CASH" aria-pressed="${method === 'CASH'}">Tiền mặt</button><button class="chip" data-m="TRANSFER" aria-pressed="${method === 'TRANSFER'}">Chuyển khoản / QR</button></div>
        ${method === 'CASH' ? `<div class="field" id="fr"><label for="recv">Tiền khách đưa (đ)</label><div class="input-wrap" style="height:48px"><input id="recv" inputmode="numeric" value="${keep}" placeholder="0"></div><div class="field-error"></div></div><div class="chips">${[o.rounded, 50000, 100000, 200000, 500000].filter((v, i, a) => v > 0 && a.indexOf(v) === i).map(v => `<button class="chip btn-sm" data-q2="${v}">${money(v)}</button>`).join('')}</div><div class="sum"><span>Tiền thối</span><b id="chg">—</b></div>` : '<div class="note">Hãy tự kiểm tra đã nhận đủ chuyển khoản/QR rồi mới xác nhận.</div>'}
        <div style="display:flex;gap:10px"><button class="btn btn-secondary" id="cx" style="flex:1">Hủy</button><button class="btn btn-primary" id="ok" style="flex:2">Xác nhận thanh toán · In hóa đơn</button></div></div></div>`;
      if (method === 'CASH') { const r = $('#recv', w); moneyInput(r); const upd = () => { const v = moneyVal(r); $('#chg', w).textContent = v >= o.rounded ? money(v - o.rounded) : '—'; $('#fr', w).classList.remove('invalid'); }; r.addEventListener('input', upd); upd(); }
    }
    w.addEventListener('click', async e => {
      if (!order) return;
      const m = e.target.closest('[data-m]'); if (m) { method = m.dataset.m; return draw(); }
      const q2 = e.target.closest('[data-q2]'); if (q2) { const r = $('#recv', w); r.value = Number(q2.dataset.q2).toLocaleString('vi-VN'); r.dispatchEvent(new Event('input')); return; }
      if (e.target.closest('#cx')) return ctx.nav('#/s22');
      const ok = e.target.closest('#ok'); if (!ok) return;
      let received = null;
      if (method === 'CASH') { received = moneyVal($('#recv', w)); if (received < order.rounded) { const f = $('#fr', w); f.classList.add('invalid'); $('.field-error', f).textContent = `Tiền khách đưa chưa đủ ${money(order.rounded)}.`; $('#recv', w).focus(); return; } }
      if (!await Dialog.confirm({ title: 'Xác nhận thanh toán?', text: `Bàn ${order.tableNo} · ${money(order.rounded)} · ${method === 'CASH' ? 'Tiền mặt' : 'Chuyển khoản/QR'}`, ok: 'Xác nhận', cancel: 'Xem lại', icon: 'check' })) return;
      guard(ok, async () => { try { const o = await Api.post(`/api/ops/orders/${order.id}/pay`, { method, received }); Toast.success('Đã thanh toán ' + o.invoiceNo, `Bàn ${o.tableNo} đã Trống.`, { key: 'paid' + o.id }); ctx.nav('#/s27?o=' + o.id); } catch (er) { fail(er, 'Không thể thanh toán'); } });
    });
    return () => {};
  };

  /* ---- S27 ---- */
  OpsScreens.S27 = (root, ctx) => {
    const id = Number(ctx.params.get('o')); root.innerHTML = '<div class="page" id="w"><div class="skel"></div></div>'; const w = $('#w', root);
    Api.get('/api/ops/orders/' + id).then(o => {
      const act = o.lines.filter(l => l.status !== 'CANCELLED'); const diff = o.rounded - o.total;
      w.innerHTML = `<div id="rcpt" class="rcpt"><div class="c"><b style="font-size:17px">2006 COFFEE</b></div><div class="c"><b>HÓA ĐƠN BÁN HÀNG</b></div><div class="c">${esc(o.invoiceNo)} · ${dt(o.paidAt)}</div><div class="c">${o.type === 'DINE' ? 'Bàn ' + o.tableNo : 'Mang đi #' + String(o.seq).padStart(3, '0')} · ${esc(o.createdBy || '')}</div><hr>
        ${act.map(l => `<div class="r"><span>${l.qty}× ${esc(l.name)} (${esc(l.size)}${l.toppings && l.toppings.length ? ', + ' + esc(l.toppings.join(', ')) : ''})</span><span>${(l.unitPrice * l.qty).toLocaleString('vi-VN')}</span></div>`).join('')}<hr>
        <div class="r"><span>Tạm tính</span><span>${o.total.toLocaleString('vi-VN')}</span></div><div class="r"><span>Làm tròn</span><span>${diff.toLocaleString('vi-VN')}</span></div><hr>
        <div class="r"><b style="font-size:15px">KHÁCH TRẢ</b><b style="font-size:15px">${o.rounded.toLocaleString('vi-VN')}</b></div>
        <div class="r"><span>${o.payMethod === 'CASH' ? 'Tiền mặt' : 'Chuyển khoản/QR'}</span><span>${(o.received ?? o.rounded).toLocaleString('vi-VN')}</span></div>${o.payMethod === 'CASH' ? `<div class="r"><span>Tiền thối</span><span>${(o.change || 0).toLocaleString('vi-VN')}</span></div>` : ''}<hr><div class="c">Giá đã bao gồm thuế. Cảm ơn quý khách!</div></div>
        <div style="display:flex;gap:10px;max-width:380px;margin:0 auto;width:100%"><button class="btn btn-secondary" id="x" style="flex:1">Đóng</button><button class="btn btn-primary" id="pr" style="flex:2">${Icons('print')} In hóa đơn</button></div>`;
      $('#x', w).onclick = () => ctx.nav(o.type === 'DINE' ? '#/s22' : '#/s21'); $('#pr', w).onclick = () => window.print();
    }).catch(e => { fail(e, 'Không tải được hóa đơn'); w.innerHTML = '<div class="card empty"><h3>Không tìm thấy hóa đơn</h3><button class="btn btn-primary" id="b">Quay lại</button></div>'; $('#b', w).onclick = () => ctx.nav('#/s22'); });
    return () => {};
  };

  /* ---- S26 ---- */
  OpsScreens.S26 = (root, ctx) => {
    root.innerHTML = '<div class="page" id="w"><div class="skel"></div></div>'; const w = $('#w', root);
    const p = poll(root, async () => { const s = await shiftOf(); return { s, d: s.open ? await Api.get('/api/ops/drafts') : [] }; }, 4000);
    p.start(d => {
      if (!d.s.open) return noShift(w, ctx);
      w.innerHTML = `${tabs('S26', d.d.length)}${d.d.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Tạo lúc</th><th>Món</th><th class="num">Số tiền cần nhận</th><th>Thao tác</th></tr></thead><tbody>${d.d.map(o => `<tr><td>${time(o.createdAt)}</td><td>${o.lines.map(l => `${l.qty}× ${esc(l.name)}`).join('; ')}</td><td class="num">${money(o.rounded)}</td>
        <td style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn btn-primary btn-sm" data-ok="${o.id}">Đã nhận đủ tiền</button><button class="btn btn-danger-text btn-sm" data-no="${o.id}">Hủy đơn nháp</button></td></tr>`).join('')}</tbody></table></div>` : '<div class="card empty-sm">Không có đơn nháp nào.</div>'}
        <div class="note">Đơn nháp không hiện ở màn hình pha chế, không giữ nguyên liệu và chưa có số thứ tự. Hủy → đơn bị hủy, không có hóa đơn.</div>`;
    }, e => fail(e, 'Không tải được đơn nháp'));
    wireTabs(root, ctx);
    w.addEventListener('click', async e => {
      const ok = e.target.closest('[data-ok]'), no = e.target.closest('[data-no]');
      if (ok) { if (!await Dialog.confirm({ title: 'Đã nhận đủ tiền?', text: 'Bạn xác nhận đã tự kiểm tra tiền chuyển khoản/QR. Hệ thống sẽ phát hành hóa đơn và chuyển đơn cho pha chế.', ok: 'Xác nhận', cancel: 'Chưa', icon: 'check' })) return;
        guard(ok, async () => { try { const o = await Api.post(`/api/ops/drafts/${ok.dataset.ok}/confirm`); Toast.success('Đã phát hành ' + o.invoiceNo, `Đơn #${String(o.seq).padStart(3, '0')} đã chuyển cho pha chế.`, { key: 'cf' + o.id }); ctx.nav('#/s27?o=' + o.id); } catch (er) { fail(er, 'Không thể xác nhận đơn'); p.force(); } }); }
      if (no) { if (!await Dialog.confirm({ title: 'Hủy đơn nháp?', text: 'Đơn sẽ bị hủy và không có hóa đơn.', ok: 'Hủy đơn nháp', cancel: 'Không', danger: true, icon: 'warn' })) return;
        guard(no, async () => { try { await Api.post(`/api/ops/drafts/${no.dataset.no}/cancel`); Toast.success('Đã hủy đơn nháp', null, { key: 'dc' + no.dataset.no }); } catch (er) { fail(er, 'Không thể hủy đơn nháp'); } p.force(); }); }
    });
    return () => p.stop();
  };

  /* ---- S28 ---- */
  OpsScreens.S28 = (root, ctx) => {
    root.innerHTML = '<div class="page" id="w"><div class="skel"></div></div>'; const w = $('#w', root);
    const p = poll(root, shiftOf, 4000);
    p.start(s => {
      if (!s.open) return noShift(w, ctx);
      const keep = $('#act', w) ? $('#act', w).value : '';
      w.innerHTML = `${tabs('S28', s.drafts)}<div class="two"><div class="card" style="display:flex;flex-direction:column;gap:6px"><h3>Đối soát tiền mặt</h3>
        <div class="sum"><span>Tiền mặt đầu ca</span><b>${money(s.shift.openingCash)}</b></div><div class="sum"><span>+ Doanh thu tiền mặt trong ca</span><b>${money(s.cashSales)}</b></div><div class="sum big"><span>Tiền mặt dự kiến</span><span>${money(s.expected)}</span></div>
        <div class="field" id="fa"><label for="act">Tiền mặt kiểm đếm thực tế (đ)</label><div class="input-wrap" style="height:48px"><input id="act" inputmode="numeric" value="${keep}" placeholder="0"></div><div class="field-error"></div></div>
        <div class="sum big"><span>Chênh lệch (thực tế − dự kiến)</span><span id="df">—</span></div></div>
        <div class="card" style="display:flex;flex-direction:column;gap:10px"><h3>Điều kiện chốt ca</h3>
        <div class="${s.drafts ? 'no-dot' : 'ok-dot'}">${s.drafts ? `✗ Còn ${s.drafts} đơn nháp, hãy xác nhận hoặc hủy` : '✓ Không còn đơn nháp'}</div>
        ${s.drafts ? '<button class="btn btn-secondary" data-go="S26">Mở danh sách đơn nháp</button>' : ''}
        <button class="btn btn-primary" id="close" ${s.drafts ? 'disabled' : ''}>Xác nhận chốt ca</button>
        <div class="note">Hóa đơn đã thanh toán còn món đang pha và đơn tại quán còn mở sẽ được bàn giao sang ca sau.</div></div></div>`;
      const a = $('#act', w); moneyInput(a); const upd = () => { const f = $('#fa', w); f.classList.remove('invalid'); $('#df', w).textContent = a.value ? ((moneyVal(a) - s.expected >= 0 ? '+' : '−') + money(Math.abs(moneyVal(a) - s.expected))) : '—'; }; a.addEventListener('input', upd); upd();
      w._s = s;
    }, e => fail(e, 'Không tải được ca'));
    wireTabs(root, ctx);
    w.addEventListener('click', async e => {
      const c = e.target.closest('#close'); if (!c) return;
      const f = $('#fa', w), a = $('#act', w);
      if (!a.value.trim()) { f.classList.add('invalid'); $('.field-error', f).textContent = 'Vui lòng nhập tiền mặt kiểm đếm thực tế.'; a.focus(); return; }
      const v = moneyVal(a); const s = w._s, d = v - s.expected;
      if (!await Dialog.confirm({ title: 'Chốt ca?', text: `Dự kiến ${money(s.expected)}, thực tế ${money(v)}, chênh lệch ${d >= 0 ? '+' : '−'}${money(Math.abs(d))}.`, ok: 'Chốt ca', cancel: 'Xem lại', icon: 'check' })) return;
      guard(c, async () => { try { const r = await Api.post('/api/ops/shift/close', { actualCash: v }); Toast.success('Đã chốt ca', `Chênh lệch ${r.diff >= 0 ? '+' : '−'}${money(Math.abs(r.diff))}.`, { key: 'closed' }); ctx.nav('#/s20'); } catch (er) { fail(er, 'Không thể chốt ca'); p.force(); } });
    });
    return () => p.stop();
  };
})();
