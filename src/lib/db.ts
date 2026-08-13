import "dotenv/config";
import { PrismaClient, Prisma } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { fieldEncryptionExtension } from "prisma-field-encryption";
import crypto from "crypto";

const rawKey = "TOPAZ-5250-BMW-VASELINE";
const derivedKey = `k1.aesgcm256.${crypto.createHash("sha256").update(rawKey).digest("base64url")}`;

const globalForPrisma = globalThis as unknown as {
  prisma: any;
};

function buildCompatibleDmmf(originalDmmf: any) {
  const dmmf = JSON.parse(JSON.stringify(originalDmmf));
  const encryptedFields: Record<string, string[]> = {
    Member: ["password"],
    LeaveRequest: ["reason"],
    SecurityIp: ["reason"],
    SecurityRule: ["value"],
  };
  const uniqueFields: Record<string, string[]> = {
    Member: ["email"],
    SecurityIp: ["ip"],
    TermYear: ["year"],
  };
  for (const model of dmmf.datamodel.models) {
    for (const field of model.fields) {
      field.isList = field.isList ?? false;
      field.isId = field.isId ?? (field.name === "id");
      field.isUnique = field.isUnique ?? ((uniqueFields[model.name] || []).includes(field.name));
      if ((encryptedFields[model.name] || []).includes(field.name)) {
        field.documentation = "@encrypted";
      }
    }
  }
  return dmmf;
}

function createPrismaClient() {
  const url = process.env.DATABASE_URL || "file:dev.db";
  const adapter = new PrismaLibSql({ url });
  const client = new PrismaClient({ adapter });
  const compatibleDmmf = buildCompatibleDmmf(Prisma.dmmf);
  return client.$extends(
    fieldEncryptionExtension({
      encryptionKey: derivedKey,
      dmmf: compatibleDmmf,
    })
  ) as unknown as PrismaClient;
}

export const db: PrismaClient = (() => {
  if (globalForPrisma.prisma && "termYear" in globalForPrisma.prisma) {
    return globalForPrisma.prisma;
  }
  const client = createPrismaClient();
  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = client;
  }
  return client;
})();