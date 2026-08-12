const fs = require("fs");
const path = require("path");

const MIGRATION_PATH = path.resolve(
  __dirname,
  "../../../../supabase/migrations/20260813090000_add_hero_build_set_revisions.sql",
);

function readSql() {
  expect(fs.existsSync(MIGRATION_PATH)).toBe(true);
  return fs.readFileSync(MIGRATION_PATH, "utf8");
}

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

describe("hero build set revision migration", () => {
  it("starts existing and newly created rows at revision one", () => {
    const sql = readSql();

    expect(sql).toMatch(
      /add\s+column\s+if\s+not\s+exists\s+revision\s+bigint\s+not\s+null\s+default\s+1/i,
    );
    expect(sql).toMatch(/revision\s*>\s*0/i);
  });

  it("stores immutable before and after snapshots with one event per revision", () => {
    const sql = readSql();

    expect(sql).toContain("public.hero_build_set_revisions");
    expect(sql).toMatch(/previous_status\s+text/i);
    expect(sql).toMatch(/previous_payload\s+jsonb/i);
    expect(sql).toMatch(/status\s+text\s+not\s+null/i);
    expect(sql).toMatch(/payload\s+jsonb\s+not\s+null/i);
    expect(sql).toMatch(/unique\s*\(hero_id,\s*revision\)/i);
    expect(sql).toMatch(/prevent_hero_build_set_revision_changes/i);
    expect(sql).toMatch(/before\s+update\s+or\s+delete/i);
  });

  it.each([
    "create_or_update_draft_hero_build_set",
    "publish_hero_build_set",
    "update_published_hero_build_set",
  ])("requires expected revision in %s", (functionName) => {
    const definition = readFunction(readSql(), functionName);

    expect(definition).toMatch(/p_expected_revision\s+bigint/i);
    expect(definition).toMatch(/revision\s*=\s*p_expected_revision/i);
    expect(definition).toMatch(/revision\s*=\s*revision\s*\+\s*1/i);
    expect(definition).toMatch(/errcode\s*=\s*'P4090'/i);
    expect(definition).toContain("public.hero_build_set_revisions");
  });

  it("uses null expected revision only for atomic draft creation", () => {
    const definition = readFunction(
      readSql(),
      "create_or_update_draft_hero_build_set",
    );

    expect(definition).toMatch(/p_expected_revision\s+is\s+null/i);
    expect(definition).toMatch(/unique_violation/i);
    expect(definition).toMatch(/values[\s\S]*?'draft'[\s\S]*?1/i);
  });

  it("restores a historical published snapshot into a newer revision", () => {
    const sql = readSql();
    const definition = readFunction(sql, "restore_published_hero_build_set");

    expect(definition).toMatch(/security\s+definer/i);
    expect(definition).toMatch(/p_history_id\s+bigint/i);
    expect(definition).toMatch(/p_expected_revision\s+bigint/i);
    expect(definition).toMatch(
      /from\s+public\.hero_build_set_revisions[\s\S]*?and\s+status\s*=\s*'published'/i,
    );
    expect(definition).toMatch(/revision\s*=\s*revision\s*\+\s*1/i);
    expect(definition).toMatch(/'restored_published'/i);
    expect(definition).not.toMatch(/update\s+public\.hero_build_set_revisions/i);
  });
});
