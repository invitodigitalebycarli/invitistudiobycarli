import { createServerFn } from "@tanstack/react-start";
import { createHmac } from "crypto";
import type { InviteConfig } from "@/lib/invite-store";

const BUCKET = "invite-media";

function sessionToken(secret: string) {
  return createHmac("sha256", secret).update("invite-editor-session").digest("hex");
}

// The PIN is verified ONLY here, server-side. The client receives an opaque
// session token and never sees or stores the real PIN value.
export const verifyPinFn = createServerFn({ method: "POST" })
  .inputValidator((data: { pin: string; user?: string }) => data)
  .handler(async ({ data }) => {
    const expected = process.env["EDITOR_PIN"];
    const expectedUser = process.env["EDITOR_USER"];
    if (!expected || typeof data.pin !== "string" || data.pin !== expected) {
      throw new Error("Credenziali non valide");
    }
    if (expectedUser && (data.user ?? "").trim().toLowerCase() !== expectedUser.toLowerCase()) {
      throw new Error("Credenziali non valide");
    }
    return { token: sessionToken(expected) };
  });

function checkToken(token: string) {
  const expected = process.env["EDITOR_PIN"];
  if (!expected || !token || token !== sessionToken(expected)) {
    throw new Error("Sessione editor non valida");
  }
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
  .inputValidator((data: { token: string; site: InviteConfig }) => data)
  .handler(async ({ data }) => {
    checkToken(data.token);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { id, name, ...rest } = data.site;
    const { error } = await supabaseAdmin
      .from("invite_sites")
      .upsert({ id, name, data: rest as never, updated_at: new Date().toISOString() });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const deleteSiteFn = createServerFn({ method: "POST" })
  .inputValidator((data: { token: string; id: string }) => data)
  .handler(async ({ data }) => {
    checkToken(data.token);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("invite_sites").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const createUploadFn = createServerFn({ method: "POST" })
  .inputValidator((data: { token: string; ext: string }) => data)
  .handler(async ({ data }) => {
    checkToken(data.token);
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
  .inputValidator((data: { token: string; path: string }) => data)
  .handler(async ({ data }) => {
    checkToken(data.token);
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
    const key = (data.slug ?? "").trim().toLowerCase();
    if (!key) return null;

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(key);

    let row: { id: string; name: string; data: unknown } | null = null;

    if (isUuid) {
      const { data: byId } = await supabaseAdmin
        .from("invite_sites")
        .select("id, name, data")
        .eq("id", key)
        .maybeSingle();
      if (byId) row = byId;
    }

    if (!row) {
      const { data: bySlug } = await supabaseAdmin
        .from("invite_sites")
        .select("id, name, data")
        .filter("data->>slug", "ilike", key)
        .limit(1)
        .maybeSingle();
      if (bySlug) row = bySlug;
    }

    if (!row) {
      // Fallback in case of special character normalization difference
      const { data: rows } = await supabaseAdmin
        .from("invite_sites")
        .select("id, name, data");
      row =
        (rows ?? []).find((r) => {
          const d = r.data as { slug?: string } | null;
          return r.id.toLowerCase() === key || (d?.slug ?? "").toLowerCase() === key;
        }) ?? null;
    }

    if (!row) return null;
    let origin = "";
    try {
      const { getRequestUrl } = await import("@tanstack/react-start/server");
      origin = new URL(getRequestUrl()).origin;
    } catch {
      origin = "";
    }
    return {
      site: {
        ...(row.data as Omit<InviteConfig, "id" | "name">),
        id: row.id,
        name: row.name,
      } as InviteConfig,
      origin,
    };
  });

export const getActiveSiteFn = createServerFn({ method: "GET" })
  .inputValidator((data?: { id?: string | null }) => data)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const targetId = data?.id;
    if (targetId) {
      const { data: row } = await supabaseAdmin
        .from("invite_sites")
        .select("id, name, data")
        .eq("id", targetId)
        .maybeSingle();
      if (row) {
        return {
          site: {
            ...(row.data as Omit<InviteConfig, "id" | "name">),
            id: row.id,
            name: row.name,
          } as InviteConfig,
        };
      }
    }
    const { data: rows } = await supabaseAdmin
      .from("invite_sites")
      .select("id, name, data")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true })
      .limit(1);
    const row = rows?.[0];
    if (!row) return null;
    return {
      site: {
        ...(row.data as Omit<InviteConfig, "id" | "name">),
        id: row.id,
        name: row.name,
      } as InviteConfig,
    };
  });
