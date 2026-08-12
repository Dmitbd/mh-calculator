const fs = require("fs");
const path = require("path");

const MIGRATION_PATH = path.resolve(
  __dirname,
  "../../../../supabase/migrations/20260812231000_enforce_hero_build_set_lifecycle.sql",
);

describe("hero_build_sets lifecycle migration", () => {
  it("keeps published rows when legacy draft and published rows coexist", () => {
    expect(fs.existsSync(MIGRATION_PATH)).toBe(true);

    const sql = fs.readFileSync(MIGRATION_PATH, "utf8");
    expect(sql).toMatch(/delete\s+from\s+public\.hero_build_sets\s+as\s+draft/s);
    expect(sql).toMatch(/published\.status\s*=\s*'published'/s);
    expect(sql).toMatch(/draft\.status\s*=\s*'draft'/s);
  });

  it("changes row identity to hero_id and exposes one atomic publication RPC", () => {
    const sql = fs.readFileSync(MIGRATION_PATH, "utf8");

    expect(sql).toMatch(/primary\s+key\s*\(hero_id\)/i);
    expect(sql).toContain("public.publish_hero_build_set");
    expect(sql).toMatch(/status\s*=\s*'published'/);
    expect(sql).toMatch(/status\s*=\s*'draft'/);
    expect(sql).toMatch(/if\s+not\s+found/i);
  });

  it("rejects published deletion, downgrade, and identity changes in the database", () => {
    const sql = fs.readFileSync(MIGRATION_PATH, "utf8");

    expect(sql).toContain("prevent_published_hero_build_set_regression");
    expect(sql).toMatch(/tg_op\s*=\s*'DELETE'/i);
    expect(sql).toMatch(/old\.status\s*=\s*'published'/i);
    expect(sql).toMatch(/new\.status\s*<>\s*'published'/i);
    expect(sql).toMatch(/new\.hero_id\s*<>\s*old\.hero_id/i);
  });

  it("requires every new server row to start as a draft", () => {
    const sql = fs.readFileSync(MIGRATION_PATH, "utf8");

    expect(sql).toMatch(/tg_op\s*=\s*'INSERT'/i);
    expect(sql).toMatch(/new\.status\s*<>\s*'draft'/i);
    expect(sql).toMatch(/before\s+insert\s+or\s+update\s+or\s+delete/i);
  });
});
