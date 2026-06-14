## Contexto

Hoje temos: enum `app_role` com `igreja_mae`, `igreja_sede`, `admin_regional`, `secretario_ebd`, `professor_classe`; `user_roles` com escopos; RLS bottom-up funcional; 5 logins de teste seedados. Esta entrega adiciona o nível Master, o fluxo de aprovação de cadastros e o seed completo do Ministério Madureira (1 ministério → 3 sedes → 12 regionais → 120 congregações), além da navegação "minha igreja local ↔ congregações" na Sede e do drill-down por congregação.

## O que será feito

### 1. Migration `20260615120000_master_and_approval.sql`
- Adiciona `'master'` ao enum `app_role`.
- Estende `user_can_see_congregation`: master vê tudo.
- Nova função `is_master(uuid) → boolean`.
- Cria coluna `city` em `ministries` (Madureira mora no RJ).
- Cria tabela `pending_users` para fila de aprovação:
  - `id`, `user_id` (FK auth.users), `email`, `display_name`, `requested_role`, `requested_scope_*` (ministry/headquarters/regional/congregation), `status` (`pending`|`approved`|`rejected`), `decided_by`, `decided_at`, `created_at`.
  - GRANTs corretos + RLS: master enxerga/aprova tudo; usuário enxerga só o próprio pedido.
- Trigger `on_auth_user_created` em `auth.users` que insere automaticamente em `pending_users` com `status='pending'` para qualquer signup novo (exceto seeds que vamos marcar como `approved`).
- Função `approve_user(pending_id, role, ministry/hq/regional/cong)` `SECURITY DEFINER` que cria o `user_roles` final e marca como aprovado.

### 2. Migration `20260615120100_seed_madureira.sql` (separada por causa do enum)
- Cria usuário Master `master@ebd.dev` / `Master@2026` com role `master` (auto-aprovado).
- Cria/atualiza ministério **"Assembleia de Deus Ministério Madureira"** (cidade: Rio de Janeiro).
- Cria login `admadureira@gmail.com` / `Admadureira@2026` com role `igreja_mae` apontando para esse ministério.
- Cria 3 headquarters: **AD Campos dos Goytacazes**, **AD Macaé**, **AD São Francisco de Itabapoana** vinculadas ao ministério Madureira.
- Cria 12 regionais ("Regional 01" a "Regional 12") sob AD Campos.
- Cria 120 congregações ("Congregação 1" a "Congregação 120"), 10 por regional.
- Reassocia o login existente `admin_igreja_mae@teste.com` para ser admin da Sede **AD Campos dos Goytacazes** (UPDATE em `user_roles.headquarters_id`).
- Cria 1 classe "Geral" em cada uma das 120 congregações (para o drill-down já ter algo, ainda que vazio).

### 3. Frontend

**Login (`Login.tsx` + `App.tsx`):**
- Master roteia para `/admin?scope=master`.
- Bloqueia login se `pending_users.status='pending'` mostrando mensagem "Aguardando aprovação".

**Cadastro público:**
- Adiciona link "Criar conta" na tela de login → `/signup` (novo). O signup pede nome + e-mail + senha + role solicitado + escopo. Após criar, mostra "Sua conta está aguardando aprovação".

**Painel Master (`MasterApprovalsTab.tsx`):**
- Nova aba "Aprovações" visível só para role `master`.
- Lista `pending_users` com botões Aprovar/Rejeitar + selects de role e escopo.
- Master também tem todas as abas existentes (visão global).

**Painel Ministério (`AdminDashboard` quando `scope=ministry`):**
- Já filtra via `useDashboardScope`. Adiciona um cartão de topo "Igrejas Sede" listando as Sedes daquele Ministério com botão "Editar" (abre modal já existente em `HierarchyTab`).

**Painel Sede com toggle (`SedeViewToggle.tsx`):**
- No topo do Admin quando `role='igreja_sede'`, dois botões grandes:
  - **"EBD da minha igreja"** → filtra dashboard pela congregação `is_headquarters=true` da Sede.
  - **"Visão das Congregações"** → mostra lista de congregações dessa Sede, com Regional como agrupador; clicar em uma congregação trava o filtro do dashboard nela (drill-down) e mostra um botão "Voltar".
- Estado salvo em query param (`?view=local|congregations|cong:<id>`).

**Edição de Congregação/Sede:**
- `HierarchyTab` já tem CRUD. Vou habilitar inline edit (nome, regional) também na lista de congregações da Sede.

### 4. Memória de projeto
Salvo regra em `mem://features/hierarquia/aprovacao-master` resumindo o fluxo de aprovação para próximas sessões.

## Detalhes técnicos
- 2 migrations separadas (enum → uso).
- Trigger usa `SECURITY DEFINER` para inserir em `pending_users`.
- Seed de 120 congregações via `generate_series` em loop com `DO $$`.
- RLS de `pending_users`: master full, dono lê o seu.
- Não mexe no `EBDRegistrationForm` nem nos relatórios.

## Fora do escopo
- E-mail de notificação ao usuário quando for aprovado (pode vir depois via edge function).
- Permitir que `igreja_mae` também aprove usuários (hoje só master).

Confirmo para implementar tudo?
