// Creates the first admin account. Usage:
//   npm run seed -- "Name" email@ucla.edu password123
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const [name, email, password] = process.argv.slice(2);

if (!name || !email || !password) {
  console.error('Usage: npm run seed -- "Full Name" email@ucla.edu password');
  process.exit(1);
}
if (password.length < 8) {
  console.error("Password must be at least 8 characters.");
  process.exit(1);
}

const lower = email.toLowerCase().trim();
const passwordHash = await bcrypt.hash(password, 10);

const grader = await prisma.grader.upsert({
  where: { email: lower },
  create: { email: lower, name, passwordHash, isAdmin: true },
  update: { name, passwordHash, isAdmin: true },
});

console.log(`Admin ready: ${grader.name} <${grader.email}>`);
await prisma.$disconnect();
