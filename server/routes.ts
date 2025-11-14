import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { insertUserSchema, insertProposalSchema, insertVoteSchema, insertPartnerSupportSchema } from "@shared/schema";
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

  app.get("/api/auth/me", authMiddleware, async (req, res) => {
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

  app.get("/api/proposals", async (req, res) => {
    try {
      const proposals = await storage.getProposals();
      
      const enriched = await Promise.all(
        proposals.map(async (p) => {
          const partners = await storage.getPartnerSupports(p.id);
          const totalPartnerStake = partners.reduce((sum, ps) => sum + Number(ps.wanAmount), 0).toString();
          return {
            ...p,
            partnerCount: partners.length,
            totalPartnerStake,
          };
        })
      );

      return res.json(enriched);
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
      if (req.user.role !== "partner" && req.user.role !== "admin") {
        return res.status(403).json({ error: "Partner role required" });
      }

      const proposal = await storage.getProposal(req.params.id);
      if (!proposal) {
        return res.status(404).json({ error: "Proposal not found" });
      }

      if (proposal.type !== "funding") {
        return res.status(400).json({ error: "Only funding proposals can receive partner support" });
      }

      if (proposal.status !== "approved" && proposal.status !== "pending") {
        return res.status(400).json({ error: "Proposal is not open for support" });
      }

      if (proposal.creatorId === req.user.id) {
        return res.status(400).json({ error: "Cannot support your own proposal" });
      }

      const existing = await storage.getPartnerSupport(req.params.id, req.user.id);
      if (existing) {
        return res.status(400).json({ error: "You have already supported this proposal" });
      }

      const data = insertPartnerSupportSchema.parse({
        ...req.body,
        proposalId: req.params.id,
        partnerId: req.user.id,
      });

      if (Number(req.user.wanBalance) < Number(data.wanAmount)) {
        return res.status(400).json({ error: "Insufficient WAN balance" });
      }

      await storage.updateUserBalance(req.user.id, "0", `-${data.wanAmount}`);

      const support = await storage.createPartnerSupport(data);

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
      if (req.user.role !== "partner" && req.user.role !== "admin") {
        return res.status(403).json({ error: "Partner role required" });
      }

      const supports = await storage.getPartnerSupportsByPartner(req.user.id);
      return res.json(supports);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/partner/available-proposals", authMiddleware, async (req, res) => {
    try {
      if (req.user.role !== "partner" && req.user.role !== "admin") {
        return res.status(403).json({ error: "Partner role required" });
      }

      const allProposals = await storage.getProposals();
      
      const availableProposals = await Promise.all(
        allProposals
          .filter(p => 
            p.type === "funding" && 
            (p.status === "pending" || p.status === "approved" || p.status === "active") &&
            p.creatorId !== req.user.id
          )
          .map(async (p) => {
            const existing = await storage.getPartnerSupport(p.id, req.user.id);
            const partners = await storage.getPartnerSupports(p.id);
            const totalPartnerStake = partners.reduce((sum, ps) => sum + Number(ps.wanAmount), 0).toString();
            
            return {
              ...p,
              alreadySupported: !!existing,
              partnerCount: partners.length,
              totalPartnerStake,
            };
          })
      );

      return res.json(availableProposals);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
