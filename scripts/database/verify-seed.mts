import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import postgres from "postgres";

const url = process.env.TEST_DATABASE_URL;
if (!url) throw new Error("Set TEST_DATABASE_URL to a disposable migrated database.");
const client = postgres(url, { max: 1, prepare: false });
try {
  const seed = await readFile("supabase/seed.sql", "utf8");
  for (let attempt = 0; attempt < 2; attempt++) {
    await client.unsafe(seed);
    const [result] = await client`
      select count(*)::integer as count,
        count(*) filter (where section_key is null or trim(section_key) = '')::integer as invalid
      from public.inspection_template_items
      where template_id in (
        select id from public.inspection_templates where name = 'Standard Pre-Sale Inspection'
      )
    `;
    assert.equal(result.count, 12);
    assert.equal(result.invalid, 0);
  }
  console.log("Seed succeeds repeatedly with 12 inspection items and valid section keys.");
} finally {
  await client.end();
}
