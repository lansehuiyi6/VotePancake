import {
  users,
  proposals,
  votes,
  partnerSupports,
  systemParams,
  claims,
  type User,
  type InsertUser,
  type Proposal,
  type InsertProposal,
  type Vote,
  type InsertVote,
  type PartnerSupport,
  type InsertPartnerSupport,
  type SystemParam,
  type InsertSystemParam,
  type Claim,
  type InsertClaim,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, inArray } from "drizzle-orm";

// PartnerSupport and InsertPartnerSupport types are imported from @shared/schema

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserBalance(id: string, xpDelta: string, wanDelta: string): Promise<void>;

  getProposals(): Promise<any[]>;
  getProposal(id: string): Promise<any | undefined>;
  getProposalsByCreator(creatorId: string): Promise<any[]>;
  getPendingProposals(): Promise<any[]>;
  createProposal(proposal: InsertProposal): Promise<Proposal>;
  updateProposalStatus(id: string, status: string, votingStartsAt?: Date, votingEndsAt?: Date): Promise<void>;
  publicizeProposal(id: string, publicizedAt: Date, fundingDeadline: Date): Promise<void>;
  updateProposalVotes(id: string, votesFor: string, votesAgainst: string): Promise<void>;

  getVotes(proposalId: string): Promise<any[]>;
  getVoteByVoter(proposalId: string, voterId: string): Promise<Vote | undefined>;
  createVote(vote: InsertVote): Promise<Vote>;
  updateVoteProcessed(id: string, processed: boolean): Promise<void>;

  getPartnerSupports(proposalId: string): Promise<any[]>;
  getPartnerSupportsForProposals(proposalIds: string[]): Promise<Map<string, any[]>>;
  getPartnerSupportsByPartner(partnerId: string): Promise<any[]>;
  getPartnerSupport(proposalId: string, partnerId: string): Promise<PartnerSupport | undefined>;
  createPartnerSupport(support: InsertPartnerSupport): Promise<PartnerSupport>;
  updatePartnerSupport(id: string, data: Partial<InsertPartnerSupport>): Promise<void>;
  updatePartnerSupportProcessed(id: string, processed: boolean): Promise<void>;

  getSystemParams(): Promise<SystemParam[]>;
  getSystemParam(key: string): Promise<SystemParam | undefined>;
  upsertSystemParam(param: InsertSystemParam): Promise<SystemParam>;

  getClaims(proposalId: string): Promise<any[]>;
  getClaimsByUser(userId: string): Promise<any[]>;
  getClaim(proposalId: string, userId: string, participationType: string): Promise<Claim | undefined>;
  createClaim(claim: InsertClaim): Promise<Claim>;
  updateClaimStatus(id: string, status: string, appliedAt?: Date, claimableAt?: Date, claimedAt?: Date): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({ ...insertUser, xpBalance: "1000000", wanBalance: "10000" })
      .returning();
    return user;
  }

  async updateUserBalance(id: string, xpDelta: string, wanDelta: string): Promise<void> {
    const user = await this.getUser(id);
    if (!user) throw new Error("User not found");

    const newXp = (Number(user.xpBalance) + Number(xpDelta)).toString();
    const newWan = (Number(user.wanBalance) + Number(wanDelta)).toString();

    await db
      .update(users)
      .set({ xpBalance: newXp, wanBalance: newWan })
      .where(eq(users.id, id));
  }

  async getProposals(): Promise<any[]> {
    return await db.query.proposals.findMany({
      with: {
        creator: { columns: { username: true } },
      },
      orderBy: [desc(proposals.createdAt)],
    });
  }

  async getProposal(id: string): Promise<any | undefined> {
    return await db.query.proposals.findFirst({
      where: eq(proposals.id, id),
      with: {
        creator: { columns: { username: true } },
      },
    });
  }

  async getProposalsByCreator(creatorId: string): Promise<any[]> {
    return await db.query.proposals.findMany({
      where: eq(proposals.creatorId, creatorId),
      with: {
        creator: { columns: { username: true } },
      },
      orderBy: [desc(proposals.createdAt)],
    });
  }

  async getPendingProposals(): Promise<any[]> {
    return await db.query.proposals.findMany({
      where: eq(proposals.status, "pending"),
      with: {
        creator: { columns: { username: true } },
      },
      orderBy: [desc(proposals.createdAt)],
    });
  }

  async createProposal(proposal: InsertProposal): Promise<Proposal> {
    const [created] = await db.insert(proposals).values(proposal).returning();
    return created;
  }

  async updateProposalStatus(id: string, status: string, votingStartsAt?: Date, votingEndsAt?: Date): Promise<void> {
    await db
      .update(proposals)
      .set({
        status,
        votingStartsAt: votingStartsAt || null,
        votingEndsAt: votingEndsAt || null,
        updatedAt: new Date(),
      })
      .where(eq(proposals.id, id));
  }

  async publicizeProposal(id: string, publicizedAt: Date, fundingDeadline: Date): Promise<void> {
    await db
      .update(proposals)
      .set({
        status: "publicized",
        publicizedAt,
        fundingDeadline,
        updatedAt: new Date(),
      })
      .where(eq(proposals.id, id));
  }

  async updateProposalVotes(id: string, votesFor: string, votesAgainst: string): Promise<void> {
    await db
      .update(proposals)
      .set({ votesFor, votesAgainst, updatedAt: new Date() })
      .where(eq(proposals.id, id));
  }

  async getVotes(proposalId: string): Promise<any[]> {
    return await db.query.votes.findMany({
      where: eq(votes.proposalId, proposalId),
      with: {
        voter: { columns: { username: true } },
      },
    });
  }

  async getVoteByVoter(proposalId: string, voterId: string): Promise<Vote | undefined> {
    const [vote] = await db
      .select()
      .from(votes)
      .where(and(eq(votes.proposalId, proposalId), eq(votes.voterId, voterId)));
    return vote || undefined;
  }

  async createVote(vote: InsertVote): Promise<Vote> {
    const [created] = await db.insert(votes).values(vote).returning();
    return created;
  }

  async updateVoteProcessed(id: string, processed: boolean): Promise<void> {
    await db.update(votes).set({ processed }).where(eq(votes.id, id));
  }

  async getPartnerSupports(proposalId: string): Promise<PartnerSupport[]> {
    try {
      return await db
        .select()
        .from(partnerSupports)
        .where(eq(partnerSupports.proposalId, proposalId));
    } catch (error) {
      console.error(`[ERROR] Error fetching partner supports for proposal ${proposalId}:`, error);
      throw error;
    }
  }

  async getPartnerSupportsByPartner(partnerId: string): Promise<PartnerSupport[]> {
    try {
      return await db
        .select()
        .from(partnerSupports)
        .where(eq(partnerSupports.partnerId, partnerId));
    } catch (error) {
      console.error(`[ERROR] Error fetching partner supports for partner ${partnerId}:`, error);
      throw error;
    }
  }

  async getPartnerSupportsForProposals(proposalIds: string[]): Promise<Map<string, PartnerSupport[]>> {
    const result = new Map<string, PartnerSupport[]>();
    
    if (proposalIds.length === 0) {
      return result;
    }
    
    console.log(`[DEBUG] Querying partner supports for proposals:`, proposalIds);
    
    try {
      // Fetch all partner supports for the given proposal IDs
      const supports = await db
        .select()
        .from(partnerSupports)
        .where(inArray(partnerSupports.proposalId, proposalIds));
      
      // Group supports by proposalId
      for (const support of supports) {
        if (!result.has(support.proposalId)) {
          result.set(support.proposalId, []);
        }
        result.get(support.proposalId)?.push(support);
      }
      
      return result;
    } catch (error) {
      console.error('[ERROR] Error in getPartnerSupportsForProposals:', error);
      throw error;
    }
  }

  async getPartnerSupport(proposalId: string, partnerId: string): Promise<PartnerSupport | undefined> {
    try {
      const [support] = await db
        .select()
        .from(partnerSupports)
        .where(
          and(
            eq(partnerSupports.proposalId, proposalId),
            eq(partnerSupports.partnerId, partnerId)
          )
        )
        .limit(1);
      
      return support || undefined;
    } catch (error) {
      console.error(`[ERROR] Error getting partner support for proposal ${proposalId} and partner ${partnerId}:`, error);
      throw error;
    }
  }

  async createPartnerSupport(support: InsertPartnerSupport): Promise<PartnerSupport> {
    try {
      const [created] = await db
        .insert(partnerSupports)
        .values({
          ...support,
          processed: false,
          createdAt: new Date()
        })
        .returning();
      
      if (!created) {
        throw new Error('Failed to create partner support');
      }
      
      return created;
    } catch (error) {
      console.error('[ERROR] Error creating partner support:', error);
      throw error;
    }
  }

  async updatePartnerSupport(id: string, data: Partial<InsertPartnerSupport>): Promise<void> {
    try {
      await db
        .update(partnerSupports)
        .set(data)
        .where(eq(partnerSupports.id, id));
    } catch (error) {
      console.error(`[ERROR] Error updating partner support ${id}:`, error);
      throw error;
    }
  }

  async updatePartnerSupportProcessed(id: string, processed: boolean): Promise<void> {
    try {
      await db
        .update(partnerSupports)
        .set({ processed })
        .where(eq(partnerSupports.id, id));
    } catch (error) {
      console.error(`[ERROR] Error updating partner support ${id} processed status:`, error);
      throw error;
    }
  }

  async getSystemParams(): Promise<SystemParam[]> {
    return await db.select().from(systemParams);
  }

  async getSystemParam(key: string): Promise<SystemParam | undefined> {
    const [param] = await db.select().from(systemParams).where(eq(systemParams.key, key));
    return param || undefined;
  }

  async upsertSystemParam(param: InsertSystemParam): Promise<SystemParam> {
    const existing = await this.getSystemParam(param.key);
    
    if (existing) {
      const [updated] = await db
        .update(systemParams)
        .set({ value: param.value, updatedAt: new Date() })
        .where(eq(systemParams.key, param.key))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(systemParams).values(param).returning();
      return created;
    }
  }

  async getClaims(proposalId: string): Promise<any[]> {
    return await db.query.claims.findMany({
      where: eq(claims.proposalId, proposalId),
      with: {
        user: { columns: { username: true } },
      },
      orderBy: [desc(claims.createdAt)],
    });
  }

  async getClaimsByUser(userId: string): Promise<any[]> {
    return await db.query.claims.findMany({
      where: eq(claims.userId, userId),
      with: {
        proposal: {
          with: {
            creator: { columns: { username: true } },
          },
        },
      },
      orderBy: [desc(claims.createdAt)],
    });
  }

  async getClaim(proposalId: string, userId: string, participationType: string): Promise<Claim | undefined> {
    const [claim] = await db
      .select()
      .from(claims)
      .where(
        and(
          eq(claims.proposalId, proposalId),
          eq(claims.userId, userId),
          eq(claims.participationType, participationType)
        )
      );
    return claim || undefined;
  }

  async createClaim(claim: InsertClaim): Promise<Claim> {
    const [created] = await db.insert(claims).values(claim).returning();
    return created;
  }

  async updateClaimStatus(
    id: string,
    status: string,
    appliedAt?: Date,
    claimableAt?: Date,
    claimedAt?: Date
  ): Promise<void> {
    const updateData: any = { status };
    if (appliedAt) updateData.appliedAt = appliedAt;
    if (claimableAt) updateData.claimableAt = claimableAt;
    if (claimedAt) updateData.claimedAt = claimedAt;
    
    await db.update(claims).set(updateData).where(eq(claims.id, id));
  }
}

export const storage = new DatabaseStorage();
