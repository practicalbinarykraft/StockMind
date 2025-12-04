import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function main() {
  // Check auto_scripts
  const scripts = await db.execute(sql`
    SELECT id, title, status, gate_decision, final_score, created_at
    FROM auto_scripts
    ORDER BY created_at DESC
    LIMIT 10
  `);

  console.log("=== Auto Scripts ===\n");
  console.log(`Found ${scripts.rows?.length || 0} scripts:\n`);

  for (const s of scripts.rows || []) {
    console.log(`[${s.status}] ${s.gate_decision} score=${s.final_score}`);
    console.log(`  "${String(s.title).substring(0, 50)}..."`);
  }

  // Check conveyor settings
  const settings = await db.execute(sql`
    SELECT items_processed_today, daily_limit,
           (SELECT COUNT(*) FROM conveyor_items WHERE status = 'completed') as total_completed,
           (SELECT COUNT(*) FROM conveyor_items WHERE status = 'failed') as total_failed
    FROM conveyor_settings
    LIMIT 1
  `);

  console.log("\n=== Settings ===");
  for (const s of settings.rows || []) {
    console.log(`Today: ${s.items_processed_today}/${s.daily_limit}`);
    console.log(`Completed: ${s.total_completed}, Failed: ${s.total_failed}`);
  }

  process.exit(0);
}

main().catch(console.error);
