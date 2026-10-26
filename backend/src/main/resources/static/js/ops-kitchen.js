/* Pha chế: S30 danh sách đơn theo thứ tự gửi (FIFO), New -> Making -> Done */
(() => {
  const { $, esc, money, time, fail, guard, poll, TEMP, optText } = O;
  OpsMeta.S30 = () => ({ title: 'Màn hình pha chế' });
  const ICE = { NONE: 'không đá', LESS: 'ít đá', NORMAL: 'đá bình thường', '-': '' };

  OpsScreens.S30 = (root, ctx) => {
    let seen = null;
    root.innerHTML = `<div class="page"><div class="card" style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;padding:12px 16px"><span class="badge info">Đã đăng nhập: ${esc(ctx.user.fullName)}</span><span class="muted-s">Sắp xếp theo thời điểm gửi (FIFO). Trừ kho khi chuyển sang Đang pha.</span></div><div class="cols" id="cols"><div class="skel"></div><div class="skel"></div><div class="skel"></div></div></div>`;
    const cols = $('#cols', root);
    const p = poll(root, () => Api.get('/api/ops/kitchen'), 3000);
    const card = l => {
      const lack = l.status === 'NEW' && !l.canStart && !l.cake;
      const opts = l.cake ? l.size : [l.size, TEMP[l.temp], l.sugar + '% đường', ICE[l.ice], ...l.toppings].filter(Boolean).join(' · ');
      const btn = l.status === 'NEW' ? `<button class="btn btn-primary btn-block" data-start="${l.id}" ${lack ? 'disabled' : ''}>${l.cake ? 'Bắt đầu lấy bánh' : 'Bắt đầu pha'}</button>`
        : l.status === 'MAKING' ? `<button class="btn btn-primary btn-block" data-done="${l.id}">Hoàn thành</button>` : '';
      return `<div class="kcard ${lack ? 'shortage' : ''}"><div class="top"><span>${esc(l.label)} · ${time(l.sentAt)} — ${l.qty}× ${esc(l.name)}</span><span class="lbadge ${l.status}">${O.LSTAT[l.status]}</span></div>
        <div class="muted-s">${esc(opts)}</div>${lack ? '<div class="errtxt">Thiếu nguyên liệu, chưa thể bắt đầu pha.</div>' : ''}${btn}</div>`;
    };
    const draw = d => {
      const L = d.lines;
      if (seen) L.forEach(l => { if (!seen.has(l.id) && l.status === 'NEW') Toast.info('Đơn mới: ' + l.label, `${l.qty}× ${l.name}`, { key: 'new' + l.id }); });
      seen = new Set(L.map(l => l.id));
      const g = s => L.filter(l => l.status === s);
      const col = (title, arr, empty) => `<section class="col" aria-label="${title}"><h3><span>${title}</span><span>(${arr.length})</span></h3>${arr.length ? arr.map(card).join('') : `<div class="empty-sm">${empty}</div>`}</section>`;
      cols.innerHTML = col('Mới', g('NEW'), 'Chưa có món mới.') + col('Đang pha', g('MAKING'), 'Chưa có món đang pha.') + col('Hoàn thành gần đây', g('DONE').slice(-6).reverse(), 'Chưa có món hoàn thành.');
    };
    p.start(draw, e => { fail(e, 'Không tải được danh sách pha chế'); if (!$('.col', cols)) cols.innerHTML = `<div class="card empty" style="grid-column:1/-1"><h3>Không tải được danh sách</h3><button class="btn btn-primary" id="rt">Thử lại</button></div>`, $('#rt', cols).onclick = () => p.force(); });
    cols.addEventListener('click', e => {
      const s = e.target.closest('[data-start]'), d = e.target.closest('[data-done]');
      if (s) guard(s, async () => { try { await Api.post(`/api/ops/kitchen/${s.dataset.start}/start`); } catch (er) {
        if (er.code === 'SHORTAGE') Toast.error(er.message, 'Chưa thể bắt đầu pha món này. Nhờ Chủ quán nhập kho.', { key: 'short' + s.dataset.start }); else fail(er, 'Không thể bắt đầu pha'); }
        await p.force(); });
      if (d) guard(d, async () => { try { const r = await Api.post(`/api/ops/kitchen/${d.dataset.done}/done`); Toast.success(`${r.label}: ${r.name} đã xong`, null, { key: 'dn' + d.dataset.done }); } catch (er) { fail(er, 'Không thể hoàn thành món'); } await p.force(); });
    });
    return () => p.stop();
  };
})();
