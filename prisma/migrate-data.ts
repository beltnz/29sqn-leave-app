import { db } from "../src/lib/db";
import { migrate } from "./field-encryption-migrations";

async function main() {
  console.log("Starting field encryption migration on existing database records...");
  
  // Since db is the extended Prisma client, we pass it directly (casting to any).
  // This will read the plaintext records and rewrite them encrypted.
  const report = await migrate(db as any);
  
  console.log("Migration report of encrypted records:");
  console.log(JSON.stringify(report, null, 2));
  console.log("Field encryption migration completed successfully!");
}

main()
  .catch((e) => {
    console.error("Error migrating data:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
