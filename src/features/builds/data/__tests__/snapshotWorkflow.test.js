const fs = require("node:fs");
const path = require("node:path");

describe("snapshot update workflow", () => {
  test("uses a pinned checkout, idempotent branch PR, least permissions, and env-only secrets", () => {
    const source = fs.readFileSync(path.join(process.cwd(), ".github/workflows/update-hero-build-snapshot.yml"), "utf8");
    expect(source).toMatch(/actions\/checkout@[a-f0-9]{40}/);
    expect(source).toMatch(/actions\/setup-node@[a-f0-9]{40}/);
    expect(source).toMatch(/contents: write[\s\S]*pull-requests: write/);
    expect(source).not.toMatch(/pages: write|id-token: write/);
    expect(source).toMatch(/concurrency:[\s\S]*cancel-in-progress: false/);
    expect(source).toContain("automation/hero-build-snapshots");
    expect(source).toMatch(/gh pr view[\s\S]*gh pr edit[\s\S]*gh pr create/);
    expect(source).not.toMatch(/git push[^\n]*main/);
    expect(source).toMatch(/SUPABASE_ANON_KEY: \$\{\{ secrets\./);
    expect(source).not.toMatch(/echo.*SUPABASE|artifact/i);
  });
});
