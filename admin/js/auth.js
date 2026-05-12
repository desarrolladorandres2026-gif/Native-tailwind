/* ── AUTH ── Manejo de sesión del panel admin ── */
const API = '/api/admin';

const Auth = (() => {
  const TOKEN_KEY = 'debuta_admin_token';
  const INFO_KEY  = 'debuta_admin_info';

  const getToken = () => localStorage.getItem(TOKEN_KEY);
  const getInfo  = () => JSON.parse(localStorage.getItem(INFO_KEY) || 'null');
  const isLoggedIn = () => !!getToken();

  const save = (token, admin) => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(INFO_KEY, JSON.stringify(admin));
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(INFO_KEY);
    location.reload();
  };

  const headers = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${getToken()}`,
  });

  const api = async (method, path, body) => {
    const opts = { method, headers: headers() };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(API + path, opts);
    if (res.status === 401) { logout(); return; }
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Error del servidor');
    return data;
  };

  return { getToken, getInfo, isLoggedIn, save, logout, headers, api };
})();

// ── Login form handler ───────────────────────
document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email    = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const errEl    = document.getElementById('login-error');
  const btnText  = document.getElementById('login-btn-text');
  const spinner  = document.getElementById('login-spinner');

  errEl.classList.add('hidden');
  btnText.classList.add('hidden');
  spinner.classList.remove('hidden');

  try {
    const res = await fetch(`${API}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ correo: email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Error de autenticación');

    Auth.save(data.token, data.admin);
    location.reload();
  } catch (err) {
    errEl.textContent = err.message;
    errEl.classList.remove('hidden');
  } finally {
    btnText.classList.remove('hidden');
    spinner.classList.add('hidden');
  }
});
