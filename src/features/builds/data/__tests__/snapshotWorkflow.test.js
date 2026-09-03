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
    expect(source).toMatch(/git fetch --no-tags origin "refs\/heads\/\$BRANCH:refs\/remotes\/origin\/\$BRANCH"/);
    expect(source).toMatch(/EXPECTED_SHA=.*git rev-parse "refs\/remotes\/origin\/\$BRANCH"/);
    expect(source).toMatch(/--force-with-lease="refs\/heads\/\$BRANCH:\$EXPECTED_SHA"/);
    expect(source).toMatch(/gh pr list --head "\$BRANCH" --base main --state open --json number --jq '\.\[0\]\.number'/);
    expect(source).toMatch(/gh pr edit "\$PR_NUMBER"[\s\S]*gh pr create/);
    expect(source).not.toContain("gh pr view");
    expect(source).not.toMatch(/git push[^\n]*main/);
    expect(source).toMatch(/SUPABASE_ANON_KEY: \$\{\{ secrets\./);
    expect(source).not.toMatch(/echo.*SUPABASE|artifact/i);

    const owners = fs.readFileSync(path.join(process.cwd(), ".github/CODEOWNERS"), "utf8");
    expect(owners).toMatch(/update-hero-build-snapshot\.yml\s+@Dmitbd/);
    expect(owners).toMatch(
      /builds\/data\/generated\/hero-builds\/\s+@Dmitbd/,
    );
    expect(source).toContain("src/features/builds/data/generated/hero-builds");
    expect(source).toContain("bundledHeroBuildSnapshot.test.ts");
    expect(source).toContain("export-hero-build-snapshot.test.js");
    expect(source).not.toContain("src/features/game-data/snapshots");
  });
});
