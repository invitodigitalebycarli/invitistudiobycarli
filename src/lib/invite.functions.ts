import { createServerFn } from "@tanstack/react-start";
import type { InviteConfig } from "@/lib/invite-store";

const BUCKET = "invite-media";

function checkPin(pin: string) {
  const expected = process.env["EDITOR_PIN"];
  if (!expected || pin !== expected) throw new Error("PIN non valido");
}

export const listSitesFn = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("invite_sites")
    .select("id, name, data, sort_order")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    ...(row.data as Omit<InviteConfig, "id" | "name">),
    id: row.id,
    name: row.name,
  })) as InviteConfig[];
});

export const saveSiteFn = createServerFn({ method: "POST" })
  .inputValidator((data: { pin: string; site: InviteConfig }) => data)
  .handler(async ({ data }) => {
    checkPin(data.pin);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { id, name, ...rest } = data.site;
    const { error } = await supabaseAdmin
      .from("invite_sites")
      .upsert({ id, name, data: rest as never, updated_at: new Date().toISOString() });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const deleteSiteFn = createServerFn({ method: "POST" })
  .inputValidator((data: { pin: string; id: string }) => data)
  .handler(async ({ data }) => {
    checkPin(data.pin);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("invite_sites").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const createUploadFn = createServerFn({ method: "POST" })
  .inputValidator((data: { pin: string; ext: string }) => data)
  .handler(async ({ data }) => {
    checkPin(data.pin);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const safeExt = (data.ext || "bin").replace(/[^a-zA-Z0-9]/g, "").slice(0, 8) || "bin";
    const path = `${crypto.randomUUID()}.${safeExt}`;
    const { data: signed, error } = await supabaseAdmin.storage
      .from(BUCKET)
      .createSignedUploadUrl(path);
    if (error || !signed) throw new Error(error?.message ?? "Upload non disponibile");
    return { path, token: signed.token, bucket: BUCKET };
  });

export const copyMediaFn = createServerFn({ method: "POST" })
  .inputValidator((data: { pin: string; path: string }) => data)
  .handler(async ({ data }) => {
    checkPin(data.pin);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const ext = data.path.split(".").pop() ?? "bin";
    const target = `${crypto.randomUUID()}.${ext}`;
    const { error } = await supabaseAdmin.storage.from(BUCKET).copy(data.path, target);
    if (error) throw new Error(error.message);
    return { path: target };
  });

export const getSiteFn = createServerFn({ method: "GET" })
  .inputValidator((data: { slug: string }) => data)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("invite_sites")
      .select("id, name, data");
    if (error) throw new Error(error.message);
    const key = data.slug.toLowerCase();
    const row = (rows ?? []).find((r) => {
      const d = r.data as { slug?: string } | null;
      return r.id === key || (d?.slug ?? "").toLowerCase() === key;
    });
    if (!row) return null;
    return {
      ...(row.data as Omit<InviteConfig, "id" | "name">),
      id: row.id,
      name: row.name,
    } as InviteConfig;
  });
