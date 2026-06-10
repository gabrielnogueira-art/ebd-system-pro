## Contexto

A arquitetura `Ministério → Sede → Regional → Congregação → Classe` já existe no banco (tabelas `ministries`, `headquarters`, `regionals`, `congregations`, `classes`, `students`, `registrations`) e o `user_roles` já possui escopos `ministry_id`, `headquarters_id`, `congregation_id`. Faltam 4 coisas que esta entrega vai cobrir:

1. Indicador visual de conexão com o Supabase.
2. Papel **`admin_regional`** (hoje só existe mãe, sede, secretário, professor).
3. RLS bottom-up de verdade em `classes` / `students` / `registrations` (hoje as policies ainda são "anyone can…" — qualquer usuário lê tudo).
4. Seed de **5 usuários de teste** já com role/escopo vinculados.

## O que será feito

### 1. Indicador de conexão Supabase
- Novo hook `useSupabaseHealth()` que faz ping leve (`select count head` em `ministries`) a cada 30s e escuta `auth.onAuthStateChange`.
- Novo componente `SupabaseStatusBadge` (canto inferior direito do `/admin` e `/professor`): bolinha verde "Conectado", amarela "Verificando", vermelha "Sem conexão" com tooltip detalhando URL do projeto e último erro.
- Logs `console.error("[Supabase] ...")` claros em qualquer falha.

### 2. Nova role `admin_regional`
Migration adiciona:
- Valor `admin_regional` no enum `app_role`.
- Coluna `regional_id uuid` em `user_roles` (FK p/ `regionals`).
- Função `get_user_regional(_user_id)`.
- Atualiza `user_can_see_congregation` para também aceitar match por `regional_id`.

Frontend:
- `useUserRole` passa a retornar `regionalId`.
- `useDashboardScope` filtra hierarquia visível para `admin_regional` (apenas sua regional + congregações filhas).
- `Login.tsx` roteia `admin_regional → /admin?scope=regional`.

### 3. RLS bottom-up real
Migration substitui as policies "Anyone can…" em `classes`, `students`, `registrations` por:
- `SELECT/INSERT/UPDATE/DELETE` permitidos quando `public.user_can_see_congregation(auth.uid(), <congregation_da_classe>)` for true.
- Para `registrations` e `students` usa subquery: `class_id IN (SELECT id FROM classes WHERE user_can_see_congregation(auth.uid(), congregation_id))`.
- Mantém `service_role` total e `GRANT`s adequados.

Resultado: cada nível só enxerga o que está abaixo de si na hierarquia, e a Congregação fica isolada (atende o requisito "bottom-up").

### 4. Seed de usuários de teste
Migration insere via `auth.users` (padrão Supabase com `encrypted_password = crypt('senha123', gen_salt('bf'))`) e popula `user_roles`:

| Email | Senha | Role | Escopo |
|---|---|---|---|
| admin_ministerio@teste.com | senha123 | igreja_mae | Ministério padrão |
| admin_igreja_mae@teste.com | senha123 | igreja_sede | Sede principal |
| admin_regional@teste.com | senha123 | admin_regional | Regional Central |
| admin_congregacao@teste.com | senha123 | secretario_ebd | Congregação principal |
| professor_classe@teste.com | senha123 | professor_classe | Classe 1 |

Inserts idempotentes (`ON CONFLICT DO NOTHING`) usando UUIDs determinísticos.

## Detalhes técnicos

- 1 nova migration: `20260610090000_admin_regional_and_seed.sql` (enum + coluna + funcs + RLS + seed users).
- Arquivos novos: `src/hooks/useSupabaseHealth.ts`, `src/components/SupabaseStatusBadge.tsx`.
- Editados: `src/hooks/useUserRole.ts`, `src/hooks/useDashboardScope.ts`, `src/pages/Login.tsx`, `src/pages/Admin.tsx`, `src/pages/Professor.tsx`.
- Não toca em `EBDRegistrationForm` nem nos dashboards visuais existentes.

## Fora do escopo (pode vir depois)
- Tela de admin para criar professores e atribuir classes (já existe parcialmente).
- Refatoração visual dos dashboards por escopo (Iteração 2 já cobriu).

Confirmo para implementar tudo de uma vez?
