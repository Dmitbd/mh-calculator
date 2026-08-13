const fs = require("node:fs");
const path = require("node:path");

const sourcePath = path.join(
  process.cwd(),
  "supabase/functions/bootstrap/index.ts",
);
const manifestPath = path.join(
  process.cwd(),
  "supabase/functions/bootstrap/manifest.ts",
);

describe("bootstrap Edge Function", () => {
  test("owns a deterministic database-backed hero-build manifest", () => {
    const source = fs.readFileSync(sourcePath, "utf8");
    const manifestSource = fs.readFileSync(manifestPath, "utf8");

    expect(source).toContain('Deno.env.get("SUPABASE_ANON_KEY")');
    expect(source).not.toContain("SERVICE_ROLE");
    expect(source).toContain('.from("hero_build_sets")');
    expect(source).toContain('.eq("status", "published")');
    expect(manifestSource).toContain('schemaVersion: 1');
    expect(manifestSource).toContain('heroBuilds:');
    expect(source).toContain("loadPublishedHeroBuildMetadata");
    expect(source).not.toMatch(/Date\.now|new Date\(\)/);
    expect(manifestSource).not.toMatch(/Date\.now|new Date\(\)/);
    expect(source).toContain('"Content-Length"');
  });
});
