/**
 * Bộ định tuyến và quản lý phiên.
 * - Chưa đăng nhập: chỉ vào được #/login (S01) và #/owner-login (S02).
 * - Đã đăng nhập: vào trang chủ theo vai trò; vào màn không có quyền thì báo lỗi và quay về trang chủ (NFR-011).
 * - Thu ngân và màn hình pha chế tự đăng xuất sau 5 phút không thao tác (UC-02).
 */
(() => {
  const app = document.getElementById('app');
  let user = null;
  let cleanup = null;
  let idleTimer = null, lastPing = 0;

  const nav = (hash, u) => { if (u) { user = u; startIdle(); } if (location.hash === hash) render(); else location.hash = hash; };

  function startIdle() {
    stopIdle();
    if (!user || !user.autoLogoutSeconds) return;
    const reset = () => {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(expire, user.autoLogoutSeconds * 1000);
      const now = Date.now();
      if (now - lastPing > 60000) { lastPing = now; Api.me().catch(() => {}); } // giữ phiên phía máy chủ khi còn thao tác
    };
    ['pointerdown', 'keydown', 'touchstart'].forEach(e => window.addEventListener(e, reset, { passive: true }));
    stopIdle.reset = reset; reset();
  }
  function stopIdle() {
    clearTimeout(idleTimer);
    if (stopIdle.reset) ['pointerdown', 'keydown', 'touchstart'].forEach(e => window.removeEventListener(e, stopIdle.reset));
    stopIdle.reset = null;
  }

  async function expire() {
    stopIdle(); user = null;
    try { await Api.logout(); } catch (e) { /* phiên đã hết hạn phía máy chủ */ }
    location.hash = '#/login';
    await Dialog.confirm({ title: 'Phiên đã hết hạn', text: 'Không thao tác 5 phút. Hãy đăng nhập lại để tiếp tục.', ok: 'Đăng nhập lại', single: true });
  }

  async function logout() {
    const ok = await Dialog.confirm({ title: 'Đăng xuất?', text: 'Bạn sẽ quay về màn hình đăng nhập.', ok: 'Đăng xuất', cancel: 'Ở lại', icon: 'logout' });
    if (!ok) return;
    const tid = Toast.loading('Đang đăng xuất…', null, { key: 'logout' });
    try {
      await Api.logout();
      stopIdle(); user = null; Toast.clear();
      location.hash = '#/login';
      Toast.success('Đã đăng xuất.', null, { key: 'logged-out' });
    } catch (e) {
      Toast.update(tid, 'error', 'Không thể đăng xuất', e.message);
    }
  }

  async function ensureUser() {
    if (user) return user;
    try { user = await Api.me(); startIdle(); } catch (e) { user = null; if (e.network) Toast.error('Không thể kết nối', e.message, { key: 'net' }); }
    return user;
  }

  async function render() {
    if (cleanup) { cleanup(); cleanup = null; }
    const raw = (location.hash || '').replace(/^#\//, '');
    const [routePart, query] = raw.split('?');
    const route = routePart.toLowerCase();
    const params = new URLSearchParams(query || '');
    const me = await ensureUser();
    const isLogin = route === 'login' || route === 'owner-login';
    if (!me) {
      if (route === 'owner-login') cleanup = Screens.ownerLogin(app, nav);
      else { if (route !== 'login') { history.replaceState(null, '', '#/login'); } cleanup = Screens.staffLogin(app, nav); }
      return;
    }
    const home = me.home.toLowerCase();
    if (isLogin || !route) { history.replaceState(null, '', '#/' + home); return render(); }
    const id = route.toUpperCase();
    if (!Screens.ROUTES[id]) { Toast.error('Không tìm thấy màn hình', null, { key: 'nf' }); history.replaceState(null, '', '#/' + home); return render(); }
    if (!Screens.canOpen(me, id)) {
      Toast.error('Bạn không có quyền truy cập', 'Màn hình này không dành cho vai trò của bạn.', { key: 'denied' });
      history.replaceState(null, '', '#/' + home); return render();
    }
    cleanup = Screens.shell(app, me, id, nav, logout, params, render);
    document.title = ((window.OpsMeta && OpsMeta[id]) ? OpsMeta[id](params).title : Screens.title(id)) + ' · 2006 Coffee';
    window.scrollTo(0, 0);
  }

  window.addEventListener('hashchange', render);
  render();
})();
