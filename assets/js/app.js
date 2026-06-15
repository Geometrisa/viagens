"use strict";

// ============================================================
// APP — Main orchestrator
// ============================================================
const App = {
  currentView: null,
  _authUnsubscribe: null,
  _hourlyTimer: null,
  _startPromise: null,
  _uiInitialized: false,
  _started: false,

  async init() {
    this.setupAuthUI();
    this.showAuthLoading();

    try {
      await Auth.init();
      this._authUnsubscribe = Auth.onAuthStateChange((event, session) => {
        this.handleAuthStateChange(event, session);
      });

      const session = await Auth.getSession();
      if (session) {
        await this.startAuthenticatedApp(session);
      } else {
        this.showLogin();
      }
    } catch (error) {
      console.error("Erro ao iniciar autenticação:", error);
      this.showLogin(
        "Não foi possível conectar ao serviço de autenticação. Recarregue a página.",
        true,
      );
    }
  },

  setupAuthUI() {
    const form = document.getElementById("auth-login-form");
    const logoutBtn = document.getElementById("auth-logout-btn");

    form?.addEventListener("submit", (event) => {
      event.preventDefault();
      this.handleLoginSubmit();
    });
    logoutBtn?.addEventListener("click", () => this.handleLogout());
  },

  async handleLoginSubmit() {
    const emailInput = document.getElementById("auth-email");
    const passwordInput = document.getElementById("auth-password");
    const email = emailInput?.value.trim() || "";
    const password = passwordInput?.value || "";

    this.setLoginError("");
    if (!email || !password) {
      this.setLoginError("Informe o email e a senha.");
      return;
    }

    this.setLoginBusy(true);
    try {
      const session = await Auth.signIn(email, password);
      if (!session) throw new Error("Sessão não criada.");

      if (passwordInput) passwordInput.value = "";
      await this.startAuthenticatedApp(session);
    } catch (error) {
      console.warn("Falha no login.");
      this.setLoginError("Não foi possível entrar. Verifique email e senha.");
    } finally {
      this.setLoginBusy(false);
    }
  },

  async handleLogout() {
    const logoutBtn = document.getElementById("auth-logout-btn");
    if (logoutBtn) logoutBtn.disabled = true;

    try {
      await Auth.signOut();
      this.stopAuthenticatedApp();
      this.showLogin();
    } catch (error) {
      console.error("Erro ao sair:", error);
      showToast("Não foi possível encerrar a sessão.", "error");
    } finally {
      if (logoutBtn) logoutBtn.disabled = false;
    }
  },

  handleAuthStateChange(event, session) {
    if (event === "SIGNED_OUT" || !session) {
      this.stopAuthenticatedApp();
      this.showLogin();
      return;
    }

    if (event === "SIGNED_IN" || event === "INITIAL_SESSION") {
      this.startAuthenticatedApp(session).catch((error) => {
        console.error("Erro ao abrir aplicação autenticada:", error);
        this.showLogin("Não foi possível carregar a aplicação.", true);
      });
      return;
    }

    this.updateAuthenticatedUser(session.user);
  },

  async startAuthenticatedApp(session) {
    if (this._started) {
      this.updateAuthenticatedUser(session.user);
      this.showAuthenticatedApp();
      return;
    }
    if (this._startPromise) return this._startPromise;

    this._startPromise = Promise.resolve().then(() => {
      db.load();

      if (typeof autoUpdateViagemStatus === "function") {
        autoUpdateViagemStatus();
      }

      if (!this._uiInitialized) {
        this.setupNav();
        this.setupModals();
        this.setupGlobalEvents();
        this.setupSearch();
        this.setupFAB();
        this._uiInitialized = true;
      }

      if (!this._hourlyTimer) {
        this._hourlyTimer = setInterval(() => {
          if (typeof autoUpdateViagemStatus === "function") {
            autoUpdateViagemStatus();
            App.updateBadges();
          }
        }, 3600000);
      }

      this._started = true;
      this.updateAuthenticatedUser(session.user);
      this.showAuthenticatedApp();
      this.navigate("resumo");
      this.updateBadges();
    });

    try {
      await this._startPromise;
    } finally {
      this._startPromise = null;
    }
  },

  stopAuthenticatedApp() {
    if (this._hourlyTimer) {
      clearInterval(this._hourlyTimer);
      this._hourlyTimer = null;
    }

    this._started = false;
    this._startPromise = null;
    this.currentView = null;

    document
      .querySelectorAll(".view")
      .forEach((view) => view.replaceChildren());
    document.querySelectorAll(".view.active").forEach((view) => {
      view.classList.remove("active");
    });
    document.getElementById("settings-footer")?.remove();
    document.getElementById("search-overlay")?.classList.remove("visible");
    document.getElementById("search-results")?.replaceChildren();
    const searchInput = document.getElementById("search-input");
    if (searchInput) searchInput.value = "";
    document.getElementById("detail-panel-body")?.replaceChildren();
    document.getElementById("detail-panel-tabs")?.replaceChildren();
    closeDetailPanel();

    document.querySelectorAll(".modal-overlay").forEach((overlay) => {
      overlay.classList.add("hidden");
    });
    document.getElementById("viagem-modal-body")?.replaceChildren();
    document.getElementById("av-results")?.replaceChildren();

    const confirmOverlay = document.getElementById("confirm-overlay");
    confirmOverlay?.querySelector(".confirm-body")?.replaceChildren();
    const confirmButton = confirmOverlay?.querySelector(".confirm-ok-btn");
    const cancelButton = confirmOverlay?.querySelector(".confirm-cancel-btn");
    if (confirmButton) confirmButton.onclick = null;
    if (cancelButton) cancelButton.onclick = null;

    if (typeof _currentViagemDraft !== "undefined") {
      _currentViagemDraft = null;
      _originalViagemSnapshot = null;
    }

    this.updateAuthenticatedUser(null);
    db.clearMemory();
  },

  showAuthLoading() {
    document.body.classList.remove("auth-logged-out", "auth-authenticated");
    document.body.classList.add("auth-loading");
    document.getElementById("auth-loading-screen")?.classList.remove("hidden");
    document.getElementById("auth-login-screen")?.classList.add("hidden");
  },

  showLogin(message = "", disabled = false) {
    document.body.classList.remove("auth-loading", "auth-authenticated");
    document.body.classList.add("auth-logged-out");
    document.getElementById("auth-loading-screen")?.classList.add("hidden");
    document.getElementById("auth-login-screen")?.classList.remove("hidden");
    this.setLoginError(message);
    this.setLoginBusy(false, disabled);

    const passwordInput = document.getElementById("auth-password");
    if (passwordInput) passwordInput.value = "";
    setTimeout(() => document.getElementById("auth-email")?.focus(), 0);
  },

  showAuthenticatedApp() {
    document.body.classList.remove("auth-loading", "auth-logged-out");
    document.body.classList.add("auth-authenticated");
    document.getElementById("auth-loading-screen")?.classList.add("hidden");
    document.getElementById("auth-login-screen")?.classList.add("hidden");
    this.setLoginError("");
  },

  updateAuthenticatedUser(user) {
    const emailEl = document.getElementById("auth-user-email");
    if (emailEl) {
      emailEl.textContent = user?.email || "Usuário autenticado";
      emailEl.title = user?.email || "";
    }
  },

  setLoginBusy(busy, disabled = false) {
    const button = document.getElementById("auth-login-btn");
    const emailInput = document.getElementById("auth-email");
    const passwordInput = document.getElementById("auth-password");
    const shouldDisable = busy || disabled;

    if (button) {
      button.disabled = shouldDisable;
      button.textContent = busy ? "Entrando..." : "Entrar";
    }
    if (emailInput) emailInput.disabled = shouldDisable;
    if (passwordInput) passwordInput.disabled = shouldDisable;
  },

  setLoginError(message) {
    const errorEl = document.getElementById("auth-login-error");
    if (errorEl) errorEl.textContent = message;
  },

  navigate(view) {
    // Clean up settings footer if leaving settings
    if (this.currentView === "configuracoes") {
      const footer = document.getElementById("settings-footer");
      if (footer) footer.remove();
    }

    // Hide all views
    document
      .querySelectorAll(".view")
      .forEach((el) => el.classList.remove("active"));

    // Update nav active state
    document.querySelectorAll(".nav-btn[data-view]").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.view === view);
    });
    document.querySelectorAll(".dropdown-item[data-view]").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.view === view);
    });

    this.currentView = view;

    // Show and render the target view
    const el = document.getElementById("view-" + view);
    if (el) {
      el.classList.add("active");
      this.renderView(view);
    }

    // Close detail panel when navigating
    closeDetailPanel();
  },

  renderView(view) {
    switch (view) {
      case "resumo":
        renderResumo();
        break;
      case "viagens":
        renderViagens();
        break;
      case "equipe":
        renderEquipe();
        break;
      case "calendar-viagens":
        initCalendar("viagens");
        break;
      case "calendar-equipe":
        CalState.mode = "equipe";
        renderTeamCalendarPage();
        break;
      case "timeline":
        initTimeline();
        break;
      case "empreendedores":
        renderEmpreendedores();
        break;
      case "atividades":
        renderAtividades();
        break;
      case "configuracoes":
        renderConfiguracoes();
        break;
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
    const upcoming = db.data.viagens.filter((v) => {
      if (v.status === "Cancelado" || v.status === "Concluído") return false;
      const p = db.getViagemPeriod(v);
      if (!p) return false;
      const dias = daysBetween(today, p.inicio);
      return dias >= 0 && dias <= cfg.alertaDias;
    });
    const badge = document.getElementById("nav-badge-viagens");
    if (badge) {
      badge.textContent = upcoming.length;
      badge.style.display = upcoming.length > 0 ? "inline" : "none";
    }
  },

  // ============================================================
  setupNav() {
    document.querySelectorAll("[data-view]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const view = btn.dataset.view;
        if (view) this.navigate(view);
      });
    });

    // Dropdown toggles
    document.querySelectorAll(".dropdown").forEach((dropdown) => {
      const trigger = dropdown.querySelector(".nav-btn");
      if (trigger) {
        trigger.addEventListener("click", (e) => {
          e.stopPropagation();
          // Close other dropdowns
          document.querySelectorAll(".dropdown.open").forEach((d) => {
            if (d !== dropdown) d.classList.remove("open");
          });
          dropdown.classList.toggle("open");
        });
      }
    });

    document.addEventListener("click", () => {
      document
        .querySelectorAll(".dropdown.open")
        .forEach((d) => d.classList.remove("open"));
    });
  },

  // ============================================================
  setupModals() {
    // Viagem modal
    const vmOverlay = document.getElementById("viagem-modal-overlay");
    if (vmOverlay) {
      vmOverlay.addEventListener("click", (e) => {
        if (e.target === vmOverlay) closeViagemModal();
      });
    }

    // Availability modal
    const avOverlay = document.getElementById("availability-modal-overlay");
    if (avOverlay) {
      avOverlay.addEventListener("click", (e) => {
        if (e.target === avOverlay) closeAvailabilityModal();
      });
    }
  },

  // ============================================================
  setupGlobalEvents() {
    document.addEventListener("keydown", (e) => {
      // ESC
      if (e.key === "Escape") {
        // Close modals in order of priority
        if (
          !document
            .getElementById("confirm-overlay")
            ?.classList.contains("hidden")
        ) {
          document.getElementById("confirm-overlay").classList.add("hidden");
          return;
        }
        if (
          !document
            .getElementById("viagem-modal-overlay")
            ?.classList.contains("hidden")
        ) {
          closeViagemModal();
          return;
        }
        if (
          !document
            .getElementById("availability-modal-overlay")
            ?.classList.contains("hidden")
        ) {
          closeAvailabilityModal();
          return;
        }
        if (
          document.getElementById("detail-panel")?.classList.contains("open")
        ) {
          closeDetailPanel();
          return;
        }
        if (document.body.classList.contains("presentation-mode")) {
          exitPresentationMode();
          return;
        }
        // Close search
        const so = document.getElementById("search-overlay");
        if (so?.classList.contains("visible")) {
          so.classList.remove("visible");
          return;
        }
      }

      // Ctrl+F — search
      if ((e.ctrlKey || e.metaKey) && e.key === "f") {
        const so = document.getElementById("search-overlay");
        if (so) {
          e.preventDefault();
          so.classList.toggle("visible");
          if (so.classList.contains("visible")) {
            document.getElementById("search-input")?.focus();
          }
        }
      }
    });

    // Click outside detail panel
    document.addEventListener("click", (e) => {
      const panel = document.getElementById("detail-panel");
      if (panel?.classList.contains("open") && !panel.contains(e.target)) {
        // Only close if not clicking on something that opened it
        const triggerables = document.querySelectorAll(
          ".trip-bar, .timeline-row, [data-opens-panel]",
        );
        if (![...triggerables].some((t) => t.contains(e.target))) {
          // Don't auto-close; let user use ESC or X
        }
      }
    });
  },

  // ============================================================
  setupSearch() {
    const searchInput = document.getElementById("search-input");
    if (!searchInput) return;
    searchInput.addEventListener(
      "input",
      debounce(() => performSearch(searchInput.value), 250),
    );
  },

  // ============================================================
  setupFAB() {
    const fab = document.getElementById("fab-disponivel");
    if (fab) fab.addEventListener("click", () => openAvailabilityModal());
  },
};

// ============================================================
// SEARCH
// ============================================================
function performSearch(q) {
  const results = document.getElementById("search-results");
  if (!results) return;
  results.innerHTML = "";
  if (!q || q.length < 2) return;

  const qL = q.toLowerCase();
  const items = [];

  // Viagens
  for (const v of db.data.viagens) {
    const barrs = v.paradas
      .map((p) => db.getBarragemNome(p.barragemId))
      .join(" ");
    const emprs = v.paradas
      .map((p) => db.getEmpreendedor(p.empreendedorId)?.nome || "")
      .join(" ");
    if (
      v.id.toLowerCase().includes(qL) ||
      v.nome.toLowerCase().includes(qL) ||
      barrs.toLowerCase().includes(qL) ||
      emprs.toLowerCase().includes(qL)
    ) {
      items.push({
        type: "viagem",
        label: `${v.id} — ${v.nome}`,
        sub: barrs,
        id: v.id,
      });
    }
  }

  // Colaboradores
  for (const c of db.data.colaboradores) {
    if (
      c.nome.toLowerCase().includes(qL) ||
      c.sigla.toLowerCase().includes(qL)
    ) {
      items.push({
        type: "colaborador",
        label: c.nome,
        sub: c.sigla,
        id: c.id,
      });
    }
  }

  if (!items.length) {
    results.innerHTML =
      '<p style="color:#aaa;font-size:11px;padding:4px">Nenhum resultado.</p>';
    return;
  }

  for (const item of items.slice(0, 15)) {
    const el = document.createElement("div");
    el.className = "search-result-item";
    el.innerHTML = `
      <span style="font-size:10px;background:${item.type === "viagem" ? "var(--c-bg)" : "#e8f5e9"};padding:1px 5px;border-radius:3px">${item.type === "viagem" ? "✈️" : "👤"}</span>
      <span style="font-weight:600;font-size:12px">${escapeHtml(item.label)}</span>
      <span style="font-size:10px;color:#888">${escapeHtml(item.sub)}</span>
    `;
    el.addEventListener("click", () => {
      document.getElementById("search-overlay").classList.remove("visible");
      openDetailPanel(item.type, item.id);
    });
    results.appendChild(el);
  }
}

// ============================================================
// TOAST NOTIFICATIONS
// ============================================================
function showToast(message, type = "success") {
  const existing = document.querySelector(".toast-notification");
  if (existing) existing.remove();

  const toast = document.createElement("div");
  toast.className = "toast-notification";
  toast.style.cssText = `
    position: fixed;
    bottom: 80px;
    left: 50%;
    transform: translateX(-50%);
    background: ${type === "error" ? "#c62828" : type === "success" ? "#2e7d32" : "#0A4174"};
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

  const style = document.createElement("style");
  style.textContent =
    "@keyframes slideUp{from{opacity:0;transform:translateX(-50%) translateY(10px)}to{opacity:1;transform:translateX(-50%)}}";
  document.head.appendChild(style);

  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// ============================================================
// CONFIRM DIALOG
// ============================================================
function openConfirm(
  title,
  body,
  onConfirm,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
) {
  const overlay = document.getElementById("confirm-overlay");
  if (!overlay) return;

  overlay.querySelector(".confirm-title").textContent = title;
  overlay.querySelector(".confirm-body").innerHTML = body;

  const confirmBtn = overlay.querySelector(".confirm-ok-btn");
  const cancelBtn = overlay.querySelector(".confirm-cancel-btn");

  confirmBtn.textContent = confirmLabel;
  if (cancelLabel) {
    cancelBtn.textContent = cancelLabel;
    cancelBtn.style.display = "block";
  } else {
    cancelBtn.style.display = "none";
  }

  confirmBtn.onclick = () => {
    overlay.classList.add("hidden");
    if (onConfirm) onConfirm();
  };
  cancelBtn.onclick = () => {
    overlay.classList.add("hidden");
  };

  overlay.classList.remove("hidden");
  overlay.onclick = (e) => {
    if (e.target === overlay) overlay.classList.add("hidden");
  };

  // Enter = confirm, Esc already handled globally
  const onKey = (e) => {
    if (overlay.classList.contains("hidden")) {
      document.removeEventListener("keydown", onKey);
      return;
    }
    if (e.key === "Enter" && e.target.tagName !== "TEXTAREA") {
      e.preventDefault();
      document.removeEventListener("keydown", onKey);
      overlay.classList.add("hidden");
      if (onConfirm) onConfirm();
    }
  };
  // Delay slightly so the keydown that opened this dialog doesn't immediately confirm it
  setTimeout(() => document.addEventListener("keydown", onKey), 100);
}

// ============================================================
// INIT on DOM ready
// ============================================================
document.addEventListener("DOMContentLoaded", () => {
  App.init().catch((error) => {
    console.error("Erro fatal na inicialização:", error);
  });
});
