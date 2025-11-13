import {
  users,
  proposals,
  votes,
  partnerSupports,
  systemParams,
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
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";

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
  updateProposalVotes(id: string, votesFor: string, votesAgainst: string): Promise<void>;

  getVotes(proposalId: string): Promise<any[]>;
  getVoteByVoter(proposalId: string, voterId: string): Promise<Vote | undefined>;
  createVote(vote: InsertVote): Promise<Vote>;
  updateVoteProcessed(id: string, processed: boolean): Promise<void>;

  getPartnerSupports(proposalId: string): Promise<any[]>;
  getPartnerSupportsByPartner(partnerId: string): Promise<any[]>;
  getPartnerSupport(proposalId: string, partnerId: string): Promise<PartnerSupport | undefined>;
  createPartnerSupport(support: InsertPartnerSupport): Promise<PartnerSupport>;
  updatePartnerSupportProcessed(id: string, processed: boolean): Promise<void>;

  getSystemParams(): Promise<SystemParam[]>;
  getSystemParam(key: string): Promise<SystemParam | undefined>;
  upsertSystemParam(param: InsertSystemParam): Promise<SystemParam>;
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

  async getPartnerSupports(proposalId: string): Promise<any[]> {
    return await db.query.partnerSupports.findMany({
      where: eq(partnerSupports.proposalId, proposalId),
      with: {
        partner: { columns: { username: true } },
      },
    });
  }

  async getPartnerSupportsByPartner(partnerId: string): Promise<any[]> {
    return await db.query.partnerSupports.findMany({
      where: eq(partnerSupports.partnerId, partnerId),
      with: {
        proposal: {
          with: {
            creator: { columns: { username: true } },
          },
        },
      },
      orderBy: [desc(partnerSupports.createdAt)],
    });
  }

  async getPartnerSupport(proposalId: string, partnerId: string): Promise<PartnerSupport | undefined> {
    const [support] = await db
      .select()
      .from(partnerSupports)
      .where(and(eq(partnerSupports.proposalId, proposalId), eq(partnerSupports.partnerId, partnerId)));
    return support || undefined;
  }

  async createPartnerSupport(support: InsertPartnerSupport): Promise<PartnerSupport> {
    const [created] = await db.insert(partnerSupports).values(support).returning();
    return created;
  }

  async updatePartnerSupportProcessed(id: string, processed: boolean): Promise<void> {
    await db.update(partnerSupports).set({ processed }).where(eq(partnerSupports.id, id));
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
}

export const storage = new DatabaseStorage();
