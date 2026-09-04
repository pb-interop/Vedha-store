import { redirect } from "next/navigation";
import { isApprovedAdmin, isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export async function requireAdmin() {
  if (!isSupabaseConfigured()) redirect("/admin?setup=required");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isApprovedAdmin(user.email)) redirect("/admin?error=unauthorized");
  const { data: allowed } = await supabase.rpc("is_admin");
  if (!allowed) redirect("/admin?error=unauthorized");
  return { supabase, user };
}

export function slugify(value: string) {
  return value.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
