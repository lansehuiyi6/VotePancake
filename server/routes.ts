import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { insertUserSchema, insertProposalSchema, insertVoteSchema, insertPartnerSupportSchema, applyClaimSchema, executeClaimSchema } from "@shared/schema";
import bcrypt from "bcrypt";

declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

const authMiddleware = async (req: any, res: any, next: any) => {
  const userId = (req.session as any)?.userId;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const user = await storage.getUser(userId);
  if (!user) {
    return res.status(401).json({ error: "User not found" });
  }
  req.user = user;
  next();
};

const optionalAuthMiddleware = async (req: any, res: any, next: any) => {
  const userId = (req.session as any)?.userId;
  if (userId) {
    const user = await storage.getUser(userId);
    if (user) {
      req.user = user;
    }
  }
  next();
};

const adminMiddleware = async (req: any, res: any, next: any) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
};

export async function registerRoutes(app: Express): Promise<Server> {
  app.post("/api/auth/register", async (req, res) => {
    try {
      const data = insertUserSchema.parse(req.body);
      const existing = await storage.getUserByUsername(data.username);
      if (existing) {
        return res.status(400).json({ error: "Username already exists" });
      }

      const hashedPassword = await bcrypt.hash(data.password, 10);
      const user = await storage.createUser({ ...data, password: hashedPassword });
      return res.json({ id: user.id, username: user.username, role: user.role });
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      (req.session as any).userId = user.id;
      return res.json({
        id: user.id,
        username: user.username,
        role: user.role,
        xpBalance: user.xpBalance,
        wanBalance: user.wanBalance,
      });
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/auth/me", optionalAuthMiddleware, async (req, res) => {
    if (!req.user) {
      return res.json(null);
    }
    return res.json({
      id: req.user.id,
      username: req.user.username,
      role: req.user.role,
      xpBalance: req.user.xpBalance,
      wanBalance: req.user.wanBalance,
    });
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy(() => {
      res.json({ success: true });
    });
  });

  app.get("/api/proposals", optionalAuthMiddleware, async (req, res) => {
    try {
      const proposals = await storage.getProposals();
      const params = await storage.getSystemParams();
      const lockMultiplierParam = params.find(p => p.key === "lockMultiplier");
      const burnMultiplierParam = params.find(p => p.key === "burnMultiplier");
      const votingDurationParam = params.find(p => p.key === "votingDuration");
      const lockMultiplier = lockMultiplierParam ? Number(lockMultiplierParam.value) : 10;
      const burnMultiplier = burnMultiplierParam ? Number(burnMultiplierParam.value) : 50;
      const votingDuration = votingDurationParam ? Number(votingDurationParam.value) : 14;

      const proposalIds = proposals.map(p => p.id);
      const partnerSupportsMap = await storage.getPartnerSupportsForProposals(proposalIds);

      const now = new Date();

      const enriched = await Promise.all(
        proposals.map(async (p) => {
          const partners = partnerSupportsMap.get(p.id) || [];
          
          if (p.status === "publicized" && p.fundingDeadline) {
            const deadline = new Date(p.fundingDeadline);
            
            if (now >= deadline) {
              const stakeMultiplier = p.stakeType === "burn" ? burnMultiplier : lockMultiplier;
              const baseFunding = Number(p.stakeAmount || 0) * stakeMultiplier;
              
              const partnerFunding = partners.reduce((sum, ps) => {
                const psMultiplier = ps.actionType === "burn" ? burnMultiplier : lockMultiplier;
                return sum + (Number(ps.wanAmount) * psMultiplier);
              }, 0);
              
              const effectiveFunding = baseFunding + partnerFunding;
              const requestedFunding = Number(p.fundingRequested || 0);
              
              if (effectiveFunding >= requestedFunding && p.status !== "active") {
                const votingStartsAt = new Date();
                const votingEndsAt = new Date();
                votingEndsAt.setDate(votingEndsAt.getDate() + votingDuration);

                await storage.updateProposalStatus(p.id, "active", votingStartsAt, votingEndsAt);
                p.status = "active";
                p.votingStartsAt = votingStartsAt;
                p.votingEndsAt = votingEndsAt;
              } else if (effectiveFunding < requestedFunding && p.status !== "closed") {
                await storage.updateProposalStatus(p.id, "closed");
                p.status = "closed";
              }
            }
          }

          const totalPartnerStake = partners.reduce((sum, ps) => sum + Number(ps.wanAmount), 0).toString();
          return {
            ...p,
            partnerCount: partners.length,
            totalPartnerStake,
          };
        })
      );

      const filtered = enriched.filter(p => {
        if (p.status !== "pending") {
          return true;
        }
        
        if (!req.user) {
          return false;
        }
        
        if (req.user.role === "admin") {
          return true;
        }
        
        return p.creatorId === req.user.id;
      });

      return res.json(filtered);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/proposals/:id", async (req, res) => {
    try {
      const proposal = await storage.getProposal(req.params.id);
      if (!proposal) {
        return res.status(404).json({ error: "Proposal not found" });
      }
      return res.json(proposal);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/proposals", authMiddleware, async (req, res) => {
    try {
      const data = insertProposalSchema.parse({
        ...req.body,
        creatorId: req.user.id,
        status: "pending",
      });

      const hasEmail = data.contactEmail && data.contactEmail.trim().length > 0;
      const hasTelegram = data.contactTelegram && data.contactTelegram.trim().length > 0;
      const hasDiscord = data.contactDiscord && data.contactDiscord.trim().length > 0;
      
      if (!hasEmail && !hasTelegram && !hasDiscord) {
        return res.status(400).json({ error: "至少需要提供一种联系方式（邮箱、电报或Discord）" });
      }

      const params = await storage.getSystemParams();
      const xpCostParam = params.find(p => p.key === "xpBurnCost");
      const xpCost = xpCostParam ? xpCostParam.value : "110000";

      if (req.user.role !== "admin") {
        if (Number(req.user.xpBalance) < Number(xpCost)) {
          return res.status(400).json({ error: "Insufficient XP balance" });
        }

        await storage.updateUserBalance(req.user.id, `-${xpCost}`, "0");
      }

      if (data.type === "funding") {
        if (!data.stakeAmount || !data.stakeType) {
          return res.status(400).json({ error: "Funding proposals require stake amount and type" });
        }

        if (!data.fundingRequested) {
          return res.status(400).json({ error: "Funding proposals require a funding request amount" });
        }

        if (Number(req.user.wanBalance) < Number(data.stakeAmount)) {
          return res.status(400).json({ error: "Insufficient WAN balance" });
        }

        await storage.updateUserBalance(req.user.id, "0", `-${data.stakeAmount}`);
      }

      const proposal = await storage.createProposal({
        ...data,
        xpBurned: req.user.role === "admin" ? "0" : xpCost,
      });

      return res.json(proposal);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/proposals/:id/votes", async (req, res) => {
    try {
      const votes = await storage.getVotes(req.params.id);
      return res.json(votes);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/proposals/:id/vote", authMiddleware, async (req, res) => {
    try {
      const proposal = await storage.getProposal(req.params.id);
      if (!proposal) {
        return res.status(404).json({ error: "Proposal not found" });
      }

      if (proposal.status !== "active") {
        return res.status(400).json({ error: "Proposal is not active for voting" });
      }

      const existing = await storage.getVoteByVoter(req.params.id, req.user.id);
      if (existing) {
        return res.status(400).json({ error: "You have already voted on this proposal" });
      }

      const data = insertVoteSchema.parse({
        ...req.body,
        proposalId: req.params.id,
        voterId: req.user.id,
      });

      const multipliers: Record<string, number> = {
        until_end: 1,
        "6_months": 5,
        "12_months": 10,
        burn: 25,
      };

      const votingPower = (Number(data.wanAmount) * multipliers[data.lockType]).toString();

      if (Number(req.user.wanBalance) < Number(data.wanAmount)) {
        return res.status(400).json({ error: "Insufficient WAN balance" });
      }

      await storage.updateUserBalance(req.user.id, "0", `-${data.wanAmount}`);

      const vote = await storage.createVote({
        ...data,
        votingPower,
      });

      const newVotesFor = data.support
        ? (Number(proposal.votesFor) + Number(votingPower)).toString()
        : proposal.votesFor;
      const newVotesAgainst = !data.support
        ? (Number(proposal.votesAgainst) + Number(votingPower)).toString()
        : proposal.votesAgainst;

      await storage.updateProposalVotes(req.params.id, newVotesFor, newVotesAgainst);

      return res.json(vote);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/proposals/:id/partners", async (req, res) => {
    try {
      const partners = await storage.getPartnerSupports(req.params.id);
      return res.json(partners);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/proposals/:id/support", authMiddleware, async (req, res) => {
    try {
      const proposal = await storage.getProposal(req.params.id);
      if (!proposal) {
        return res.status(404).json({ error: "提案不存在" });
      }

      if (proposal.type !== "funding") {
        return res.status(400).json({ error: "只有资金申请提案可以接受Partner支持" });
      }

      if (proposal.status !== "publicized") {
        return res.status(400).json({ error: "只有已公示的提案可以接受Partner追加资金" });
      }

      if (proposal.creatorId === req.user.id) {
        return res.status(400).json({ error: "不能支持自己的提案" });
      }

      if (!proposal.fundingRequested || !proposal.stakeAmount || !proposal.stakeType) {
        return res.status(400).json({ error: "提案缺少必要的资金信息" });
      }

      const data = insertPartnerSupportSchema.parse({
        ...req.body,
        proposalId: req.params.id,
        partnerId: req.user.id,
      });

      if (!data.actionType || (data.actionType !== "lock" && data.actionType !== "burn")) {
        return res.status(400).json({ error: "actionType必须是lock或burn" });
      }

      if (!data.contactEmail && !data.contactTelegram && !data.contactDiscord) {
        return res.status(400).json({ error: "请至少填写一个联系方式（邮箱、Telegram 或 Discord）" });
      }

      if (Number(req.user.wanBalance) < Number(data.wanAmount)) {
        return res.status(400).json({ error: "WAN余额不足" });
      }

      const existing = await storage.getPartnerSupport(req.params.id, req.user.id);
      let support;
      
      if (existing) {
        // Update existing support instead of creating new one
        const newAmount = (Number(existing.wanAmount) + Number(data.wanAmount)).toString();
        await storage.updatePartnerSupport(existing.id, { wanAmount: newAmount });
        support = { ...existing, wanAmount: newAmount };
      } else {
        support = await storage.createPartnerSupport(data);
      }

      const params = await storage.getSystemParams();
      const lockMultiplierParam = params.find(p => p.key === "lockMultiplier");
      const burnMultiplierParam = params.find(p => p.key === "burnMultiplier");
      const lockMultiplier = lockMultiplierParam ? Number(lockMultiplierParam.value) : 10;
      const burnMultiplier = burnMultiplierParam ? Number(burnMultiplierParam.value) : 50;

      const stakeMultiplier = proposal.stakeType === "burn" ? burnMultiplier : lockMultiplier;
      const baseFunding = Number(proposal.stakeAmount) * stakeMultiplier;
      const requestedFunding = Number(proposal.fundingRequested);

      if (requestedFunding <= baseFunding) {
        return res.status(400).json({ error: "此提案不需要额外的Partner资金支持" });
      }

      await storage.updateUserBalance(req.user.id, "0", `-${data.wanAmount}`);

      const allSupports = await storage.getPartnerSupports(req.params.id);
      const partnerFunding = allSupports.reduce((sum, ps) => {
        const psMultiplier = ps.actionType === "burn" ? burnMultiplier : lockMultiplier;
        return sum + (Number(ps.wanAmount) * psMultiplier);
      }, 0);
      
      const effectiveFunding = baseFunding + partnerFunding;

      if (effectiveFunding >= requestedFunding) {
        const votingDurationParam = params.find(p => p.key === "votingDuration");
        const votingDuration = votingDurationParam ? Number(votingDurationParam.value) : 14;

        const votingStartsAt = new Date();
        const votingEndsAt = new Date();
        votingEndsAt.setDate(votingEndsAt.getDate() + votingDuration);

        await storage.updateProposalStatus(req.params.id, "active", votingStartsAt, votingEndsAt);
        
        return res.json({ 
          ...support, 
          proposalUpdated: true,
          newStatus: "active",
          message: "资金已达标，提案已自动进入投票阶段"
        });
      }

      return res.json(support);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/admin/pending", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const pending = await storage.getPendingProposals();
      return res.json(pending);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/admin/proposals/:id/approve", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const proposal = await storage.getProposal(req.params.id);
      if (!proposal) {
        return res.status(404).json({ error: "Proposal not found" });
      }

      if (proposal.status !== "pending") {
        return res.status(400).json({ error: "Proposal is not pending" });
      }

      const params = await storage.getSystemParams();
      const votingDurationParam = params.find(p => p.key === "votingDuration");
      const votingDuration = votingDurationParam ? Number(votingDurationParam.value) : 14;

      const votingStartsAt = new Date();
      const votingEndsAt = new Date();
      votingEndsAt.setDate(votingEndsAt.getDate() + votingDuration);

      await storage.updateProposalStatus(req.params.id, "active", votingStartsAt, votingEndsAt);

      return res.json({ success: true });
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/admin/proposals/:id/reject", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const proposal = await storage.getProposal(req.params.id);
      if (!proposal) {
        return res.status(404).json({ error: "Proposal not found" });
      }

      if (proposal.status !== "pending") {
        return res.status(400).json({ error: "Proposal is not pending" });
      }

      await storage.updateProposalStatus(req.params.id, "rejected");

      if (proposal.type === "funding" && proposal.stakeAmount) {
        await storage.updateUserBalance(proposal.creatorId, "0", proposal.stakeAmount);
      }

      return res.json({ success: true });
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/admin/proposals/:id/publicize", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const proposal = await storage.getProposal(req.params.id);
      if (!proposal) {
        return res.status(404).json({ error: "Proposal not found" });
      }

      if (proposal.status !== "pending") {
        return res.status(400).json({ error: "只有待审核的提案可以公示" });
      }

      if (proposal.type !== "funding") {
        return res.status(400).json({ error: "只有资金申请提案可以公示" });
      }

      if (!proposal.fundingRequested || !proposal.stakeAmount || !proposal.stakeType) {
        return res.status(400).json({ error: "提案缺少必要的资金信息" });
      }

      const multipliers: Record<string, number> = {
        lock: 10,
        burn: 50,
      };
      const multiplier = multipliers[proposal.stakeType] || 10;
      const baseFunding = Number(proposal.stakeAmount) * multiplier;
      const requestedFunding = Number(proposal.fundingRequested);

      if (requestedFunding <= baseFunding) {
        return res.status(400).json({ error: "质押金和申请金额已匹配，无需公示" });
      }

      const publicizedAt = new Date();
      const fundingDeadline = new Date();
      fundingDeadline.setDate(fundingDeadline.getDate() + 14);

      await storage.publicizeProposal(req.params.id, publicizedAt, fundingDeadline);

      return res.json({ success: true, publicizedAt, fundingDeadline });
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/system/params", async (req, res) => {
    try {
      const params = await storage.getSystemParams();
      
      const defaults = {
        xpBurnCost: "110000",
        lockMultiplier: "10",
        burnMultiplier: "50",
        votingDuration: "14",
        lockDuration: "12",
      };

      const result: any = {};
      for (const [key, defaultValue] of Object.entries(defaults)) {
        const param = params.find(p => p.key === key);
        result[key] = param ? param.value : defaultValue;
      }

      return res.json(result);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/admin/params/:key", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const { value } = req.body;
      if (!value) {
        return res.status(400).json({ error: "Value is required" });
      }

      await storage.upsertSystemParam({
        key: req.params.key,
        value,
        description: `System parameter: ${req.params.key}`,
      });

      return res.json({ success: true });
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/partner/supports", authMiddleware, async (req, res) => {
    try {
      const supports = await storage.getPartnerSupportsByPartner(req.user.id);
      return res.json(supports);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/partner/available-proposals", authMiddleware, async (req, res) => {
    try {
      const allProposals = await storage.getProposals();
      
      const availableProposals = await Promise.all(
        allProposals
          .filter(p => {
            if (p.type !== "funding") return false;
            if (!(p.status === "pending" || p.status === "approved" || p.status === "active")) return false;
            if (p.creatorId === req.user.id) return false;
            
            if (!p.fundingRequested || !p.stakeAmount || !p.stakeType) return false;
            
            const params = ["lock", "burn"];
            const multipliers: Record<string, number> = {
              lock: 10,
              burn: 50,
            };
            const multiplier = multipliers[p.stakeType] || 10;
            const baseFunding = Number(p.stakeAmount) * multiplier;
            const requestedFunding = Number(p.fundingRequested);
            
            return requestedFunding > baseFunding;
          })
          .map(async (p) => {
            const existing = await storage.getPartnerSupport(p.id, req.user.id);
            const partners = await storage.getPartnerSupports(p.id);
            const totalPartnerStake = partners.reduce((sum, ps) => sum + Number(ps.wanAmount), 0).toString();
            
            const multipliers: Record<string, number> = {
              lock: 10,
              burn: 50,
            };
            const multiplier = multipliers[p.stakeType || "lock"] || 10;
            const baseFunding = Number(p.stakeAmount || 0) * multiplier;
            const requestedFunding = Number(p.fundingRequested || 0);
            const fundingGap = requestedFunding - baseFunding;
            
            return {
              ...p,
              alreadySupported: !!existing,
              partnerCount: partners.length,
              totalPartnerStake,
              baseFunding: baseFunding.toString(),
              fundingGap: fundingGap.toString(),
            };
          })
      );

      return res.json(availableProposals);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/proposals/:id/claims", authMiddleware, async (req, res) => {
    try {
      const claims = await storage.getClaims(req.params.id);
      return res.json(claims);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/user/claims", authMiddleware, async (req, res) => {
    try {
      const claims = await storage.getClaimsByUser(req.user.id);
      return res.json(claims);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/proposals/:id/claim/apply", authMiddleware, async (req, res) => {
    try {
      const data = applyClaimSchema.parse(req.body);
      
      const proposal = await storage.getProposal(req.params.id);
      if (!proposal) {
        return res.status(404).json({ error: "Proposal not found" });
      }

      // 检查resolution字段
      if (proposal.resolution === "administrative_reject") {
        return res.status(400).json({ error: "管理员拒绝的提案可以直接赎回，无需申请" });
      }

      if (proposal.resolution !== "vote_passed" && proposal.resolution !== "vote_failed") {
        return res.status(400).json({ error: "只能对投票结束的提案申请赎回" });
      }

      const existing = await storage.getClaim(req.params.id, req.user.id, data.participationType);
      if (existing) {
        return res.status(400).json({ error: "已经申请过此赎回" });
      }

      let claimableAmount = "0";
      let canApply = false;

      if (data.participationType === "creator") {
        if (proposal.creatorId !== req.user.id) {
          return res.status(403).json({ error: "只有提案创建者才能申请创建者赎回" });
        }
        if (proposal.stakeAmount) {
          claimableAmount = proposal.stakeAmount;
          canApply = true;
        }
      } else if (data.participationType === "vote") {
        const vote = await storage.getVoteByVoter(req.params.id, req.user.id);
        if (!vote) {
          return res.status(403).json({ error: "您没有对此提案进行投票" });
        }
        if (vote.wanAmount) {
          claimableAmount = vote.wanAmount;
          canApply = true;
        }
      } else if (data.participationType === "partner") {
        const support = await storage.getPartnerSupport(req.params.id, req.user.id);
        if (!support) {
          return res.status(403).json({ error: "您没有为此提案提供Partner支持" });
        }
        if (support.wanAmount) {
          claimableAmount = support.wanAmount;
          canApply = true;
        }
      }

      if (!canApply || Number(claimableAmount) === 0) {
        return res.status(400).json({ error: "您没有可赎回的资金" });
      }

      const appliedAt = new Date();
      const claimableAt = new Date(appliedAt);
      claimableAt.setDate(claimableAt.getDate() + 3);

      const claim = await storage.createClaim({
        proposalId: req.params.id,
        userId: req.user.id,
        participationType: data.participationType,
        claimableAmount,
        status: "applied",
        appliedAt,
        claimableAt,
      });

      return res.json(claim);
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ error: "Invalid request data", details: error.errors });
      }
      return res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/proposals/:id/claim/execute", authMiddleware, async (req, res) => {
    try {
      const data = executeClaimSchema.parse(req.body);
      
      const proposal = await storage.getProposal(req.params.id);
      if (!proposal) {
        return res.status(404).json({ error: "Proposal not found" });
      }

      // 检查提案是否有有效的resolution
      const hasValidResolution = proposal.resolution === "administrative_reject" || 
                                  proposal.resolution === "vote_passed" || 
                                  proposal.resolution === "vote_failed";
      
      if (!hasValidResolution) {
        return res.status(400).json({ error: "提案尚未结束，无法赎回" });
      }

      // 管理员拒绝的提案可以直接赎回，不需要claim记录
      if (proposal.resolution === "administrative_reject") {
        // 验证用户权限
        let claimableAmount = "0";
        let canClaim = false;

        if (data.participationType === "creator") {
          if (proposal.creatorId !== req.user.id) {
            return res.status(403).json({ error: "只有提案创建者才能赎回" });
          }
          if (proposal.stakeAmount) {
            claimableAmount = proposal.stakeAmount;
            canClaim = true;
          }
        } else if (data.participationType === "partner") {
          const support = await storage.getPartnerSupport(req.params.id, req.user.id);
          if (!support) {
            return res.status(403).json({ error: "您没有为此提案提供Partner支持" });
          }
          if (support.wanAmount) {
            claimableAmount = support.wanAmount;
            canClaim = true;
          }
        } else {
          return res.status(400).json({ error: "管理员拒绝的提案不支持投票者赎回（因为未进行投票）" });
        }

        if (!canClaim || Number(claimableAmount) === 0) {
          return res.status(400).json({ error: "您没有可赎回的资金" });
        }

        // 直接返还资金
        await storage.updateUserBalance(req.user.id, "0", claimableAmount);

        return res.json({ success: true, claimedAmount: claimableAmount });
      }

      // 投票结束的提案需要先apply claim
      const claim = await storage.getClaim(req.params.id, req.user.id, data.participationType);
      if (!claim) {
        return res.status(404).json({ error: "未找到赎回申请，请先申请赎回" });
      }

      if (claim.userId !== req.user.id) {
        return res.status(403).json({ error: "您不能执行他人的赎回" });
      }

      if (claim.status === "claimed") {
        return res.status(400).json({ error: "已经赎回过了" });
      }

      if (claim.status === "applied") {
        if (claim.claimableAt && new Date() < new Date(claim.claimableAt)) {
          const waitTime = Math.ceil((new Date(claim.claimableAt).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
          return res.status(400).json({ error: `还需等待 ${waitTime} 天才能赎回` });
        }
      }

      await storage.updateUserBalance(req.user.id, "0", claim.claimableAmount);

      const claimedAt = new Date();
      await storage.updateClaimStatus(claim.id, "claimed", undefined, undefined, claimedAt);

      return res.json({ success: true, claimedAmount: claim.claimableAmount });
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ error: "Invalid request data", details: error.errors });
      }
      return res.status(400).json({ error: error.message });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
