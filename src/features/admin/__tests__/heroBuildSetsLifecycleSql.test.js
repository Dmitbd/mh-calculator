const fs = require("fs");
const path = require("path");

const MIGRATION_PATH = path.resolve(
  __dirname,
  "../../../../supabase/migrations/20260812231000_enforce_hero_build_set_lifecycle.sql",
);

function readFunction(sql, functionName) {
  const match = sql.match(
    new RegExp(
      `create or replace function public\\.${functionName}\\([\\s\\S]*?\\n\\$\\$;`,
      "i",
    ),
  );

  if (!match) {
    throw new Error(`Missing SQL function: ${functionName}`);
  }

  return match[0];
}

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

  it("revokes direct lifecycle DML from PostgREST roles", () => {
    const sql = fs.readFileSync(MIGRATION_PATH, "utf8");

    expect(sql).toMatch(
      /revoke\s+insert\s*,\s*update\s*,\s*delete\s+on\s+public\.hero_build_sets\s+from\s+anon\s*,\s*authenticated/i,
    );
    expect(sql).not.toMatch(
      /grant\s+(?:insert|update|delete)[\s\S]*?hero_build_sets[\s\S]*?authenticated/i,
    );
  });

  it.each([
    "create_or_update_draft_hero_build_set",
    "publish_hero_build_set",
    "update_published_hero_build_set",
  ])("protects %s with an exact admin claim check", (functionName) => {
    const sql = fs.readFileSync(MIGRATION_PATH, "utf8");
    const definition = readFunction(sql, functionName);

    expect(definition).toMatch(/security\s+definer/i);
    expect(definition).toMatch(/set\s+search_path\s*=\s*''/i);
    expect(definition).toMatch(
      /auth\.jwt\(\)\s*->\s*'app_metadata'\s*->>\s*'role'[\s\S]*?is\s+distinct\s+from\s+'admin'/i,
    );
    expect(definition).toMatch(/raise\s+exception[\s\S]*?errcode\s*=\s*'42501'/i);
    expect(definition).toMatch(/if\s+not\s+found/i);
  });

  it("gives every write RPC one exact source-state predicate", () => {
    const sql = fs.readFileSync(MIGRATION_PATH, "utf8");
    const createDraft = readFunction(
      sql,
      "create_or_update_draft_hero_build_set",
    );
    const publishDraft = readFunction(sql, "publish_hero_build_set");
    const updatePublished = readFunction(
      sql,
      "update_published_hero_build_set",
    );

    expect(createDraft).toMatch(/values\s*\([\s\S]*?'draft'/i);
    expect(createDraft).toMatch(
      /on\s+conflict\s*\(hero_id\)[\s\S]*?where\s+hero_build_sets\.status\s*=\s*'draft'/i,
    );
    expect(publishDraft).toMatch(
      /set\s+status\s*=\s*'published'[\s\S]*?where\s+hero_id\s*=\s*p_hero_id\s+and\s+status\s*=\s*'draft'/i,
    );
    expect(updatePublished).toMatch(
      /set\s+payload\s*=\s*p_payload[\s\S]*?where\s+hero_id\s*=\s*p_hero_id\s+and\s+status\s*=\s*'published'/i,
    );
    expect(updatePublished).not.toMatch(/set\s+status\s*=/i);
  });
});
