const fs = require("node:fs");
const path = require("node:path");

const sourcePath = path.join(
  process.cwd(),
  "supabase/functions/bootstrap/index.ts",
);

describe("bootstrap Edge Function", () => {
  test("owns a deterministic database-backed hero-build manifest", () => {
    const source = fs.readFileSync(sourcePath, "utf8");

    expect(source).toContain('Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")');
    expect(source).toContain('.from("hero_build_sets")');
    expect(source).toContain('.eq("status", "published")');
    expect(source).toContain('schemaVersion: 1');
    expect(source).toContain('heroBuilds:');
    expect(source).toMatch(/crypto\.subtle\.digest\(\s*"SHA-256"/);
    expect(source).not.toMatch(/Date\.now|new Date\(\)/);
  });
});
