import { ClipboardList, Users, LayoutDashboard } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

export type ProfessorSection = "chamada" | "alunos" | "painel";

interface Props {
  section: ProfessorSection;
  onChange: (s: ProfessorSection) => void;
}

const items: { id: ProfessorSection; title: string; icon: any }[] = [
  { id: "chamada", title: "Chamada", icon: ClipboardList },
  { id: "alunos", title: "Alunos", icon: Users },
  { id: "painel", title: "Painel da Classe", icon: LayoutDashboard },
];

export const ProfessorSidebar = ({ section, onChange }: Props) => {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Professor</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    asChild
                    isActive={section === item.id}
                  >
                    <button
                      type="button"
                      onClick={() => onChange(item.id)}
                      className="flex items-center gap-2 w-full text-left"
                    >
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </button>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
};
