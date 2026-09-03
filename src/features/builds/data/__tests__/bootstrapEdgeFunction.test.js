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
  test("reads one atomic RLS-preserving bootstrap RPC", () => {
    const source = fs.readFileSync(sourcePath, "utf8");
    const manifestSource = fs.readFileSync(manifestPath, "utf8");

    expect(source).toContain('Deno.env.get("SUPABASE_ANON_KEY")');
    expect(source).not.toContain("SERVICE_ROLE");
    expect(source).toMatch(
      /\.rpc\(\s*"get_published_hero_builds_bootstrap_manifest"\s*,?\s*\)/,
    );
    expect(source.match(/\.rpc\(/g)).toHaveLength(1);
    expect(source).not.toContain('.from("hero_build_sets")');
    expect(source).not.toContain(".range(");
    expect(source).toContain("parseBootstrapManifestRpcResponse");
    expect(source).toContain('schemaVersion: 1');
    expect(source).toContain('heroBuilds:');
    expect(source).not.toMatch(/Date\.now|new Date\(\)/);
    expect(manifestSource).not.toMatch(/Date\.now|new Date\(\)/);
    expect(source).toContain('"Content-Length"');
  });
});
