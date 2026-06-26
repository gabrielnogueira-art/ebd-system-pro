import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AppRole =
  | "master"
  | "igreja_mae"
  | "igreja_sede"
  | "admin_regional"
  | "secretario_ebd"
  | "professor_classe";

export interface UserRoleInfo {
  role: AppRole | null;
  ministryId: string | null;
  headquartersId: string | null;
  regionalId: string | null;
  congregationId: string | null;
  loading: boolean;
}

// Prioridade do mais alto pro mais baixo
const ROLE_PRIORITY: AppRole[] = [
  "master",
  "igreja_mae",
  "igreja_sede",
  "admin_regional",
  "secretario_ebd",
  "professor_classe",
];

/**
 * Store global compartilhado: uma unica busca + um unico listener de auth,
 * independente de quantos componentes chamem useUserRole().
 * Antes, cada componente abria sua propria subscription e disparava queries
 * paralelas, o que deixava o app lento e com input lag.
 */
const EMPTY: UserRoleInfo = {
  role: null,
  ministryId: null,
  headquartersId: null,
  regionalId: null,
  congregationId: null,
  loading: true,
};

let currentInfo: UserRoleInfo = EMPTY;
const listeners = new Set<(v: UserRoleInfo) => void>();
let initialized = false;
let inflight: Promise<void> | null = null;
let lastUserId: string | null | undefined = undefined;

function emit(next: UserRoleInfo) {
  currentInfo = next;
  listeners.forEach((l) => l(next));
}

async function loadFor(userId: string | null) {
  if (!userId) {
    emit({ ...EMPTY, loading: false });
    return;
  }
  const { data, error } = await supabase
    .from("user_roles" as any)
    .select("role, ministry_id, headquarters_id, regional_id, congregation_id")
    .eq("user_id", userId);
  if (error || !data || (data as any[]).length === 0) {
    emit({ ...EMPTY, loading: false });
    return;
  }
  const rows = data as unknown as Array<{
    role: AppRole;
    ministry_id: string | null;
    headquarters_id: string | null;
    regional_id: string | null;
    congregation_id: string | null;
  }>;
  const chosen =
    ROLE_PRIORITY.map((r) => rows.find((x) => x.role === r)).find(Boolean) ?? rows[0];
  emit({
    role: chosen!.role,
    ministryId: chosen!.ministry_id ?? null,
    headquartersId: chosen!.headquarters_id ?? null,
    regionalId: chosen!.regional_id ?? null,
    congregationId: chosen!.congregation_id ?? null,
    loading: false,
  });
}

async function refresh() {
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const { data } = await supabase.auth.getSession();
      const uid = data.session?.user?.id ?? null;
      lastUserId = uid;
      await loadFor(uid);
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

function ensureInitialized() {
  if (initialized) return;
  initialized = true;
  refresh();
  supabase.auth.onAuthStateChange((_e, session) => {
    const uid = session?.user?.id ?? null;
    // Evita refetch desnecessario quando o token apenas renova
    if (uid === lastUserId && !currentInfo.loading) return;
    setTimeout(() => { refresh(); }, 0);
  });
}

export function useUserRole(): UserRoleInfo {
  ensureInitialized();
  const [info, setInfo] = useState<UserRoleInfo>(currentInfo);
  useEffect(() => {
    listeners.add(setInfo);
    // Sincroniza caso o store tenha mudado entre o render e o effect
    if (info !== currentInfo) setInfo(currentInfo);
    return () => { listeners.delete(setInfo); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return info;
}