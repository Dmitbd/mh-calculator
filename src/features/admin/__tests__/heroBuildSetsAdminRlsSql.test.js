const fs = require("fs");
const path = require("path");

const ASSERTION_PATH = path.resolve(
  __dirname,
  "../../../../supabase/tests/20260812_hero_build_sets_admin_rls_assert.sql",
);

function readSqlLiteral(sql, variableName) {
  const match = sql.match(
    new RegExp(`${variableName} constant text :=\\s*'((?:''|[^'])*)';`),
  );

  if (!match) {
    throw new Error(`Missing SQL fixture: ${variableName}`);
  }

  return match[1].replace(/''/g, "'");
}

function normalizeLikeSql(expression) {
  return expression.toLowerCase().replace(/\s+/g, "").replace(/::text/g, "");
}

describe("hero_build_sets admin RLS SQL assertion", () => {
  it("normalizes actual and expected expressions through one semantic-safe pipeline", () => {
    const sql = fs.readFileSync(ASSERTION_PATH, "utf8");

    expect(sql).toContain(
      "pg_temp.normalize_policy_expression(admin_expected_expression)",
    );
    expect(sql).toContain("auth.jwt() -> 'app_metadata' ->> 'role'");
    expect(sql).toContain("admin positive fixture does not match expected");
    expect(sql).toContain("admin negative fixture accepts a permissive clause");
    expect(sql).not.toMatch(/regexp_replace\([\s\S]*?'\[\(\)\]'/);
    expect(sql).not.toMatch(/\b(?:not\s+)?like\b/i);

    const expected = readSqlLiteral(sql, "admin_expected_expression");
    const positive = readSqlLiteral(sql, "admin_positive_fixture");
    const negative = readSqlLiteral(sql, "admin_negative_fixture");

    expect(normalizeLikeSql(positive)).toBe(normalizeLikeSql(expected));
    expect(normalizeLikeSql(negative)).not.toBe(normalizeLikeSql(expected));
    expect(normalizeLikeSql(positive)).toContain("auth.jwt()");
    expect(normalizeLikeSql(negative)).toContain("ortrue");
  });
});
