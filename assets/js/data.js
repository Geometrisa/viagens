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
  historico: [],
};

// ============================================================
// DATABASE CLASS
// ============================================================
class Database {
  constructor() {
    this._data = null;
  }

  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        this._data = JSON.parse(raw);
      } else {
        this._data = JSON.parse(JSON.stringify(INITIAL_DATA));
        this.save();
      }
    } catch (e) {
      this._data = JSON.parse(JSON.stringify(INITIAL_DATA));
    }
    return this;
  }

  get data() {
    if (!this._data) this.load();
    return this._data;
  }

  clearMemory() {
    this._data = null;
  }

  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this._data));
      this._autoBackup();
    } catch (e) {
      console.error("Erro ao salvar dados:", e);
    }
  }

  update(updater) {
    updater(this._data);
    this.save();
    if (window.App) App.onDataChange();
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
    if (backups[index]) {
      this._data = JSON.parse(backups[index].data);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this._data));
      return true;
    }
    return false;
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
      if (!parsed.viagens || !parsed.colaboradores)
        throw new Error("Estrutura inválida");
      this._data = parsed;
      this.save();
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
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
    this.save();
    if (window.App) App.onDataChange();
  }

  deleteViagem(id) {
    this.data.viagens = this.data.viagens.filter((v) => v.id !== id);
    this.save();
    if (window.App) App.onDataChange();
  }
}

const db = new Database();
