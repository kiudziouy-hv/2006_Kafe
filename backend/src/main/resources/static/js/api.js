/** Lớp gọi API. Mọi lỗi mạng được chuẩn hóa để giao diện không giả lập thành công. */
window.Api = (() => {
  async function req(method, url, body) {
    let res;
    try {
      res = await fetch(url, { method, headers: body ? { 'Content-Type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined, credentials: 'same-origin' });
    } catch (e) {
      throw { network: true, message: 'Không thể kết nối máy chủ. Vui lòng thử lại.' };
    }
    let data = null;
    try { data = await res.json(); } catch (e) { /* không có thân JSON */ }
    if (!res.ok) throw { status: res.status, code: data && data.code, message: (data && data.message) || 'Không thể thực hiện thao tác. Vui lòng thử lại.', ...(data || {}) };
    return data;
  }
  return {
    req,
    get: u => req('GET', u), post: (u, b) => req('POST', u, b || {}),
    staffList: () => req('GET', '/api/auth/staff'),
    staffLogin: (accountId, pin) => req('POST', '/api/auth/staff/login', { accountId, pin }),
    ownerLogin: (username, password) => req('POST', '/api/auth/owner/login', { username, password }),
    logout: () => req('POST', '/api/auth/logout'),
    me: () => req('GET', '/api/auth/me')
  };
})();
