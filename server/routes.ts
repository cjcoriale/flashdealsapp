import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { auditMiddleware, auditError, type AuditRequest } from "./middleware/audit";

export async function registerRoutes(app: Express): Promise<Server> {
  // Get all active deals
  app.get("/api/deals", auditMiddleware("View Deals"), async (req: AuditRequest, res) => {
    try {
      const deals = await storage.getAllActiveDeals();
      res.json(deals);
    } catch (error) {
      auditError(req, error as Error, "View Deals");
      res.status(500).json({ error: "Failed to fetch deals" });
    }
  });

  // Get deals by location
  app.get("/api/deals/location", auditMiddleware("Location Search"), async (req: AuditRequest, res) => {
    try {
      const { lat, lng, radius = 10 } = req.query;
      
      if (!lat || !lng) {
        return res.status(400).json({ error: "Latitude and longitude are required" });
      }

      const deals = await storage.getDealsByLocation(
        parseFloat(lat as string),
        parseFloat(lng as string),
        parseFloat(radius as string)
      );
      
      res.json(deals);
    } catch (error) {
      auditError(req, error as Error, "Location Search");
      res.status(500).json({ error: "Failed to fetch deals by location" });
    }
  });

  // Get specific deal
  app.get("/api/deals/:id", auditMiddleware("View Deal Details"), async (req: AuditRequest, res) => {
    try {
      const dealId = parseInt(req.params.id);
      const deal = await storage.getDeal(dealId);
      
      if (!deal) {
        return res.status(404).json({ error: "Deal not found" });
      }

      const merchant = await storage.getMerchant(deal.merchantId);
      res.json({ ...deal, merchant });
    } catch (error) {
      auditError(req, error as Error, "View Deal Details");
      res.status(500).json({ error: "Failed to fetch deal details" });
    }
  });

  // Claim a deal
  app.post("/api/deals/:id/claim", auditMiddleware("Claim Deal"), async (req: AuditRequest, res) => {
    try {
      const dealId = parseInt(req.params.id);
      const deal = await storage.getDeal(dealId);
      
      if (!deal) {
        return res.status(404).json({ error: "Deal not found" });
      }

      if (!deal.isActive || new Date(deal.endTime) <= new Date()) {
        return res.status(400).json({ error: "Deal is no longer active" });
      }

      if (deal.maxRedemptions && deal.currentRedemptions >= deal.maxRedemptions) {
        return res.status(400).json({ error: "Deal has reached maximum redemptions" });
      }

      await storage.updateDealRedemptions(dealId);
      res.json({ message: "Deal claimed successfully" });
    } catch (error) {
      auditError(req, error as Error, "Claim Deal");
      res.status(500).json({ error: "Failed to claim deal" });
    }
  });

  // Get all merchants
  app.get("/api/merchants", auditMiddleware("View Merchants"), async (req: AuditRequest, res) => {
    try {
      const merchants = await storage.getAllMerchants();
      res.json(merchants);
    } catch (error) {
      auditError(req, error as Error, "View Merchants");
      res.status(500).json({ error: "Failed to fetch merchants" });
    }
  });

  // Search deals
  app.get("/api/search", auditMiddleware("Search"), async (req: AuditRequest, res) => {
    try {
      const { q } = req.query;
      
      if (!q) {
        return res.status(400).json({ error: "Search query is required" });
      }

      const deals = await storage.getAllActiveDeals();
      const query = (q as string).toLowerCase();
      
      const filteredDeals = deals.filter(deal => 
        deal.title.toLowerCase().includes(query) ||
        deal.description?.toLowerCase().includes(query) ||
        deal.merchant.name.toLowerCase().includes(query) ||
        deal.merchant.category.toLowerCase().includes(query)
      );

      res.json(filteredDeals);
    } catch (error) {
      auditError(req, error as Error, "Search");
      res.status(500).json({ error: "Failed to search deals" });
    }
  });

  // Get audit logs
  app.get("/api/audit/logs", auditMiddleware("View Audit Logs"), async (req: AuditRequest, res) => {
    try {
      const { limit = 50 } = req.query;
      const logs = await storage.getAuditLogs(parseInt(limit as string));
      res.json(logs);
    } catch (error) {
      auditError(req, error as Error, "View Audit Logs");
      res.status(500).json({ error: "Failed to fetch audit logs" });
    }
  });

  // Get audit statistics
  app.get("/api/audit/stats", auditMiddleware("View Audit Stats"), async (req: AuditRequest, res) => {
    try {
      const stats = await storage.getAuditStats();
      res.json(stats);
    } catch (error) {
      auditError(req, error as Error, "View Audit Stats");
      res.status(500).json({ error: "Failed to fetch audit statistics" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
