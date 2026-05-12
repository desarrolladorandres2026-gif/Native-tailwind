/* ── APP.JS ── Router SPA + Inicialización ── */

// ── Utilidades globales ───────────────────────────────────────────────────────
function showToast(msg, type = 'success') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = `toast ${type}`;
  el.classList.remove('hidden');
  clearTimeout(el._timer);
  el._timer = setTimeout(() => el.classList.add('hidden'), 3500);
}

function renderPagination(containerId, page, pages, loadFn) {
  const container = document.getElementById(containerId);
  if (!container || pages <= 1) { if (container) container.innerHTML = ''; return; }

  let html = `<button class="page-btn" onclick="(${loadFn.name || 'arguments.callee'})(${page - 1})" ${page <= 1 ? 'disabled' : ''}>‹ Anterior</button>`;

  const start = Math.max(1, page - 2);
  const end   = Math.min(pages, page + 2);
  for (let i = start; i <= end; i++) {
    html += `<button class="page-btn ${i === page ? 'active' : ''}" onclick="${loadFn.name}(${i})">${i}</button>`;
  }

  html += `<button class="page-btn" onclick="${loadFn.name}(${page + 1})" ${page >= pages ? 'disabled' : ''}>Siguiente ›</button>`;
  container.innerHTML = html;
}

// ── Estadísticas charts ───────────────────────────────────────────────────────
let estadisticasLoaded = false;
let chartMotivos, chartProviders, chartCities, chartCountries;

async function loadEstadisticas() {
  if (estadisticasLoaded) return;
  estadisticasLoaded = true;
  try {
    const d = await Auth.api('GET', '/growth?days=30');
    const colors = ['#e94560','#a0a0ff','#00e5a0','#ffb703','#ff6b8a','#4facfe'];

    // Reportes por motivo
    if (chartMotivos) chartMotivos.destroy();
    chartMotivos = new Chart(document.getElementById('chart-motivos'), {
      type: 'pie',
      data: {
        labels: d.reportesPorMotivo.map(r => r._id),
        datasets: [{ data: d.reportesPorMotivo.map(r => r.count), backgroundColor: colors, borderWidth: 0 }],
      },
      options: { responsive: true, plugins: { legend: { position: 'bottom', labels: { color: '#9999cc', font: { size: 11 } } } } },
    });

    // Auth providers
    if (chartProviders) chartProviders.destroy();
    chartProviders = new Chart(document.getElementById('chart-providers'), {
      type: 'doughnut',
      data: {
        labels: d.porProveedor.map(p => p._id),
        datasets: [{ data: d.porProveedor.map(p => p.count), backgroundColor: colors, borderWidth: 0 }],
      },
      options: { responsive: true, plugins: { legend: { position: 'bottom', labels: { color: '#9999cc', font: { size: 11 } } } } },
    });

    // Top ciudades
    if (chartCities) chartCities.destroy();
    chartCities = new Chart(document.getElementById('chart-cities'), {
      type: 'bar',
      data: {
        labels: d.porCiudad.map(c => c._id),
        datasets: [{ label: 'Usuarios', data: d.porCiudad.map(c => c.count), backgroundColor: 'rgba(233,69,96,0.6)', borderRadius: 6 }],
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: '#5555aa', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.05)' } },
          y: { ticks: { color: '#5555aa', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.05)' } },
        },
      },
    });

    // Top países
    if (chartCountries) chartCountries.destroy();
    chartCountries = new Chart(document.getElementById('chart-countries'), {
      type: 'bar',
      data: {
        labels: d.porPais.map(p => p._id),
        datasets: [{ label: 'Usuarios', data: d.porPais.map(p => p.count), backgroundColor: 'rgba(160,160,255,0.6)', borderRadius: 6 }],
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: '#5555aa', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.05)' } },
          y: { ticks: { color: '#9999cc', font: { size: 11 } }, grid: { display: false } },
        },
      },
    });
  } catch (e) { console.error('loadEstadisticas:', e); }
}

// ── Router SPA ────────────────────────────────────────────────────────────────
const sections = ['dashboard', 'usuarios', 'reportes', 'asociados', 'estadisticas', 'soporte'];

function navigateTo(name) {
  sections.forEach(s => {
    document.getElementById(`section-${s}`)?.classList.remove('active');
    document.getElementById(`nav-${s}`)?.classList.remove('active');
  });
  document.getElementById(`section-${name}`)?.classList.add('active');
  document.getElementById(`nav-${name}`)?.classList.add('active');

  const titles = { dashboard: 'Dashboard', usuarios: 'Usuarios', reportes: 'Reportes', asociados: 'Asociados', estadisticas: 'Estadísticas', soporte: 'Soporte' };
  document.getElementById('page-title').textContent = titles[name] || name;

  if (name === 'estadisticas') loadEstadisticas();
  if (name === 'soporte') Soporte.load(1);

  // Cierra sidebar en mobile
  document.getElementById('sidebar')?.classList.remove('open');
}

// ── Reloj ─────────────────────────────────────────────────────────────────────
function startClock() {
  const el = document.getElementById('topbar-time');
  const tick = () => {
    const now = new Date();
    el.textContent = now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };
  tick();
  setInterval(tick, 1000);
}

// ── Socket.io — online count ──────────────────────────────────────────────────
function initSocketOnline() {
  try {
    const token = Auth.getToken();
    const socket = io({ auth: { token }, reconnectionAttempts: 5 });
    socket.on('usuario:online',  () => { Dashboard.loadStats(); });
    socket.on('usuario:offline', () => { Dashboard.loadStats(); });
  } catch (e) { console.warn('Socket no disponible:', e); }
}

// ── INIT ──────────────────────────────────────────────────────────────────────
function initApp() {
  const admin = Auth.getInfo();
  if (admin) {
    document.getElementById('admin-name').textContent   = admin.first_name || 'Admin';
    document.getElementById('admin-avatar').textContent = (admin.first_name || 'A')[0].toUpperCase();
  }

  // Nav links
  sections.forEach(s => {
    document.getElementById(`nav-${s}`)?.addEventListener('click', (e) => {
      e.preventDefault();
      navigateTo(s);
    });
  });

  // Logout
  document.getElementById('btn-logout').addEventListener('click', () => {
    if (confirm('¿Cerrar sesión del panel de administración?')) Auth.logout();
  });

  // Modal close (perfil usuario)
  document.getElementById('modal-close').addEventListener('click', () => {
    document.getElementById('user-modal').classList.add('hidden');
  });
  document.getElementById('user-modal').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) e.currentTarget.classList.add('hidden');
  });

  // Modal close (ticket soporte)
  document.getElementById('ticket-modal-close')?.addEventListener('click', () => {
    document.getElementById('ticket-modal').classList.add('hidden');
  });
  document.getElementById('ticket-modal')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) e.currentTarget.classList.add('hidden');
  });

  // Mobile sidebar toggle
  document.getElementById('btn-menu-mobile').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
  });

  startClock();
  initSocketOnline();

  // Init modules
  Dashboard.init();
  Usuarios.init();
  Reportes.init();
  Asociados.init();
  Soporte.init();

  // Recargar stats soporte cada 60 seg para notificaciones en tiempo real
  setInterval(() => Soporte.loadStats(), 60000);

  navigateTo('dashboard');
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  if (Auth.isLoggedIn()) {
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('app-shell').classList.remove('hidden');
    initApp();
  } else {
    document.getElementById('login-screen').classList.remove('hidden');
    document.getElementById('app-shell').classList.add('hidden');
  }
});
