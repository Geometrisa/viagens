"use strict";

// ============================================================
// TRIP COLORS — ordem de criação (mod 20 se ultrapassar)
// ============================================================
const TRIP_COLORS = [
  "#B8D4E8",
  "#A8E2DC",
  "#B0E8C8",
  "#C8EAA8",
  "#F0EAA8",
  "#FFE0A8",
  "#FFCCB0",
  "#FFB8B8",
  "#FFB8D0",
  "#F8C0DC",
  "#F0C0E8",
  "#E0C0F0",
  "#CEB8F0",
  "#C0C8F0",
  "#B8C8E8",
  "#B0D8CC",
  "#D8E8B0",
  "#E8D8B0",
  "#D8C0E8",
  "#C0E0E8",
];

const COLAB_COLORS = [
  "#6264A7",
  "#4F6BED",
  "#038387",
  "#498205",
  "#C239B3",
  "#D83B01",
  "#FFB900",
  "#E74856",
  "#881798",
  "#005B70",
  "#CA5010",
  "#8764B8",
  "#00B7C3",
  "#107C10",
  "#5C2D91",
  "#0078D4",
  "#8E562E",
  "#69797E",
  "#E3008C",
  "#0063B1",
];

const STATUS_COLORS = {
  Previsto: "#BDD8E9",
  Confirmado: "#D4EDDA",
  "Em campo": "#FFE0B2",
  Concluído: "#C8EAA8",
  Cancelado: "#E0E0E0",
};

const STORAGE_KEY = "geoviagens_data_v01";
const BACKUP_KEY = "geoviagens_backups_v01";
const MAX_BACKUPS = 5;

// ============================================================
// INITIAL DATA
// ============================================================
const INITIAL_DATA = {
  colaboradores: [
    { id: "c1", nome: "Ana Lima", sigla: "ALI", status: "Ativo" },
    { id: "c2", nome: "Bruno Souza", sigla: "BSO", status: "Ativo" },
    { id: "c3", nome: "Carla Mendes", sigla: "CME", status: "Ativo" },
    { id: "c4", nome: "Diego Ferreira", sigla: "DFE", status: "Ativo" },
    { id: "c5", nome: "Elisa Rocha", sigla: "ERO", status: "Ativo" },
    { id: "c6", nome: "Felipe Martins", sigla: "FMA", status: "Ativo" },
    { id: "c7", nome: "Gabriela Costa", sigla: "GCO", status: "Ativo" },
    { id: "c8", nome: "Henrique Alves", sigla: "HAL", status: "Ativo" },
    { id: "c9", nome: "Isabela Nunes", sigla: "INU", status: "Ativo" },
    { id: "c10", nome: "João Pereira", sigla: "JPE", status: "Ativo" },
    { id: "c11", nome: "Karen Oliveira", sigla: "KOL", status: "Ativo" },
    { id: "c12", nome: "Lucas Ribeiro", sigla: "LRI", status: "Ativo" },
    { id: "c13", nome: "Marina Santos", sigla: "MSA", status: "Ativo" },
    { id: "c14", nome: "Nelson Carvalho", sigla: "NCA", status: "Ativo" },
    { id: "c15", nome: "Patrícia Gomes", sigla: "PGO", status: "Ativo" },
    { id: "c16", nome: "Rafael Dias", sigla: "RDI", status: "Ativo" },
    { id: "c17", nome: "Sandra Moreira", sigla: "SMO", status: "Ativo" },
    { id: "c18", nome: "Tiago Barbosa", sigla: "TBA", status: "Ativo" },
    { id: "c19", nome: "Ursula Freitas", sigla: "UFR", status: "Ativo" },
    { id: "c20", nome: "Vinícius Cardoso", sigla: "VCA", status: "Ativo" },
  ],
  empreendedores: [
    {
      id: "e1",
      nome: "AXIA",
      barragens: [
        { id: "b1", nome: "UHE Balbina", sigla: "BAL", status: "Ativa" },
        { id: "b2", nome: "UHE Tucuruí", sigla: "TUC", status: "Ativa" },
        { id: "b3", nome: "UHE Samuel", sigla: "SAM", status: "Ativa" },
        { id: "b4", nome: "UHE Coaracy Nunes", sigla: "COA", status: "Ativa" },
        { id: "b5", nome: "UHE Curuá-Una", sigla: "CUA", status: "Ativa" },
      ],
    },
    {
      id: "e2",
      nome: "Ouro Safra",
      barragens: [
        { id: "b6", nome: "Pilar", sigla: "PIL", status: "Ativa" },
        { id: "b7", nome: "Batista", sigla: "BAT", status: "Ativa" },
        { id: "b8", nome: "Jorda Flor", sigla: "JOR", status: "Ativa" },
      ],
    },
    {
      id: "e3",
      nome: "Ambev",
      barragens: [
        { id: "b9", nome: "Barragem do Franco", sigla: "FRA", status: "Ativa" },
      ],
    },
    {
      id: "e4",
      nome: "CHESF",
      barragens: [
        { id: "b10", nome: "Paulo Afonso", sigla: "PAF", status: "Ativa" },
        { id: "b11", nome: "Sobradinho", sigla: "SOB", status: "Ativa" },
        { id: "b12", nome: "Xingó", sigla: "XIN", status: "Ativa" },
      ],
    },
  ],
  atividades: [
    {
      id: "a1",
      nome: "Batimetria",
      categoria: "Segurança",
      icone: "📡",
      status: "Ativa",
      ordem: 1,
    },
    {
      id: "a2",
      nome: "Inspeção",
      categoria: "Segurança",
      icone: "🔍",
      status: "Ativa",
      ordem: 2,
    },
    {
      id: "a3",
      nome: "Coleta de Dados",
      categoria: "Segurança",
      icone: "📊",
      status: "Ativa",
      ordem: 3,
    },
    {
      id: "a4",
      nome: "Cadastro",
      categoria: "Emergência",
      icone: "📋",
      status: "Ativa",
      ordem: 4,
    },
    {
      id: "a5",
      nome: "Simulado",
      categoria: "Emergência",
      icone: "🎯",
      status: "Ativa",
      ordem: 5,
    },
    {
      id: "a6",
      nome: "Workshop",
      categoria: "Emergência",
      icone: "📚",
      status: "Ativa",
      ordem: 6,
    },
    {
      id: "a7",
      nome: "Placas",
      categoria: "Emergência",
      icone: "🪧",
      status: "Ativa",
      ordem: 7,
    },
    {
      id: "a8",
      nome: "Reunião",
      categoria: "Emergência",
      icone: "🤝",
      status: "Ativa",
      ordem: 8,
    },
    {
      id: "a9",
      nome: "Evento",
      categoria: "Emergência",
      icone: "🎪",
      status: "Ativa",
      ordem: 9,
    },
  ],
  viagens: [
    {
      id: "V01",
      nome: "Levantamento Cadastral ZAS",
      status: "Previsto",
      observacoes: "",
      colorIndex: 0,
      paradas: [
        {
          id: "p1",
          empreendedorId: "e1",
          barragemId: "b1",
          dataInicio: "2026-06-27",
          dataFim: "2026-07-05",
          atividades: ["a4"],
          colaboradores: [
            {
              colaboradorId: "c17",
              dataInicio: "2026-06-27",
              dataFim: "2026-07-05",
              confirmado: false,
            },
            {
              colaboradorId: "c18",
              dataInicio: "2026-06-27",
              dataFim: "2026-07-05",
              confirmado: false,
            },
            {
              colaboradorId: "c19",
              dataInicio: "2026-06-27",
              dataFim: "2026-07-05",
              confirmado: false,
            },
            {
              colaboradorId: "c1",
              dataInicio: "2026-06-27",
              dataFim: "2026-06-30",
              confirmado: false,
            },
          ],
        },
      ],
    },
    {
      id: "V02",
      nome: "Workshop + Simulado Externo ZAS",
      status: "Previsto",
      observacoes: "",
      colorIndex: 1,
      paradas: [
        {
          id: "p2",
          empreendedorId: "e1",
          barragemId: "b1",
          dataInicio: "2026-07-05",
          dataFim: "2026-07-08",
          atividades: ["a6", "a5"],
          colaboradores: [
            {
              colaboradorId: "c9",
              dataInicio: "2026-07-05",
              dataFim: "2026-07-08",
              confirmado: false,
            },
            {
              colaboradorId: "c20",
              dataInicio: "2026-07-05",
              dataFim: "2026-07-08",
              confirmado: false,
            },
            {
              colaboradorId: "c18",
              dataInicio: "2026-07-05",
              dataFim: "2026-07-08",
              confirmado: false,
            },
            {
              colaboradorId: "c19",
              dataInicio: "2026-07-05",
              dataFim: "2026-07-08",
              confirmado: false,
            },
          ],
        },
      ],
    },
  ],
  configuracoes: {
    alertaDias: 7,
    limiteGantt: 30,
    anoInicial: 2025,
    anoFinal: 2028,
    feriados: { nacionais: true },
  },
  nextColorIndex: 2,
  nextFeriasId: 1,
  ferias: [],
  historico: [],
};

const STATE_TABLE = "geoviagens_state";
const STATE_ID = "main";
const SAVE_DEBOUNCE_MS = 150;

// ============================================================
// DATABASE CLASS
// ============================================================
class Database {
  constructor() {
    this._data = null;
    this._revision = null;
    this._saveQueue = Promise.resolve();
    this._syncStatus = "idle";
    this._lastSyncError = null;
    this._readOnly = false;
    this._debounceTimer = null;
    this._pendingSaveResolvers = [];
    this._conflictNotified = false;
    this._lastSyncedSnapshot = null;
    this._lastSyncedRevision = null;
    this._conflictSnapshot = null;
  }

  get syncStatus() {
    return this._syncStatus;
  }

  get readOnly() {
    return this._readOnly;
  }

  get lastSyncError() {
    return this._lastSyncError;
  }

  getSyncStatusLabel() {
    switch (this._syncStatus) {
      case "saving":
        return "Salvando...";
      case "synced":
        return "Sincronizado";
      case "offline":
        return "Sem conexão: somente leitura";
      case "conflict":
        return "Conflito de edição";
      case "error":
        return "Falha ao salvar";
      default:
        return "";
    }
  }

  _cloneData(data) {
    return JSON.parse(JSON.stringify(data));
  }

  _validateDataStructure(data) {
    return Boolean(
      data &&
        Array.isArray(data.viagens) &&
        Array.isArray(data.colaboradores) &&
        Array.isArray(data.empreendedores) &&
        Array.isArray(data.atividades) &&
        data.configuracoes,
    );
  }

  _ensureFeriasData() {
    if (!this._data) return;
    if (!Array.isArray(this._data.ferias)) this._data.ferias = [];
    if (typeof this._data.nextFeriasId !== "number") {
      const maxId = this._data.ferias.reduce((mx, f) => {
        const n = parseInt(String(f.id).replace("f", ""), 10);
        return !isNaN(n) && n > mx ? n : mx;
      }, 0);
      this._data.nextFeriasId = maxId + 1;
    }
  }

  _readCache() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;

      const parsed = JSON.parse(raw);
      if (this._validateDataStructure(parsed)) {
        return { data: parsed, revision: null };
      }
      if (parsed?.data && this._validateDataStructure(parsed.data)) {
        return {
          data: parsed.data,
          revision:
            typeof parsed.revision === "number" ? parsed.revision : null,
        };
      }
    } catch (e) {
      return null;
    }
    return null;
  }

  _writeCache(data, revision = this._revision) {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          data,
          revision,
          cachedAt: new Date().toISOString(),
        }),
      );
    } catch (e) {
      console.error("Erro ao gravar cache local:", e);
    }
  }

  _setSyncStatus(status, error = null) {
    this._syncStatus = status;
    this._lastSyncError = error;
    if (status !== "conflict") this._conflictNotified = false;
    if (window.App?.updateSyncStatus) App.updateSyncStatus();
  }

  _markSynced(data, revision) {
    this._lastSyncedSnapshot = this._cloneData(data);
    this._lastSyncedRevision = revision;
    this._conflictSnapshot = null;
  }

  _isRevisionConflict(error, rows) {
    if (rows?.length) return false;
    if (!error) return true;
    const code = String(error.code || "");
    return code === "PGRST116" || code === "PGRST103";
  }

  _handleRevisionConflict(failedSnapshot) {
    this._conflictSnapshot = this._cloneData(failedSnapshot);
    this._setSyncStatus("conflict");

    if (this._lastSyncedSnapshot) {
      this._data = this._cloneData(this._lastSyncedSnapshot);
      this._revision = this._lastSyncedRevision;
      this._writeCache(this._data, this._revision);
      if (window.App?.refresh) App.refresh();
    }

    if (!this._conflictNotified && window.App?.onSyncConflict) {
      this._conflictNotified = true;
      App.onSyncConflict();
    }
  }

  restoreConflictSnapshot() {
    if (!this._conflictSnapshot) return false;
    this._data = this._cloneData(this._conflictSnapshot);
    this._writeCache(this._data, this._revision);
    if (window.App?.refresh) App.refresh();
    return true;
  }

  clearConflictSnapshot() {
    this._conflictSnapshot = null;
  }

  _isNetworkError(error) {
    if (!error) return false;
    if (error.name === "TypeError") return true;
    const msg = String(error.message || error).toLowerCase();
    return (
      msg.includes("failed to fetch") ||
      msg.includes("network") ||
      msg.includes("fetch")
    );
  }

  async load() {
    const session = await Auth.getSession();
    if (!session) throw new Error("Sessão não autenticada.");

    const cached = this._readCache();

    try {
      const { data: row, error } = await Auth.client
        .from(STATE_TABLE)
        .select("data, revision")
        .eq("id", STATE_ID)
        .maybeSingle();

      if (error) throw error;

      if (row) {
        if (!this._validateDataStructure(row.data)) {
          throw new Error("Estrutura remota inválida.");
        }
        this._data = row.data;
        this._revision = row.revision;
        this._readOnly = false;
        this._writeCache(this._data, this._revision);
        this._markSynced(this._data, this._revision);
        this._setSyncStatus("synced");
        return this;
      }

      const seed =
        cached?.data && this._validateDataStructure(cached.data)
          ? cached.data
          : this._cloneData(INITIAL_DATA);

      const user = await Auth.getUser();
      if (!user?.id) throw new Error("Usuário não autenticado.");

      const { data: inserted, error: insertError } = await Auth.client
        .from(STATE_TABLE)
        .insert({
          id: STATE_ID,
          owner_id: user.id,
          data: seed,
          revision: 1,
          updated_at: new Date().toISOString(),
        })
        .select("revision")
        .single();

      if (insertError) {
        if (insertError.code === "23505") {
          return this.reloadFromRemote();
        }
        throw new Error(
          insertError.message?.includes("policy") ||
            insertError.code === "42501"
            ? "Usuário sem permissão para acessar os dados."
            : insertError.message || "Falha ao inicializar dados remotos.",
        );
      }

      this._data = seed;
      this._revision = inserted.revision;
      this._readOnly = false;
      this._writeCache(this._data, this._revision);
      this._markSynced(this._data, this._revision);
      this._setSyncStatus("synced");
      return this;
    } catch (error) {
      if (cached?.data && this._validateDataStructure(cached.data)) {
        this._data = cached.data;
        this._revision =
          typeof cached.revision === "number" ? cached.revision : 0;
        this._readOnly = true;
        this._markSynced(this._data, this._revision);
        this._setSyncStatus("offline", error);
        return this;
      }

      this._setSyncStatus("error", error);
      throw error;
    }
  }

  async reloadFromRemote() {
    const session = await Auth.getSession();
    if (!session) throw new Error("Sessão não autenticada.");

    const { data: row, error } = await Auth.client
      .from(STATE_TABLE)
      .select("data, revision")
      .eq("id", STATE_ID)
      .maybeSingle();

    if (error) throw error;
    if (!row || !this._validateDataStructure(row.data)) {
      throw new Error("Não foi possível recarregar os dados remotos.");
    }

    this._data = row.data;
    this._revision = row.revision;
    this._readOnly = false;
    this._conflictNotified = false;
    this._writeCache(this._data, this._revision);
    this._markSynced(this._data, this._revision);
    this._setSyncStatus("synced");
    return this;
  }

  get data() {
    if (!this._data) {
      throw new Error(
        "Dados não carregados. Execute await db.load() após autenticação.",
      );
    }
    this._ensureFeriasData();
    return this._data;
  }

  clearMemory() {
    this._data = null;
    this._revision = null;
    this._syncStatus = "idle";
    this._lastSyncError = null;
    this._readOnly = false;
    this._conflictNotified = false;
    this._lastSyncedSnapshot = null;
    this._lastSyncedRevision = null;
    this._conflictSnapshot = null;
    if (this._debounceTimer) {
      clearTimeout(this._debounceTimer);
      this._debounceTimer = null;
    }
    this._pendingSaveResolvers = [];
    this._saveQueue = Promise.resolve();
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {}
  }

  save() {
    return this._persist();
  }

  update(updater) {
    if (this._readOnly) {
      return Promise.reject(new Error("Modo somente leitura."));
    }
    updater(this._data);
    const promise = this._persist();
    if (window.App) App.onDataChange();
    return promise;
  }

  _persist() {
    if (!this._data) {
      return Promise.reject(new Error("Sem dados para salvar."));
    }
    if (this._readOnly) {
      return Promise.reject(new Error("Modo somente leitura."));
    }

    const snapshot = this._cloneData(this._data);
    this._writeCache(snapshot);
    this._autoBackup();

    return new Promise((resolve, reject) => {
      this._pendingSaveResolvers.push({ resolve, reject });

      if (this._debounceTimer) clearTimeout(this._debounceTimer);
      this._debounceTimer = setTimeout(() => {
        this._debounceTimer = null;
        const resolvers = this._pendingSaveResolvers.splice(0);
        const latestSnapshot = this._cloneData(this._data);
        this._writeCache(latestSnapshot);

        this._saveQueue = this._saveQueue
          .then(() => this._executeRemoteSave(latestSnapshot))
          .then((result) => {
            resolvers.forEach((entry) => entry.resolve(result));
            return result;
          })
          .catch((err) => {
            resolvers.forEach((entry) => entry.reject(err));
          });
      }, SAVE_DEBOUNCE_MS);
    });
  }

  async _executeRemoteSave(snapshot) {
    this._setSyncStatus("saving");

    const expectedRevision = this._revision;
    const nextRevision = (expectedRevision ?? 0) + 1;

    try {
      const { data, error } = await Auth.client
        .from(STATE_TABLE)
        .update({
          data: snapshot,
          revision: nextRevision,
          updated_at: new Date().toISOString(),
        })
        .eq("id", STATE_ID)
        .eq("revision", expectedRevision)
        .select("revision, updated_at");

      if (error && !this._isRevisionConflict(error, data)) throw error;

      if (!data?.length) {
        this._handleRevisionConflict(snapshot);
        throw new Error("Conflito de revisão.");
      }

      const row = data[0];
      this._revision = row.revision;
      this._writeCache(snapshot, this._revision);
      this._markSynced(snapshot, this._revision);
      this._setSyncStatus("synced");
      return row;
    } catch (error) {
      if (this._syncStatus !== "conflict") {
        this._setSyncStatus(
          this._isNetworkError(error) ? "offline" : "error",
          error,
        );
        if (this._isNetworkError(error)) this._readOnly = true;
      }
      throw error;
    }
  }

  _autoBackup() {
    try {
      const backups = this.getBackups();
      backups.unshift({
        timestamp: new Date().toISOString(),
        data: JSON.stringify(this._data),
        numViagens: (this._data.viagens || []).length,
      });
      const trimmed = backups.slice(0, MAX_BACKUPS);
      localStorage.setItem(BACKUP_KEY, JSON.stringify(trimmed));
    } catch (e) {}
  }

  getBackups() {
    try {
      return JSON.parse(localStorage.getItem(BACKUP_KEY) || "[]");
    } catch (e) {
      return [];
    }
  }

  restoreBackup(index) {
    const backups = this.getBackups();
    if (!backups[index]) {
      return Promise.reject(new Error("Backup não encontrado."));
    }

    this._data = JSON.parse(backups[index].data);
    return this._persist();
  }

  exportJSON() {
    const blob = new Blob([JSON.stringify(this._data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `geoviagens-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  importJSON(json) {
    try {
      const parsed = JSON.parse(json);
      if (!this._validateDataStructure(parsed)) {
        return Promise.reject(new Error("Estrutura inválida"));
      }
      this._data = parsed;
      return this._persist();
    } catch (e) {
      return Promise.reject(new Error(e.message || "JSON inválido"));
    }
  }

  // ---- helpers ----
  getViagem(id) {
    return this.data.viagens.find((v) => v.id === id);
  }
  getColaborador(id) {
    return this.data.colaboradores.find((c) => c.id === id);
  }
  getEmpreendedor(id) {
    return this.data.empreendedores.find((e) => e.id === id);
  }
  getAtividade(id) {
    return this.data.atividades.find((a) => a.id === id);
  }

  getBarragem(id) {
    for (const e of this.data.empreendedores) {
      const b = e.barragens.find((b) => b.id === id);
      if (b) return { ...b, empreendedor: e };
    }
    return null;
  }

  getBarragemSigla(id) {
    const b = this.getBarragem(id);
    return b ? b.sigla : "???";
  }

  getBarragemNome(id) {
    const b = this.getBarragem(id);
    return b ? b.nome : "Desconhecida";
  }

  getViagemColor(viagemId) {
    const v = this.getViagem(viagemId);
    if (!v) return "#E0E0E0";
    const idx =
      (v.colorIndex !== undefined ? v.colorIndex : 0) % TRIP_COLORS.length;
    if (v.status === "Concluído" || v.status === "Cancelado") return "#CCCCCC";
    return TRIP_COLORS[idx];
  }

  getViagemColorRaw(viagemId) {
    const v = this.getViagem(viagemId);
    if (!v) return "#E0E0E0";
    return TRIP_COLORS[(v.colorIndex || 0) % TRIP_COLORS.length];
  }

  nextViagemId() {
    const ids = this.data.viagens
      .map((v) => parseInt(v.id.replace("V", ""), 10))
      .filter((n) => !isNaN(n));
    const max = ids.length ? Math.max(...ids) : 0;
    return `V${String(max + 1).padStart(2, "0")}`;
  }

  nextParadaId() {
    let max = 0;
    for (const v of this.data.viagens) {
      for (const p of v.paradas || []) {
        const n = parseInt(p.id.replace("p", ""), 10);
        if (!isNaN(n) && n > max) max = n;
      }
    }
    return `p${max + 1}`;
  }

  getViagemPeriod(viagem) {
    if (!viagem.paradas || !viagem.paradas.length) return null;
    const starts = viagem.paradas.map((p) => p.dataInicio).filter(Boolean);
    const ends = viagem.paradas.map((p) => p.dataFim).filter(Boolean);
    if (!starts.length) return null;
    return { inicio: starts.sort()[0], fim: ends.sort().reverse()[0] };
  }

  getActiveColaboradores() {
    return this.data.colaboradores.filter((c) => c.status === "Ativo");
  }

  // Returns days a colaborador is assigned across all viagens (current year by default)
  getDiasEmCampo(colaboradorId, year) {
    year = year || new Date().getFullYear();
    let days = new Set();
    for (const v of this.data.viagens) {
      if (v.status === "Cancelado") continue;
      for (const p of v.paradas || []) {
        for (const c of p.colaboradores || []) {
          if (c.colaboradorId !== colaboradorId) continue;
          let d = new Date(c.dataInicio + "T00:00:00");
          const end = new Date(c.dataFim + "T00:00:00");
          while (d <= end) {
            if (d.getFullYear() === year) {
              days.add(d.toISOString().slice(0, 10));
            }
            d.setDate(d.getDate() + 1);
          }
        }
      }
    }
    return days.size;
  }

  getColaboradorColor(colaboradorId) {
    const idx = this.data.colaboradores.findIndex((c) => c.id === colaboradorId);
    if (idx < 0) return "#69797E";
    return COLAB_COLORS[idx % COLAB_COLORS.length];
  }

  getFerias(colaboradorId) {
    const ferias = this.data.ferias || [];
    if (!colaboradorId) return ferias;
    return ferias.filter((f) => f.colaboradorId === colaboradorId);
  }

  getFeriasEntry(id) {
    return (this.data.ferias || []).find((f) => f.id === id);
  }

  isColaboradorOnVacation(colaboradorId, start, end) {
    if (!colaboradorId || !start || !end) return false;
    return (this.data.ferias || []).some(
      (f) =>
        f.colaboradorId === colaboradorId &&
        datesOverlap(f.dataInicio, f.dataFim, start, end),
    );
  }

  getColaboradorVacationOverlap(colaboradorId, start, end) {
    if (!colaboradorId || !start || !end) return null;
    return (
      (this.data.ferias || []).find(
        (f) =>
          f.colaboradorId === colaboradorId &&
          datesOverlap(f.dataInicio, f.dataFim, start, end),
      ) || null
    );
  }

  nextFeriasId() {
    this._ensureFeriasData();
    const id = `f${this.data.nextFeriasId}`;
    this.data.nextFeriasId += 1;
    return id;
  }

  saveFerias(entry) {
    this._ensureFeriasData();
    const idx = this.data.ferias.findIndex((f) => f.id === entry.id);
    if (idx >= 0) this.data.ferias[idx] = entry;
    else this.data.ferias.push(entry);
    const promise = this._persist();
    if (window.App) App.onDataChange();
    return promise;
  }

  deleteFerias(id) {
    this._ensureFeriasData();
    this.data.ferias = this.data.ferias.filter((f) => f.id !== id);
    const promise = this._persist();
    if (window.App) App.onDataChange();
    return promise;
  }

  saveViagem(viagem) {
    const idx = this.data.viagens.findIndex((v) => v.id === viagem.id);
    if (idx >= 0) {
      this.data.viagens[idx] = viagem;
    } else {
      if (!viagem.colorIndex && viagem.colorIndex !== 0) {
        viagem.colorIndex = this.data.nextColorIndex || 0;
        this.data.nextColorIndex = viagem.colorIndex + 1;
      }
      this.data.viagens.push(viagem);
    }
    const promise = this._persist();
    if (window.App) App.onDataChange();
    return promise;
  }

  deleteViagem(id) {
    this.data.viagens = this.data.viagens.filter((v) => v.id !== id);
    const promise = this._persist();
    if (window.App) App.onDataChange();
    return promise;
  }
}

const db = new Database();
