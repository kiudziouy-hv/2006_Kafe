/** Hộp thoại xác nhận: fade + scale, đóng bằng Esc hoặc nút, trả lại focus khi đóng. */
window.Dialog = (() => {
  function confirm({ title, text, ok = 'Xác nhận', cancel = 'Hủy bỏ', danger = false, icon = 'info', single = false }) {
    return new Promise(resolve => {
      const prev = document.activeElement;
      const root = document.getElementById('dialog-root');
      const scrim = document.createElement('div');
      scrim.className = 'scrim';
      scrim.innerHTML = `<div class="dialog" role="alertdialog" aria-modal="true" aria-labelledby="dlg-t" aria-describedby="dlg-d">
        <div class="ic">${Icons(icon)}</div><h2 id="dlg-t"></h2><p id="dlg-d" class="muted" style="margin:0"></p>
        <div class="row">${single ? '' : '<button class="btn btn-secondary" data-r="0"></button>'}<button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-r="1"></button></div></div>`;
      scrim.querySelector('h2').textContent = title;
      scrim.querySelector('#dlg-d').textContent = text || '';
      const [c, o] = [scrim.querySelector('[data-r="0"]'), scrim.querySelector('[data-r="1"]')];
      if (c) c.textContent = cancel; o.textContent = ok;
      const close = v => {
        document.removeEventListener('keydown', key);
        scrim.classList.add('closing');
        setTimeout(() => { scrim.remove(); prev && prev.focus && prev.focus(); resolve(v); }, 170);
      };
      const key = e => {
        if (e.key === 'Escape' && !single) close(false);
        if (e.key === 'Tab') { // giữ focus trong hộp thoại
          const f = [...scrim.querySelectorAll('button')]; const i = f.indexOf(document.activeElement);
          e.preventDefault(); f[(i + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus();
        }
      };
      scrim.addEventListener('click', e => { if (e.target === scrim && !single) close(false); });
      o.onclick = () => close(true); if (c) c.onclick = () => close(false);
      document.addEventListener('keydown', key);
      root.appendChild(scrim);
      (c || o).focus();
    });
  }
  /** Hộp thoại nhập lý do bắt buộc. Trả về chuỗi lý do hoặc null nếu bỏ qua. */
  function prompt({ title, text, label, ok = 'Xác nhận', cancel = 'Không', danger = true, icon = 'warn', placeholder = 'Nhập lý do…' }) {
    return new Promise(resolve => {
      const prev = document.activeElement;
      const scrim = document.createElement('div');
      scrim.className = 'scrim';
      scrim.innerHTML = `<form class="dialog" role="dialog" aria-modal="true" aria-labelledby="dlg-t" novalidate>
        <div class="ic">${Icons(icon)}</div><h2 id="dlg-t"></h2><p class="muted" style="margin:0"></p>
        <div class="field" style="text-align:left"><label for="dlg-in"></label>
          <div class="input-wrap" style="height:48px"><input id="dlg-in" maxlength="200"></div><div class="field-error"></div></div>
        <div class="row"><button type="button" class="btn btn-secondary" data-r="0"></button><button type="submit" class="btn ${danger ? 'btn-danger' : 'btn-primary'}"></button></div></form>`;
      scrim.querySelector('h2').textContent = title;
      scrim.querySelector('p').textContent = text || '';
      scrim.querySelector('label').textContent = label;
      const inp = scrim.querySelector('input'); inp.placeholder = placeholder;
      scrim.querySelector('[data-r="0"]').textContent = cancel;
      scrim.querySelector('[type=submit]').textContent = ok;
      const field = scrim.querySelector('.field');
      const close = v => { document.removeEventListener('keydown', key); scrim.classList.add('closing'); setTimeout(() => { scrim.remove(); prev && prev.focus && prev.focus(); resolve(v); }, 170); };
      const key = e => { if (e.key === 'Escape') close(null); };
      scrim.querySelector('form').onsubmit = e => {
        e.preventDefault();
        const v = inp.value.trim();
        if (!v) { field.classList.add('invalid'); field.querySelector('.field-error').textContent = 'Vui lòng nhập lý do.'; inp.focus(); return; }
        close(v);
      };
      inp.oninput = () => field.classList.remove('invalid');
      scrim.querySelector('[data-r="0"]').onclick = () => close(null);
      scrim.addEventListener('click', e => { if (e.target === scrim) close(null); });
      document.addEventListener('keydown', key);
      document.getElementById('dialog-root').appendChild(scrim);
      inp.focus();
    });
  }
  return { confirm, prompt };
})();
