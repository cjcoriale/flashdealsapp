import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupSimpleAuth, isAuthenticated } from "./simpleAuth";
import cookieParser from "cookie-parser";
import { auditMiddleware, type AuditRequest, auditError } from "./middleware/audit";
import { insertDealSchema, insertMerchantSchema, insertSavedDealSchema, insertDealClaimSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Cookie parser for simple auth
  app.use(cookieParser());
  
  // Auth middleware
  await setupSimpleAuth(app);

  // Note: Auth routes are now handled in setupSimpleAuth

  // Public deal routes (no auth required)
  app.get("/api/deals", auditMiddleware("View Deals"), async (req: AuditRequest, res) => {
    try {
      const deals = await storage.getAllActiveDeals();
      res.json(deals);
    } catch (error) {
      auditError(req, error as Error, "View Deals");
      res.status(500).json({ message: "Failed to fetch deals" });
    }
  });

  app.get("/api/deals/location", auditMiddleware("Location Search"), async (req: AuditRequest, res) => {
    try {
      const { lat, lng, radius = 10 } = req.query;
      if (!lat || !lng) {
        return res.status(400).json({ message: "Latitude and longitude are required" });
      }
      
      const deals = await storage.getDealsByLocation(
        parseFloat(lat as string),
        parseFloat(lng as string),
        parseFloat(radius as string)
      );
      res.json(deals);
    } catch (error) {
      auditError(req, error as Error, "Location Search");
      res.status(500).json({ message: "Failed to fetch deals by location" });
    }
  });

  app.get("/api/deals/:id", auditMiddleware("View Deal Details"), async (req: AuditRequest, res) => {
    try {
      const deal = await storage.getDeal(parseInt(req.params.id));
      if (!deal) {
        return res.status(404).json({ message: "Deal not found" });
      }
      res.json(deal);
    } catch (error) {
      auditError(req, error as Error, "View Deal Details");
      res.status(500).json({ message: "Failed to fetch deal" });
    }
  });

  // Protected routes (require authentication)
  app.post("/api/deals/:id/claim", isAuthenticated, auditMiddleware("Claim Deal"), async (req: AuditRequest, res) => {
    try {
      const userId = (req as any).user.claims.sub;
      const dealId = parseInt(req.params.id);
      
      // Check if deal exists and is still active
      const deal = await storage.getDeal(dealId);
      if (!deal || !deal.isActive || new Date() > new Date(deal.endTime)) {
        return res.status(400).json({ message: "Deal is no longer available" });
      }

      // Check if user already claimed this deal
      const existingClaims = await storage.getClaimedDeals(userId);
      const alreadyClaimed = existingClaims.some(claim => claim.dealId === dealId);
      if (alreadyClaimed) {
        return res.status(400).json({ message: "Deal already claimed" });
      }

      // Check if deal has remaining redemptions
      if (deal.currentRedemptions && deal.maxRedemptions && deal.currentRedemptions >= deal.maxRedemptions) {
        return res.status(400).json({ message: "Deal has reached maximum redemptions" });
      }

      const dealClaim = await storage.claimDeal({ userId, dealId });
      res.json(dealClaim);
    } catch (error) {
      auditError(req, error as Error, "Claim Deal");
      res.status(500).json({ message: "Failed to claim deal" });
    }
  });

  // Saved deals routes
  app.get("/api/saved-deals", isAuthenticated, auditMiddleware("View Saved Deals"), async (req: AuditRequest, res) => {
    try {
      const userId = (req as any).user.claims.sub;
      const savedDeals = await storage.getSavedDeals(userId);
      res.json(savedDeals);
    } catch (error) {
      auditError(req, error as Error, "View Saved Deals");
      res.status(500).json({ message: "Failed to fetch saved deals" });
    }
  });

  app.post("/api/deals/:id/save", isAuthenticated, auditMiddleware("Save Deal"), async (req: AuditRequest, res) => {
    try {
      const userId = (req as any).user.claims.sub;
      const dealId = parseInt(req.params.id);
      
      // Check if already saved
      const alreadySaved = await storage.isDealSaved(userId, dealId);
      if (alreadySaved) {
        return res.status(400).json({ message: "Deal already saved" });
      }

      const savedDeal = await storage.saveDeal({ userId, dealId });
      res.json(savedDeal);
    } catch (error) {
      auditError(req, error as Error, "Save Deal");
      res.status(500).json({ message: "Failed to save deal" });
    }
  });

  app.delete("/api/deals/:id/save", isAuthenticated, auditMiddleware("Unsave Deal"), async (req: AuditRequest, res) => {
    try {
      const userId = (req as any).user.claims.sub;
      const dealId = parseInt(req.params.id);
      
      await storage.unsaveDeal(userId, dealId);
      res.json({ message: "Deal unsaved successfully" });
    } catch (error) {
      auditError(req, error as Error, "Unsave Deal");
      res.status(500).json({ message: "Failed to unsave deal" });
    }
  });

  // Claimed deals routes
  app.get("/api/claimed-deals", isAuthenticated, auditMiddleware("View Claimed Deals"), async (req: AuditRequest, res) => {
    try {
      const userId = (req as any).user.claims.sub;
      const claimedDeals = await storage.getClaimedDeals(userId);
      res.json(claimedDeals);
    } catch (error) {
      auditError(req, error as Error, "View Claimed Deals");
      res.status(500).json({ message: "Failed to fetch claimed deals" });
    }
  });

  // Merchant routes
  app.get("/api/merchants", auditMiddleware("View Merchants"), async (req: AuditRequest, res) => {
    try {
      const merchants = await storage.getAllMerchants();
      res.json(merchants);
    } catch (error) {
      auditError(req, error as Error, "View Merchants");
      res.status(500).json({ message: "Failed to fetch merchants" });
    }
  });

  app.get("/api/my-merchants", isAuthenticated, auditMiddleware("View My Merchants"), async (req: AuditRequest, res) => {
    try {
      const userId = (req as any).user.claims.sub;
      const merchants = await storage.getMerchantsByUser(userId);
      res.json(merchants);
    } catch (error) {
      auditError(req, error as Error, "View My Merchants");
      res.status(500).json({ message: "Failed to fetch user merchants" });
    }
  });

  app.post("/api/merchants", isAuthenticated, auditMiddleware("Create Merchant"), async (req: AuditRequest, res) => {
    try {
      const userId = (req as any).user.claims.sub;
      const merchantData = insertMerchantSchema.parse({ ...req.body, userId });
      const merchant = await storage.createMerchant(merchantData);
      res.json(merchant);
    } catch (error) {
      auditError(req, error as Error, "Create Merchant");
      res.status(500).json({ message: "Failed to create merchant" });
    }
  });

  app.get("/api/merchants/:id/deals", auditMiddleware("View Merchant Deals"), async (req: AuditRequest, res) => {
    try {
      const merchantId = parseInt(req.params.id);
      const deals = await storage.getDealsByMerchant(merchantId);
      res.json(deals);
    } catch (error) {
      auditError(req, error as Error, "View Merchant Deals");
      res.status(500).json({ message: "Failed to fetch merchant deals" });
    }
  });

  app.post("/api/merchants/:id/deals", isAuthenticated, auditMiddleware("Create Deal"), async (req: AuditRequest, res) => {
    try {
      const userId = (req as any).user.claims.sub;
      const merchantId = parseInt(req.params.id);
      
      console.log("Create deal request:", { userId, merchantId, body: req.body });
      
      // Verify user owns this merchant
      const merchant = await storage.getMerchant(merchantId);
      if (!merchant || merchant.userId !== userId) {
        return res.status(403).json({ message: "Unauthorized to create deals for this merchant" });
      }

      const dealData = insertDealSchema.parse({ ...req.body, merchantId });
      console.log("Parsed deal data:", dealData);
      
      const deal = await storage.createDeal(dealData);
      console.log("Created deal:", deal);
      
      res.json(deal);
    } catch (error) {
      console.error("Deal creation error:", error);
      auditError(req, error as Error, "Create Deal");
      res.status(500).json({ message: "Failed to create deal", error: error.message });
    }
  });

  // Search routes
  app.get("/api/search", auditMiddleware("Search"), async (req: AuditRequest, res) => {
    try {
      const { q } = req.query;
      if (!q) {
        return res.json([]);
      }
      
      // Simple search - in production would use full-text search
      const allDeals = await storage.getAllActiveDeals();
      const searchTerm = (q as string).toLowerCase();
      const filteredDeals = allDeals.filter(deal => 
        deal.title.toLowerCase().includes(searchTerm) ||
        deal.description?.toLowerCase().includes(searchTerm) ||
        deal.merchant.name.toLowerCase().includes(searchTerm) ||
        deal.category.toLowerCase().includes(searchTerm)
      );
      
      res.json(filteredDeals);
    } catch (error) {
      auditError(req, error as Error, "Search");
      res.status(500).json({ message: "Failed to search deals" });
    }
  });

  // Audit routes (admin only - for now just check if user exists)
  app.get("/api/audit/logs", isAuthenticated, auditMiddleware("View Audit Logs"), async (req: AuditRequest, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const logs = await storage.getAuditLogs(limit);
      res.json(logs);
    } catch (error) {
      auditError(req, error as Error, "View Audit Logs");
      res.status(500).json({ message: "Failed to fetch audit logs" });
    }
  });

  app.get("/api/audit/stats", isAuthenticated, auditMiddleware("View Audit Stats"), async (req: AuditRequest, res) => {
    try {
      const stats = await storage.getAuditStats();
      res.json(stats);
    } catch (error) {
      auditError(req, error as Error, "View Audit Stats");
      res.status(500).json({ message: "Failed to fetch audit stats" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}