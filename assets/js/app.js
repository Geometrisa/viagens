'use strict';

// ============================================================
// APP — Main orchestrator
// ============================================================
const App = {
  currentView: null,

  init() {
    db.load();
    // Auto-update trip statuses based on today's date
    if (typeof autoUpdateViagemStatus === 'function') autoUpdateViagemStatus();
    // Repeat auto-update every hour (3 600 000 ms)
    setInterval(() => {
      if (typeof autoUpdateViagemStatus === 'function') {
        autoUpdateViagemStatus();
        App.updateBadges();
      }
    }, 3600000);
    this.setupNav();
    this.setupModals();
    this.setupGlobalEvents();
    this.setupSearch();
    this.setupFAB();
    this.navigate('resumo');
    this.updateBadges();
  },

  navigate(view) {
    // Clean up settings footer if leaving settings
    if (this.currentView === 'configuracoes') {
      const footer = document.getElementById('settings-footer');
      if (footer) footer.remove();
    }

    // Hide all views
    document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));

    // Update nav active state
    document.querySelectorAll('.nav-btn[data-view]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === view);
    });
    document.querySelectorAll('.dropdown-item[data-view]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === view);
    });

    this.currentView = view;

    // Show and render the target view
    const el = document.getElementById('view-' + view);
    if (el) {
      el.classList.add('active');
      this.renderView(view);
    }

    // Close detail panel when navigating
    closeDetailPanel();
  },

  renderView(view) {
    switch(view) {
      case 'resumo':          renderResumo();          break;
      case 'viagens':         renderViagens();         break;
      case 'equipe':          renderEquipe();          break;
      case 'calendar-viagens': initCalendar('viagens'); break;
      case 'calendar-equipe':
        CalState.mode = 'equipe';
        renderTeamCalendarPage();
        break;
      case 'timeline':        initTimeline();         break;
      case 'empreendedores':  renderEmpreendedores();  break;
      case 'atividades':      renderAtividades();      break;
      case 'configuracoes':   renderConfiguracoes();   break;
    }
  },

  refresh() {
    this.renderView(this.currentView);
    this.updateBadges();
  },

  onDataChange() {
    this.updateBadges();
  },

  updateBadges() {
    // Badge on Viagens nav item for upcoming trips
    const cfg = db.data.configuracoes;
    const today = isoToday();
    const upcoming = db.data.viagens.filter(v => {
      if (v.status === 'Cancelado' || v.status === 'Concluído') return false;
      const p = db.getViagemPeriod(v);
      if (!p) return false;
      const dias = daysBetween(today, p.inicio);
      return dias >= 0 && dias <= cfg.alertaDias;
    });
    const badge = document.getElementById('nav-badge-viagens');
    if (badge) {
      badge.textContent = upcoming.length;
      badge.style.display = upcoming.length > 0 ? 'inline' : 'none';
    }
  },

  // ============================================================
  setupNav() {
    document.querySelectorAll('[data-view]').forEach(btn => {
      btn.addEventListener('click', () => {
        const view = btn.dataset.view;
        if (view) this.navigate(view);
      });
    });

    // Dropdown toggles
    document.querySelectorAll('.dropdown').forEach(dropdown => {
      const trigger = dropdown.querySelector('.nav-btn');
      if (trigger) {
        trigger.addEventListener('click', (e) => {
          e.stopPropagation();
          // Close other dropdowns
          document.querySelectorAll('.dropdown.open').forEach(d => {
            if (d !== dropdown) d.classList.remove('open');
          });
          dropdown.classList.toggle('open');
        });
      }
    });

    document.addEventListener('click', () => {
      document.querySelectorAll('.dropdown.open').forEach(d => d.classList.remove('open'));
    });
  },

  // ============================================================
  setupModals() {
    // Viagem modal
    const vmOverlay = document.getElementById('viagem-modal-overlay');
    if (vmOverlay) {
      vmOverlay.addEventListener('click', (e) => {
        if (e.target === vmOverlay) closeViagemModal();
      });
    }

    // Availability modal
    const avOverlay = document.getElementById('availability-modal-overlay');
    if (avOverlay) {
      avOverlay.addEventListener('click', (e) => {
        if (e.target === avOverlay) closeAvailabilityModal();
      });
    }
  },

  // ============================================================
  setupGlobalEvents() {
    document.addEventListener('keydown', (e) => {
      // ESC
      if (e.key === 'Escape') {
        // Close modals in order of priority
        if (!document.getElementById('confirm-overlay')?.classList.contains('hidden')) {
          document.getElementById('confirm-overlay').classList.add('hidden');
          return;
        }
        if (!document.getElementById('viagem-modal-overlay')?.classList.contains('hidden')) {
          closeViagemModal();
          return;
        }
        if (!document.getElementById('availability-modal-overlay')?.classList.contains('hidden')) {
          closeAvailabilityModal();
          return;
        }
        if (document.getElementById('detail-panel')?.classList.contains('open')) {
          closeDetailPanel();
          return;
        }
        if (document.body.classList.contains('presentation-mode')) {
          exitPresentationMode();
          return;
        }
        // Close search
        const so = document.getElementById('search-overlay');
        if (so?.classList.contains('visible')) {
          so.classList.remove('visible');
          return;
        }
      }

      // Ctrl+F — search
      if ((e.ctrlKey||e.metaKey) && e.key === 'f') {
        const so = document.getElementById('search-overlay');
        if (so) {
          e.preventDefault();
          so.classList.toggle('visible');
          if (so.classList.contains('visible')) {
            document.getElementById('search-input')?.focus();
          }
        }
      }
    });

    // Click outside detail panel
    document.addEventListener('click', (e) => {
      const panel = document.getElementById('detail-panel');
      if (panel?.classList.contains('open') && !panel.contains(e.target)) {
        // Only close if not clicking on something that opened it
        const triggerables = document.querySelectorAll('.trip-bar, .timeline-row, [data-opens-panel]');
        if (![...triggerables].some(t => t.contains(e.target))) {
          // Don't auto-close; let user use ESC or X
        }
      }
    });
  },

  // ============================================================
  setupSearch() {
    const searchInput = document.getElementById('search-input');
    if (!searchInput) return;
    searchInput.addEventListener('input', debounce(() => performSearch(searchInput.value), 250));
  },

  // ============================================================
  setupFAB() {
    const fab = document.getElementById('fab-disponivel');
    if (fab) fab.addEventListener('click', () => openAvailabilityModal());
  },
};

// ============================================================
// SEARCH
// ============================================================
function performSearch(q) {
  const results = document.getElementById('search-results');
  if (!results) return;
  results.innerHTML = '';
  if (!q || q.length < 2) return;

  const qL = q.toLowerCase();
  const items = [];

  // Viagens
  for (const v of db.data.viagens) {
    const barrs = v.paradas.map(p => db.getBarragemNome(p.barragemId)).join(' ');
    const emprs = v.paradas.map(p => db.getEmpreendedor(p.empreendedorId)?.nome||'').join(' ');
    if (v.id.toLowerCase().includes(qL) || v.nome.toLowerCase().includes(qL) ||
        barrs.toLowerCase().includes(qL) || emprs.toLowerCase().includes(qL)) {
      items.push({ type:'viagem', label:`${v.id} — ${v.nome}`, sub: barrs, id: v.id });
    }
  }

  // Colaboradores
  for (const c of db.data.colaboradores) {
    if (c.nome.toLowerCase().includes(qL) || c.sigla.toLowerCase().includes(qL)) {
      items.push({ type:'colaborador', label:c.nome, sub:c.sigla, id:c.id });
    }
  }

  if (!items.length) {
    results.innerHTML = '<p style="color:#aaa;font-size:11px;padding:4px">Nenhum resultado.</p>';
    return;
  }

  for (const item of items.slice(0, 15)) {
    const el = document.createElement('div');
    el.className = 'search-result-item';
    el.innerHTML = `
      <span style="font-size:10px;background:${item.type==='viagem'?'var(--c-bg)':'#e8f5e9'};padding:1px 5px;border-radius:3px">${item.type==='viagem'?'✈️':'👤'}</span>
      <span style="font-weight:600;font-size:12px">${escapeHtml(item.label)}</span>
      <span style="font-size:10px;color:#888">${escapeHtml(item.sub)}</span>
    `;
    el.addEventListener('click', () => {
      document.getElementById('search-overlay').classList.remove('visible');
      openDetailPanel(item.type, item.id);
    });
    results.appendChild(el);
  }
}

// ============================================================
// TOAST NOTIFICATIONS
// ============================================================
function showToast(message, type = 'success') {
  const existing = document.querySelector('.toast-notification');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'toast-notification';
  toast.style.cssText = `
    position: fixed;
    bottom: 80px;
    left: 50%;
    transform: translateX(-50%);
    background: ${type==='error'?'#c62828':type==='success'?'#2e7d32':'#0A4174'};
    color: #fff;
    padding: 10px 20px;
    border-radius: var(--radius);
    font-size: 13px;
    font-weight: 600;
    z-index: 9999;
    box-shadow: var(--shadow-lg);
    animation: slideUp .2s ease;
    white-space: nowrap;
  `;
  toast.textContent = message;

  const style = document.createElement('style');
  style.textContent = '@keyframes slideUp{from{opacity:0;transform:translateX(-50%) translateY(10px)}to{opacity:1;transform:translateX(-50%)}}';
  document.head.appendChild(style);

  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// ============================================================
// CONFIRM DIALOG
// ============================================================
function openConfirm(title, body, onConfirm, confirmLabel = 'Confirmar', cancelLabel = 'Cancelar') {
  const overlay = document.getElementById('confirm-overlay');
  if (!overlay) return;

  overlay.querySelector('.confirm-title').textContent = title;
  overlay.querySelector('.confirm-body').innerHTML = body;

  const confirmBtn = overlay.querySelector('.confirm-ok-btn');
  const cancelBtn  = overlay.querySelector('.confirm-cancel-btn');

  confirmBtn.textContent = confirmLabel;
  if (cancelLabel) {
    cancelBtn.textContent = cancelLabel;
    cancelBtn.style.display = 'block';
  } else {
    cancelBtn.style.display = 'none';
  }

  confirmBtn.onclick = () => {
    overlay.classList.add('hidden');
    if (onConfirm) onConfirm();
  };
  cancelBtn.onclick = () => {
    overlay.classList.add('hidden');
  };

  overlay.classList.remove('hidden');
  overlay.onclick = (e) => {
    if (e.target === overlay) overlay.classList.add('hidden');
  };

  // Enter = confirm, Esc already handled globally
  const onKey = (e) => {
    if (overlay.classList.contains('hidden')) { document.removeEventListener('keydown', onKey); return; }
    if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
      e.preventDefault();
      document.removeEventListener('keydown', onKey);
      overlay.classList.add('hidden');
      if (onConfirm) onConfirm();
    }
  };
  // Delay slightly so the keydown that opened this dialog doesn't immediately confirm it
  setTimeout(() => document.addEventListener('keydown', onKey), 100);
}

// ============================================================
// INIT on DOM ready
// ============================================================
document.addEventListener('DOMContentLoaded', () => App.init());
