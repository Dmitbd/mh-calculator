// @ts-nocheck -- Supabase Edge Functions are checked by the Deno runtime, not app tsc.
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  createHeroBuildsBootstrapManifest,
  loadPublishedHeroBuildMetadata,
} from "./manifest.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Expose-Headers": "Content-Length",
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS, status: 204 });
  }
  if (request.method !== "GET") {
    return jsonResponse({ status: "error" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !anonKey) {
    return jsonResponse({ status: "error" }, 503);
  }

  const client = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false },
  });
  try {
    const rows = await loadPublishedHeroBuildMetadata(async (from, to) =>
      await client
        .from("hero_build_sets")
        .select("hero_id,revision,updated_at")
        .eq("status", "published")
        .order("hero_id", { ascending: true })
        .range(from, to)
    );
    return jsonResponse(await createHeroBuildsBootstrapManifest(rows));
  } catch {
    return jsonResponse({ status: "error" }, 503);
  }
});

function jsonResponse(body: unknown, status = 200): Response {
  const json = JSON.stringify(body);
  const contentLength = new TextEncoder().encode(json).byteLength;
  return new Response(json, {
    headers: {
      ...CORS_HEADERS,
      "Content-Length": String(contentLength),
      "Content-Type": "application/json",
    },
    status,
  });
}
