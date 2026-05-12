/* ── ASOCIADOS ── Control de cuentas asociadas ── */
const Asociados = (() => {
  let currentPage = 1;

  function fmtDate(d) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  function onlineDot(online) {
    return online
      ? `<span class="online-indicator"><span class="dot-online"></span>En línea</span>`
      : `<span class="online-indicator"><span class="dot-offline"></span>Offline</span>`;
  }

  async function load(page = 1) {
    currentPage = page;
    const tbody = document.getElementById('asociados-tbody');
    tbody.innerHTML = `<tr><td colspan="8" class="loading-row">Cargando…</td></tr>`;

    try {
      const qs = new URLSearchParams({ page, limit: 20 }).toString();
      const d  = await Auth.api('GET', `/asociados?${qs}`);
      renderRows(d.asociados);
      renderPagination('asociados-pagination', d.page, d.pages, load);
    } catch (e) {
      tbody.innerHTML = `<tr><td colspan="8" class="loading-row" style="color:var(--red)">${e.message}</td></tr>`;
    }
  }

  function renderRows(asociados) {
    const tbody = document.getElementById('asociados-tbody');
    if (!asociados.length) {
      tbody.innerHTML = `<tr><td colspan="8" class="loading-row">No hay asociados registrados</td></tr>`;
      return;
    }
    tbody.innerHTML = asociados.map(a => {
      const letter = (a.first_name || '?')[0].toUpperCase();
      const avatar = a.profile_picture?.url
        ? `<div class="user-avatar"><img src="${a.profile_picture.url}" /></div>`
        : `<div class="user-avatar">${letter}</div>`;
      return `
        <tr>
          <td>
            <div class="user-cell">
              ${avatar}
              <div>
                <div class="user-name">${a.first_name} ${a.last_name || ''}</div>
                <div class="user-username">@${a.username}</div>
              </div>
            </div>
          </td>
          <td>${a.correo}</td>
          <td><span class="badge ${a.activo ? 'badge-active' : 'badge-inactive'}">${a.activo ? 'Activo' : 'Inactivo'}</span></td>
          <td>${onlineDot(a.online)}</td>
          <td><strong style="color:var(--yellow)">${a.citasPendientes}</strong></td>
          <td><strong style="color:var(--green)">${a.citasAceptadas}</strong></td>
          <td>${fmtDate(a.createdAt)}</td>
          <td>
            <div class="actions-cell">
              <button class="btn btn-${a.activo ? 'warn' : 'success'} btn-sm" onclick="Asociados.toggle('${a._id}')">
                ${a.activo ? 'Desactivar' : 'Activar'}
              </button>
              <button class="btn btn-danger btn-sm" onclick="Asociados.revocarAsociado('${a._id}','${a.first_name}')">
                Revocar
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  async function toggle(id) {
    try {
      const d = await Auth.api('PUT', `/users/${id}/toggle`);
      showToast(d.message, 'success');
      load(currentPage);
    } catch (e) { showToast(e.message, 'error'); }
  }

  async function revocarAsociado(id, nombre) {
    if (!confirm(`¿Revocar el rol de asociado a ${nombre}? Pasará a ser usuario normal.`)) return;
    try {
      const d = await Auth.api('PUT', `/users/${id}/role`, { rol: 'user' });
      showToast(`${nombre} ya no es asociado`, 'success');
      load(currentPage);
    } catch (e) { showToast(e.message, 'error'); }
  }

  function init() {
    load(1);
  }

  return { init, load, toggle, revocarAsociado };
})();
