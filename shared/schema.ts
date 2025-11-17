import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, decimal, boolean } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("voter"),
  xpBalance: decimal("xp_balance", { precision: 20, scale: 2 }).notNull().default("0"),
  wanBalance: decimal("wan_balance", { precision: 20, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const proposals = pgTable("proposals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description").notNull(),
  type: text("type").notNull(),
  status: text("status").notNull().default("pending"),
  creatorId: varchar("creator_id").notNull().references(() => users.id),
  fundingAmount: decimal("funding_amount", { precision: 20, scale: 2 }),
  fundingRequested: decimal("funding_requested", { precision: 20, scale: 2 }),
  stakeAmount: decimal("stake_amount", { precision: 20, scale: 2 }),
  stakeType: text("stake_type"),
  xpBurned: decimal("xp_burned", { precision: 20, scale: 2 }),
  contactEmail: text("contact_email"),
  contactTelegram: text("contact_telegram"),
  contactDiscord: text("contact_discord"),
  publicizedAt: timestamp("publicized_at"),
  fundingDeadline: timestamp("funding_deadline"),
  votingStartsAt: timestamp("voting_starts_at"),
  votingEndsAt: timestamp("voting_ends_at"),
  votesFor: decimal("votes_for", { precision: 20, scale: 2 }).notNull().default("0"),
  votesAgainst: decimal("votes_against", { precision: 20, scale: 2 }).notNull().default("0"),
  resolution: text("resolution"),
  rejectedBy: varchar("rejected_by").references(() => users.id),
  rejectionReason: text("rejection_reason"),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const votes = pgTable("votes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  proposalId: varchar("proposal_id").notNull().references(() => proposals.id),
  voterId: varchar("voter_id").notNull().references(() => users.id),
  support: boolean("support").notNull(),
  wanAmount: decimal("wan_amount", { precision: 20, scale: 2 }).notNull(),
  lockType: text("lock_type").notNull(),
  votingPower: decimal("voting_power", { precision: 20, scale: 2 }).notNull(),
  processed: boolean("processed").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const partnerSupports = pgTable("partner_supports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  proposalId: varchar("proposal_id").notNull().references(() => proposals.id),
  partnerId: varchar("partner_id").notNull().references(() => users.id),
  wanAmount: decimal("wan_amount", { precision: 20, scale: 2 }).notNull(),
  actionType: text("action_type").notNull(),
  contactEmail: text("contact_email"),
  contactTelegram: text("contact_telegram"),
  contactDiscord: text("contact_discord"),
  processed: boolean("processed").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const systemParams = pgTable("system_params", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  description: text("description"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const claims = pgTable("claims", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  proposalId: varchar("proposal_id").notNull().references(() => proposals.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  participationType: text("participation_type").notNull(),
  claimableAmount: decimal("claimable_amount", { precision: 20, scale: 2 }).notNull(),
  status: text("status").notNull().default("pending"),
  appliedAt: timestamp("applied_at"),
  claimableAt: timestamp("claimable_at"),
  claimedAt: timestamp("claimed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  proposals: many(proposals),
  votes: many(votes),
  partnerSupports: many(partnerSupports),
}));

export const proposalsRelations = relations(proposals, ({ one, many }) => ({
  creator: one(users, {
    fields: [proposals.creatorId],
    references: [users.id],
  }),
  votes: many(votes),
  partnerSupports: many(partnerSupports),
}));

export const votesRelations = relations(votes, ({ one }) => ({
  proposal: one(proposals, {
    fields: [votes.proposalId],
    references: [proposals.id],
  }),
  voter: one(users, {
    fields: [votes.voterId],
    references: [users.id],
  }),
}));

export const partnerSupportsRelations = relations(partnerSupports, ({ one }) => ({
  proposal: one(proposals, {
    fields: [partnerSupports.proposalId],
    references: [proposals.id],
  }),
  partner: one(users, {
    fields: [partnerSupports.partnerId],
    references: [users.id],
  }),
}));

export const claimsRelations = relations(claims, ({ one }) => ({
  proposal: one(proposals, {
    fields: [claims.proposalId],
    references: [proposals.id],
  }),
  user: one(users, {
    fields: [claims.userId],
    references: [users.id],
  }),
}));

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertProposalSchema = createInsertSchema(proposals).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  votesFor: true,
  votesAgainst: true,
  fundingAmount: true,
});

export const insertVoteSchema = createInsertSchema(votes).omit({
  id: true,
  createdAt: true,
  processed: true,
});

export const insertPartnerSupportSchema = createInsertSchema(partnerSupports).omit({
  id: true,
  createdAt: true,
  processed: true,
});

export const insertSystemParamSchema = createInsertSchema(systemParams).omit({
  id: true,
  updatedAt: true,
});

export const insertClaimSchema = createInsertSchema(claims).omit({
  id: true,
  createdAt: true,
});

export const applyClaimSchema = z.object({
  participationType: z.enum(["creator", "vote", "partner"]),
});

export const executeClaimSchema = z.object({
  participationType: z.enum(["creator", "vote", "partner"]),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertProposal = z.infer<typeof insertProposalSchema>;
export type Proposal = typeof proposals.$inferSelect;
export type InsertVote = z.infer<typeof insertVoteSchema>;
export type Vote = typeof votes.$inferSelect;
export type InsertPartnerSupport = z.infer<typeof insertPartnerSupportSchema>;
export type PartnerSupport = typeof partnerSupports.$inferSelect;
export type InsertSystemParam = z.infer<typeof insertSystemParamSchema>;
export type SystemParam = typeof systemParams.$inferSelect;
export type InsertClaim = z.infer<typeof insertClaimSchema>;
export type Claim = typeof claims.$inferSelect;
