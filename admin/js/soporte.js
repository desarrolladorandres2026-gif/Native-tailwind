/* ── SOPORTE ── Gestión de tickets de soporte ── */
const Soporte = (() => {
  let currentPage = 1;

  const categoriaLabel = {
    problema_tecnico: '🐛 Problema técnico',
    cuenta:           '👤 Mi cuenta',
    pagos:            '💳 Pagos',
    abuso:            '🛡️ Abuso o acoso',
    sugerencia:       '💡 Sugerencia',
    otro:             '❓ Otro',
  };

  const estadoMap = {
    abierto:     { cls: 'badge-pending',  label: 'Abierto' },
    en_revision: { cls: 'badge-reviewed', label: 'En revisión' },
    resuelto:    { cls: 'badge-resolved', label: 'Resuelto' },
    cerrado:     { cls: 'badge-inactive', label: 'Cerrado' },
  };

  function estadoBadge(estado) {
    const m = estadoMap[estado] || { cls: 'badge-pending', label: estado };
    return `<span class="badge ${m.cls}">${m.label}</span>`;
  }

  function fmtDate(d) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  function userCell(u) {
    if (!u) return '<span style="color:var(--text3)">—</span>';
    const letter = (u.first_name || u.username || '?')[0].toUpperCase();
    const avatar = u.profile_picture?.url
      ? `<div class="user-avatar"><img src="${u.profile_picture.url}" /></div>`
      : `<div class="user-avatar">${letter}</div>`;
    return `<div class="user-cell">${avatar}<div><div class="user-name">${u.first_name || ''} ${u.last_name || ''}</div><div class="user-username">${u.correo || ''}</div></div></div>`;
  }

  async function loadStats() {
    try {
      const d = await Auth.api('GET', '/soporte/stats');
      // Actualizar KPIs de soporte
      const el = document.getElementById('kpi-soporte-val');
      if (el) el.textContent = d.abiertos + d.enRevision;

      // Badge en el nav
      const badge = document.getElementById('badge-soporte');
      if (badge) {
        if (d.noLeidos > 0) {
          badge.textContent = d.noLeidos;
          badge.style.display = 'inline-flex';
        } else {
          badge.style.display = 'none';
        }
      }

      // KPI cards en la sección soporte
      const setKpi = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };
      setKpi('soporte-kpi-abiertos',    d.abiertos);
      setKpi('soporte-kpi-en-revision', d.enRevision);
      setKpi('soporte-kpi-resueltos',   d.resueltos);
      setKpi('soporte-kpi-no-leidos',   d.noLeidos);
    } catch (e) {
      console.error('loadStats soporte:', e);
    }
  }

  async function load(page = 1) {
    currentPage = page;
    const estado = document.getElementById('soporte-status-filter')?.value || '';
    const tbody  = document.getElementById('soporte-tbody');
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="6" class="loading-row">Cargando…</td></tr>`;

    try {
      const qs = new URLSearchParams({ page, limit: 20, estado }).toString();
      const d  = await Auth.api('GET', `/soporte?${qs}`);
      renderRows(d.tickets);
      renderPagination('soporte-pagination', d.page, d.pages, load);
    } catch (e) {
      tbody.innerHTML = `<tr><td colspan="6" class="loading-row" style="color:var(--red)">${e.message}</td></tr>`;
    }
  }

  function renderRows(tickets) {
    const tbody = document.getElementById('soporte-tbody');
    if (!tickets.length) {
      tbody.innerHTML = `<tr><td colspan="6" class="loading-row">No hay tickets</td></tr>`;
      return;
    }
    tbody.innerHTML = tickets.map(t => `
      <tr class="${!t.leido_admin ? 'ticket-unread' : ''}">
        <td>${userCell(t.usuario)}</td>
        <td><span class="badge" style="background:rgba(160,160,255,0.1);color:#a0a0ff;border:1px solid rgba(160,160,255,0.25)">${categoriaLabel[t.categoria] || t.categoria}</span></td>
        <td style="max-width:200px;font-weight:600;color:var(--text)">${t.asunto}</td>
        <td style="max-width:220px;color:var(--text2);font-size:12px">${(t.descripcion || '').slice(0, 80)}${t.descripcion?.length > 80 ? '…' : ''}</td>
        <td>${estadoBadge(t.estado)}</td>
        <td>${fmtDate(t.createdAt)}</td>
        <td>
          <div class="actions-cell">
            <button class="btn btn-ghost btn-sm" onclick="Soporte.openTicket('${t._id}')">Ver</button>
            ${t.estado === 'abierto'      ? `<button class="btn btn-warn btn-sm" onclick="Soporte.setStatus('${t._id}','en_revision')">Revisar</button>` : ''}
            ${t.estado !== 'resuelto' && t.estado !== 'cerrado' ? `<button class="btn btn-success btn-sm" onclick="Soporte.setStatus('${t._id}','resuelto')">Resolver</button>` : ''}
            ${t.estado !== 'cerrado' ? `<button class="btn btn-danger btn-sm" onclick="Soporte.setStatus('${t._id}','cerrado')">Cerrar</button>` : ''}
          </div>
        </td>
      </tr>
    `).join('');
  }

  async function setStatus(id, estado) {
    try {
      await Auth.api('PUT', `/soporte/${id}`, { estado });
      showToast(`Ticket marcado como ${estadoMap[estado]?.label || estado}`, 'success');
      load(currentPage);
      loadStats();
    } catch (e) { showToast(e.message, 'error'); }
  }

  function openTicket(id) {
    // Abrir el modal de detalles del ticket
    const modal = document.getElementById('ticket-modal');
    const body  = document.getElementById('ticket-modal-body');
    if (!modal || !body) return;

    body.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text3)">Cargando…</div>`;
    modal.classList.remove('hidden');

    Auth.api('GET', `/soporte?page=1&limit=200`).then(d => {
      const t = d.tickets.find(x => x._id === id);
      if (!t) { body.innerHTML = '<p style="color:var(--red)">Ticket no encontrado</p>'; return; }

      const userInfo = t.usuario
        ? `${t.usuario.first_name || ''} ${t.usuario.last_name || ''} (${t.usuario.correo || ''})`
        : '—';

      body.innerHTML = `
        <h2 style="font-size:18px;font-weight:700;margin-bottom:6px">${t.asunto}</h2>
        <div style="display:flex;gap:8px;margin-bottom:20px;flex-wrap:wrap">
          ${estadoBadge(t.estado)}
          <span class="badge" style="background:rgba(160,160,255,0.1);color:#a0a0ff;border:1px solid rgba(160,160,255,0.25)">${categoriaLabel[t.categoria] || t.categoria}</span>
        </div>

        <div style="margin-bottom:16px">
          <div style="font-size:11px;color:var(--text3);text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">Usuario</div>
          <div style="color:var(--text);font-weight:600">${userInfo}</div>
        </div>

        <div style="margin-bottom:20px">
          <div style="font-size:11px;color:var(--text3);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">Descripción</div>
          <div style="background:var(--card);border:1px solid var(--border);border-radius:8px;padding:14px;color:var(--text2);font-size:13px;line-height:1.6;white-space:pre-wrap">${t.descripcion}</div>
        </div>

        <div style="margin-bottom:20px">
          <div style="font-size:11px;color:var(--text3);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">Respuesta del admin</div>
          <textarea id="ticket-respuesta" style="width:100%;background:var(--card);border:1px solid var(--border);border-radius:8px;padding:12px;color:var(--text);font-size:13px;font-family:inherit;resize:vertical;min-height:80px;outline:none" placeholder="Escribe una respuesta para el usuario...">${t.respuesta_admin || ''}</textarea>
        </div>

        <div style="display:flex;gap:8px;flex-wrap:wrap">
          ${t.estado !== 'en_revision' ? `<button class="btn btn-warn btn-sm" onclick="Soporte.updateTicket('${t._id}','en_revision')">Marcar en revisión</button>` : ''}
          ${t.estado !== 'resuelto' ? `<button class="btn btn-success btn-sm" onclick="Soporte.updateTicket('${t._id}','resuelto')">Marcar resuelto</button>` : ''}
          ${t.estado !== 'cerrado'  ? `<button class="btn btn-danger btn-sm" onclick="Soporte.updateTicket('${t._id}','cerrado')">Cerrar ticket</button>` : ''}
          <button class="btn btn-primary btn-sm" onclick="Soporte.saveRespuesta('${t._id}')">💾 Guardar respuesta</button>
        </div>

        <div style="margin-top:16px;font-size:11px;color:var(--text3)">Recibido: ${fmtDate(t.createdAt)}</div>
      `;
    }).catch(e => {
      body.innerHTML = `<p style="color:var(--red)">${e.message}</p>`;
    });
  }

  async function updateTicket(id, estado) {
    const respuesta = document.getElementById('ticket-respuesta')?.value || '';
    try {
      await Auth.api('PUT', `/soporte/${id}`, { estado, respuesta_admin: respuesta });
      showToast(`Ticket actualizado a: ${estadoMap[estado]?.label || estado}`, 'success');
      document.getElementById('ticket-modal')?.classList.add('hidden');
      load(currentPage);
      loadStats();
    } catch (e) { showToast(e.message, 'error'); }
  }

  async function saveRespuesta(id) {
    const respuesta = document.getElementById('ticket-respuesta')?.value || '';
    try {
      await Auth.api('PUT', `/soporte/${id}`, { respuesta_admin: respuesta });
      showToast('Respuesta guardada', 'success');
    } catch (e) { showToast(e.message, 'error'); }
  }

  function init() {
    loadStats();
    document.getElementById('soporte-filter-btn')?.addEventListener('click', () => load(1));
    document.getElementById('soporte-status-filter')?.addEventListener('change', () => load(1));
  }

  return { init, load, loadStats, setStatus, openTicket, updateTicket, saveRespuesta };
})();
