## Objetivo
Evoluir a arquitetura atual (que já tem Ministério→Sede→Regional→Congregação + roles `secretario_ebd`/`professor_classe`) para suportar **4 níveis de acesso reais** com isolamento de dados por escopo, dashboards segmentados e dados de teste.

## Fase A — Banco de Dados (nova migration)

### A.1 Expandir enum de roles
Adicionar 2 novos papéis ao `app_role`:
- `igreja_mae` (Ministério)
- `igreja_sede` (Sede da Cidade)
- (mantém) `secretario_ebd` → será **alias de Congregação** (admin local de uma congregação)
- (mantém) `professor_classe`

### A.2 Ajustar `user_roles`
Adicionar colunas de escopo opcionais para cada nível:
- `ministry_id uuid NULL`
- `headquarters_id uuid NULL`
- `congregation_id uuid NULL` (já existe)

Regra: cada linha de role preenche apenas o campo do seu nível.

### A.3 Funções security definer (evitar recursão RLS)
- `get_user_ministry(uuid)` → ministry_id
- `get_user_headquarters(uuid)` → headquarters_id
- `user_can_see_congregation(uuid, uuid)` → boolean (true se for igreja_mae do ministério da congregação, sede da headquarters da congregação, ou secretario daquela congregação)

### A.4 RLS em `classes` / `students` / `registrations`
Substituir policies atuais por: usuário pode acessar registros cuja `congregation_id` (via class) passa por `user_can_see_congregation`.

### A.5 Seed de teste
Inserir via SQL:
- 2ª Igreja Sede ("Sede Norte") com 2 Regionais + 3 Congregações
- Classes/alunos/registros mínimos em cada congregação
- (logins de teste serão criados após migration, manualmente ou via script — não dá pra criar `auth.users` via migration de forma confiável; instrução fornecida ao usuário)

## Fase B — Frontend

### B.1 Login routing (`src/pages/Login.tsx`)
Após autenticar, ler todas as roles e priorizar redirecionamento:
1. `igreja_mae` → `/admin?scope=ministry`
2. `igreja_sede` → `/admin?scope=headquarters`
3. `secretario_ebd` → `/admin?scope=congregation`
4. `professor_classe` → `/professor`

Atualizar `useUserRole` para retornar `{ role, ministryId, headquartersId, congregationId }`.

### B.2 Dashboards escopados (`src/components/AdminDashboard.tsx`)
- Adicionar filtro de escopo no topo, visível conforme role:
  - **igreja_mae**: seletor de Sede (ou "Todas")
  - **igreja_sede**: toggle "Minha EBD local" ↔ "Visão global (todas congregações)" + filtro por Regional
  - **secretario_ebd**: sem seletor, sempre congregação dele
- Queries de `registrations`/`classes` filtradas via join com `congregations` usando o escopo selecionado.

### B.3 Módulo CRUD da Igreja Sede (`HierarchyTab.tsx`)
Já existe. Ajustar para:
- Igreja Sede vê apenas suas próprias Regionais/Congregações
- Igreja Mãe vê todas as Sedes do seu ministério
- Esconder seções fora do escopo

### B.4 Visão do Professor (`src/pages/Professor.tsx`)
Implementar tela completa:
- Lista de classes vinculadas ao usuário (via `teacher_classes`)
- Chamada do dia (presença), CRUD de alunos da classe, registro de Bíblias/revistas/ofertas
- Dashboard restrito à classe

## Fase C — Documentação / Seed Manual
Fornecer SQL ao usuário para criar usuários de teste no Auth dashboard e vincular roles:
- `mae@teste.com` → igreja_mae
- `sede1@teste.com` → igreja_sede (Sede atual)
- `sede2@teste.com` → igreja_sede (Sede Norte)
- `cong1@teste.com` → secretario_ebd (Congregação X)
- `prof1@teste.com` → professor_classe

## Ordem de execução
1. **Iteração 1 (esta)**: Fase A (migration) + B.1 (login routing) + hook atualizado.
2. **Iteração 2**: B.2 dashboards escopados.
3. **Iteração 3**: B.3 CRUD escopado + B.4 visão do Professor.
4. **Iteração 4**: Seed de logins de teste + documentação.

## Detalhes técnicos
- Migration timestamped `2026060906xxxx_multitenant_scopes.sql`.
- Não quebrar usuários existentes: quem não tem role nenhuma cai em `/admin` (compatibilidade já existe em `Login.tsx`).
- Tipos do Supabase serão regenerados após migration; até lá, usar `supabase as any` para tabelas novas.

Confirma para eu começar pela **Iteração 1** (migration + login routing)?
