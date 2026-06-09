'use strict';

// ============================================================
// DATE UTILITIES
// ============================================================
const MONTHS_PT = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
                   'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const MONTHS_SHORT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const DAYS_PT = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

function parseDate(str) {
  // str: 'YYYY-MM-DD'
  if (!str) return null;
  const [y,m,d] = str.split('-').map(Number);
  return new Date(y, m-1, d);
}

function formatDateISO(date) {
  if (!date) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth()+1).padStart(2,'0');
  const d = String(date.getDate()).padStart(2,'0');
  return `${y}-${m}-${d}`;
}

function formatDate(str) {
  // 'YYYY-MM-DD' → 'DD/MM/YYYY'
  if (!str) return '';
  const [y,m,d] = str.split('-');
  return `${d}/${m}/${y}`;
}

function formatDateShort(str) {
  // 'YYYY-MM-DD' → 'DD/MM'
  if (!str) return '';
  const [,m,d] = str.split('-');
  return `${d}/${m}`;
}

function addDays(dateStr, n) {
  const d = parseDate(dateStr);
  d.setDate(d.getDate() + n);
  return formatDateISO(d);
}

function daysBetween(startStr, endStr) {
  const s = parseDate(startStr);
  const e = parseDate(endStr);
  if (!s || !e) return 0;
  return Math.round((e - s) / 86400000);
}

function datesOverlap(s1, e1, s2, e2) {
  return s1 <= e2 && e1 >= s2;
}

function isWeekend(dateStr) {
  const d = parseDate(dateStr);
  const dow = d.getDay();
  return dow === 0 || dow === 6;
}

function isoToday() {
  return formatDateISO(new Date());
}

// ============================================================
// HOLIDAY CALCULATION
// ============================================================

// Gauss/Anonymous Gregorian algorithm for Easter
function calcEaster(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19*a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2*e + 2*i - h - k) % 7;
  const m = Math.floor((a + 11*h + 22*l) / 451);
  const month = Math.floor((h + l - 7*m + 114) / 31);
  const day   = ((h + l - 7*m + 114) % 31) + 1;
  return new Date(year, month-1, day);
}

function getHolidays(year) {
  const map = {};
  const add = (dateStr, name) => { map[dateStr] = name; };

  // Fixed
  add(`${year}-01-01`, 'Confraternização Universal');
  add(`${year}-04-21`, 'Tiradentes');
  add(`${year}-05-01`, 'Dia do Trabalho');
  add(`${year}-09-07`, 'Independência do Brasil');
  add(`${year}-10-12`, 'Nossa Senhora Aparecida');
  add(`${year}-11-02`, 'Finados');
  add(`${year}-11-15`, 'Proclamação da República');
  add(`${year}-11-20`, 'Consciência Negra');
  add(`${year}-12-25`, 'Natal');

  // Variable (Easter-based)
  const easter = calcEaster(year);

  const easterISO = formatDateISO(easter);

  // Sexta-feira Santa = Easter - 2
  const goodFriday = new Date(easter); goodFriday.setDate(goodFriday.getDate()-2);
  add(formatDateISO(goodFriday), 'Sexta-feira Santa');

  // Carnaval (ponto facultativo) = Easter - 47
  const carnaval = new Date(easter); carnaval.setDate(carnaval.getDate()-47);
  add(formatDateISO(carnaval), 'Carnaval (ponto facultativo)');
  const carnaval2 = new Date(easter); carnaval2.setDate(carnaval2.getDate()-48);
  add(formatDateISO(carnaval2), 'Carnaval');

  // Corpus Christi (ponto facultativo) = Easter + 60
  const corpus = new Date(easter); corpus.setDate(corpus.getDate()+60);
  add(formatDateISO(corpus), 'Corpus Christi (ponto facultativo)');

  return map;
}

// Cache holidays per year
const _holidayCache = {};
function getHolidaysCached(year) {
  if (!_holidayCache[year]) _holidayCache[year] = getHolidays(year);
  return _holidayCache[year];
}

function getHolidayName(dateStr) {
  if (!dateStr) return null;
  const year = parseInt(dateStr.split('-')[0]);
  const holidays = getHolidaysCached(year);
  return holidays[dateStr] || null;
}

// ============================================================
// CONFLICT DETECTION
// ============================================================
function detectConflicts(viagens) {
  // Returns array of { colaboradorId, viagemId1, paradaId1, viagemId2, paradaId2, dates }
  const conflicts = [];
  // Build a map: colaboradorId -> [{dataInicio, dataFim, viagemId, paradaId}]
  const assignments = {};

  for (const v of viagens) {
    if (v.status === 'Cancelado') continue;
    for (const p of (v.paradas||[])) {
      for (const c of (p.colaboradores||[])) {
        if (!assignments[c.colaboradorId]) assignments[c.colaboradorId] = [];
        assignments[c.colaboradorId].push({
          dataInicio: c.dataInicio,
          dataFim:    c.dataFim,
          viagemId:   v.id,
          paradaId:   p.id,
          viagemNome: v.nome
        });
      }
    }
  }

  for (const [colId, slots] of Object.entries(assignments)) {
    for (let i = 0; i < slots.length; i++) {
      for (let j = i+1; j < slots.length; j++) {
        const a = slots[i], b = slots[j];
        if (datesOverlap(a.dataInicio, a.dataFim, b.dataInicio, b.dataFim)) {
          conflicts.push({
            colaboradorId: colId,
            viagemId1: a.viagemId, paradaId1: a.paradaId,
            viagemId2: b.viagemId, paradaId2: b.paradaId,
          });
        }
      }
    }
  }
  return conflicts;
}

function hasConflict(viagem, viagens) {
  const cs = detectConflicts(viagens);
  return cs.some(c => c.viagemId1 === viagem.id || c.viagemId2 === viagem.id);
}

function getConflictsForViagem(viagemId, viagens) {
  return detectConflicts(viagens).filter(c => c.viagemId1 === viagemId || c.viagemId2 === viagemId);
}

function getConflictsForColaborador(colId, viagens) {
  return detectConflicts(viagens).filter(c => c.colaboradorId === colId);
}

// ============================================================
// SIGLA AUTO-SUGGESTION
// ============================================================
function suggestSigla(nome, existingSiglas = []) {
  if (!nome) return '';
  const words = nome.toUpperCase().replace(/[^A-Z\s]/g,'').trim().split(/\s+/).filter(Boolean);
  let candidates = [];

  if (words.length >= 3) {
    candidates.push(words[0][0] + words[1][0] + words[2][0]);
  }
  if (words.length === 2) {
    candidates.push(words[0][0] + words[1][0] + (words[1][1]||words[0][1]||'X'));
    candidates.push(words[0].slice(0,2) + words[1][0]);
  }
  if (words.length === 1) {
    const w = words[0];
    candidates.push(w.slice(0,3));
  }
  // Try each candidate
  for (const c of candidates) {
    const s = c.slice(0,3).toUpperCase();
    if (s.length === 3 && !existingSiglas.includes(s)) return s;
  }
  // Fallback: iterate
  const base = (words[0]||'X').slice(0,2).toUpperCase();
  for (let i = 0; i < 26; i++) {
    const s = base + String.fromCharCode(65+i);
    if (!existingSiglas.includes(s)) return s;
  }
  return 'XXX';
}

// ============================================================
// WEEK/MONTH GRID HELPERS
// ============================================================
function getMonthWeeks(year, month) {
  // Returns array of weeks; each week is array of 7 date strings (YYYY-MM-DD)
  // Fills partial weeks with dates from prev/next month
  const firstDay = new Date(year, month, 1);
  const lastDay  = new Date(year, month+1, 0);
  const startDow = firstDay.getDay(); // 0=Sun
  const weeks = [];
  let cursor = new Date(firstDay);
  cursor.setDate(cursor.getDate() - startDow);
  while (cursor <= lastDay || cursor.getDay() !== 0) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      week.push(formatDateISO(new Date(cursor)));
      cursor.setDate(cursor.getDate()+1);
    }
    weeks.push(week);
    if (cursor > lastDay && cursor.getDay() === 0) break;
  }
  return weeks;
}

// ============================================================
// LANE ASSIGNMENT FOR CALENDAR BARS
// ============================================================
function assignLanes(viagens, year, month) {
  // Returns { [viagemId]: laneIndex }
  // Only non-cancelled viagens; sorted by period start
  const active = viagens
    .filter(v => v.status !== 'Cancelado')
    .map(v => {
      const p = db.getViagemPeriod(v);
      return p ? { id: v.id, inicio: p.inicio, fim: p.fim } : null;
    })
    .filter(Boolean)
    .sort((a,b) => a.inicio.localeCompare(b.inicio) || a.id.localeCompare(b.id));

  const monthStart = `${year}-${String(month+1).padStart(2,'0')}-01`;
  const lastDayNum  = new Date(year, month+1, 0).getDate();
  const monthEnd    = `${year}-${String(month+1).padStart(2,'0')}-${String(lastDayNum).padStart(2,'0')}`;

  const weeks = getMonthWeeks(year, month);
  const laneMap = {};

  for (const week of weeks) {
    const weekStart = week[0], weekEnd = week[6];
    const activeInWeek = active.filter(v =>
      datesOverlap(v.inicio, v.fim, weekStart, weekEnd)
    );
    const usedLanes = [];
    // First assign those already with a lane
    for (const v of activeInWeek) {
      if (laneMap[v.id] !== undefined) {
        usedLanes[laneMap[v.id]] = true;
      }
    }
    // Then assign new ones
    for (const v of activeInWeek) {
      if (laneMap[v.id] === undefined) {
        let lane = 0;
        while (usedLanes[lane]) lane++;
        laneMap[v.id] = lane;
        usedLanes[lane] = true;
      }
    }
  }
  return laneMap;
}

// ============================================================
// MISC UTILS
// ============================================================
function escapeHtml(s) {
  if (!s) return '';
  return String(s)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;');
}

function truncate(s, n) {
  if (!s || s.length <= n) return s||'';
  return s.slice(0,n)+'…';
}

function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(()=>fn(...args), ms); };
}

function formatPeriod(inicio, fim) {
  if (!inicio) return '';
  if (!fim || inicio === fim) return formatDate(inicio);
  return `${formatDate(inicio)} → ${formatDate(fim)}`;
}

function getCurrentWeekRange() {
  const today = new Date();
  const dow = today.getDay();
  const sun = new Date(today); sun.setDate(today.getDate() - dow);
  const sat = new Date(sun);   sat.setDate(sun.getDate() + 6);
  return { start: formatDateISO(sun), end: formatDateISO(sat) };
}

function getWeekRange(offset) {
  const today = new Date();
  const dow = today.getDay();
  const sun = new Date(today);
  sun.setDate(today.getDate() - dow + offset*7);
  const sat = new Date(sun); sat.setDate(sun.getDate()+6);
  return { start: formatDateISO(sun), end: formatDateISO(sat) };
}
