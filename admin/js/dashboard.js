/* ── DASHBOARD ── Métricas + Gráficas ── */
const Dashboard = (() => {
  let growthChart = null;
  let genderChart = null;

  const fmt = (n) => (n ?? '—').toLocaleString();

  async function loadStats() {
    try {
      const d = await Auth.api('GET', '/stats');
      document.getElementById('kpi-online-val').textContent   = fmt(d.usuariosOnline);
      document.getElementById('kpi-total-val').textContent    = fmt(d.totalUsuarios);
      document.getElementById('kpi-hoy-val').textContent      = fmt(d.usuariosHoy);
      document.getElementById('kpi-semana-val').textContent   = fmt(d.usuariosSemana);
      document.getElementById('kpi-matches-val').textContent  = fmt(d.totalMatches);
      document.getElementById('kpi-mensajes-val').textContent = fmt(d.totalMensajes);
      document.getElementById('kpi-reportes-val').textContent = fmt(d.reportesPendientes);
      document.getElementById('kpi-asociados-val').textContent= fmt(d.totalAsociados);
      document.getElementById('online-count').textContent     = d.usuariosOnline ?? 0;

      // Badge de reportes en sidebar
      const badge = document.getElementById('badge-reportes');
      if (d.reportesPendientes > 0) {
        badge.textContent = d.reportesPendientes;
        badge.style.display = 'inline-flex';
      } else {
        badge.style.display = 'none';
      }
    } catch (e) { console.error('loadStats:', e); }

    // Actualizar KPI de soporte también
    if (typeof Soporte !== 'undefined') Soporte.loadStats();
  }

  async function loadGrowth(days = 30) {
    try {
      const d = await Auth.api('GET', `/growth?days=${days}`);

      // Growth chart
      const labels = d.registrosPorDia.map(r => {
        const { year, month, day } = r._id;
        return `${day}/${month}`;
      });
      const values = d.registrosPorDia.map(r => r.count);

      if (growthChart) growthChart.destroy();
      growthChart = new Chart(document.getElementById('chart-growth'), {
        type: 'line',
        data: {
          labels,
          datasets: [{
            label: 'Registros',
            data: values,
            borderColor: '#e94560',
            backgroundColor: 'rgba(233,69,96,0.1)',
            fill: true,
            tension: 0.4,
            pointBackgroundColor: '#e94560',
            pointRadius: 3,
          }],
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

      // Gender chart
      const gColors = ['#e94560','#a0a0ff','#00e5a0','#ffb703','#ff6b8a'];
      const gLabels = d.porGenero.map(g => g._id || 'Sin definir');
      const gValues = d.porGenero.map(g => g.count);

      if (genderChart) genderChart.destroy();
      genderChart = new Chart(document.getElementById('chart-gender'), {
        type: 'doughnut',
        data: {
          labels: gLabels,
          datasets: [{
            data: gValues,
            backgroundColor: gColors,
            borderWidth: 0,
          }],
        },
        options: {
          responsive: true,
          plugins: {
            legend: { position: 'bottom', labels: { color: '#9999cc', font: { size: 11 } } },
          },
        },
      });
    } catch (e) { console.error('loadGrowth:', e); }
  }

  function init() {
    loadStats();
    loadGrowth(30);
    document.getElementById('growth-days').addEventListener('change', (e) => {
      loadGrowth(parseInt(e.target.value));
    });
    // Refresh stats cada 30s
    setInterval(loadStats, 30_000);
  }

  return { init, loadStats };
})();
