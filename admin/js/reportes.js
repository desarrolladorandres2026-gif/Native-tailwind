/* ── REPORTES ── Gestión de reportes ── */
const Reportes = (() => {
  let currentPage = 1;

  const motivoLabel = {
    spam: 'Spam',
    contenido_inapropiado: 'Contenido inapropiado',
    comportamiento_ofensivo: 'Comportamiento ofensivo',
    perfil_falso: 'Perfil falso',
    acoso: 'Acoso',
    otro: 'Otro',
  };

  function estadoBadge(estado) {
    const map = { pendiente: 'badge-pending', revisado: 'badge-reviewed', resuelto: 'badge-resolved' };
    return `<span class="badge ${map[estado] || 'badge-pending'}">${estado}</span>`;
  }

  function fmtDate(d) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  function userCell(u) {
    if (!u) return '—';
    const letter = (u.first_name || u.username || '?')[0].toUpperCase();
    const avatar = u.profile_picture?.url
      ? `<div class="user-avatar"><img src="${u.profile_picture.url}" /></div>`
      : `<div class="user-avatar">${letter}</div>`;
    return `<div class="user-cell">${avatar}<div><div class="user-name">${u.first_name || ''}</div><div class="user-username">@${u.username}</div></div></div>`;
  }

  async function load(page = 1) {
    currentPage = page;
    const estado = document.getElementById('report-status-filter').value;
    const tbody  = document.getElementById('reports-tbody');
    tbody.innerHTML = `<tr><td colspan="7" class="loading-row">Cargando…</td></tr>`;

    try {
      const qs = new URLSearchParams({ page, limit: 20, estado }).toString();
      const d  = await Auth.api('GET', `/reports?${qs}`);
      renderRows(d.reportes);
      renderPagination('reports-pagination', d.page, d.pages, load);
    } catch (e) {
      tbody.innerHTML = `<tr><td colspan="7" class="loading-row" style="color:var(--red)">${e.message}</td></tr>`;
    }
  }

  function renderRows(reportes) {
    const tbody = document.getElementById('reports-tbody');
    if (!reportes.length) {
      tbody.innerHTML = `<tr><td colspan="7" class="loading-row">No hay reportes</td></tr>`;
      return;
    }
    tbody.innerHTML = reportes.map(r => `
      <tr>
        <td>${userCell(r.reportadoPor)}</td>
        <td>${userCell(r.reportado)}</td>
        <td><span class="badge badge-pending" style="background:rgba(255,183,3,0.1);color:#ffb703">${motivoLabel[r.motivo] || r.motivo}</span></td>
        <td style="max-width:200px;color:var(--text2);font-size:12px">${r.descripcion || '—'}</td>
        <td>${estadoBadge(r.estado)}</td>
        <td>${fmtDate(r.createdAt)}</td>
        <td>
          <div class="actions-cell">
            ${r.estado !== 'revisado'  ? `<button class="btn btn-ghost btn-sm"   onclick="Reportes.setStatus('${r._id}','revisado')">Revisar</button>` : ''}
            ${r.estado !== 'resuelto'  ? `<button class="btn btn-success btn-sm" onclick="Reportes.setStatus('${r._id}','resuelto')">Resolver</button>` : ''}
            ${r.reportado?.activo !== false ? `<button class="btn btn-danger btn-sm" onclick="Reportes.ban('${r._id}','${r.reportado?.first_name || 'usuario'}')">Banear</button>` : '<span style="font-size:11px;color:var(--text3)">Baneado</span>'}
          </div>
        </td>
      </tr>
    `).join('');
  }

  async function setStatus(id, estado) {
    try {
      await Auth.api('PUT', `/reports/${id}/status`, { estado });
      showToast(`Reporte marcado como ${estado}`, 'success');
      load(currentPage);
      Dashboard.loadStats();
    } catch (e) { showToast(e.message, 'error'); }
  }

  async function ban(id, nombre) {
    if (!confirm(`¿Banear a ${nombre}? Su cuenta quedará desactivada.`)) return;
    try {
      const d = await Auth.api('POST', `/reports/${id}/ban`);
      showToast(d.message, 'success');
      load(currentPage);
      Dashboard.loadStats();
    } catch (e) { showToast(e.message, 'error'); }
  }

  function init() {
    load(1);
    document.getElementById('report-filter-btn').addEventListener('click', () => load(1));
    document.getElementById('report-status-filter').addEventListener('change', () => load(1));
  }

  return { init, load, setStatus, ban };
})();
