# Integração do GeoViagens com Supabase

## 1. Objetivo

Migrar a fonte principal de dados do `localStorage` para o Supabase, mantendo:

- o frontend atual em Vanilla JS;
- o formato de `db.data`;
- os helpers públicos da classe `Database`;
- o `localStorage` apenas como cache e backup local;
- um único usuário de login com permissão total sobre os dados do sistema.

Esta primeira integração não normaliza viagens, paradas, colaboradores e cadastros em tabelas separadas. O estado completo será salvo em uma única coluna `jsonb`, pois o produto atual já trabalha com um objeto agregado e faz várias mutações diretas antes de chamar `db.save()`.

## 2. Diagnóstico do produto atual

- SPA estática, sem framework, bundler ou backend.
- `assets/js/data.js` concentra persistência, dados iniciais e helpers.
- `assets/js/auth.js` existe, mas está vazio e ainda não é carregado.
- `App.init()` e `db.load()` são síncronos.
- Viagens usam `db.saveViagem()` e `db.deleteViagem()`.
- Colaboradores, empreendedores, barragens, atividades e configurações alteram `db.data` diretamente e depois chamam `db.save()`.
- O estado principal está em `localStorage["geoviagens_data_v01"]`.
- Backups locais estão em `localStorage["geoviagens_backups_v01"]`.

Consequência: a integração deve preservar `db.data` em memória, mas o carregamento inicial e as gravações remotas precisarão ser assíncronos.

## 3. Arquitetura escolhida

```text
Navegador
  |
  +-- Supabase Auth (email e senha)
  |
  +-- Database
        |
        +-- memória: db.data
        +-- cache: localStorage
        +-- fonte principal: public.geoviagens_state.data (jsonb)
```

Arquivos previstos:

| Arquivo | Responsabilidade |
| --- | --- |
| `assets/js/supabase-config.js` | URL e chave pública do projeto |
| `assets/js/auth.js` | cliente Supabase, sessão, login e logout |
| `assets/js/data.js` | cache local, leitura remota e fila de gravação |
| `assets/js/app.js` | inicialização assíncrona e estados de loading/erro |
| `index.html` | SDK, tela de login, usuário atual e logout |

Não criar uma segunda implementação permanente como `data-v2.js`. A migração deve terminar com uma única classe `Database`, evitando duas fontes de verdade.

## 4. Segurança obrigatória

1. Criar manualmente apenas um usuário em `Authentication > Users`.
2. Desativar `Allow new users to sign up`.
3. Usar login por email e senha com `signInWithPassword()`.
4. Não implementar cadastro público.
5. Usar no navegador somente a chave `publishable` ou a chave legada `anon`.
6. Nunca incluir `service_role`, chave secreta ou senha do usuário no repositório.
7. Habilitar RLS na tabela e vincular a policy ao UUID exato do usuário autorizado.
8. Não confiar apenas em esconder botões. A autorização real deve estar no PostgreSQL por RLS.

A URL e a chave pública do Supabase podem aparecer no frontend estático. Elas identificam o projeto, mas não substituem autenticação nem RLS.

Um login compartilhado não permite identificar qual pessoa realizou cada alteração. Se auditoria individual se tornar requisito, será necessário criar contas separadas.

## 5. Configuração do projeto Supabase

1. Criar o projeto.
2. Em `Authentication > Providers > Email`, manter email/senha habilitado.
3. Em `Authentication > Settings`, desativar novos cadastros.
4. Criar manualmente o usuário operacional.
5. Copiar o UUID desse usuário.
6. Em `Project Settings > API Keys`, obter:
   - Project URL;
   - Publishable key, preferencialmente, ou `anon` key em projetos legados.
7. Executar o SQL abaixo, substituindo `<UUID_DO_USUARIO_UNICO>`.

## 6. SQL inicial

```sql
create table if not exists public.geoviagens_state (
  id text primary key check (id = 'main'),
  owner_id uuid not null references auth.users (id) on delete restrict,
  data jsonb not null,
  revision bigint not null default 0 check (revision >= 0),
  updated_at timestamptz not null default now()
);

alter table public.geoviagens_state enable row level security;

revoke all on table public.geoviagens_state from public, anon;
grant select, insert, update, delete
  on table public.geoviagens_state
  to authenticated;

drop policy if exists "GeoViagens single user full access"
  on public.geoviagens_state;

create policy "GeoViagens single user full access"
  on public.geoviagens_state
  for all
  to authenticated
  using (
    (select auth.uid()) = owner_id
    and owner_id = '<UUID_DO_USUARIO_UNICO>'::uuid
  )
  with check (
    (select auth.uid()) = owner_id
    and owner_id = '<UUID_DO_USUARIO_UNICO>'::uuid
  );
```

Não conceder acesso a `anon`. Não criar policy genérica baseada apenas em `auth.role() = 'authenticated'`, pois uma segunda conta criada por engano também receberia acesso.

## 7. Carregamento do SDK e scripts

Status: concluído em 15/06/2026.

Como o projeto não usa npm, carregar uma versão 2.x testada e fixada do `@supabase/supabase-js`. Evitar uma URL flutuante em produção.

Versão de referência verificada em 12/06/2026:

Ordem esperada:

```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.108.1"></script>
<script src="assets/js/supabase-config.js"></script>
<script src="assets/js/auth.js"></script>
<script src="assets/js/data.js"></script>
<script src="assets/js/utils.js"></script>
<script src="assets/js/calendar.js"></script>
<script src="assets/js/timeline.js"></script>
<script src="assets/js/forms.js"></script>
<script src="assets/js/views.js"></script>
<script src="assets/js/app.js"></script>
```

Com esse build, o cliente é criado por `window.supabase.createClient(url, publishableKey)`.

O arquivo de configuração deve conter somente valores públicos:

```js
"use strict";

window.GEOVIAGENS_CONFIG = {
  supabaseUrl: "https://SEU_PROJETO.supabase.co",
  supabasePublishableKey: "SUA_CHAVE_PUBLICA",
};
```

Não colocar email ou senha nesse arquivo.

## 8. Contrato de autenticação

Status: concluído em 15/06/2026.

`assets/js/auth.js` deve expor um objeto global `Auth` com:

```js
Auth.init();
Auth.getSession();
Auth.getUser();
Auth.signIn(email, password);
Auth.signOut();
Auth.onAuthStateChange(callback);
Auth.client;
```

Regras:

- `Auth.init()` cria o cliente uma única vez.
- Na inicialização, verificar a sessão existente antes de mostrar a aplicação.
- Login usa `Auth.client.auth.signInWithPassword({ email, password })`.
- Logout usa `Auth.client.auth.signOut()`.
- A tela de login não deve possuir link de cadastro.
- Após logout, esconder a aplicação e limpar o estado em memória.
- Se o cache local puder conter informação sensível, removê-lo no logout.
- Mensagens de erro de login não devem revelar se o email existe.

## 9. Contrato da classe Database

Status: concluído em 15/06/2026.

Manter estes membros e helpers:

```js
db.data;
db.load();
db.save();
db.update(updater);
db.saveViagem(viagem);
db.deleteViagem(id);
db.getViagem(id);
db.getColaborador(id);
db.getEmpreendedor(id);
db.getAtividade(id);
db.getBarragem(id);
```

Mudanças necessárias:

- `db.load()` passa a retornar `Promise<Database>`.
- `db.save()`, `db.update()`, `db.saveViagem()` e `db.deleteViagem()` retornam `Promise`.
- `db.data` continua síncrono depois de `await db.load()`.
- Toda mutação atualiza o cache imediatamente.
- Toda gravação remota entra em uma fila única. Nunca executar vários updates concorrentes para o mesmo documento.
- Os fluxos que mostram "salvo com sucesso" devem aguardar a Promise.

Estado interno recomendado:

```js
this._data = null;
this._revision = null;
this._saveQueue = Promise.resolve();
this._syncStatus = "idle";
this._lastSyncError = null;
```

## 10. Algoritmo de leitura

`await db.load()` deve:

1. Confirmar que existe sessão autenticada.
2. Ler o cache e mantê-lo como fallback.
3. Buscar `id = 'main'` no Supabase com `.maybeSingle()`.
4. Se a linha existir:
   - validar a estrutura mínima;
   - preencher `_data`;
   - guardar `revision`;
   - atualizar o cache.
5. Se a linha não existir:
   - usar o JSON migrado ou `INITIAL_DATA`;
   - inserir a linha com `owner_id = Auth.getUser().id`;
   - iniciar `revision = 1`.
6. Se a rede falhar e houver cache válido:
   - permitir visualização;
   - mostrar estado offline;
   - bloquear gravações nesta primeira versão.
7. Se rede e cache falharem:
   - mostrar erro de inicialização;
   - não renderizar as views.

Nunca substituir silenciosamente dados remotos válidos por `INITIAL_DATA`.

## 11. Algoritmo de gravação

Cada save deve:

1. Clonar o snapshot atual que será persistido.
2. Salvar o snapshot no cache local.
3. Enfileirar a operação remota.
4. Atualizar somente a linha `id = 'main'`.
5. Aplicar controle otimista com a revisão conhecida:

```js
const nextRevision = this._revision + 1;

const { data, error } = await Auth.client
  .from("geoviagens_state")
  .update({
    data: snapshot,
    revision: nextRevision,
    updated_at: new Date().toISOString(),
  })
  .eq("id", "main")
  .eq("revision", this._revision)
  .select("revision, updated_at")
  .maybeSingle();
```

Se nenhuma linha for retornada, houve alteração concorrente. Nesse caso:

- não repetir o update como "último salvamento vence";
- marcar status `conflict`;
- avisar o usuário;
- oferecer recarregar os dados remotos;
- preservar o snapshot local para recuperação manual.

Chamadas rápidas de `db.save()` podem ser agrupadas com debounce curto, desde que a ordem seja preservada e as Promises sejam resolvidas corretamente.

## 12. Inicialização da aplicação

Status: concluído em 15/06/2026.

Converter `App.init()` em `async`:

```js
async init() {
  this.showLoading();
  await Auth.init();

  const session = await Auth.getSession();
  if (!session) {
    this.showLogin();
    return;
  }

  await db.load();
  this.startAuthenticatedApp();
}
```

Somente depois de autenticar e carregar os dados:

- executar `autoUpdateViagemStatus()`;
- configurar os eventos;
- navegar para `resumo`;
- iniciar o `setInterval`;
- liberar os controles de CRUD.

Garantir que `setupNav()`, `setupModals()` e outros listeners não sejam registrados mais de uma vez após login/logout.

## 13. Migração dos dados existentes

Status: concluído em 15/06/2026 (seed automático a partir do cache `geoviagens_data_v01` na primeira autenticação; importação JSON persiste no Supabase).

Antes da troca:

1. Abrir a versão atual no navegador que contém os dados oficiais.
2. Usar `Exportar JSON`.
3. Guardar o arquivo como backup externo.
4. Validar que contém:
   - `viagens`;
   - `colaboradores`;
   - `empreendedores`;
   - `atividades`;
   - `configuracoes`.
5. Autenticar na nova versão.
6. Importar o JSON uma única vez.
7. Aguardar confirmação de sincronização remota.
8. Recarregar a página e comparar contagens e registros principais.

O importador deve persistir no Supabase, não apenas no `localStorage`.

## 14. Estados visuais mínimos

Adicionar estados claros:

- `Carregando dados...`
- `Salvando...`
- `Sincronizado`
- `Sem conexão: somente leitura`
- `Conflito de edição`
- `Falha ao salvar`

Não exibir toast de sucesso antes de a gravação remota terminar.

## 15. Critérios de aceite

- Usuário não autenticado vê apenas a tela de login.
- Senha não aparece no código, HTML, logs ou configuração.
- Chave secreta/service role não aparece no frontend.
- O único usuário autorizado consegue criar, ler, editar e excluir registros do produto.
- Um segundo usuário autenticado de teste não consegue ler nem alterar a linha.
- Atualizar a página mantém a sessão e recarrega dados remotos.
- Todos os CRUDs existentes sobrevivem a um novo carregamento.
- Falha de rede não apaga o cache.
- Modo offline não aceita edições silenciosas.
- Duas abas com revisões diferentes geram conflito em vez de sobrescrever dados.
- Exportação e importação JSON continuam funcionando.
- GitHub Pages continua funcionando sem backend próprio.

## 16. Fora do escopo inicial

- Contas individuais por colaborador.
- Perfis admin/viewer.
- Realtime.
- Edge Functions.
- Normalização em várias tabelas.
- Merge automático de alterações concorrentes.
- Auditoria individual.

## 17. Referências oficiais

- [Supabase Auth com senha](https://supabase.com/docs/guides/auth/passwords)
- [signInWithPassword](https://supabase.com/docs/reference/javascript/auth-signinwithpassword)
- [Configuração geral do Auth](https://supabase.com/docs/guides/auth/general-configuration)
- [Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Chaves de API](https://supabase.com/docs/guides/getting-started/api-keys)
- [Upsert e operações JavaScript](https://supabase.com/docs/reference/javascript/upsert)
