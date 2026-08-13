import { db } from "../src/lib/db";
import { verifyPassword, hashPassword } from "../src/lib/auth";

async function main() {
  const surname = "belt";
  const members = await db.member.findMany({ where: { isAdmin: true } });
  console.log("Admins in DB:", members.map(m => m.surname));
  
  const member = members.find((m) => m.surname.toLowerCase() === surname.toLowerCase());
  console.log("Found member:", member ? `${member.rank} ${member.surname}` : "None");
  
  if (member) {
    console.log("Stored encrypted/decrypted password in DB:", member.password);
    console.log("Hash of 'admin':   ", hashPassword("admin"));
    console.log("Hash of 'mhall6969':", hashPassword("mhall6969"));
    console.log("verifyPassword('admin'):   ", verifyPassword("admin", member.password));
    console.log("verifyPassword('mhall6969'):", verifyPassword("mhall6969", member.password));
  }
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
