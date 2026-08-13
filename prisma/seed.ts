import { db } from "../src/lib/db";
import { APP_STATUS, isDbResetAllowed } from "../src/lib/config";
import crypto from "crypto";

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

async function main() {
  console.log(`[Seed Guard] Current APP_STATUS: '${APP_STATUS}'`);

  // Enforce DB reset safeguard rule
  if (!isDbResetAllowed()) {
    console.error(
      `[SECURITY BLOCK] Database seed/reset operation aborted. APP_STATUS is set to '${APP_STATUS}' (must be 'DEVELOPING' to allow DB changes/resets).`
    );
    process.exit(1);
  }

  console.log("Seeding database (retaining existing data where possible)...");

  // 1. Primary Admin & Adjutant: FLTLT Belt
  const adminBelt = await db.member.upsert({
    where: { email: "peter.belt@cadetforces.org.nz" },
    update: {
      rank: "FLTLT",
      surname: "Belt",
      password: hashPassword("29sqn1941"),
      isAdjutant: true,
      isManager: true,
      isAdmin: true,
    },
    create: {
      rank: "FLTLT",
      surname: "Belt",
      email: "peter.belt@cadetforces.org.nz",
      password: hashPassword("29sqn1941"),
      isAdjutant: true,
      isManager: true,
      isAdmin: true,
    },
  });

  // 2. Secondary Admin & Adjutant: Wg Cdr Vance
  const adminVance = await db.member.upsert({
    where: { email: "admin@29sqn.mod.uk" },
    update: {
      rank: "SQNLDR",
      surname: "Vance",
      password: hashPassword("29sqn1941"),
      isAdjutant: true,
      isManager: true,
      isAdmin: true,
    },
    create: {
      rank: "SQNLDR",
      surname: "Vance",
      email: "admin@29sqn.mod.uk",
      password: hashPassword("29sqn1941"),
      isAdjutant: true,
      isManager: true,
      isAdmin: true,
    },
  });

  // 3. Adjutant user: Sqn Ldr Taylor
  const adjutantTaylor = await db.member.upsert({
    where: { email: "adjutant@29sqn.mod.uk" },
    update: {
      rank: "SQNLDR",
      surname: "Taylor",
      password: hashPassword("29sqn1941"),
      isAdjutant: true,
      isManager: true,
      isAdmin: false,
    },
    create: {
      rank: "SQNLDR",
      surname: "Taylor",
      email: "adjutant@29sqn.mod.uk",
      password: hashPassword("29sqn1941"),
      isAdjutant: true,
      isManager: true,
      isAdmin: false,
    },
  });

  console.log(
    `Ensured default admins & adjutants: ${adminBelt.surname} (${adminBelt.email}), ${adminVance.surname}, ${adjutantTaylor.surname}`
  );

  // Auto-whitelist admin IPs
  await db.securityIp.upsert({
    where: { ip: "127.0.0.1" },
    update: {
      type: "WHITELIST",
      source: "AUTO_ADMIN",
    },
    create: {
      ip: "127.0.0.1",
      type: "WHITELIST",
      source: "AUTO_ADMIN",
      reason: "Auto-whitelisted local admin IP",
    },
  });

  // Sample Leave Requests (only create if table is empty to retain existing user submissions)
  const existingRequestsCount = await db.leaveRequest.count();
  if (existingRequestsCount === 0) {
    await db.leaveRequest.create({
      data: {
        rank: "CDT",
        surname: "Miller",
        startDate: new Date("2026-09-01T00:00:00Z"),
        endDate: new Date("2026-09-05T00:00:00Z"),
        reason: "Annual Summer Camp Leave",
        status: "PENDING",
      },
    });

    await db.leaveRequest.create({
      data: {
        rank: "CDTSGT",
        surname: "Davis",
        startDate: new Date("2026-07-10T00:00:00Z"),
        endDate: new Date("2026-07-14T00:00:00Z"),
        reason: "School Exam Preparation",
        status: "APPROVED",
      },
    });
    console.log("Seeded initial test leave requests.");
  } else {
    console.log(`Retained ${existingRequestsCount} existing leave requests.`);
  }

  console.log("Database seed completed successfully.");
}

main()
  .catch((e) => {
    console.error("Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
