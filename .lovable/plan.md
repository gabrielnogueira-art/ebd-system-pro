## Diagnóstico

O console mostra o erro real que quebra tudo (inclusive "Igreja Independente"):

```
permission denied for function is_master
```

A função `public.is_master(uuid)` foi criada como `SECURITY DEFINER`, mas nunca recebeu `GRANT EXECUTE` para o role `authenticated`. Como praticamente todas as políticas RLS de escrita (ministries, headquarters, congregations, regionals, user_roles) chamam `is_master(auth.uid())`, qualquer INSERT/SELECT feito pelo usuário logado falha com 42501 — inclusive:

- O dashboard do Master (erro visível no console).
- A Edge Function `create-entity-user` quando executa via service_role até funciona, mas o passo seguinte no cliente (recarregar hierarquia) falha, e em várias RLS a checagem `is_master` roda no contexto do JWT do caller e retorna "permission denied", abortando a transação antes do INSERT.

Além disso, outras funções auxiliares (`user_can_manage_*`, `user_can_see_congregation`, `has_role`, `teacher_has_class`, `get_admin_dashboard_*`) provavelmente estão no mesmo estado — só funcionam por sorte quando chamadas internamente por outra função definer.

## Plano

### 1. Migração SQL: conceder EXECUTE nas funções usadas por RLS/JWT

Rodar um `GRANT EXECUTE ... TO authenticated` (e `service_role`) em todas as funções que aparecem em políticas ou são chamadas do cliente:

- `is_master(uuid)`
- `has_role(uuid, app_role)`
- `user_can_see_congregation(uuid, uuid)`
- `user_can_manage_headquarters(uuid, uuid)`
- `user_can_manage_regional(uuid, uuid)`
- `user_can_manage_congregation_structure(uuid, uuid)`
- `teacher_has_class(uuid, int)`
- `get_user_ministry / headquarters / regional / congregation(uuid)`
- `get_admin_dashboard_summary(...)` e `get_admin_dashboard_trends(...)`
- `approve_user(...)` e `reject_user(...)`

Como todas são `SECURITY DEFINER` com `search_path` fixo, dar EXECUTE é seguro.

### 2. Verificar fluxo "Igreja Independente" após o fix

Com `is_master` executável, a Edge Function `create-entity-user` (action `create_independent_church`) deve concluir:
1. cria `ministries` → `headquarters` → `congregations` (`is_headquarters: true`)
2. cria auth user
3. insere `user_roles` como `secretario_ebd` vinculado à congregação

Rodar teste com `supabase--curl_edge_functions` chamando `create-entity-user` com um payload de teste, e ler `supabase--edge_function_logs` se der erro. Se algum passo falhar por RLS residual, ajustar política ou usar `admin` (service_role) — mas o service_role bypassa RLS, então o único vetor de falha real é o `is_master` faltando permissão quando a Edge Function usa `userClient` para algo (não usa hoje — só para `getUser`), portanto o fix acima deve ser suficiente.

### 3. Checklist de teste dos 5 níveis de login

Depois do fix aplicado, testar login e navegação para cada um. Vou executar via browser (Playwright) contra `http://localhost:8080` e reportar o que cada usuário vê:

| Login | Senha | Deve acessar |
|---|---|---|
| master@ebd.dev | Master@2026 | Estrutura completa, todas as sedes, todas as congregações, aba Aprovações |
| admadureira@gmail.com | Admadureira@2026 | Ministério Madureira, todas as sedes/regionais/congregações abaixo |
| admin_igreja_mae@teste.com | (senha seed) | Sua igreja mãe + descendentes |
| admin_regional@teste.com | (senha seed) | Apenas sua regional |
| admin_congregacao@teste.com | (senha seed) | Apenas dashboard da sua congregação |
| professor_classe@teste.com | (senha seed) | Sidebar de professor: Chamada, Alunos, Painel |

Para cada login capturar screenshot do painel inicial + tentar 1 ação de escrita (ex.: criar item um nível acima do escopo) para confirmar que a RLS bloqueia corretamente.

### Detalhes técnicos

- Passo 1 é 1 migração SQL só com `GRANT EXECUTE`. Nada de alterar corpo das funções nem RLS.
- Passo 2 e 3 são verificação, sem código adicional. Se algum teste falhar, abro um segundo plano.
- Não vou mexer em `AdminDashboard.tsx`, `HierarchyTab.tsx` nem em `create-entity-user` — o bug é no banco, não no cliente.
