# GeoViagens · Geometrisa

Sistema web de gerenciamento de viagens de campo da Geometrisa — consultoria em segurança de barragens.

## Funcionalidades

- Cadastro e acompanhamento de viagens de campo (inspeções em barragens/UHEs)
- Calendário mensal com barras de viagem por status (Previsto / Confirmado / Em campo / Concluído)
- Calendário de equipe com alocação individual de colaboradores
- Linha do tempo Gantt por colaborador
- Detecção automática de conflitos de agenda
- Exportação PDF com filtro de período e formato A4/A3

## Como executar localmente

```bash
python -m http.server 8080
# Acesse: http://localhost:8080
```

> Não abrir `index.html` diretamente como `file://` — o `localStorage` pode ser bloqueado pelo navegador.

## Tecnologia

Vanilla JS puro · sem framework · sem bundler · sem npm  
Dados salvos em `localStorage` (v01)

## Roadmap

- **v01** — Frontend completo, dados em `localStorage`, hospedagem GitHub Pages
- **v02** — Login único com Supabase Auth, persistência PostgreSQL/JSONB protegida por RLS

O plano técnico da integração está em [`docs/supabase-integration.md`](docs/supabase-integration.md).
