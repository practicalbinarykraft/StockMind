import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function main() {
  // Check auto_scripts with user info
  const scripts = await db.execute(sql`
    SELECT
      a.id,
      a.title,
      a.status,
      a.gate_decision,
      a.user_id,
      u.email as user_email
    FROM auto_scripts a
    LEFT JOIN users u ON a.user_id = u.id
    ORDER BY a.created_at DESC
    LIMIT 10
  `);

  console.log("=== Auto Scripts with Users ===\n");
  for (const s of scripts.rows || []) {
    console.log(`[${s.status}] ${s.gate_decision}`);
    console.log(`  User ID: ${s.user_id}`);
    console.log(`  User Email: ${s.user_email}`);
    console.log(`  Title: ${String(s.title).substring(0, 50)}...`);
    console.log("");
  }

  // Also check conveyor settings to see which user_ids exist
  const settings = await db.execute(sql`
    SELECT
      cs.user_id,
      u.email as user_email,
      cs.enabled
    FROM conveyor_settings cs
    LEFT JOIN users u ON cs.user_id = u.id
  `);

  console.log("=== Conveyor Settings Users ===\n");
  for (const s of settings.rows || []) {
    console.log(`User ID: ${s.user_id}`);
    console.log(`  Email: ${s.user_email}`);
    console.log(`  Enabled: ${s.enabled}`);
    console.log("");
  }

  process.exit(0);
}

main().catch(console.error);
