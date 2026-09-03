const fs = require("node:fs");
const path = require("node:path");

const MIGRATION_PATH = path.resolve(
  __dirname,
  "../../../../../supabase/migrations/20260813180000_add_atomic_bootstrap_manifest_rpc.sql",
);
const CREATE_TABLE_MIGRATION_PATH = path.resolve(
  __dirname,
  "../../../../../supabase/migrations/20260702170000_create_hero_build_sets.sql",
);
const PUBLIC_READ_GRANT_MIGRATION_PATH = path.resolve(
  __dirname,
  "../../../../../supabase/migrations/20260813190000_grant_hero_build_sets_read.sql",
);
const LIFECYCLE_MIGRATION_PATH = path.resolve(
  __dirname,
  "../../../../../supabase/migrations/20260812231000_enforce_hero_build_set_lifecycle.sql",
);

function readMigration() {
  expect(fs.existsSync(MIGRATION_PATH)).toBe(true);
  return fs.readFileSync(MIGRATION_PATH, "utf8");
}

function readFunction(sql) {
  const match = sql.match(
    /create\s+or\s+replace\s+function\s+public\.get_published_hero_builds_bootstrap_manifest\(\)[\s\S]*?\n\$\$;/i,
  );
  if (!match) {
    throw new Error("Missing atomic bootstrap manifest RPC.");
  }
  return match[0];
}

describe("atomic bootstrap manifest migration", () => {
  test("computes the complete ordered published digest in one SQL statement", () => {
    const definition = readFunction(readMigration());
    const body = definition.match(/\$\$([\s\S]*?)\$\$;/)?.[1] ?? "";

    expect(definition).toMatch(
      /returns\s+table\s*\(\s*published_count\s+bigint\s*,\s*version\s+text\s*,\s*etag\s+text\s*,\s*content_updated_at\s+text\s*\)/i,
    );
    expect(definition).toMatch(/language\s+sql/i);
    expect(definition).toMatch(/stable/i);
    expect(definition).toMatch(/security\s+invoker/i);
    expect(definition).not.toMatch(/security\s+definer/i);
    expect(definition).toMatch(/set\s+search_path\s*=\s*''/i);
    expect(body.match(/;/g)).toHaveLength(1);
    expect(body).toMatch(/from\s+public\.hero_build_sets/i);
    expect(body).toMatch(/where\s+status\s*=\s*'published'/i);
    expect(body).toMatch(/count\(\*\)::bigint\s+as\s+published_count/i);
    expect(body).toMatch(/jsonb_agg\([\s\S]*?order\s+by\s+hero_id/i);
    expect(body).toMatch(/hero_id[\s\S]*?revision[\s\S]*?updated_at/i);
    expect(body).toMatch(/max\(updated_at\)/i);
    expect(body).toMatch(/extensions\.digest\([\s\S]*?'sha256'/i);
    expect(body).toMatch(/coalesce\([\s\S]*?'\[\]'::jsonb/i);
    expect(body).toMatch(
      /'hero-builds:'\s*\|\|\s*left\(content_hash,\s*16\)\s+as\s+version/i,
    );
    expect(body).toMatch(
      /'sha256:'\s*\|\|\s*content_hash\s+as\s+etag/i,
    );
    expect(body).not.toMatch(/\bpayload\b/i);
    expect(body).not.toMatch(/hero_build_set_revisions/i);
  });

  test("exposes only the narrow RLS-preserving RPC to runtime roles", () => {
    const sql = readMigration();

    expect(sql).toMatch(/create\s+extension\s+if\s+not\s+exists\s+pgcrypto\s+with\s+schema\s+extensions/i);
    expect(sql).toMatch(
      /revoke\s+all\s+on\s+function\s+public\.get_published_hero_builds_bootstrap_manifest\(\)\s+from\s+public/i,
    );
    expect(sql).toMatch(
      /grant\s+execute\s+on\s+function\s+public\.get_published_hero_builds_bootstrap_manifest\(\)\s+to\s+anon\s*,\s*authenticated/i,
    );
    expect(sql).not.toMatch(/grant\s+execute[\s\S]*?service_role/i);
    expect(sql).not.toMatch(/row_security\s*=\s*off/i);
  });

  test("fresh migrations grant public reads while RLS keeps drafts and writes closed", () => {
    expect(fs.existsSync(PUBLIC_READ_GRANT_MIGRATION_PATH)).toBe(true);
    const tableSql = fs.readFileSync(CREATE_TABLE_MIGRATION_PATH, "utf8");
    const grantSql = fs.readFileSync(PUBLIC_READ_GRANT_MIGRATION_PATH, "utf8");
    const lifecycleSql = fs.readFileSync(LIFECYCLE_MIGRATION_PATH, "utf8");

    expect(tableSql).toMatch(
      /alter\s+table\s+public\.hero_build_sets\s+enable\s+row\s+level\s+security/i,
    );
    expect(tableSql).toMatch(
      /create\s+policy\s+"Anyone can read published hero build sets"[\s\S]*?for\s+select[\s\S]*?using\s*\(status\s*=\s*'published'\)/i,
    );
    expect(grantSql).toMatch(
      /grant\s+select\s+on\s+table\s+public\.hero_build_sets\s+to\s+anon\s*,\s*authenticated\s*;/i,
    );
    expect(grantSql).not.toMatch(/grant\s+(?:insert|update|delete|all)\b/i);
    expect(grantSql).not.toMatch(/disable\s+row\s+level\s+security/i);
    expect(lifecycleSql).toMatch(
      /revoke\s+insert\s*,\s*update\s*,\s*delete\s+on\s+public\.hero_build_sets\s+from\s+anon\s*,\s*authenticated/i,
    );
  });
});
