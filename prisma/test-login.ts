import { db } from "../src/lib/db";
import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import crypto from "crypto";

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

async function main() {
  console.log("--- Extended Client Read ---");
  const membersExt = await db.member.findMany();
  for (const m of membersExt) {
    console.log(`ID: ${m.id}, Surname: ${m.surname}, Email: ${m.email}`);
    console.log(`  Decrypted Password Hash:  ${m.password}`);
    console.log(`  Does it match 'admin'?     ${m.password === hashPassword("admin")}`);
    console.log(`  Does it match 'mhall6969'? ${m.password === hashPassword("mhall6969")}`);
  }

  console.log("\n--- Raw (Unextended) Client Read ---");
  const url = process.env.DATABASE_URL || "file:dev.db";
  const adapter = new PrismaLibSql({ url });
  const rawClient = new PrismaClient({ adapter });
  const membersRaw = await rawClient.member.findMany();
  for (const m of membersRaw) {
    console.log(`ID: ${m.id}, Surname: ${m.surname}`);
    console.log(`  Raw Stored Password:      ${m.password}`);
  }
  await rawClient.$disconnect();
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
