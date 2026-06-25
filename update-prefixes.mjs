import pg from "postgres";

const sql = pg("postgres://paperclip:paperclip@127.0.0.1:54329/paperclip");

// Move archived companies' prefixes out of the way
await sql`UPDATE companies SET issue_prefix = 'MAC-OLD' WHERE issue_prefix = 'MAC' AND status = 'archived'`;
await sql`UPDATE companies SET issue_prefix = 'STE-OLD' WHERE issue_prefix = 'STE' AND status = 'archived'`;

// Set new prefixes on active companies
const r1 = await sql`UPDATE companies SET issue_prefix = 'MAC' WHERE issue_prefix = 'MACA' RETURNING id, issue_prefix, name`;
const r2 = await sql`UPDATE companies SET issue_prefix = 'S8N' WHERE issue_prefix = 'STEA' RETURNING id, issue_prefix, name`;

console.log("Mace:", JSON.stringify(r1[0]));
console.log("S8N:", JSON.stringify(r2[0]));

// Verify
const all = await sql`SELECT id, issue_prefix, name, status FROM companies ORDER BY status, name`;
for (const c of all) {
  console.log(`  ${c.issue_prefix} | ${c.name} | ${c.status}`);
}

await sql.end();
