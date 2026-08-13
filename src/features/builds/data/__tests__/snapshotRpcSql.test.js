const fs = require("node:fs");
const path = require("node:path");

test("full snapshot RPC is bounded, published-only, and preserves anon RLS", () => {
  const source = fs.readFileSync(path.join(process.cwd(), "supabase/migrations/20260813200000_add_published_hero_builds_snapshot_rpc.sql"), "utf8");
  expect(source).toMatch(/security\s+invoker/i);
  expect(source).not.toMatch(/security\s+definer|row_security\s*=\s*off/i);
  expect(source.match(/where\s+status\s*=\s*'published'/gi)?.length).toBeGreaterThanOrEqual(3);
  expect(source).toMatch(/row_count\s*>\s*1000[\s\S]*raise\s+exception/i);
  expect(source).toMatch(/octet_length\(resource_text\)\s*>\s*3670016/i);
  expect(source).toMatch(/resource_checksum[\s\S]*digest\(convert_to\(resource_text,\s*'UTF8'\),\s*'sha256'\)/i);
  expect(source).toMatch(/hero_builds_text\s*:=\s*resource_text/i);
  expect(source).toMatch(/jsonb_agg\([\s\S]*order\s+by\s+hero_id/i);
  expect(source).toMatch(/revoke\s+all[\s\S]*from\s+public/i);
  expect(source).toMatch(/grant\s+execute[\s\S]*to\s+anon\s*,\s*authenticated/i);
  expect(source).not.toMatch(/service_role/i);
});
