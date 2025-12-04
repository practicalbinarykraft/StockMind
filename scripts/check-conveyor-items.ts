import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function main() {
  const items = await db.execute(sql`
    SELECT
      id,
      status,
      current_stage,
      gate_data,
      qc_data,
      error_message,
      started_at
    FROM conveyor_items
    ORDER BY started_at DESC
    LIMIT 10
  `);

  console.log("=== Conveyor Items ===\n");
  console.log(`Found ${items.rows?.length || 0} items:\n`);

  for (const item of items.rows || []) {
    const gateData = item.gate_data as any;
    const qcData = item.qc_data as any;

    console.log(`[${item.status}] Stage: ${item.current_stage}/9`);
    console.log(`  ID: ${item.id}`);

    if (gateData) {
      console.log(`  Gate: ${gateData.decision} (score: ${gateData.finalScore}, confidence: ${gateData.confidence})`);
      console.log(`  Reason: ${gateData.reason}`);
    }

    if (qcData) {
      console.log(`  QC Score: ${qcData.overallScore}, Hook: ${qcData.hookScore}`);
      if (qcData.weakSpots?.length > 0) {
        const critical = qcData.weakSpots.filter((w: any) => w.severity === 'critical');
        const major = qcData.weakSpots.filter((w: any) => w.severity === 'major');
        console.log(`  Weak spots: ${critical.length} critical, ${major.length} major`);
      }
    }

    if (item.error_message) {
      console.log(`  Error: ${item.error_message}`);
    }

    console.log("");
  }

  process.exit(0);
}

main().catch(console.error);
