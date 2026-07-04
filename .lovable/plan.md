## Objetivos

1. **Corrigir o recarregamento da página** ao vincular professor a uma classe e melhorar a performance percebida.
2. **Filtrar e buscar alunos** no seletor "Professor Responsável" (mostrar apenas alunos da classe cujo nome contém "PROFESSOR") + campo de busca.
3. **Gestão de login das classes** (por classe) respeitando a hierarquia — criar/alterar e-mail e senha do usuário `professor_classe` associado à classe.
4. **Filtro hierárquico global de escopo** nas abas Dashboard, Registros, Confronto, Classes, Alunos e Relatórios — nada é carregado até o usuário escolher um escopo (Global → Ministério → Sede → Regional → Congregação), e cada seleção restringe os filtros seguintes.

---

## 1. Vínculo de professor sem reload

- No `ClassesManagement.tsx`, o `<form>` do dialog está fazendo submit nativo. Envolver `handleSubmit` com `e.preventDefault()` já existe, mas há um botão de submit que ao clicar dispara refetch pesado. Trocar por atualização local + `invalidateQueries` do card específico (sem `window.location.reload` nem `setRefreshKey` global).
- Após salvar, apenas atualizar o item na lista local (`setClasses(prev => prev.map(...))`) em vez de refazer o `fetch` completo.

## 2. Combobox de professor com busca e filtro

- Trocar o `<Select>` atual por um `Command`/`Popover` (shadcn combobox) com busca por nome.
- Query de alunos passa a filtrar por: `class_id IN (classes onde upper(name) LIKE '%PROFESSOR%'` **da mesma congregação da classe sendo editada**`)` e `active = true`.
- Mostrar nome + classe atual do aluno como subtítulo.

## 3. Gestão de login das classes

Nova aba **"Logins de Classe"** (visível para `master`, `igreja_mae`, `igreja_sede`, `admin_regional`, `secretario_ebd` — cada um vê apenas as classes do seu escopo).

Fluxo por classe:
- Se ainda não existe login: botão **"Criar login"** → abre dialog com e-mail + senha → chama edge function `create-entity-user` com role `professor_classe` + `class_id`.
- Se já existe: mostra e-mail atual, botões **"Alterar e-mail"** e **"Redefinir senha"** → chamam nova edge function `update-class-login` (service_role) que valida:
  - o solicitante tem permissão sobre a congregação da classe (usa `user_can_manage_congregation_structure`);
  - atualiza `auth.users.email` / `password` via admin API.

Tabela auxiliar: usar `user_roles` existente (`role='professor_classe'` + `teacher_classes.class_id`) — sem nova tabela.

## 4. Filtro hierárquico global (lazy load)

Criar componente `<ScopeGate>` reutilizável no topo de cada aba (Dashboard, Registros, Confronto, Classes, Alunos, Relatórios):

```text
[ Ministério ▾ ] → [ Sede ▾ ] → [ Regional ▾ ] → [ Congregação ▾ ]  [Aplicar]
```

- Enquanto nenhum escopo for aplicado, a aba mostra um card "Selecione um escopo para carregar os dados" — **nenhuma query dispara**.
- Cada select só lista opções filhas do nível anterior selecionado.
- Roles restritas (sede/regional/secretário) têm o nível superior pré-fixado e desabilitado, exatamente como já ocorre em `DashboardScopeFilter`.
- O escopo aplicado é propagado via contexto (`ScopeContext`) para os componentes de cada aba, que passam a receber `effectiveClassIds` / `effectiveCongregationIds` como props obrigatórias antes de fazer fetch.
- Para o `master`/`igreja_mae` fica disponível a opção "Todos" em cada nível, mas ainda assim exige clique em **Aplicar** para carregar.

## Detalhes técnicos

- **DB**: nenhuma alteração de schema necessária. Nova edge function `update-class-login` (usa `SUPABASE_SERVICE_ROLE_KEY`, valida via JWT do chamador com `user_can_manage_congregation_structure`).
- **Frontend**:
  - `src/context/ScopeContext.tsx` (novo) — provider com `applied`, `scope`, `apply()`, `reset()`.
  - `src/components/ScopeGate.tsx` (novo) — UI dos selects em cascata + botão Aplicar.
  - Adaptar `AdminDashboard`, `RegistrationsList`, `ConfrontoTab`, `ClassesManagement`, `StudentsManagement`, `ReportsTab` para: (a) mostrar `<ScopeGate>` no topo; (b) só disparar fetch quando `scope.applied === true`.
  - `ClassesManagement`: combobox com busca + atualização local sem reload.
  - Nova aba `ClassLoginsTab` + edge function `update-class-login`.

## Fora do escopo

- Reescrever o hook `useDashboardScope` (será estendido, não substituído).
- Alterações em RLS existentes.

Confirma este plano para eu implementar?
