import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function main() {
  // Check RSS sources
  const sources = await db.execute(sql`
    SELECT id, name, url, created_at
    FROM rss_sources
    ORDER BY created_at
  `);

  console.log("=== RSS Sources ===\n");
  console.log(`Found ${sources.rows?.length || 0} sources:\n`);

  for (const s of sources.rows || []) {
    console.log(`ID: ${s.id}`);
    console.log(`  Name: ${s.name}`);
    console.log(`  URL: ${s.url}`);
    console.log(`  Created: ${s.created_at}`);
    console.log("");
  }

  // Check for duplicate URLs
  const duplicates = await db.execute(sql`
    SELECT url, COUNT(*) as count
    FROM rss_sources
    GROUP BY url
    HAVING COUNT(*) > 1
  `);

  if (duplicates.rows && duplicates.rows.length > 0) {
    console.log("=== DUPLICATE URLs FOUND ===\n");
    for (const d of duplicates.rows) {
      console.log(`URL: ${d.url} (${d.count} times)`);
    }
  } else {
    console.log("No duplicate URLs found.");
  }

  process.exit(0);
}

main().catch(console.error);
