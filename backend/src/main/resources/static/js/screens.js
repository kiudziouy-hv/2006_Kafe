/* Các màn hình Đợt 1: S01 đăng nhập nhân viên, S02 đăng nhập Chủ quán, khung ứng dụng và trang chủ theo vai trò. */
window.Screens = (() => {
  const ROLE_NAME = { OWNER: 'Chủ quán / Quản lý', WAITER: 'Phục vụ', CASHIER: 'Thu ngân', BARISTA: 'Pha chế' };
  const $ = (s, r = document) => r.querySelector(s);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const mmss = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  /* ---------- Bảng route và phân quyền (UI_GD4 mục 8.5, 8.6) ---------- */
  const OWNER_GROUPS = [
    { name: 'Vận hành', items: [['S10', 'Sơ đồ bàn', 'cup'], ['S22', 'Đơn tại quán', 'receipt'], ['S21', 'Đơn mang đi', 'plus'], ['S30', 'Pha chế', 'cup'], ['S20', 'Ca thu ngân', 'clock']] },
    { name: 'Bán hàng', items: [['S54', 'Báo cáo doanh thu', 'chart'], ['S55', 'Hóa đơn', 'receipt'], ['S51', 'Khuyến mãi', 'plus']] },
    { name: 'Thực đơn', items: [['S42', 'Món', 'cup'], ['S44', 'Topping', 'plus']] },
    { name: 'Kho', items: [['S45', 'Nguyên liệu & tồn kho', 'box'], ['S46', 'Công thức', 'plus'], ['S47', 'Nhập kho', 'box'], ['S48', 'Điều chỉnh tồn kho', 'box'], ['S49', 'Hao hụt', 'box'], ['S50', 'Cảnh báo kho', 'bell']] },
    { name: 'Nhân sự & ca', items: [['S40', 'Nhân viên', 'user'], ['S52', 'Chấm công', 'clock'], ['S53', 'Ca & chốt ngày', 'clock']] }
  ];
  const ROUTES = {};
  [['S10', 'Sơ đồ bàn'], ['S11', 'Chọn món'], ['S12', 'Xác nhận gửi đơn'], ['S13', 'Chi tiết đơn'], ['S14', 'Chuyển bàn']].forEach(([i, t]) => { ROUTES[i] = [t, ['WAITER']]; });
  [['S20', 'Mở ca thu ngân'], ['S21', 'Đơn mang đi'], ['S22', 'Đơn tại quán'], ['S23', 'Thanh toán'], ['S26', 'Đơn nháp'], ['S27', 'Hóa đơn'], ['S28', 'Chốt ca']].forEach(([i, t]) => { ROUTES[i] = [t, ['CASHIER']]; });
  ROUTES.S30 = ['Màn hình pha chế', ['BARISTA']];
  OWNER_GROUPS.forEach(g => g.items.forEach(([id, t]) => { ROUTES[id] = [t, ['OWNER']]; }));
  const canOpen = (user, id) => !!ROUTES[id] && (user.role === 'OWNER' || ROUTES[id][1].includes(user.role));
  const title = id => (ROUTES[id] || ['Không tìm thấy'])[0];

  /* ---------- S01: đăng nhập nhân viên (UC-01) ---------- */
  function staffLogin(app, nav, flash) {
    const st = { accounts: null, error: null, sel: null, pin: '', busy: false, lock: {} };
    let timer = null;
    app.innerHTML = `<div class="staff-wrap">
      <div class="brand"><div class="logo"></div><div><b>2006 Coffee</b><span>Đăng nhập nhân viên</span></div></div>
      <h2 id="s1">1. Chọn tài khoản của bạn</h2>
      <div id="accts" class="staff-list" style="display:flex;flex-direction:column;gap:10px" aria-labelledby="s1"></div>
      <h2>2. Nhập mã PIN 6 số</h2>
      <div id="dots" class="pin-dots" role="img" aria-label="Đã nhập 0 trên 6 số"></div>
      <div id="lockmsg" class="muted" style="text-align:center;min-height:20px" aria-live="polite"></div>
      <div id="keys" class="keypad"></div>
      <button class="btn btn-ghost" id="toOwner">Chủ quán / Quản lý: đăng nhập bằng mật khẩu</button></div>`;

    const dots = $('#dots'), keys = $('#keys'), list = $('#accts');
    dots.innerHTML = '<i></i>'.repeat(6);
    ['1','2','3','4','5','6','7','8','9','Xóa','0','OK'].forEach(k => {
      const b = document.createElement('button'); b.className = 'key'; b.textContent = k; b.dataset.k = k; b.type = 'button'; keys.appendChild(b);
    });
    keys.addEventListener('click', e => { const b = e.target.closest('.key'); if (b) press(b.dataset.k); });
    const onKey = e => {
      if (!document.body.contains(app) || e.ctrlKey || e.metaKey) return;
      if (/^\d$/.test(e.key)) press(e.key); else if (e.key === 'Backspace') press('Xóa'); else if (e.key === 'Enter' && document.activeElement.tagName !== 'BUTTON') press('OK');
    };
    document.addEventListener('keydown', onKey);
    $('#toOwner').onclick = () => nav('#/owner-login');

    const lockLeft = id => Math.max(0, Math.ceil(((st.lock[id] || 0) - Date.now()) / 1000));
    function paint() {
      if (st.accounts === null && !st.error) list.innerHTML = '<div class="card muted" aria-busy="true">Đang tải danh sách tài khoản…</div>';
      else if (st.error) { list.innerHTML = '<div class="card" style="display:flex;flex-direction:column;gap:10px"><span>Không tải được danh sách tài khoản.</span><button class="btn btn-secondary" id="retry">Thử lại</button></div>'; $('#retry').onclick = load; }
      else if (!st.accounts.length) list.innerHTML = '<div class="card muted">Chưa có tài khoản nhân viên. Hãy nhờ Chủ quán tạo tài khoản.</div>';
      else {
        list.innerHTML = '';
        st.accounts.forEach(a => {
          const b = document.createElement('button'); b.type = 'button'; b.className = 'acct';
          const left = lockLeft(a.id);
          b.disabled = left > 0; b.setAttribute('aria-pressed', String(st.sel === a.id));
          b.innerHTML = `<b></b><small></small>`; b.firstChild.textContent = a.fullName;
          b.lastChild.textContent = left > 0 ? `Tạm khóa · còn ${mmss(left)}` : ROLE_NAME[a.role];
          b.onclick = () => { st.sel = a.id; st.pin = ''; paint(); };
          list.appendChild(b);
        });
      }
      [...dots.children].forEach((d, i) => d.classList.toggle('on', i < st.pin.length));
      dots.setAttribute('aria-label', `Đã nhập ${st.pin.length} trên 6 số`);
      const left = st.sel ? lockLeft(st.sel) : 0;
      $('#lockmsg').textContent = left > 0 ? `Tài khoản đang khóa, thử lại sau ${mmss(left)}.` : (!st.sel ? 'Hãy chọn tài khoản trước khi nhập PIN.' : '');
      keys.querySelectorAll('.key').forEach(k => {
        const ok = k.dataset.k === 'OK';
        k.disabled = st.busy || !st.sel || left > 0 || (ok && st.pin.length < 6);
      });
    }
    async function load() {
      st.error = null; st.accounts = null; paint();
      try { st.accounts = await Api.staffList(); st.accounts.forEach(a => { if (a.locked) st.lock[a.id] = Date.now() + 15 * 60000; }); }
      catch (e) { st.error = e; Toast.error('Không thể tải danh sách tài khoản.', e.message, { key: 'staff-load' }); }
      paint();
    }
    function press(k) {
      if (st.busy || !st.sel || lockLeft(st.sel) > 0) return;
      if (k === 'Xóa') st.pin = st.pin.slice(0, -1);
      else if (k === 'OK') { if (st.pin.length === 6) return submit(); }
      else if (st.pin.length < 6) st.pin += k;
      paint();
      if (st.pin.length === 6 && k !== 'OK') submit();
    }
    async function submit() {
      if (st.busy) return; // chống gửi trùng
      st.busy = true; paint();
      try {
        const user = await Api.staffLogin(st.sel, st.pin);
        cleanup(); Toast.clear(); nav('#/' + user.home.toLowerCase(), user);
      } catch (e) {
        st.busy = false; st.pin = '';
        dots.classList.remove('shake'); void dots.offsetWidth; dots.classList.add('shake');
        if (e.network) Toast.error('Không thể kết nối', e.message, { key: 'net' });
        else if (e.code === 'LOCKED') {
          st.lock[st.sel] = Date.now() + (e.lockSeconds || 900) * 1000;
          Toast.dismissKey('pin-wrong');
          Toast.error('Tài khoản tạm khóa 15 phút', 'Bạn đã nhập sai 5 lần liên tiếp.', { key: 'locked' + st.sel });
        } else if (e.code === 'WRONG_SECRET') Toast.error('Mã PIN không đúng', `Còn ${e.attemptsLeft} lần thử.`, { key: 'pin-wrong' });
        else Toast.error('Không thể đăng nhập', e.message, { key: 'login-err' });
        paint();
      }
    }
    function cleanup() { clearInterval(timer); document.removeEventListener('keydown', onKey); }
    timer = setInterval(() => { if (!document.body.contains(app)) return cleanup(); if (Object.keys(st.lock).length) paint(); }, 1000);
    if (flash) flash();
    load();
    return cleanup;
  }

  /* ---------- S02: đăng nhập Chủ quán (chia hai nửa, nửa trái dành cho logo) ---------- */
  function ownerLogin(app, nav, flash) {
    let lockUntil = 0, busy = false, timer = null;
    const saved = (() => { try { return localStorage.getItem('owner.username') || ''; } catch (e) { return ''; } })();
    app.innerHTML = `<div class="split">
      <div class="split-left" aria-hidden="true"><div class="logo-slot" title="Vị trí chèn logo"></div></div>
      <div class="split-right"><form class="login-card" id="f" novalidate>
        <div class="brand"><div class="logo"></div><div><b>2006 Coffee</b><span>Đăng nhập Chủ quán / Quản lý</span></div></div>
        <h1>Đăng nhập</h1>
        <div class="field" id="fu"><label for="u" class="sr-only">Tên đăng nhập</label>
          <div class="input-wrap"><input id="u" autocomplete="username" placeholder="Tên đăng nhập…">${Icons('user')}</div><div class="field-error" id="eu"></div></div>
        <div class="field" id="fp"><label for="p" class="sr-only">Mật khẩu</label>
          <div class="input-wrap"><input id="p" type="password" autocomplete="current-password" placeholder="Mật khẩu…"><button type="button" class="icon-btn" id="eye" aria-label="Hiện mật khẩu" style="background:transparent">${Icons('eye')}</button></div><div class="field-error" id="ep"></div></div>
        <label class="checkbox"><input type="checkbox" id="rm"> Ghi nhớ tên đăng nhập</label>
        <button class="btn btn-primary" id="go" type="submit" style="height:56px;border-radius:20px">Đăng nhập</button>
        <div class="muted" id="lk" style="text-align:center;min-height:18px;font-size:13px" aria-live="polite"></div>
        <button class="btn btn-ghost" type="button" id="toStaff">Nhân viên đăng nhập bằng mã PIN →</button>
      </form></div></div>`;
    const u = $('#u'), p = $('#p'), go = $('#go');
    u.value = saved; $('#rm').checked = !!saved;
    $('#toStaff').onclick = () => nav('#/login');
    $('#eye').onclick = () => { const h = p.type === 'password'; p.type = h ? 'text' : 'password'; $('#eye').innerHTML = Icons(h ? 'eyeOff' : 'eye'); $('#eye').setAttribute('aria-label', h ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'); };
    const setErr = (f, e, msg) => { $(f).classList.toggle('invalid', !!msg); $(e).textContent = msg || ''; };
    u.oninput = () => setErr('#fu', '#eu', '');
    p.oninput = () => setErr('#fp', '#ep', '');
    function tick() {
      const left = Math.ceil((lockUntil - Date.now()) / 1000);
      go.disabled = busy || left > 0;
      $('#lk').textContent = left > 0 ? `Tài khoản đang khóa, thử lại sau ${mmss(left)}.` : '';
      if (left <= 0 && lockUntil) lockUntil = 0;
    }
    timer = setInterval(() => { if (!document.body.contains(app)) clearInterval(timer); else tick(); }, 1000);
    $('#f').onsubmit = async e => {
      e.preventDefault(); if (busy) return;
      const un = u.value.trim(), pw = p.value;
      setErr('#fu', '#eu', un ? '' : 'Vui lòng nhập tên đăng nhập.');
      setErr('#fp', '#ep', pw ? '' : 'Vui lòng nhập mật khẩu.');
      if (!un || !pw) { (un ? p : u).focus(); return; }
      busy = true; go.classList.add('loading'); tick();
      try {
        const user = await Api.ownerLogin(un, pw);
        try { $('#rm').checked ? localStorage.setItem('owner.username', un) : localStorage.removeItem('owner.username'); } catch (er) { /* bỏ qua */ }
        clearInterval(timer); Toast.clear(); nav('#/' + user.home.toLowerCase(), user);
      } catch (er) {
        busy = false; go.classList.remove('loading');
        if (er.network) Toast.error('Không thể kết nối', er.message, { key: 'net' });
        else if (er.code === 'LOCKED') { lockUntil = Date.now() + (er.lockSeconds || 900) * 1000; Toast.dismissKey('owner-wrong'); Toast.error('Tài khoản tạm khóa 15 phút', 'Bạn đã nhập sai 5 lần liên tiếp.', { key: 'locked-owner' }); }
        else if (er.code === 'BAD_CREDENTIALS' || er.code === 'WRONG_SECRET') { Toast.error('Sai thông tin đăng nhập', er.attemptsLeft ? `Còn ${er.attemptsLeft} lần thử.` : 'Sai 5 lần sẽ bị khóa 15 phút.', { key: 'owner-wrong' }); p.value = ''; p.focus(); }
        else Toast.error('Không thể đăng nhập', er.message, { key: 'login-err' });
        tick();
      }
    };
    if (flash) flash();
    (saved ? p : u).focus();
    return () => clearInterval(timer);
  }

  /* ---------- Khung ứng dụng: sidebar kính (Chủ quán) hoặc thanh tiêu đề (vai trò khác) ---------- */
  function shell(app, user, id, nav, logout, params, rerender) {
    const meta = (window.OpsMeta && OpsMeta[id]) ? OpsMeta[id](params) : { title: title(id) };
    const t = meta.title;
    const initials = user.fullName.split(' ').slice(-1)[0].slice(0, 2).toUpperCase();
    const isOps = !!(window.OpsScreens && OpsScreens[id]);
    const content = isOps ? '' : `<div class="empty card">
        <div class="badge-ic">${Icons('clock')}</div><h2>${esc(t)}</h2>
        <p class="muted" style="margin:0;max-width:420px">Màn hình ${esc(id)} thuộc đợt triển khai tiếp theo. Đợt này hoàn thiện đăng nhập, phân quyền, thông báo và khung điều hướng.</p>
        <span class="badge info">Vai trò: ${esc(ROLE_NAME[user.role])}</span></div>`;
    const back = meta.back ? `<button class="icon-btn" id="back" aria-label="Quay lại">${Icons('back')}</button>` : '';
    const bell = `<button class="icon-btn" id="bell" aria-label="Thông báo">${Icons('bell')}</button>`;
    let html;
    if (user.role === 'OWNER') {
      const groups = OWNER_GROUPS.map(g => {
        const open = g.items.some(i => i[0] === id);
        return `<div class="sb-group ${open ? 'open' : ''}"><button type="button" aria-expanded="${open}">${esc(g.name)}${Icons('chevR')}</button><div class="sb-items">${g.items.map(([rid, name, ic]) =>
          `<a class="nav" href="#/${rid.toLowerCase()}" ${rid === id ? 'aria-current="page"' : ''}>${Icons(ic)}<span>${esc(name)}</span></a>`).join('')}</div></div>`;
      }).join('');
      html = `<div class="shell"><aside class="sidebar glass" aria-label="Điều hướng">
          <div class="sb-head"><div class="logo"></div><b>2006 Coffee</b></div>
          <nav class="sb-scroll">${groups}</nav>
          <div style="position:relative"><button class="sb-user" id="um" aria-haspopup="menu" aria-expanded="false"><span class="avatar">${esc(initials)}</span><span style="flex:1;min-width:0"><b style="display:block;font-size:13px">${esc(user.fullName)}</b><small class="muted">${esc(ROLE_NAME[user.role])}</small></span>${Icons('chevR')}</button></div>
        </aside><main class="main"><header class="topbar glass"><button class="icon-btn menu-btn" id="menu" aria-label="Mở menu" aria-expanded="false">${Icons('list')}</button>${back}<h1>${esc(t)}</h1>${bell}</header><section class="page" id="opsroot">${content}</section></main></div>`;
    } else {
      html = `<div class="shell" style="flex-direction:column"><header class="topbar glass">${back}<h1>${esc(t)}</h1>${bell}
          <div style="position:relative"><button class="user-chip" id="um" aria-haspopup="menu" aria-expanded="false"><span class="avatar">${esc(initials)}</span><span>${esc(user.fullName)}</span>${Icons('chevR')}</button></div></header>
        <main class="main"><section class="page" id="opsroot">${content}</section></main></div>`;
    }
    app.innerHTML = html;
    const bk = $('#back'); if (bk) bk.onclick = () => nav(meta.back);
    app.querySelectorAll('.sb-group > button').forEach(b => b.onclick = () => { const g = b.parentElement; const o = g.classList.toggle('open'); b.setAttribute('aria-expanded', String(o)); });
    const sb = $('.sidebar'), mb = $('#menu');
    if (sb && mb) {
      const setOpen = o => { sb.classList.toggle('open', o); mb.setAttribute('aria-expanded', String(o)); };
      mb.onclick = e => { e.stopPropagation(); setOpen(!sb.classList.contains('open')); };
      sb.addEventListener('click', e => { if (e.target.closest('a.nav')) setOpen(false); });
      document.addEventListener('click', e => { if (sb.classList.contains('open') && !sb.contains(e.target)) setOpen(false); });
      document.addEventListener('keydown', e => { if (e.key === 'Escape') setOpen(false); });
    }
    $('#bell').onclick = () => Toast.info('Chưa có thông báo mới.', null, { key: 'no-notif' });
    const um = $('#um');
    um.onclick = e => {
      e.stopPropagation();
      const ex = $('.popover'); if (ex) { ex.remove(); um.setAttribute('aria-expanded', 'false'); return; }
      const pop = document.createElement('div'); pop.className = 'popover ' + (user.role === 'OWNER' ? 'up' : 'down'); pop.setAttribute('role', 'menu');
      pop.innerHTML = `<button role="menuitem" class="danger">${Icons('logout')}Đăng xuất</button>`;
      um.parentElement.appendChild(pop); um.setAttribute('aria-expanded', 'true');
      pop.querySelector('button').onclick = () => { pop.remove(); logout(); };
      pop.querySelector('button').focus();
      const away = ev => { if (!pop.contains(ev.target)) { pop.remove(); um.setAttribute('aria-expanded', 'false'); document.removeEventListener('click', away); document.removeEventListener('keydown', esc2); } };
      const esc2 = ev => { if (ev.key === 'Escape') { pop.remove(); um.setAttribute('aria-expanded', 'false'); um.focus(); document.removeEventListener('click', away); document.removeEventListener('keydown', esc2); } };
      setTimeout(() => { document.addEventListener('click', away); document.addEventListener('keydown', esc2); });
    };
    if (isOps) {
      const ctx = { user, params, nav, rerender, root: $('#opsroot') };
      return OpsScreens[id]($('#opsroot'), ctx) || (() => {});
    }
    return () => {};
  }

  return { staffLogin, ownerLogin, shell, canOpen, ROUTES, ROLE_NAME, title };
})();
