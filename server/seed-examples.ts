import bcrypt from "bcrypt";
import { db } from "./db";
import { users, proposals, votes, partnerSupports } from "@shared/schema";
import { eq } from "drizzle-orm";

async function seedExamples() {
  try {
    console.log("开始创建示例数据...");

    // 创建测试用户
    const hashedPassword = await bcrypt.hash("test123", 10);
    
    // 检查并创建测试用户
    let testUsers: any[] = [];
    const usernames = ["alice", "bob", "charlie", "david", "eve"];
    
    for (const username of usernames) {
      const existing = await db
        .select()
        .from(users)
        .where(eq(users.username, username));
      
      if (existing.length === 0) {
        const [user] = await db
          .insert(users)
          .values({
            username,
            password: hashedPassword,
            role: username === "alice" || username === "bob" ? "partner" : "voter",
            xpBalance: "10000",
            wanBalance: "50000",
          })
          .returning();
        testUsers.push(user);
        console.log(`✓ 创建用户: ${username}`);
      } else {
        testUsers.push(existing[0]);
        console.log(`→ 用户已存在: ${username}`);
      }
    }

    // 获取所有测试用户
    const allTestUsers = await db
      .select()
      .from(users)
      .where(eq(users.username, usernames[0]))
      .then(() => 
        db.select().from(users)
      );

    const alice = allTestUsers.find(u => u.username === "alice")!;
    const bob = allTestUsers.find(u => u.username === "bob")!;
    const charlie = allTestUsers.find(u => u.username === "charlie")!;
    const david = allTestUsers.find(u => u.username === "david")!;
    const eve = allTestUsers.find(u => u.username === "eve")!;

    console.log("\n创建示例提案...");

    // 1. Passed Funding Proposal
    const passedFundingDate = new Date();
    passedFundingDate.setDate(passedFundingDate.getDate() - 10); // 10天前创建
    const passedFundingVotingEnd = new Date(passedFundingDate);
    passedFundingVotingEnd.setDate(passedFundingVotingEnd.getDate() + 7); // 投票持续7天
    passedFundingVotingEnd.setHours(passedFundingVotingEnd.getHours() - 1); // 已结束

    const [passedFunding] = await db
      .insert(proposals)
      .values({
        title: "Community Education Program",
        description: "A comprehensive educational initiative to onboard new users to WAN ecosystem.\n\nThis program will include:\n- Online video tutorials\n- Interactive workshops\n- Documentation in multiple languages\n- Community support channels",
        type: "funding",
        status: "passed",
        creatorId: alice.id,
        fundingRequested: "50000",
        fundingAmount: "15000", // 真实获得的资金
        stakeAmount: "500",
        stakeType: "lock",
        publicizedAt: passedFundingDate,
        votingStartsAt: passedFundingDate,
        votingEndsAt: passedFundingVotingEnd,
        votesFor: "8500",
        votesAgainst: "1200",
        resolution: "vote_passed",
        resolvedAt: passedFundingVotingEnd,
        contactEmail: "alice@example.com",
        contactTelegram: "@alice_wan",
        createdAt: passedFundingDate,
        updatedAt: passedFundingVotingEnd,
      })
      .returning();

    console.log(`✓ 创建 Passed Funding 提案: ${passedFunding.title}`);

    // 添加投票数据
    await db.insert(votes).values([
      {
        proposalId: passedFunding.id,
        voterId: bob.id,
        support: true,
        wanAmount: "100",
        lockType: "12_months",
        votingPower: "1000", // 100 * 10
      },
      {
        proposalId: passedFunding.id,
        voterId: charlie.id,
        support: true,
        wanAmount: "150",
        lockType: "burn",
        votingPower: "3750", // 150 * 25
      },
      {
        proposalId: passedFunding.id,
        voterId: david.id,
        support: true,
        wanAmount: "200",
        lockType: "6_months",
        votingPower: "1000", // 200 * 5
      },
      {
        proposalId: passedFunding.id,
        voterId: eve.id,
        support: false,
        wanAmount: "80",
        lockType: "6_months",
        votingPower: "400", // 80 * 5
      },
    ]);

    // 添加合作伙伴支持
    await db.insert(partnerSupports).values([
      {
        proposalId: passedFunding.id,
        partnerId: bob.id,
        wanAmount: "1000",
        actionType: "lock",
        contactEmail: "bob@example.com",
        contactTelegram: "@bob_partner",
      },
    ]);

    console.log(`  ✓ 添加投票和合作伙伴数据`);

    // 2. Failed Funding Proposal
    const failedFundingDate = new Date();
    failedFundingDate.setDate(failedFundingDate.getDate() - 15);
    const failedFundingVotingEnd = new Date(failedFundingDate);
    failedFundingVotingEnd.setDate(failedFundingVotingEnd.getDate() + 7);
    failedFundingVotingEnd.setHours(failedFundingVotingEnd.getHours() - 1);

    const [failedFunding] = await db
      .insert(proposals)
      .values({
        title: "Luxury Office Space Rental",
        description: "Proposal to rent a luxury office space in downtown for the community.\n\nFeatures:\n- Prime location\n- Modern amenities\n- 24/7 access\n\nBudget breakdown:\n- Rent: $30,000/month\n- Utilities: $3,000/month\n- Maintenance: $2,000/month",
        type: "funding",
        status: "rejected",
        creatorId: charlie.id,
        fundingRequested: "100000",
        fundingAmount: "0",
        stakeAmount: "300",
        stakeType: "lock",
        publicizedAt: failedFundingDate,
        votingStartsAt: failedFundingDate,
        votingEndsAt: failedFundingVotingEnd,
        votesFor: "2000",
        votesAgainst: "12500",
        resolution: "vote_failed",
        resolvedAt: failedFundingVotingEnd,
        contactEmail: "charlie@example.com",
        createdAt: failedFundingDate,
        updatedAt: failedFundingVotingEnd,
      })
      .returning();

    console.log(`✓ 创建 Failed Funding 提案: ${failedFunding.title}`);

    await db.insert(votes).values([
      {
        proposalId: failedFunding.id,
        voterId: alice.id,
        support: false,
        wanAmount: "200",
        lockType: "burn",
        votingPower: "5000",
      },
      {
        proposalId: failedFunding.id,
        voterId: bob.id,
        support: false,
        wanAmount: "150",
        lockType: "12_months",
        votingPower: "1500",
      },
      {
        proposalId: failedFunding.id,
        voterId: david.id,
        support: true,
        wanAmount: "100",
        lockType: "6_months",
        votingPower: "500",
      },
      {
        proposalId: failedFunding.id,
        voterId: eve.id,
        support: false,
        wanAmount: "120",
        lockType: "12_months",
        votingPower: "1200",
      },
    ]);

    console.log(`  ✓ 添加投票数据`);

    // 3. Passed Parameter Proposal
    const passedParamDate = new Date();
    passedParamDate.setDate(passedParamDate.getDate() - 20);
    const passedParamVotingEnd = new Date(passedParamDate);
    passedParamVotingEnd.setDate(passedParamVotingEnd.getDate() + 7);
    passedParamVotingEnd.setHours(passedParamVotingEnd.getHours() - 1);

    const [passedParam] = await db
      .insert(proposals)
      .values({
        title: "Increase Voting Period to 10 Days",
        description: "Proposal to extend the standard voting period from 7 days to 10 days.\n\nRationale:\n- More time for community discussion\n- Allows international community members to participate\n- Reduces rushed decision-making\n- Better alignment with community feedback cycles",
        type: "parameter",
        status: "passed",
        creatorId: david.id,
        xpBurned: "1000",
        publicizedAt: passedParamDate,
        votingStartsAt: passedParamDate,
        votingEndsAt: passedParamVotingEnd,
        votesFor: "15000",
        votesAgainst: "3500",
        resolution: "vote_passed",
        resolvedAt: passedParamVotingEnd,
        contactDiscord: "david#1234",
        createdAt: passedParamDate,
        updatedAt: passedParamVotingEnd,
      })
      .returning();

    console.log(`✓ 创建 Passed Parameter 提案: ${passedParam.title}`);

    await db.insert(votes).values([
      {
        proposalId: passedParam.id,
        voterId: alice.id,
        support: true,
        wanAmount: "250",
        lockType: "burn",
        votingPower: "6250",
      },
      {
        proposalId: passedParam.id,
        voterId: bob.id,
        support: true,
        wanAmount: "180",
        lockType: "12_months",
        votingPower: "1800",
      },
      {
        proposalId: passedParam.id,
        voterId: charlie.id,
        support: true,
        wanAmount: "150",
        lockType: "6_months",
        votingPower: "750",
      },
      {
        proposalId: passedParam.id,
        voterId: eve.id,
        support: false,
        wanAmount: "140",
        lockType: "burn",
        votingPower: "3500",
      },
    ]);

    console.log(`  ✓ 添加投票数据`);

    // 4. Failed Parameter Proposal
    const failedParamDate = new Date();
    failedParamDate.setDate(failedParamDate.getDate() - 25);
    const failedParamVotingEnd = new Date(failedParamDate);
    failedParamVotingEnd.setDate(failedParamVotingEnd.getDate() + 7);
    failedParamVotingEnd.setHours(failedParamVotingEnd.getHours() - 1);

    const [failedParam] = await db
      .insert(proposals)
      .values({
        title: "Reduce Minimum Stake to 10 WAN",
        description: "Proposal to reduce the minimum stake requirement from 100 WAN to 10 WAN for creating proposals.\n\nArguments:\n- Lower barrier to entry\n- Encourage more participation\n- Allow smaller community members to propose\n\nConcerns:\n- May lead to spam proposals\n- Could reduce proposal quality",
        type: "parameter",
        status: "rejected",
        creatorId: eve.id,
        xpBurned: "800",
        publicizedAt: failedParamDate,
        votingStartsAt: failedParamDate,
        votingEndsAt: failedParamVotingEnd,
        votesFor: "4000",
        votesAgainst: "18000",
        resolution: "vote_failed",
        resolvedAt: failedParamVotingEnd,
        contactEmail: "eve@example.com",
        contactTelegram: "@eve_community",
        createdAt: failedParamDate,
        updatedAt: failedParamVotingEnd,
      })
      .returning();

    console.log(`✓ 创建 Failed Parameter 提案: ${failedParam.title}`);

    await db.insert(votes).values([
      {
        proposalId: failedParam.id,
        voterId: alice.id,
        support: false,
        wanAmount: "300",
        lockType: "burn",
        votingPower: "7500",
      },
      {
        proposalId: failedParam.id,
        voterId: bob.id,
        support: false,
        wanAmount: "200",
        lockType: "12_months",
        votingPower: "2000",
      },
      {
        proposalId: failedParam.id,
        voterId: charlie.id,
        support: true,
        wanAmount: "80",
        lockType: "12_months",
        votingPower: "800",
      },
      {
        proposalId: failedParam.id,
        voterId: david.id,
        support: false,
        wanAmount: "170",
        lockType: "burn",
        votingPower: "4250",
      },
    ]);

    console.log(`  ✓ 添加投票数据`);

    // 5. Admin Rejected Funding Proposal
    console.log("\n✓ 创建 Admin Rejected Funding 提案");
    
    const adminRejectDate = new Date();
    adminRejectDate.setDate(adminRejectDate.getDate() - 5);

    // 首先获取admin用户
    const admin = await db.select().from(users).where(eq(users.username, "admin")).then(r => r[0]);
    
    if (admin) {
      const [adminRejected] = await db
        .insert(proposals)
        .values({
          title: "Spam Proposal - Buy My NFT Collection",
          description: "This is a spam proposal to promote my NFT collection. Please buy my NFTs at examplescam.com",
          type: "funding",
          status: "failed",
          creatorId: eve.id,
          fundingRequested: "10000",
          fundingAmount: "0",
          stakeAmount: "100",
          stakeType: "lock",
          resolution: "administrative_reject",
          rejectedBy: admin.id,
          rejectionReason: "Spam/scam proposal, not related to WAN ecosystem",
          resolvedAt: adminRejectDate,
          createdAt: adminRejectDate,
          updatedAt: adminRejectDate,
        })
        .returning();

      console.log(`  ✓ 创建 Admin Rejected 提案: ${adminRejected.title}`);
      console.log(`    - 管理员: ${admin.username} 拒绝于 ${adminRejectDate.toLocaleDateString()}`);
    } else {
      console.log(`  ⚠ 跳过Admin Rejected提案创建（未找到admin用户，请先运行 npm run seed:admin）`);
    }

    console.log("\n✅ 所有示例数据创建成功！");
    console.log("\n创建的提案：");
    console.log("  1. ✓ Community Education Program (Funding, Passed, vote_passed)");
    console.log("  2. ✗ Luxury Office Space Rental (Funding, Failed, vote_failed)");
    console.log("  3. ✓ Increase Voting Period to 10 Days (Parameter, Passed, vote_passed)");
    console.log("  4. ✗ Reduce Minimum Stake to 10 WAN (Parameter, Failed, vote_failed)");
    console.log("  5. ✗ Spam Proposal (Funding, Admin Rejected, administrative_reject)");
    console.log("\n测试用户（密码都是 test123）：");
    console.log("  - alice (partner)");
    console.log("  - bob (partner)");
    console.log("  - charlie (voter)");
    console.log("  - david (voter)");
    console.log("  - eve (voter)");

    process.exit(0);
  } catch (error) {
    console.error("创建示例数据失败:", error);
    process.exit(1);
  }
}

seedExamples();
