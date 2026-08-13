// @ts-nocheck -- Supabase Edge Functions are checked by the Deno runtime, not app tsc.
import { createClient } from "npm:@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Origin": "*",
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS, status: 204 });
  }
  if (request.method !== "GET") {
    return jsonResponse({ status: "error" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ status: "error" }, 503);
  }

  const client = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });
  const { data, error } = await client
    .from("hero_build_sets")
    .select("hero_id,revision,updated_at")
    .eq("status", "published")
    .order("hero_id", { ascending: true });

  if (error || !Array.isArray(data)) {
    return jsonResponse({ status: "error" }, 503);
  }

  const canonicalRows = data.map(({ hero_id, revision, updated_at }) => ({
    heroId: hero_id,
    revision,
    updatedAt: updated_at,
  }));
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(JSON.stringify(canonicalRows)),
  );
  const etag = `sha256:${Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("")}`;
  const version = `hero-builds:${etag.slice("sha256:".length, 23)}`;

  return jsonResponse({
    status: "ok",
    contentVersion: version,
    schemaVersion: 1,
    resources: {
      heroBuilds: { version, etag },
    },
  });
});

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    status,
  });
}
