# GeoViagens — Copilot Instructions

## Visão Geral

SPA de gerenciamento de viagens de campo da Geometrisa (inspeções em barragens/UHEs). Vanilla JS puro, sem framework, sem bundler, sem npm. Para executar localmente, use um servidor HTTP, por exemplo `python -m http.server 8080`.

## Arquitetura e Ordem de Carregamento

Os scripts devem ser carregados nesta ordem (já definida no `index.html`):

```
Supabase SDK → supabase-config.js → auth.js → data.js → utils.js → calendar.js → timeline.js → forms.js → views.js → app.js
```

Qualquer novo módulo deve ser inserido respeitando dependências (ex.: não usar `db` antes de `data.js`).

## Camadas Principais

| Arquivo       | Responsabilidade                                                          |
| ------------- | ------------------------------------------------------------------------- |
| `supabase-config.js` | URL e chave pública do Supabase                                    |
| `auth.js`     | Cliente Supabase, sessão, login e logout                                  |
| `data.js`     | Classe `Database` + instância global `db`; persistência em `localStorage` |
| `app.js`      | Objeto `App` (orquestrador); navegação, search, toasts, confirm dialog    |
| `utils.js`    | Datas, feriados, detecção de conflitos, sugestão de sigla                 |
| `views.js`    | Todas as funções `render*()`, detail panel, `autoUpdateViagemStatus()`    |
| `forms.js`    | Modal de criação/edição de viagem (`_currentViagemDraft`)                 |
| `calendar.js` | Calendário mensal (`CalState`), vistas Viagens e Equipe                   |
| `timeline.js` | Gantt (`TLState`)                                                         |

## Modelo de Dados (localStorage: `geoviagens_data_v01`)

```js
{
  viagens: [{ id, nome, status, colorIndex, observacoes, paradas: [{
    id, empreendedorId, barragemId, dataInicio, dataFim,
    atividades: [atividadeId],
    colaboradores: [{ colaboradorId, dataInicio, dataFim, confirmado }]
  }]}],
  colaboradores: [{ id, nome, sigla, status }],
  empreendedores: [{ id, nome, barragens: [{ id, nome, sigla, status }] }],
  atividades: [{ id, nome, categoria, icone, status, ordem }],
  configuracoes: { alertaDias, limiteGantt, anoInicial, anoFinal, feriados }
}
```

- IDs: `c1..cN` (colaboradores), `e1..eN` (empreendedores), `b1..bN` (barragens), `a1..aN` (atividades), `V01..VNN` (viagens), `p1..pN` (paradas)
- Siglas: sempre 3 chars maiúsculos (ex.: `FMA`, `BAL`)

## Persistência — Regras Críticas

- **Nunca** mutate `db.data` sem chamar `db.save()` ao final.
- Use `db.update(fn)` para mutações que devem notificar a UI (`App.onDataChange()` é chamado automaticamente).
- Use `db.saveViagem(v)` para salvar/inserir viagens individualmente.
- Backup automático em `geoviagens_backups_v01` (max 5 snapshots).

## Status de Viagem e Ciclo de Vida

`Previsto → Confirmado → Em campo → Concluído | Cancelado`

`autoUpdateViagemStatus()` (em `views.js`) faz a transição automática com base na data atual — chamada a cada render e a cada hora via `setInterval`. **Nunca altere status diretamente sem considerar essa lógica.**

## Padrões de Datas

- Formato interno: `YYYY-MM-DD` (string ISO)
- Exibição: `DD/MM/YYYY` via `formatDate(str)`
- Sempre use `parseDate(str)` ao construir objetos `Date` (evita problemas de fuso horário — sem `T00:00:00`)
- Datas "hoje": `isoToday()` retorna string ISO do dia corrente

## Padrão de View

```js
function renderMinhaView() {
  const container = document.getElementById("view-minha-view");
  container.innerHTML = "";
  const page = document.createElement("div");
  page.className = "page-container";
  // ... construção imperativa de DOM
  container.appendChild(page);
}
```

- Registrar em `App.renderView()` no `switch` em `app.js`
- Declarar `<div id="view-minha-view" class="view"></div>` em `index.html`
- Adicionar botão de navegação com `data-view="minha-view"` no header

## CSS — Classes Fundamentais

- Layout: `page-container`, `page-header`, `page-toolbar`, `content-card`, `kpi-row`, `kpi-card`
- Botões: `btn btn-primary`, `btn btn-ghost`, `btn btn-sm`, `btn btn-xs`
- Formulários: `form-control`, `form-group`, `form-label`, `form-row`
- Tabela: `data-table`, `clickable`
- Status badge: `status-badge badge-previsto | badge-confirmado | badge-em-campo | badge-concluído | badge-cancelado`
- Variáveis: `--c-primary (#0A4174)`, `--c-error`, `--c-success`, `--c-bg`, `--c-border`

## UX — Padrões Recorrentes

- **Toasts**: `showToast(msg, 'success'|'error'|'info')` — 3 s, canto inferior central
- **Confirmações destrutivas**: sempre usar `openConfirm(title, body, onConfirm, confirmLabel, cancelLabel)`
- **Detail panel** (slide from right): `openDetailPanel('viagem'|'colaborador', id)` / `closeDetailPanel()`
- **Ações de linha**: clique simples → detail panel; duplo clique → edição inline ou modal
- **Conflitos**: `detectConflicts(viagens)` em `utils.js`; exibir `<span class="conflict-badge">⚠️</span>`

## Cores de Viagem

- Array `TRIP_COLORS` (20 tons pastéis); acesso via `db.getViagemColor(id)` / `db.getViagemColorRaw(id)`
- Viagens Concluídas/Canceladas sempre retornam `#CCCCCC`
- `colorIndex` é auto-incrementado pelo `db` ao criar viagem

## Estado Global dos Módulos

| Objeto          | Módulo        | Uso                                        |
| --------------- | ------------- | ------------------------------------------ |
| `CalState`      | `calendar.js` | Ano, modo (viagens/equipe), filtros        |
| `TLState`       | `timeline.js` | Ano, ordenação, filtro de dias             |
| `ViagensState`  | `views.js`    | Ordenação e filtro da lista                |
| `EquipeState`   | `views.js`    | Ordenação, filtro e ano                    |
| `GlobalCalZoom` | `calendar.js` | Zoom compartilhado (calendário + timeline) |

## Regras Visuais — Barras de Calendário

### Estilo por status (Calendário de Viagens)

| Status     | Estilo da barra                                             |
| ---------- | ----------------------------------------------------------- |
| Previsto   | Tracejada (`border-style: dashed`) com cor pastel da viagem |
| Confirmado | Sólida com cor pastel da viagem                             |
| Em campo   | Sólida com cor pastel da viagem                             |
| Concluído  | Sólida cinza (`#CCCCCC`)                                    |
| Cancelado  | **Não aparece** no calendário                               |

Conflito ativo → ícone `⚠️` vermelho sobreposto na barra.

### Conteúdo da barra (Calendário de Viagens)

- **Linha 1:** siglas das barragens da parada separadas por `+` (ex: `BAL + TUC`) + ícones das atividades. **Nunca usar "múltiplos"**.
- **Linha 2:** siglas de **todos** os colaboradores da parada. Se não couber, truncar com `+N` e exibir todos no tooltip.
- Ao quebrar de semana: sem arredondamento na extremidade de continuação; repetir a sigla da barragem no início da nova linha.

### Calendário de Equipe — barras por colaborador

- Cada barra representa o **período individual** do colaborador (`c.dataInicio` / `c.dataFim` dentro do objeto `colaboradores[]` da parada), **não** o período total da parada ou viagem.
- Se o colaborador tem lacunas entre paradas → barras **separadas** (sem continuidade visual).
- Cor da barra = `db.getViagemColor(viagemId)`.
- Botões de filtro por viagem: exibir siglas das barragens (ex: `BAL` ou `BAL + PIL`), nunca `V01`, `V02`.

## Interações — Especificações Críticas

- **TAB no campo de busca de colaboradores** (card de viagem, `forms.js`): deve funcionar como ENTER para confirmar o colaborador sugerido.
- **Confirmação de descarte** no `closeViagemModal()`: exibir `openConfirm(...)` **somente** se `_isViagemDirty()` retornar `true`. A função compara `JSON.stringify(_currentViagemDraft) !== _originalViagemSnapshot`. Se não houve alteração, fechar imediatamente.
- **ENTER = confirmar / ESC = fechar** em todos os modais e `openConfirm` — já parcialmente implementado em `app.js`, garantir cobertura completa.
- **Filtros do calendário**: devem ter `position: sticky; top: 0` para ficarem visíveis ao rolar.
- **Botão "Ir para Hoje"** (todos os calendários): usar `scrollIntoView()` ou `scrollTo()` até o elemento do mês atual.
- **Meses anteriores ao atual**: ocultos por padrão com botão toggle "Ver meses anteriores". Já implementado parcialmente em `calendar.js` — garantir comportamento em todos os calendários.
- **Zoom (`GlobalCalZoom`)**: sincronizado entre Calendário Viagens, Equipe e Linha do Tempo. Alterar em qualquer view persiste ao navegar.
- **Coluna Barragem na lista de viagens**: exibir siglas separadas por `+` para múltiplas paradas. Tooltip com nomes completos.
- **Tooltip em ícones de atividades** (lista de viagens): ao hover nos ícones da coluna Tipo, exibir nomes das atividades.

## Exportação PDF

- **Modal obrigatório antes de exportar**: opções de formato (A4 / A3) + período (De/Até por mês). Corrigir exibição se não estiver aparecendo.
- **Orientação**: paisagem obrigatória (`@media print { @page { orientation: landscape } }`).
- **Estrutura de cada página**: legenda no topo + grade mensal + rodapé (logo + data de exportação + nº página).
- **Uma página por mês**: grade deve expandir para ocupar folha inteira sem transbordar.
- **Se conflitos ativos**: adicionar página de alertas no início do documento (checkbox "Incluir alertas", padrão: ativado).

## Arrastar Barras no Calendário (feature)

- Arrastar barra inteira → desloca `dataInicio` e `dataFim` da parada proporcionalmente.
- Arrastar borda esquerda → ajusta `dataInicio`.
- Arrastar borda direita → ajusta `dataFim`.
- Ao soltar: salvar via `db.saveViagem(v)` e atualizar `dataInicio`/`dataFim` de todos os colaboradores da parada proporcionalmente. Perguntar ao usuário se deseja atualizar datas individuais.

## Backlog — Correções e Melhorias Pendentes

Referência numerada dos itens solicitados pelo cliente. Usar estes números ao criar issues/commits.

| #     | Área                 | Descrição resumida                                                                                                                                                                                                     |
| ----- | -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ✅ 1  | Equipe               | Sigla editável ao cadastrar colaborador — já implementado em `showAddColaboradorForm()`: auto-sugestão via `suggestSigla()`, edição livre, force-uppercase                                                             |
| ✅ 2  | Viagens / Calendário | Múltiplas barragens: exibir `BAL + TUC`, nunca "múltiplos" — corrigido em `calendar.js` (join com espaços)                                                                                                             |
| ✅ 3  | Calendário Viagens   | Barra sólida = Confirmado; tracejada = Previsto — corrigida lógica em `buildTripBar()` / `buildTeamWeekRow()`                                                                                                          |
| ✅ 4  | Calendário Viagens   | Status Concluído aparece cinza e sólido — removida classe `.past`; cor cinza garantida por `getViagemColor()`                                                                                                          |
| ✅ 5  | Calendário Viagens   | Conflito: borda vermelha sempre; fundo sólido rosa se Confirmado, tracejado rosa se Previsto — corrigido no CSS                                                                                                        |
| ✅ 6  | Global               | `autoUpdateViagemStatus()` já implementado em `views.js`; chamado a cada render e a cada hora via `setInterval`                                                                                                        |
| ✅ 7  | Card Viagem          | Descarte só pergunta se `_isViagemDirty()` — nova viagem agora tira snapshot inicial; fechamento imediato sem edição                                                                                                   |
| ✅ 8  | Card Viagem          | TAB = ENTER no campo de busca de colaboradores — já implementado em `forms.js` com handler `keydown`                                                                                                                   |
| ✅ 9  | Calendários          | Filtros sticky — já implementado: `.cal-header-bar` tem `position: sticky; top: 0; z-index: 30` no CSS                                                                                                                 |
| ✅ 10 | Calendários          | Botão "Ir para Hoje" — já implementado: chama `renderCalendarPage()` + `scrollToCurrentMonth()` em `calendar.js`                                                                                                       |
| ✅ 11 | Calendários          | Meses anteriores ocultos — já implementado com toggle `▼ Ver N meses anteriores` em ambos os calendários                                                                                                               |
| ✅ 12 | Calendários          | Zoom `GlobalCalZoom` — já sincronizado: `applyZoom()` re-renderiza as 3 views; valor persiste ao navegar                                                                                                               |
| ✅ 13 | PDF                  | Uma página por mês: corrigido `.calendar-page { overflow: visible; height: auto }` no print; filtro De/Até aplica `.print-exclude`; JS marca `.print-first-month` para suprimir quebra de página antes do primeiro mês |
| ✅ 14 | PDF                  | Modal de exportação: corrigido seletor CSS `.modal-box.confirm-dialog`; formato A3/A4 injeta `@page { size }` antes de `window.print()`                                                                                |
| ✅ 15 | Calendário Viagens   | Barra exibe siglas de TODOS os colaboradores (truncar `+N`) — já implementado em `getBarTeamString()`                                                                                                                  |
| ✅ 16 | Calendário Viagens   | Barras arrastáveis — já implementado: `addBarDragBehavior()` em `calendar.js`; move = `applyViagemDateShift()`; resize = `applyViagemStartShift()` / `applyViagemEndShift()`                                           |
| ✅ 17 | Calendário Equipe    | Barras por período individual (`colAssign.dataInicio/dataFim`); lane-assignment corrigido: não-sobrepostos ficam em lane 0 (lacuna visual), conflitos em lane 1+                                                       |
| ✅ 18 | Calendário Equipe    | Painel lateral de meses — já implementado: `buildCalSidebar()` em `renderTeamCalendarPage()`; `scrollToMonth()` usa prefixo `month-equipe`                                                                             |
| ✅ 19 | Calendário Equipe    | Filtros de viagem: exibir siglas das barragens — já implementado: botões usam `tripSiglas` em `buildCalHeaderBar()`                                                                                                    |
| ✅ 20 | Lista Viagens        | Tooltip nos ícones de atividades — já implementado: coluna Tipo usa `title` com nomes das atividades                                                                                                                   |
| ✅ 21 | Global               | ENTER = confirmar / ESC = fechar — já implementado em `app.js` (`setupGlobalEvents`) e `openConfirm()`                                                                                                                 |

## Escopo v01 vs v02

**Estado atual:** Supabase Auth e persistência PostgreSQL (jsonb + RLS) implementados.

**v02 (próxima etapa):** Validar CRUDs, offline, conflito entre abas e acesso negado para segundo usuário.

## Roadmap v02 — Supabase

### Stack escolhida

| Camada | Tecnologia |
| --- | --- |
| Frontend | Vanilla JS atual |
| Autenticação | Supabase Auth com email e senha |
| Persistência | Supabase PostgreSQL, uma linha `jsonb` |
| Autorização | Row Level Security vinculada ao UUID do usuário único |
| Cache local | `localStorage` |
| Hospedagem | GitHub Pages ou outra hospedagem estática |

### Decisões obrigatórias

- Criar somente um usuário operacional e desativar novos cadastros.
- Esse usuário terá CRUD completo.
- Não colocar senha, `service_role` ou chave secreta no frontend.
- Usar somente chave pública com RLS.
- Persistir inicialmente o objeto completo de `db.data` em `public.geoviagens_state`.
- Manter IDs atuais (`V01`, `c1`, `e1`, `b1`, `a1`, `p1`).
- Preservar os helpers da classe `Database`.
- Tornar `App.init()` e a persistência assíncronos.
- Serializar gravações e usar a coluna `revision` para detectar conflitos.
- Usar cache offline apenas para leitura na primeira versão.
- Não criar `data-v2.js` permanente; deve existir uma única implementação ativa.

### Ordem de implementação

1. [x] Criar projeto, usuário único, tabela, grants e policies RLS.
2. [x] Adicionar SDK fixado e configuração pública.
3. [x] Implementar `auth.js`, tela de login, sessão e logout.
4. [x] Converter `App.init()` para fluxo assíncrono.
5. [x] Adaptar `Database` para Supabase, cache, fila e revisão.
6. [x] Migrar o JSON local oficial.
7. Testar todos os CRUDs, reload, rede indisponível e conflito entre abas.
8. Confirmar que um segundo usuário autenticado não possui acesso.

### Instrução detalhada

Antes de implementar v02, ler integralmente:

```text
docs/supabase-integration.md
```
