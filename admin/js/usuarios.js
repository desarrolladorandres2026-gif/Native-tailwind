/* ── USUARIOS ── Tabla paginada + modal de perfil ── */
const Usuarios = (() => {
  let currentPage = 1;

  function avatarHTML(u, size = 34) {
    const letter = (u.first_name || u.username || '?')[0].toUpperCase();
    if (u.profile_picture?.url) {
      return `<div class="user-avatar" style="width:${size}px;height:${size}px"><img src="${u.profile_picture.url}" alt="" /></div>`;
    }
    return `<div class="user-avatar" style="width:${size}px;height:${size}px;font-size:${size*0.38}px">${letter}</div>`;
  }

  function rolBadge(rol) {
    const map = { user: 'badge-user', admin: 'badge-admin', asociado: 'badge-asociado' };
    return `<span class="badge ${map[rol] || 'badge-user'}">${rol}</span>`;
  }

  function onlineDot(online) {
    return online
      ? `<span class="online-indicator"><span class="dot-online"></span>En línea</span>`
      : `<span class="online-indicator"><span class="dot-offline"></span>Offline</span>`;
  }

  function fmtDate(d) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('es-MX', { day:'2-digit', month:'short', year:'numeric' });
  }

  async function load(page = 1) {
    currentPage = page;
    const search = document.getElementById('user-search').value.trim();
    const rol    = document.getElementById('user-rol-filter').value;
    const activo = document.getElementById('user-status-filter').value;
    const tbody  = document.getElementById('users-tbody');
    tbody.innerHTML = `<tr><td colspan="7" class="loading-row">Cargando…</td></tr>`;

    try {
      const qs = new URLSearchParams({ page, limit: 20, search, rol, activo }).toString();
      const d  = await Auth.api('GET', `/users?${qs}`);
      renderRows(d.usuarios);
      renderPagination('users-pagination', d.page, d.pages, load);
    } catch (e) {
      tbody.innerHTML = `<tr><td colspan="7" class="loading-row" style="color:var(--red)">${e.message}</td></tr>`;
    }
  }

  function renderRows(usuarios) {
    const tbody = document.getElementById('users-tbody');
    if (!usuarios.length) {
      tbody.innerHTML = `<tr><td colspan="7" class="loading-row">No se encontraron usuarios</td></tr>`;
      return;
    }
    tbody.innerHTML = usuarios.map(u => `
      <tr>
        <td>
          <div class="user-cell">
            ${avatarHTML(u)}
            <div>
              <div class="user-name">${u.first_name} ${u.last_name || ''}</div>
              <div class="user-username">@${u.username}</div>
            </div>
          </div>
        </td>
        <td>${u.correo}</td>
        <td>${rolBadge(u.rol)}</td>
        <td><span class="badge ${u.activo ? 'badge-active' : 'badge-inactive'}">${u.activo ? 'Activo' : 'Inactivo'}</span></td>
        <td>${onlineDot(u.online)}</td>
        <td>${fmtDate(u.createdAt)}</td>
        <td>
          <div class="actions-cell">
            <button class="btn btn-ghost btn-sm" onclick="Usuarios.openModal('${u._id}')">Ver</button>
            <button class="btn btn-${u.activo ? 'warn' : 'success'} btn-sm" onclick="Usuarios.toggle('${u._id}', this)">
              ${u.activo ? 'Desactivar' : 'Activar'}
            </button>
            <button class="btn btn-danger btn-sm" onclick="Usuarios.eliminar('${u._id}', '${u.first_name}')">Eliminar</button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  async function openModal(id) {
    const overlay = document.getElementById('user-modal');
    const body    = document.getElementById('modal-body');
    overlay.classList.remove('hidden');
    body.innerHTML = '<p style="color:var(--text2);text-align:center;padding:40px">Cargando…</p>';

    try {
      const { usuario: u, stats } = await Auth.api('GET', `/users/${id}`);
      const letter = (u.first_name || '?')[0].toUpperCase();
      const avatar = u.profile_picture?.url
        ? `<div class="modal-avatar"><img src="${u.profile_picture.url}" /></div>`
        : `<div class="modal-avatar">${letter}</div>`;

      body.innerHTML = `
        <div class="modal-user-header">
          ${avatar}
          <div class="modal-user-info">
            <h2>${u.first_name} ${u.last_name || ''}</h2>
            <p>@${u.username} · ${u.correo}</p>
            <p style="margin-top:6px">${rolBadge(u.rol)} <span class="badge ${u.activo ? 'badge-active' : 'badge-inactive'}" style="margin-left:4px">${u.activo ? 'Activo' : 'Inactivo'}</span></p>
          </div>
        </div>
        <div class="modal-stats">
          <div class="mstat"><div class="mstat-val">${stats.totalMatches}</div><div class="mstat-label">Matches</div></div>
          <div class="mstat"><div class="mstat-val">${stats.totalMensajes}</div><div class="mstat-label">Mensajes</div></div>
          <div class="mstat"><div class="mstat-val">${stats.totalReportes}</div><div class="mstat-label">Reportes recibidos</div></div>
        </div>
        <div class="modal-fields">
          <div class="mfield"><label>Género</label><p>${u.gender || '—'}</p></div>
          <div class="mfield"><label>Ciudad</label><p>${u.ciudad || '—'}</p></div>
          <div class="mfield"><label>País</label><p>${u.pais || '—'}</p></div>
          <div class="mfield"><label>Auth</label><p>${u.auth_provider}</p></div>
          <div class="mfield"><label>Teléfono</label><p>${u.telefono || '—'}</p></div>
          <div class="mfield"><label>Verificado</label><p>${u.is_verified ? '✅ Sí' : '❌ No'}</p></div>
          <div class="mfield"><label>Registro</label><p>${fmtDate(u.createdAt)}</p></div>
          <div class="mfield"><label>Online ahora</label><p>${u.online ? '🟢 Sí' : '⚫ No'}</p></div>
        </div>
        ${u.bio ? `<div style="margin-bottom:16px"><label style="font-size:11px;color:var(--text3);text-transform:uppercase">Bio</label><p style="margin-top:4px;color:var(--text2);font-size:13px">${u.bio}</p></div>` : ''}
        <div class="modal-actions">
          <select id="modal-rol-select" class="select-sm">
            <option value="user"     ${u.rol==='user'?'selected':''}>user</option>
            <option value="admin"    ${u.rol==='admin'?'selected':''}>admin</option>
            <option value="asociado" ${u.rol==='asociado'?'selected':''}>asociado</option>
          </select>
          <button class="btn btn-primary btn-sm" onclick="Usuarios.cambiarRol('${u._id}')">Cambiar rol</button>
          <button class="btn btn-${u.activo ? 'warn' : 'success'} btn-sm" onclick="Usuarios.toggle('${u._id}', this);document.getElementById('user-modal').classList.add('hidden');load()">
            ${u.activo ? 'Desactivar' : 'Activar'}
          </button>
          <button class="btn btn-danger btn-sm" onclick="Usuarios.eliminar('${u._id}','${u.first_name}')">Eliminar cuenta</button>
        </div>
      `;
    } catch (e) {
      body.innerHTML = `<p style="color:var(--red);padding:20px">${e.message}</p>`;
    }
  }

  async function toggle(id, btn) {
    try {
      const d = await Auth.api('PUT', `/users/${id}/toggle`);
      showToast(d.message, 'success');
      load(currentPage);
    } catch (e) { showToast(e.message, 'error'); }
  }

  async function cambiarRol(id) {
    const rol = document.getElementById('modal-rol-select')?.value;
    if (!rol) return;
    try {
      const d = await Auth.api('PUT', `/users/${id}/role`, { rol });
      showToast(d.message, 'success');
      document.getElementById('user-modal').classList.add('hidden');
      load(currentPage);
    } catch (e) { showToast(e.message, 'error'); }
  }

  async function eliminar(id, nombre) {
    if (!confirm(`¿Eliminar permanentemente la cuenta de ${nombre}? Esta acción no se puede deshacer.`)) return;
    try {
      const d = await Auth.api('DELETE', `/users/${id}`);
      showToast(d.message, 'success');
      document.getElementById('user-modal').classList.add('hidden');
      load(currentPage);
    } catch (e) { showToast(e.message, 'error'); }
  }

  function init() {
    load(1);
    document.getElementById('user-search-btn').addEventListener('click', () => load(1));
    document.getElementById('user-search').addEventListener('keydown', e => { if (e.key === 'Enter') load(1); });
    document.getElementById('user-rol-filter').addEventListener('change', () => load(1));
    document.getElementById('user-status-filter').addEventListener('change', () => load(1));
  }

  return { init, load, openModal, toggle, cambiarRol, eliminar };
})();
