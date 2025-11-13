import { db } from "./db";
import { users, systemParams } from "@shared/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";

async function seed() {
  console.log("Seeding database...");

  const existingAdmin = await db.select().from(users).where(eq(users.username, "admin"));
  if (existingAdmin.length === 0) {
    const hashedPassword = await bcrypt.hash("admin123", 10);
    await db.insert(users).values({
      username: "admin",
      password: hashedPassword,
      role: "admin",
      xpBalance: "10000000",
      wanBalance: "1000000",
    });
    console.log("Created admin user (username: admin, password: admin123)");
  }

  const params = [
    { key: "xpBurnCost", value: "110000", description: "XP required to create a proposal" },
    { key: "lockMultiplier", value: "10", description: "Funding multiplier for locked WAN" },
    { key: "burnMultiplier", value: "50", description: "Funding multiplier for burned WAN" },
    { key: "votingDuration", value: "14", description: "Voting period duration in days" },
    { key: "lockDuration", value: "12", description: "Lock duration for passed proposals in months" },
  ];

  for (const param of params) {
    const existing = await db.select().from(systemParams).where(eq(systemParams.key, param.key));
    if (existing.length === 0) {
      await db.insert(systemParams).values(param);
      console.log(`Created system parameter: ${param.key}`);
    }
  }

  console.log("Database seeding completed!");
}

seed().catch(console.error);
