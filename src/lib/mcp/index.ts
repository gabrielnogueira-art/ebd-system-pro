import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listCongregations from "./tools/list-congregations";
import listClasses from "./tools/list-classes";
import listStudents from "./tools/list-students";
import listRecentRegistrations from "./tools/list-recent-registrations";

// OAuth issuer must be the direct Supabase host (not the .lovable.cloud proxy).
// Build it from the project ref so it stays import-safe (no runtime env reads).
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "ebd-system-pro-mcp",
  title: "EBD System Pro",
  version: "0.1.0",
  instructions:
    "Tools to read EBD (Escola Bíblica Dominical) data from this app: congregations, classes, students, and weekly registrations. All access respects the signed-in user's hierarchy (master, igreja_mãe, igreja_sede, admin_regional, secretário_ebd, professor_classe).",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listCongregations, listClasses, listStudents, listRecentRegistrations],
});