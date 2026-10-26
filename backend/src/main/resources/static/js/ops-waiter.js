/* Phục vụ: S10 sơ đồ bàn, S11 chọn món, S12 xác nhận gửi đơn, S13 chi tiết đơn, S14 chuyển bàn (S15 là hộp thoại hủy món) */
(() => {
  const { $, $$, esc, money, time, fail, guard, poll, optionSheet, cart, toPayload, lineDesc, LSTAT, optText } = O;
  const ST = { EMPTY: 'Trống', SERVING: 'Đang phục vụ', WAITING_PAY: 'Chờ thanh toán' };
  const tableOf = p => Number(p.get('t'));

  OpsMeta.S10 = () => ({ title: 'Sơ đồ bàn' });
  OpsMeta.S11 = p => ({ title: `Bàn ${tableOf(p)} · Chọn món`, back: '#/s10' });
  OpsMeta.S12 = p => ({ title: `Bàn ${tableOf(p)} · Xác nhận đơn`, back: `#/s11?t=${tableOf(p)}` });
  OpsMeta.S13 = p => ({ title: `Bàn ${tableOf(p)} · Chi tiết đơn`, back: '#/s10' });
  OpsMeta.S14 = p => ({ title: `Chuyển bàn ${tableOf(p)}`, back: `#/s13?t=${tableOf(p)}` });

  /* ---- S10 ---- */
  OpsScreens.S10 = (root, ctx) => {
    root.innerHTML = '<div class="m-wrap" id="w"><div class="tgrid"><div class="skel"></div><div class="skel"></div><div class="skel"></div><div class="skel"></div></div></div>';
    const w = $('#w', root);
    const p = poll(root, () => Api.get('/api/ops/tables'), 4000);
    const card = t => `<button class="tcard ${t.status === 'SERVING' ? 'serving' : t.status === 'WAITING_PAY' ? 'waiting' : ''}" data-t="${t.no}" data-s="${t.status}" aria-label="Bàn ${t.no}, ${ST[t.status]}"><b>Bàn ${t.no}</b><span>${ST[t.status]}</span></button>`;
    const draw = tbl => {
      const zone = z => tbl.filter(t => t.zone === z);
      w.innerHTML = `<div class="legend"><span class="lbadge">Trống</span><span class="lbadge SERVING">Đang phục vụ</span><span class="lbadge WAITING">Chờ thanh toán</span></div>
        <h2 class="sec-title">Góc Hoài Niệm (${zone('Góc Hoài Niệm').length} bàn)</h2><div class="tgrid">${zone('Góc Hoài Niệm').map(card).join('')}</div>
        <h2 class="sec-title">Hiên Nắng (${zone('Hiên Nắng').length} bàn)</h2><div class="tgrid">${zone('Hiên Nắng').map(card).join('')}</div>
        <div class="note">Chạm bàn Trống để tạo đơn; bàn có đơn để xem đơn.</div>`;
    };
    p.start(draw, e => {
      if (!$('.tgrid .tcard', w)) { w.innerHTML = `<div class="card empty"><div class="badge-ic">${Icons('error')}</div><h3>Không tải được sơ đồ bàn</h3><p class="muted" style="margin:0">${esc(e.message || '')}</p><button class="btn btn-primary" id="rt">Thử lại</button></div>`; $('#rt', w).onclick = () => { w.innerHTML = '<div class="tgrid"><div class="skel"></div><div class="skel"></div></div>'; p.force(); }; }
      O.fail(e, 'Không tải được sơ đồ bàn');
    });
    w.addEventListener('click', e => {
      const b = e.target.closest('.tcard'); if (!b) return;
      const t = b.dataset.t, s = b.dataset.s;
      const c = cart.load('dine'); if (c.table !== Number(t)) cart.clear('dine');
      ctx.nav(s === 'EMPTY' ? `#/s11?t=${t}` : `#/s13?t=${t}`);
    });
    return () => p.stop();
  };

  /* ---- S11 ---- */
  OpsScreens.S11 = (root, ctx) => {
    const t = tableOf(ctx.params);
    let menu = null, group = 'Coffee';
    const c = cart.load('dine'); if (c.table !== t) { c.table = t; c.lines = []; cart.save('dine', c); }
    root.innerHTML = '<div class="m-wrap" id="w"><div class="skel"></div><div class="skel"></div><div class="skel"></div></div>';
    const w = $('#w', root);
    const draw = () => {
      const cc = cart.load('dine'); const n = cc.lines.reduce((a, l) => a + l.qty, 0);
      const items = menu.items.filter(i => i.group === group);
      w.innerHTML = `<div class="chips" role="tablist">${menu.groups.map(g => `<button class="chip" role="tab" data-g="${g}" aria-pressed="${g === group}">${g}</button>`).join('')}</div>
        <div style="display:flex;flex-direction:column;gap:10px">${items.map(i => {
          const off = i.status !== 'ACTIVE';
          return `<div class="mrow ${off ? 'off' : ''}"><div class="thumb">${Icons('cup')}</div><div class="grow"><b>${esc(i.name)}</b><small>từ ${money(i.sizes[0].price)}</small>${off ? '<div><span class="lbadge CANCELLED">Hết hàng</span></div>' : ''}</div>
          <button class="add-btn" data-i="${i.id}" ${off ? 'disabled' : ''} aria-label="Thêm ${esc(i.name)}">${Icons('plus')}</button></div>`; }).join('')}</div>
        <div class="bar glass"><span class="grow">Đơn đang soạn: ${n} món</span><button class="btn btn-primary" id="rv" ${n ? '' : 'disabled'}>Xem lại &amp; gửi</button></div>`;
    };
    w.addEventListener('click', async e => {
      const g = e.target.closest('[data-g]'); if (g) { group = g.dataset.g; return draw(); }
      const a = e.target.closest('.add-btn'); if (a && !a.disabled) {
        const item = menu.items.find(i => i.id === Number(a.dataset.i));
        const line = await optionSheet(item, menu.toppings);
        if (line) { const cc = cart.load('dine'); cc.table = t; cc.lines.push(line); cart.save('dine', cc); Toast.success('Đã thêm ' + item.name, null, { key: 'add:' + item.id, duration: 1800 }); draw(); }
        return;
      }
      if (e.target.closest('#rv')) ctx.nav(`#/s12?t=${t}`);
    });
    Api.get('/api/ops/menu').then(m => { menu = m; draw(); }).catch(e => {
      w.innerHTML = `<div class="card empty"><div class="badge-ic">${Icons('error')}</div><h3>Không tải được thực đơn</h3><button class="btn btn-primary" id="rt">Thử lại</button></div>`;
      $('#rt', w).onclick = () => ctx.rerender(); fail(e, 'Không tải được thực đơn');
    });
    return () => {};
  };

  /* ---- S12 ---- */
  OpsScreens.S12 = (root, ctx) => {
    const t = tableOf(ctx.params);
    const w = document.createElement('div'); w.className = 'm-wrap'; root.appendChild(w);
    const draw = () => {
      const c = cart.load('dine');
      if (!c.lines.length) { w.innerHTML = `<div class="card empty"><div class="badge-ic">${Icons('info')}</div><h3>Đơn chưa có món nào</h3><button class="btn btn-primary" id="back">Chọn món</button></div>`; $('#back', w).onclick = () => ctx.nav(`#/s11?t=${t}`); return; }
      const total = c.lines.reduce((a, l) => a + l.unitPrice * l.qty, 0);
      w.innerHTML = `<div style="display:flex;flex-direction:column;gap:10px">${c.lines.map((l, i) => `<div class="lrow"><div class="top"><div><b>${esc(l.name)}</b><div class="muted-s">${esc(lineDesc(l))}</div></div><b>${money(l.unitPrice * l.qty)}</b></div>
        <div style="display:flex;justify-content:space-between;align-items:center"><div class="stepper"><button data-q="-1" data-i="${i}" aria-label="Giảm" ${l.qty <= 1 ? 'disabled' : ''}>${Icons('minus')}</button><span>${l.qty}</span><button data-q="1" data-i="${i}" aria-label="Tăng" ${l.qty >= 20 ? 'disabled' : ''}>${Icons('plus')}</button></div>
        <button class="btn btn-ghost btn-sm" data-rm="${i}" style="color:var(--destructive)">${Icons('trash')} Xóa</button></div></div>`).join('')}</div>
        <div class="card"><div class="sum big" style="border:0;margin:0;padding:0"><span>Tạm tính</span><span>${money(total)}</span></div><div class="note">Giá và khuyến mãi được chốt khi gửi đơn.</div></div>
        <button class="btn btn-secondary btn-block" id="more">+ Thêm món</button>
        <button class="btn btn-primary btn-block" id="send" style="min-height:52px">Gửi đơn</button>`;
    };
    w.addEventListener('click', async e => {
      const c = cart.load('dine');
      const q = e.target.closest('[data-q]'); if (q) { const l = c.lines[q.dataset.i]; l.qty = Math.min(20, Math.max(1, l.qty + Number(q.dataset.q))); cart.save('dine', c); return draw(); }
      const rm = e.target.closest('[data-rm]'); if (rm) { const [gone] = c.lines.splice(rm.dataset.rm, 1); cart.save('dine', c); draw();
        Toast.info('Đã xóa ' + gone.name, null, { key: 'rm', undo: () => { const cc = cart.load('dine'); cc.lines.splice(Number(rm.dataset.rm), 0, gone); cart.save('dine', cc); draw(); } }); return; }
      if (e.target.closest('#more')) return ctx.nav(`#/s11?t=${t}`);
      const send = e.target.closest('#send'); if (!send) return;
      const total = c.lines.reduce((a, l) => a + l.unitPrice * l.qty, 0);
      const ok = await Dialog.confirm({ title: 'Gửi đơn cho pha chế?', text: `Bàn ${t} · ${c.lines.reduce((a, l) => a + l.qty, 0)} món · ${money(total)}`, ok: 'Gửi đơn', cancel: 'Xem lại', icon: 'check' });
      if (!ok) return;
      guard(send, async () => {
        try {
          const o = await Api.post(`/api/ops/tables/${t}/orders`, { lines: c.lines.map(toPayload) });
          cart.clear('dine'); Toast.success('Đã gửi đơn Bàn ' + t, `${o.lines.filter(l => l.status !== 'CANCELLED').length} món đang chờ pha chế.`, { key: 'sent' + t });
          ctx.nav('#/s10');
        } catch (er) {
          if (er.code === 'WAITING_PAY') { cart.clear('dine'); ctx.nav('#/s10'); }
          fail(er, 'Không thể gửi đơn');   // giữ nguyên giỏ để người dùng chỉnh lại
        }
      });
    });
    draw();
    return () => {};
  };

  /* ---- S13 ---- */
  OpsScreens.S13 = (root, ctx) => {
    const t = tableOf(ctx.params), role = ctx.user.role;
    const w = document.createElement('div'); w.className = 'm-wrap'; root.appendChild(w);
    w.innerHTML = '<div class="skel"></div><div class="skel"></div>';
    let seen = null, order = null;
    const p = poll(root, async () => { try { return await Api.get(`/api/ops/tables/${t}/order`); } catch (e) { if (e.code === 'NO_ORDER') return { none: true }; throw e; } }, 3000);
    const draw = o => {
      if (o.none) { w.innerHTML = `<div class="card empty"><div class="badge-ic">${Icons('info')}</div><h3>Bàn ${t} chưa có đơn</h3><p class="muted" style="margin:0">Đơn đã thanh toán hoặc đã hủy.</p><button class="btn btn-primary" id="b">Về sơ đồ bàn</button></div>`; $('#b', w).onclick = () => ctx.nav('#/s10'); order = null; return; }
      order = o;
      if (seen) o.lines.forEach(l => { if (l.status === 'DONE' && seen[l.id] && seen[l.id] !== 'DONE') Toast.success(`Bàn ${t}: ${l.name} đã hoàn thành`, null, { key: 'done' + l.id }); });
      seen = Object.fromEntries(o.lines.map(l => [l.id, l.status]));
      const active = o.lines.filter(l => l.status !== 'CANCELLED');
      const canFinish = active.length && active.every(l => l.status === 'DONE');
      w.innerHTML = `<div style="display:flex;gap:8px;align-items:center"><span class="lbadge ${o.waitingPay ? 'WAITING' : 'SERVING'}">${o.waitingPay ? 'Chờ thanh toán' : 'Đang phục vụ'}</span><span class="muted-s">Tạo lúc ${time(o.createdAt)}</span></div>
        <div style="display:flex;flex-direction:column;gap:10px">${o.lines.map(l => {
          const canCancel = (l.status === 'NEW') || (l.status === 'MAKING');
          const ownerOnly = l.status === 'MAKING' && role !== 'OWNER';
          return `<div class="lrow ${l.status === 'CANCELLED' ? 'cancelled' : ''}"><div class="top"><div><b>${l.qty}× ${esc(l.name)}</b><div class="muted-s">${esc(optText(l))}</div><div class="muted-s">gửi ${time(l.sentAt)}</div></div><span class="lbadge ${l.status}">${LSTAT[l.status]}</span></div>
          ${canCancel && !o.waitingPay ? `<button class="btn btn-danger-text btn-sm" data-c="${l.id}" ${ownerOnly ? 'disabled title="Chỉ Chủ quán/Quản lý được hủy món đang pha"' : ''}>${ownerOnly ? 'Hủy món (chỉ Chủ quán/Quản lý)' : 'Hủy món'}</button>` : ''}</div>`; }).join('')}</div>
        <div class="card"><div class="sum big" style="border:0;margin:0;padding:0"><span>Tạm tính</span><span>${money(o.total)}</span></div></div>
        ${o.waitingPay ? '<div class="note">Bàn đã chuyển sang Chờ thanh toán. Thu ngân sẽ thanh toán.</div>' : `
        <button class="btn btn-primary btn-block" id="add">+ Gọi thêm món</button>
        <button class="btn btn-secondary btn-block" id="mv">Chuyển bàn</button>
        <button class="btn btn-secondary btn-block" id="fin" ${canFinish ? '' : 'disabled'}>Khách đã dùng xong</button>
        ${canFinish ? '' : '<div class="note">Nút này bật khi mọi món đã hoàn thành hoặc đã hủy.</div>'}`}`;
    };
    p.start(draw, e => O.fail(e, 'Không tải được đơn'));
    w.addEventListener('click', async e => {
      if (e.target.closest('#add')) { const c = cart.load('dine'); if (c.table !== t) cart.clear('dine'); return ctx.nav(`#/s11?t=${t}`); }
      if (e.target.closest('#mv')) return ctx.nav(`#/s14?t=${t}`);
      const fin = e.target.closest('#fin');
      if (fin && order) {
        if (!await Dialog.confirm({ title: 'Khách đã dùng xong?', text: `Bàn ${t} sẽ chuyển sang Chờ thanh toán.`, ok: 'Xác nhận', cancel: 'Chưa', icon: 'check' })) return;
        return guard(fin, async () => { try { await Api.post(`/api/ops/orders/${order.id}/finish`); Toast.success(`Bàn ${t} chờ thanh toán`, null, { key: 'fin' + t }); ctx.nav('#/s10'); } catch (er) { fail(er, 'Không thể chuyển Chờ thanh toán'); p.force(); } });
      }
      const cb = e.target.closest('[data-c]'); if (!cb || cb.disabled || !order) return;
      const l = order.lines.find(x => x.id === Number(cb.dataset.c));
      let reason = null;
      if (l.status === 'MAKING') { reason = await Dialog.prompt({ title: 'Hủy món đang pha?', text: `${l.name} đã được trừ nguyên liệu và sẽ ghi hao hụt.`, label: 'Lý do hủy (bắt buộc)', ok: 'Xác nhận hủy', cancel: 'Không' }); if (!reason) return; }
      else if (!await Dialog.confirm({ title: 'Hủy món này?', text: `${l.qty}× ${l.name} (Mới). Bánh đã trừ kho khi gửi đơn sẽ được cộng lại.`, ok: 'Hủy món', cancel: 'Không', danger: true, icon: 'warn' })) return;
      guard(cb, async () => { try { await Api.post(`/api/ops/orders/${order.id}/lines/${l.id}/cancel`, { reason }); Toast.success('Đã hủy ' + l.name, null, { key: 'cx' + l.id }); } catch (er) { fail(er, 'Không thể hủy món'); } p.force(); });
    });
    return () => p.stop();
  };

  /* ---- S14 ---- */
  OpsScreens.S14 = (root, ctx) => {
    const t = tableOf(ctx.params); let sel = null, order = null, tables = [];
    const w = document.createElement('div'); w.className = 'm-wrap'; root.appendChild(w);
    const draw = () => {
      const free = tables.filter(x => x.status === 'EMPTY');
      w.innerHTML = `<h2 class="sec-title">Chuyển đơn của Bàn ${t} sang bàn đang Trống</h2>
        ${free.length ? `<div class="tgrid">${free.map(x => `<button class="tcard" data-n="${x.no}" aria-pressed="${sel === x.no}" style="${sel === x.no ? 'border-color:var(--primary);border-width:3px;background:#fff' : ''}"><b>Bàn ${x.no}</b><span>Trống</span></button>`).join('')}</div>` : '<div class="card empty-sm">Hiện không còn bàn Trống.</div>'}
        <div style="display:flex;gap:10px"><button class="btn btn-secondary" id="cx" style="flex:1">Hủy</button><button class="btn btn-primary" id="ok" style="flex:2" ${sel && order ? '' : 'disabled'}>${sel ? `Xác nhận chuyển sang Bàn ${sel}` : 'Chọn bàn đích'}</button></div>`;
    };
    Promise.all([Api.get('/api/ops/tables'), Api.get(`/api/ops/tables/${t}/order`)]).then(([tb, o]) => { tables = tb; order = o; draw(); }).catch(e => { fail(e, 'Không tải được dữ liệu'); w.innerHTML = `<div class="card empty"><h3>Không thể chuyển bàn</h3><button class="btn btn-primary" id="b">Quay lại</button></div>`; $('#b', w).onclick = () => ctx.nav(`#/s13?t=${t}`); });
    w.addEventListener('click', async e => {
      const n = e.target.closest('[data-n]'); if (n) { sel = Number(n.dataset.n); return draw(); }
      if (e.target.closest('#cx')) return ctx.nav(`#/s13?t=${t}`);
      const ok = e.target.closest('#ok'); if (!ok || !sel) return;
      if (!await Dialog.confirm({ title: `Chuyển sang Bàn ${sel}?`, text: `Bàn ${t} sẽ Trống và Bàn ${sel} chuyển sang Đang phục vụ.`, ok: 'Chuyển bàn', cancel: 'Không', icon: 'info' })) return;
      guard(ok, async () => { try { await Api.post(`/api/ops/orders/${order.id}/move`, { to: sel }); Toast.success(`Đã chuyển sang Bàn ${sel}`, null, { key: 'mv' }); ctx.nav('#/s10'); }
        catch (er) { fail(er, 'Không thể chuyển bàn'); tables = await Api.get('/api/ops/tables').catch(() => tables); sel = null; draw(); } });
    });
    return () => {};
  };
})();
