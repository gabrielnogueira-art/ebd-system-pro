# Painel do Professor com Sidebar

Hoje a página `/professor` é uma tela única com seletor de classe + formulário de chamada. Vamos transformá-la em um painel completo, com barra lateral colapsável, semelhante em estrutura ao painel do ADM, mas com escopo restrito à(s) classe(s) do professor.

## Estrutura visual

```text
┌───────────────────────────────────────────────┐
│ ☰  Painel do Professor       [Classe ▼] Sair │
├──────────┬────────────────────────────────────┤
│ Sidebar  │                                    │
│  • Chamada│   Conteúdo da seção ativa          │
│  • Alunos │                                    │
│  • Painel │                                    │
└──────────┴────────────────────────────────────┘
```

- Sidebar usa o componente `shadcn/ui sidebar` com `collapsible="icon"` (recolhe para ícones, expande no clique do botão ☰ no header).
- Seletor de classe permanece no header (enquanto não existe vínculo único professor→classe). Ao trocar a classe, todas as seções recarregam com o novo `classId`.

## Seções do painel

1. **Chamada (Registro)** — reusa o atual `ProfessorAttendanceTab` (formulário de presença/ofertas já existente). Nenhuma mudança funcional.

2. **Alunos da Classe** — CRUD restrito aos alunos da classe selecionada:
   - Listar alunos (`students` filtrado por `class_id`).
   - Adicionar, editar e desativar/reativar aluno.
   - Campos: nome, telefone, data de nascimento, cargo, endereço.
   - Reutilizar visualmente o padrão do `StudentsManagement` (usado pelo ADM), mas em uma versão simplificada que sempre recebe `classId` por prop — sem seletor de classe e sem mudar a classe do aluno.

3. **Painel da Classe (Dashboard)** — visão macro restrita à classe:
   - Cards de KPIs: matriculados ativos, média de presença, média de bíblias, média de revistas, ofertas acumuladas (dinheiro + PIX).
   - Aniversariantes do mês.
   - Atenção pastoral: alunos com 2+ faltas consecutivas nos últimos registros.
   - Histórico recente: tabela com últimos registros da classe (data, presentes, bíblias, revistas, oferta total).
   - Frequência por aluno: tabela com total e % de presença de cada aluno no período disponível.
   - Tudo derivado de `registrations` + `students` filtrando por `class_id`.

## Segurança / dados

Não muda nada no banco. As RLS atuais já restringem `students`, `registrations` e `classes` ao escopo do professor (via `teacher_classes`). Apenas garantimos que todas as queries das novas seções filtram por `class_id` selecionado.

## Detalhes técnicos

- Novos arquivos:
  - `src/pages/Professor.tsx` — reescrita para usar `SidebarProvider` + layout shell + roteamento interno por estado (`section: "chamada" | "alunos" | "painel"`).
  - `src/components/ProfessorSidebar.tsx` — sidebar com itens Chamada / Alunos / Painel da Classe (`NavLink`-like via estado).
  - `src/components/ProfessorStudentsTab.tsx` — gerenciamento de alunos da classe (recebe `classId`).
  - `src/components/ProfessorDashboardTab.tsx` — dashboard da classe (recebe `classId`).
- Mantém `ProfessorAttendanceTab` como está.
- Header fixo com `SidebarTrigger`, título, seletor de classe (quando houver mais de uma) e botão Sair.
- Responsivo: em mobile o sidebar vira offcanvas; o seletor de classe colapsa abaixo do título.

## Itens fora do escopo desta etapa

- Vincular automaticamente o professor a uma única classe e remover o seletor (será feito depois, conforme você indicou).
- Exportação de relatórios em PDF na visão do professor (pode ser adicionado depois reusando o `ReportsTab` filtrado).
