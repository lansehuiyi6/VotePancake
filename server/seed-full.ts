import { db } from "./db";
import { users, systemParams, proposals, votes, partnerSupports } from "@shared/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";

async function seedFull() {
  console.log("🌱 Starting comprehensive database seeding...");

  console.log("\n📊 Creating system parameters...");
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
      console.log(`  ✓ Created parameter: ${param.key}`);
    } else {
      console.log(`  - Parameter exists: ${param.key}`);
    }
  }

  console.log("\n👥 Creating users...");
  const hashedPassword = await bcrypt.hash("password123", 10);

  const usernames = [
    { username: "admin", role: "admin", xpBalance: "10000000", wanBalance: "1000000" },
    { username: "alice", role: "voter", xpBalance: "500000", wanBalance: "50000" },
    { username: "bob", role: "partner", xpBalance: "1000000", wanBalance: "100000" },
    { username: "charlie", role: "voter", xpBalance: "300000", wanBalance: "30000" },
    { username: "david", role: "partner", xpBalance: "800000", wanBalance: "80000" },
    { username: "eve", role: "voter", xpBalance: "400000", wanBalance: "40000" },
  ];

  const createdUsers: any[] = [];
  for (const userData of usernames) {
    const existing = await db.select().from(users).where(eq(users.username, userData.username));
    if (existing.length === 0) {
      const [user] = await db.insert(users).values({
        ...userData,
        password: hashedPassword,
      }).returning();
      createdUsers.push(user);
      console.log(`  ✓ Created user: ${userData.username} (${userData.role})`);
    } else {
      createdUsers.push(existing[0]);
      console.log(`  - User exists: ${userData.username}`);
    }
  }

  const [admin, alice, bob, charlie, david, eve] = createdUsers;

  console.log("\n📝 Creating proposals with various statuses...");

  const now = new Date();
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [passedFunding] = await db.insert(proposals).values({
    title: "WAN Ecosystem Developer Fund",
    description: "Establish a developer fund to attract and retain talented developers building on WAN. This fund will provide grants for innovative projects, hackathon prizes, and developer education programs.",
    type: "funding",
    status: "passed",
    creatorId: alice.id,
    fundingAmount: "50000",
    fundingRequested: "50000",
    stakeAmount: "1000",
    stakeType: "lock",
    xpBurned: "110000",
    publicizedAt: fourteenDaysAgo,
    fundingDeadline: sevenDaysAgo,
    votingStartsAt: sevenDaysAgo,
    votingEndsAt: threeDaysAgo,
    votesFor: "150000",
    votesAgainst: "30000",
  }).returning();
  console.log("  ✓ Created PASSED funding proposal");

  await db.insert(partnerSupports).values([
    {
      proposalId: passedFunding.id,
      partnerId: bob.id,
      wanAmount: "2000",
      actionType: "lock",
      processed: true,
    },
    {
      proposalId: passedFunding.id,
      partnerId: david.id,
      wanAmount: "1500",
      actionType: "burn",
      processed: true,
    },
  ]);

  await db.insert(votes).values([
    {
      proposalId: passedFunding.id,
      voterId: charlie.id,
      support: true,
      wanAmount: "5000",
      lockType: "6_months",
      votingPower: "25000",
      processed: true,
    },
    {
      proposalId: passedFunding.id,
      voterId: eve.id,
      support: true,
      wanAmount: "10000",
      lockType: "12_months",
      votingPower: "100000",
      processed: true,
    },
    {
      proposalId: passedFunding.id,
      voterId: admin.id,
      support: false,
      wanAmount: "3000",
      lockType: "until_end",
      votingPower: "3000",
      processed: true,
    },
  ]);

  const [failedFunding] = await db.insert(proposals).values({
    title: "High-Risk Experimental DeFi Protocol",
    description: "Funding for an experimental DeFi protocol with untested mechanisms. While innovative, the proposal lacks detailed risk analysis and audit plans.",
    type: "funding",
    status: "failed",
    creatorId: charlie.id,
    fundingAmount: "100000",
    fundingRequested: "100000",
    stakeAmount: "500",
    stakeType: "burn",
    xpBurned: "110000",
    publicizedAt: fourteenDaysAgo,
    fundingDeadline: sevenDaysAgo,
    votingStartsAt: sevenDaysAgo,
    votingEndsAt: threeDaysAgo,
    votesFor: "40000",
    votesAgainst: "180000",
  }).returning();
  console.log("  ✓ Created FAILED funding proposal");

  await db.insert(votes).values([
    {
      proposalId: failedFunding.id,
      voterId: alice.id,
      support: false,
      wanAmount: "8000",
      lockType: "6_months",
      votingPower: "40000",
      processed: true,
    },
    {
      proposalId: failedFunding.id,
      voterId: eve.id,
      support: false,
      wanAmount: "10000",
      lockType: "12_months",
      votingPower: "100000",
      processed: true,
    },
  ]);

  const [passedParameter] = await db.insert(proposals).values({
    title: "Increase Voting Period to 21 Days",
    description: "Extend the voting period from 14 to 21 days to give community members more time to review complex proposals and participate in governance decisions.",
    type: "parameter",
    status: "passed",
    creatorId: eve.id,
    stakeAmount: "800",
    stakeType: "lock",
    xpBurned: "110000",
    publicizedAt: fourteenDaysAgo,
    votingStartsAt: sevenDaysAgo,
    votingEndsAt: threeDaysAgo,
    votesFor: "200000",
    votesAgainst: "50000",
  }).returning();
  console.log("  ✓ Created PASSED parameter proposal");

  await db.insert(votes).values([
    {
      proposalId: passedParameter.id,
      voterId: alice.id,
      support: true,
      wanAmount: "10000",
      lockType: "12_months",
      votingPower: "100000",
      processed: true,
    },
    {
      proposalId: passedParameter.id,
      voterId: charlie.id,
      support: true,
      wanAmount: "8000",
      lockType: "12_months",
      votingPower: "80000",
      processed: true,
    },
    {
      proposalId: passedParameter.id,
      voterId: bob.id,
      support: false,
      wanAmount: "5000",
      lockType: "until_end",
      votingPower: "5000",
      processed: true,
    },
  ]);

  const [failedParameter] = await db.insert(proposals).values({
    title: "Reduce XP Burn Cost to 50,000",
    description: "Lower the XP requirement for creating proposals from 110,000 to 50,000. This change would make it easier to submit proposals but may increase spam.",
    type: "parameter",
    status: "failed",
    creatorId: charlie.id,
    stakeAmount: "300",
    stakeType: "lock",
    xpBurned: "110000",
    publicizedAt: fourteenDaysAgo,
    votingStartsAt: sevenDaysAgo,
    votingEndsAt: threeDaysAgo,
    votesFor: "60000",
    votesAgainst: "150000",
  }).returning();
  console.log("  ✓ Created FAILED parameter proposal");

  await db.insert(votes).values([
    {
      proposalId: failedParameter.id,
      voterId: alice.id,
      support: false,
      wanAmount: "10000",
      lockType: "12_months",
      votingPower: "100000",
      processed: true,
    },
    {
      proposalId: failedParameter.id,
      voterId: eve.id,
      support: false,
      wanAmount: "5000",
      lockType: "until_end",
      votingPower: "5000",
      processed: true,
    },
  ]);

  const [pendingProposal] = await db.insert(proposals).values({
    title: "WAN Community Events Sponsorship",
    description: "Request funding to sponsor WAN community events worldwide, including meetups, conferences, and educational workshops.",
    type: "funding",
    status: "pending",
    creatorId: bob.id,
    fundingAmount: "30000",
    fundingRequested: "30000",
    stakeAmount: "800",
    stakeType: "lock",
    xpBurned: "110000",
  }).returning();
  console.log("  ✓ Created PENDING funding proposal");

  const [publicizedProposal] = await db.insert(proposals).values({
    title: "Cross-Chain Bridge Infrastructure",
    description: "Build a secure cross-chain bridge to connect WAN with other major blockchain networks, enhancing interoperability and expanding the ecosystem.",
    type: "funding",
    status: "publicized",
    creatorId: david.id,
    fundingAmount: "80000",
    fundingRequested: "80000",
    stakeAmount: "1500",
    stakeType: "burn",
    xpBurned: "110000",
    publicizedAt: threeDaysAgo,
    fundingDeadline: sevenDaysLater,
  }).returning();
  console.log("  ✓ Created PUBLICIZED funding proposal (needs partner support)");

  await db.insert(partnerSupports).values({
    proposalId: publicizedProposal.id,
    partnerId: bob.id,
    wanAmount: "800",
    actionType: "lock",
    processed: false,
  });

  const [votingProposal] = await db.insert(proposals).values({
    title: "DAO Treasury Management Strategy",
    description: "Implement a diversified treasury management strategy to ensure long-term sustainability of the DAO and protect against market volatility.",
    type: "parameter",
    status: "voting",
    creatorId: alice.id,
    stakeAmount: "1000",
    stakeType: "lock",
    xpBurned: "110000",
    publicizedAt: sevenDaysAgo,
    votingStartsAt: threeDaysAgo,
    votingEndsAt: sevenDaysLater,
    votesFor: "80000",
    votesAgainst: "20000",
  }).returning();
  console.log("  ✓ Created VOTING parameter proposal (active voting)");

  await db.insert(votes).values([
    {
      proposalId: votingProposal.id,
      voterId: charlie.id,
      support: true,
      wanAmount: "8000",
      lockType: "until_end",
      votingPower: "8000",
      processed: false,
    },
    {
      proposalId: votingProposal.id,
      voterId: eve.id,
      support: false,
      wanAmount: "2000",
      lockType: "until_end",
      votingPower: "2000",
      processed: false,
    },
  ]);

  console.log("\n✅ Comprehensive seeding completed successfully!");
  console.log("\n📋 Summary:");
  console.log(`  - ${createdUsers.length} users created`);
  console.log(`  - 7 proposals created:`);
  console.log(`    • 1 PENDING funding proposal`);
  console.log(`    • 1 PUBLICIZED funding proposal`);
  console.log(`    • 1 VOTING parameter proposal`);
  console.log(`    • 1 PASSED funding proposal`);
  console.log(`    • 1 FAILED funding proposal`);
  console.log(`    • 1 PASSED parameter proposal`);
  console.log(`    • 1 FAILED parameter proposal`);
  console.log(`\n🔑 Login credentials:`);
  console.log(`  admin/password123, alice/password123, bob/password123`);
  console.log(`  charlie/password123, david/password123, eve/password123`);

  process.exit(0);
}

seedFull().catch((error) => {
  console.error("❌ Seeding failed:", error);
  process.exit(1);
});
