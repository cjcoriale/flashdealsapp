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

  // Super merchant promotion (admin endpoint)
  app.post("/api/users/:id/promote-super-merchant", isAuthenticated, auditMiddleware("Promote Super Merchant"), async (req: AuditRequest, res) => {
    try {
      const targetUserId = req.params.id;
      const currentUserId = (req as any).user.claims.sub;
      
      // For now, allow self-promotion for testing - in production this would need admin check
      if (targetUserId !== currentUserId) {
        return res.status(403).json({ message: "Unauthorized to promote other users" });
      }

      const user = await storage.promoteUserToSuperMerchant(targetUserId);
      res.json({ message: "User promoted to super merchant", user });
    } catch (error) {
      auditError(req, error as Error, "Promote Super Merchant");
      res.status(500).json({ message: "Failed to promote user to super merchant" });
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

  app.put("/api/merchants/:id", isAuthenticated, auditMiddleware("Update Merchant"), async (req: AuditRequest, res) => {
    try {
      const userId = (req as any).user.claims.sub;
      const merchantId = parseInt(req.params.id);
      
      // Verify user owns this merchant or is super merchant
      const existingMerchant = await storage.getMerchant(merchantId);
      const currentUser = await storage.getUser(userId);
      
      if (!existingMerchant || (existingMerchant.userId !== userId && currentUser?.role !== 'super_merchant')) {
        return res.status(403).json({ message: "Unauthorized to update this merchant" });
      }

      const merchantData = insertMerchantSchema.parse({ ...req.body, userId: existingMerchant.userId });
      const updatedMerchant = await storage.updateMerchant(merchantId, merchantData);
      res.json(updatedMerchant);
    } catch (error) {
      auditError(req, error as Error, "Update Merchant");
      res.status(500).json({ message: "Failed to update merchant" });
    }
  });

  app.delete("/api/merchants/:id", isAuthenticated, auditMiddleware("Delete Merchant"), async (req: AuditRequest, res) => {
    try {
      const userId = (req as any).user.claims.sub;
      const merchantId = parseInt(req.params.id);
      
      // Verify user owns this merchant or is super merchant
      const existingMerchant = await storage.getMerchant(merchantId);
      const currentUser = await storage.getUser(userId);
      
      if (!existingMerchant || (existingMerchant.userId !== userId && currentUser?.role !== 'super_merchant')) {
        return res.status(403).json({ message: "Unauthorized to delete this merchant" });
      }

      await storage.deleteMerchant(merchantId);
      res.json({ message: "Merchant deleted successfully" });
    } catch (error) {
      auditError(req, error as Error, "Delete Merchant");
      res.status(500).json({ message: "Failed to delete merchant" });
    }
  });

  // Super merchant bulk business creation
  app.post("/api/super-merchant/bulk-businesses", isAuthenticated, auditMiddleware("Bulk Create Businesses"), async (req: AuditRequest, res) => {
    try {
      const currentUserId = (req as any).user.claims.sub;
      const currentUser = await storage.getUser(currentUserId);
      
      if (!currentUser || currentUser.role !== 'super_merchant') {
        return res.status(403).json({ message: "Super merchant access required" });
      }

      const { businesses } = req.body;
      if (!Array.isArray(businesses) || businesses.length === 0) {
        return res.status(400).json({ message: "Businesses array is required" });
      }

      const createdBusinesses = [];
      for (const businessData of businesses) {
        try {
          const merchantData = insertMerchantSchema.parse({ ...businessData, userId: currentUserId });
          const merchant = await storage.createMerchant(merchantData);
          createdBusinesses.push(merchant);
        } catch (error) {
          console.error(`Failed to create business: ${businessData.name}`, error);
        }
      }

      res.json({ 
        message: `Created ${createdBusinesses.length} businesses successfully`,
        businesses: createdBusinesses 
      });
    } catch (error) {
      auditError(req, error as Error, "Bulk Create Businesses");
      res.status(500).json({ message: "Failed to create businesses in bulk" });
    }
  });

  // Search businesses endpoint for super merchants
  app.post("/api/super-merchant/search-businesses", isAuthenticated, auditMiddleware("Search Businesses"), async (req: AuditRequest, res) => {
    try {
      const currentUserId = (req as any).user.claims.sub;
      const currentUser = await storage.getUser(currentUserId);
      
      console.log("Search request debug:", {
        userId: currentUserId,
        userRole: currentUser?.role,
        query: req.body.query
      });
      
      if (!currentUser || currentUser.role !== 'super_merchant') {
        console.log("Access denied - role check failed");
        return res.status(403).json({ message: "Super merchant access required" });
      }

      const { query } = req.body;
      if (!query || typeof query !== 'string') {
        console.log("Invalid query:", query);
        return res.status(400).json({ message: "Search query is required" });
      }

      // Use Google Places API for real business search
      const googleResults = await searchGooglePlaces(query);
      
      console.log("Google Places results:", googleResults.length);
      
      const response = { 
        query,
        results: googleResults,
        count: googleResults.length
      };
      
      console.log("Sending response:", response);
      res.json(response);
    } catch (error) {
      auditError(req, error as Error, "Search Businesses");
      res.status(500).json({ message: "Failed to search businesses" });
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

  app.get("/api/merchants/:id/deals/expired", auditMiddleware("View Expired Deals"), async (req: AuditRequest, res) => {
    try {
      const merchantId = parseInt(req.params.id);
      const expiredDeals = await storage.getExpiredDealsByMerchant(merchantId);
      res.json(expiredDeals);
    } catch (error) {
      auditError(req, error as Error, "View Expired Deals");
      res.status(500).json({ message: "Failed to fetch expired deals" });
    }
  });

  app.post("/api/deals/:id/repost", isAuthenticated, auditMiddleware("Repost Deal"), async (req: AuditRequest, res) => {
    try {
      const userId = (req as any).user.claims.sub;
      const dealId = parseInt(req.params.id);
      
      // Get the original deal
      const originalDeal = await storage.getDeal(dealId);
      if (!originalDeal) {
        return res.status(404).json({ message: "Deal not found" });
      }
      
      // Verify user owns this deal's merchant
      const merchant = await storage.getMerchant(originalDeal.merchantId);
      if (!merchant || merchant.userId !== userId) {
        return res.status(403).json({ message: "Unauthorized to repost this deal" });
      }
      
      // Create new deal with updated times
      const { startTime, endTime } = req.body;
      const { id, createdAt, ...dealDataWithoutId } = originalDeal;
      const newDealData = {
        ...dealDataWithoutId,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        currentRedemptions: 0, // Reset redemptions
        isActive: true
      };
      
      const newDeal = await storage.createDeal(newDealData);
      res.json(newDeal);
    } catch (error) {
      console.error("Deal repost error:", error);
      auditError(req, error as Error, "Repost Deal");
      res.status(500).json({ message: "Failed to repost deal" });
    }
  });

  app.post("/api/merchants/:id/deals", isAuthenticated, auditMiddleware("Create Deal"), async (req: AuditRequest, res) => {
    try {
      const userId = (req as any).user.claims.sub;
      const merchantId = parseInt(req.params.id);
      
      console.log("Create deal request:", { userId, merchantId, body: req.body });
      
      // Verify user owns this merchant or is super merchant
      const merchant = await storage.getMerchant(merchantId);
      const currentUser = await storage.getUser(userId);
      
      if (!merchant || (merchant.userId !== userId && currentUser?.role !== 'super_merchant')) {
        return res.status(403).json({ message: "Unauthorized to create deals for this merchant" });
      }

      // Convert string dates to Date objects
      const bodyWithDates = {
        ...req.body,
        merchantId,
        startTime: new Date(req.body.startTime),
        endTime: new Date(req.body.endTime)
      };
      
      const dealData = insertDealSchema.parse(bodyWithDates);
      console.log("Parsed deal data:", dealData);
      
      const deal = await storage.createDeal(dealData);
      console.log("Created deal:", deal);
      
      res.json(deal);
    } catch (error) {
      console.error("Deal creation error:", error);
      auditError(req, error as Error, "Create Deal");
      res.status(500).json({ message: "Failed to create deal", error: (error as Error).message });
    }
  });

  // Delete deal route
  app.delete("/api/deals/:id", isAuthenticated, auditMiddleware("Delete Deal"), async (req: AuditRequest, res) => {
    try {
      const userId = (req as any).user.claims.sub;
      const dealId = parseInt(req.params.id);
      
      // Get the deal to verify ownership
      const deal = await storage.getDeal(dealId);
      if (!deal) {
        return res.status(404).json({ message: "Deal not found" });
      }
      
      // Verify user owns this deal's merchant
      const merchant = await storage.getMerchant(deal.merchantId);
      const currentUser = await storage.getUser(userId);
      
      if (!merchant || (merchant.userId !== userId && currentUser?.role !== 'super_merchant')) {
        return res.status(403).json({ message: "Unauthorized to delete this deal" });
      }
      
      await storage.deleteDeal(dealId);
      res.json({ message: "Deal deleted successfully" });
    } catch (error) {
      console.error("Deal deletion error:", error);
      auditError(req, error as Error, "Delete Deal");
      res.status(500).json({ message: "Failed to delete deal" });
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
        deal.category.toLowerCase().includes(searchTerm) ||
        deal.merchant.address.toLowerCase().includes(searchTerm) ||
        deal.merchant.city?.toLowerCase().includes(searchTerm) ||
        deal.merchant.state?.toLowerCase().includes(searchTerm)
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

  // Recurring deals management
  app.post("/api/deals/process-recurring", isAuthenticated, auditMiddleware("Process Recurring Deals"), async (req: AuditRequest, res) => {
    try {
      const processedCount = await processRecurringDeals();
      res.json({ message: `Processed ${processedCount} recurring deals`, count: processedCount });
    } catch (error) {
      auditError(req, error as Error, "Process Recurring Deals");
      res.status(500).json({ message: "Failed to process recurring deals" });
    }
  });

  // State management (for super merchants)
  app.get("/api/enabled-states", auditMiddleware("Get Enabled States"), async (req: AuditRequest, res) => {
    try {
      const enabledStates = await storage.getEnabledStates();
      res.json(enabledStates);
    } catch (error) {
      auditError(req, error as Error, "Get Enabled States");
      res.status(500).json({ message: "Failed to fetch enabled states" });
    }
  });

  app.post("/api/enabled-states", isAuthenticated, auditMiddleware("Update Enabled States"), async (req: AuditRequest, res) => {
    try {
      const { enabledStates } = req.body;
      await storage.setEnabledStates(enabledStates);
      res.json({ message: "Enabled states updated successfully", enabledStates });
    } catch (error) {
      auditError(req, error as Error, "Update Enabled States");
      res.status(500).json({ message: "Failed to update enabled states" });
    }
  });

  // App settings management
  app.get("/api/app-settings", isAuthenticated, auditMiddleware("Get App Settings"), async (req: AuditRequest, res) => {
    try {
      const settings = await storage.getAllAppSettings();
      res.json(settings);
    } catch (error) {
      auditError(req, error as Error, "Get App Settings");
      res.status(500).json({ message: "Failed to fetch app settings" });
    }
  });

  app.get("/api/app-settings/:key", isAuthenticated, auditMiddleware("Get App Setting"), async (req: AuditRequest, res) => {
    try {
      const { key } = req.params;
      const setting = await storage.getAppSetting(key);
      if (!setting) {
        return res.status(404).json({ message: "Setting not found" });
      }
      res.json(setting);
    } catch (error) {
      auditError(req, error as Error, "Get App Setting");
      res.status(500).json({ message: "Failed to fetch app setting" });
    }
  });

  app.post("/api/app-settings", isAuthenticated, auditMiddleware("Set App Setting"), async (req: AuditRequest, res) => {
    try {
      const currentUserId = (req as any).user.claims.sub;
      const currentUser = await storage.getUser(currentUserId);
      
      if (!currentUser || currentUser.role !== 'super_merchant') {
        return res.status(403).json({ message: "Super merchant access required" });
      }

      const { key, value, description, category } = req.body;
      const setting = await storage.setAppSetting(key, value, description, category, currentUserId);
      res.json({ message: "App setting updated successfully", setting });
    } catch (error) {
      auditError(req, error as Error, "Set App Setting");
      res.status(500).json({ message: "Failed to update app setting" });
    }
  });

  // User preferences management
  app.get("/api/user-preferences", isAuthenticated, auditMiddleware("Get User Preferences"), async (req: AuditRequest, res) => {
    try {
      const currentUserId = (req as any).user.claims.sub;
      const { category } = req.query;
      const preferences = await storage.getUserPreferences(currentUserId, category as string);
      res.json(preferences);
    } catch (error) {
      auditError(req, error as Error, "Get User Preferences");
      res.status(500).json({ message: "Failed to fetch user preferences" });
    }
  });

  app.get("/api/user-preferences/:key", isAuthenticated, auditMiddleware("Get User Preference"), async (req: AuditRequest, res) => {
    try {
      const currentUserId = (req as any).user.claims.sub;
      const { key } = req.params;
      const preference = await storage.getUserPreference(currentUserId, key);
      if (!preference) {
        return res.status(404).json({ message: "Preference not found" });
      }
      res.json(preference);
    } catch (error) {
      auditError(req, error as Error, "Get User Preference");
      res.status(500).json({ message: "Failed to fetch user preference" });
    }
  });

  app.post("/api/user-preferences", isAuthenticated, auditMiddleware("Set User Preference"), async (req: AuditRequest, res) => {
    try {
      const currentUserId = (req as any).user.claims.sub;
      const { key, value, category } = req.body;
      const preference = await storage.setUserPreference(currentUserId, key, value, category);
      res.json({ message: "User preference updated successfully", preference });
    } catch (error) {
      auditError(req, error as Error, "Set User Preference");
      res.status(500).json({ message: "Failed to update user preference" });
    }
  });

  app.delete("/api/user-preferences/:key", isAuthenticated, auditMiddleware("Delete User Preference"), async (req: AuditRequest, res) => {
    try {
      const currentUserId = (req as any).user.claims.sub;
      const { key } = req.params;
      await storage.deleteUserPreference(currentUserId, key);
      res.json({ message: "User preference deleted successfully" });
    } catch (error) {
      auditError(req, error as Error, "Delete User Preference");
      res.status(500).json({ message: "Failed to delete user preference" });
    }
  });

  // Background task to process recurring deals
  const processRecurringDeals = async () => {
    try {
      const allDeals = await storage.getAllExpiredDeals();
      let processedCount = 0;

      for (const deal of allDeals) {
        if (deal.isRecurring && deal.recurringInterval) {
          const now = new Date();
          const lastRecurred = deal.lastRecurredAt ? new Date(deal.lastRecurredAt) : new Date(deal.createdAt!);
          
          let shouldRecur = false;
          
          switch (deal.recurringInterval) {
            case 'daily':
              shouldRecur = now.getTime() - lastRecurred.getTime() >= 24 * 60 * 60 * 1000;
              break;
            case 'weekly':
              shouldRecur = now.getTime() - lastRecurred.getTime() >= 7 * 24 * 60 * 60 * 1000;
              break;
            case 'monthly':
              shouldRecur = now.getTime() - lastRecurred.getTime() >= 30 * 24 * 60 * 60 * 1000;
              break;
          }
          
          if (shouldRecur) {
            // Create a new deal with the same properties but new timing
            const newDeal = {
              merchantId: deal.merchantId,
              title: deal.title,
              description: deal.description,
              originalPrice: deal.originalPrice,
              discountedPrice: deal.discountedPrice,
              discountPercentage: deal.discountPercentage,
              category: deal.category,
              startTime: now,
              endTime: new Date(now.getTime() + 24 * 60 * 60 * 1000), // 24 hours from now
              maxRedemptions: deal.maxRedemptions,
              currentRedemptions: 0,
              isActive: true,
              isRecurring: true,
              recurringInterval: deal.recurringInterval,
            };
            
            await storage.createDeal(newDeal);
            
            // Update the original deal's lastRecurredAt timestamp
            await storage.updateDeal(deal.id, { lastRecurredAt: now } as any);
            
            processedCount++;
          }
        }
      }
      
      return processedCount;
    } catch (error) {
      console.error("Error processing recurring deals:", error);
      return 0;
    }
  };

  // Start recurring deals processor (every hour)
  setInterval(async () => {
    try {
      const processedCount = await processRecurringDeals();
      if (processedCount > 0) {
        console.log(`Processed ${processedCount} recurring deals`);
      }
    } catch (error) {
      console.error("Error in recurring deals processor:", error);
    }
  }, 60 * 60 * 1000); // Run every hour

  const httpServer = createServer(app);
  return httpServer;
}

async function searchGooglePlaces(query: string): Promise<any[]> {
  try {
    const apiKey = process.env.GOOGLE_PLACES_API_KEY_UNRESTRICTED || process.env.GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
      console.error("Google Places API key not found");
      return [];
    }

    // Try Nearby Search first, then fall back to Text Search if needed
    const location = "33.4484,-112.0740"; // Phoenix, AZ coordinates as default
    const radius = "50000"; // 50km radius
    
    // Use Google Places Nearby Search API (this should work with basic Places API)
    const nearbyUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${location}&radius=${radius}&type=restaurant&keyword=${encodeURIComponent(query)}&key=${apiKey}`;
    
    console.log("Searching Google Places Nearby Search for:", query);
    
    let response = await fetch(nearbyUrl);
    let data = await response.json();

    // If nearby search fails or returns no results, try text search
    if (data.status !== 'OK' || !data.results || data.results.length === 0) {
      console.log("Nearby search failed or no results, trying text search...");
      const textSearchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query + " restaurant")}&key=${apiKey}`;
      response = await fetch(textSearchUrl);
      data = await response.json();
    }

    if (data.status !== 'OK') {
      console.error("Google Places API error:", data.status, data.error_message || data);
      console.log("Full API response:", JSON.stringify(data, null, 2));
      return [];
    }

    if (!data.results || data.results.length === 0) {
      console.log("No places found for query:", query);
      return [];
    }

    const results = data.results.slice(0, 10).map((place: any) => {
      // Get photo URL if available
      let photo = null;
      if (place.photos && place.photos.length > 0) {
        const photoReference = place.photos[0].photo_reference;
        photo = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photoReference}&key=${apiKey}`;
      }

      return {
        name: place.name,
        address: place.formatted_address || place.vicinity,
        category: "restaurant",
        phone: null, // Will need Place Details API for phone
        rating: place.rating || null,
        photo: photo,
        latitude: place.geometry?.location?.lat || null,
        longitude: place.geometry?.location?.lng || null,
        place_id: place.place_id,
        price_level: place.price_level || null,
        user_ratings_total: place.user_ratings_total || null
      };
    });

    console.log(`Found ${results.length} places from Google Places API`);
    return results;

  } catch (error) {
    console.error("Error searching Google Places:", error);
    return [];
  }
}

function generateMockBusinessResults(query: string): any[] {
  const queryLower = query.toLowerCase();
  const results = [];

  // Generate relevant business results based on query
  if (queryLower.includes('pizza')) {
    results.push(
      {
        name: "Tony's Authentic Pizzeria",
        address: "145 Bleecker St, New York, NY 10012",
        category: "restaurant",
        phone: "+1 (212) 555-0145",
        rating: 4.5,
        photo: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400",
        latitude: 40.7282,
        longitude: -74.0059
      },
      {
        name: "Slice Heaven",
        address: "789 Broadway, New York, NY 10003",
        category: "restaurant", 
        phone: "+1 (212) 555-0789",
        rating: 4.2,
        photo: "https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400",
        latitude: 40.7328,
        longitude: -73.9903
      },
      {
        name: "Brooklyn Style Pizza Co.",
        address: "456 Park Ave, Brooklyn, NY 11215",
        category: "restaurant",
        phone: "+1 (718) 555-0456",
        rating: 4.3,
        photo: "https://images.unsplash.com/photo-1534308983923-353928dc5df9?w=400",
        latitude: 40.6782,
        longitude: -73.9442
      },
      {
        name: "Artisan Wood Fire Pizza",
        address: "321 5th Ave, Manhattan, NY 10016",
        category: "restaurant",
        phone: "+1 (212) 555-0321",
        rating: 4.7,
        photo: "https://images.unsplash.com/photo-1571997478779-2adcbbe9ab2f?w=400",
        latitude: 40.7505,
        longitude: -73.9934
      },
      {
        name: "Giuseppe's Pizza Palace",
        address: "987 Atlantic Ave, Queens, NY 11238",
        category: "restaurant",
        phone: "+1 (718) 555-0987",
        rating: 4.0,
        photo: "https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400",
        latitude: 40.6892,
        longitude: -73.9442
      }
    );
  }

  if (queryLower.includes('coffee')) {
    results.push(
      {
        name: "Artisan Coffee Co.",
        address: "234 Pine St, Seattle, WA 98101",
        category: "restaurant",
        phone: "+1 (206) 555-0234",
        rating: 4.7,
        photo: "https://images.unsplash.com/photo-1498804103079-a6351b050096?w=400",
        latitude: 47.6097,
        longitude: -122.3331
      },
      {
        name: "Brew & Beans",
        address: "567 Capitol Hill, Seattle, WA 98102",
        category: "restaurant",
        phone: "+1 (206) 555-0567", 
        rating: 4.3,
        photo: "https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=400",
        latitude: 47.6205,
        longitude: -122.3212
      },
      {
        name: "The Daily Grind",
        address: "123 University Way, Seattle, WA 98105",
        category: "restaurant",
        phone: "+1 (206) 555-0123",
        rating: 4.1,
        photo: "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=400",
        latitude: 47.6587,
        longitude: -122.3050
      },
      {
        name: "Roaster's Corner",
        address: "789 1st Ave, Seattle, WA 98104",
        category: "restaurant",
        phone: "+1 (206) 555-0789",
        rating: 4.5,
        photo: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400",
        latitude: 47.6039,
        longitude: -122.3351
      },
      {
        name: "Espresso Central",
        address: "456 Fremont Ave, Seattle, WA 98103",
        category: "restaurant",
        phone: "+1 (206) 555-0456",
        rating: 4.4,
        photo: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400",
        latitude: 47.6506,
        longitude: -122.3480
      }
    );
  }

  if (queryLower.includes('sushi')) {
    results.push(
      {
        name: "Sakura Sushi Bar",
        address: "321 Union St, San Francisco, CA 94133",
        category: "restaurant",
        phone: "+1 (415) 555-0321",
        rating: 4.6,
        photo: "https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=400",
        latitude: 37.8024,
        longitude: -122.4058
      }
    );
  }

  if (queryLower.includes('barbecue') || queryLower.includes('bbq')) {
    results.push(
      {
        name: "Smoky Joe's BBQ",
        address: "456 South St, Austin, TX 78701",
        category: "restaurant",
        phone: "+1 (512) 555-0456",
        rating: 4.4,
        photo: "https://images.unsplash.com/photo-1544025162-d76694265947?w=400",
        latitude: 30.2672,
        longitude: -97.7431
      }
    );
  }

  if (queryLower.includes('taco')) {
    results.push(
      {
        name: "El Taco Loco",
        address: "890 Sunset Blvd, Los Angeles, CA 90026",
        category: "restaurant",
        phone: "+1 (213) 555-0890",
        rating: 4.1,
        photo: "https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=400",
        latitude: 34.0522,
        longitude: -118.2437
      }
    );
  }

  if (queryLower.includes('burger')) {
    results.push(
      {
        name: "The Burger Joint",
        address: "234 Main St, Los Angeles, CA 90210",
        category: "restaurant",
        phone: "+1 (310) 555-0234",
        rating: 4.2,
        photo: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400",
        latitude: 34.0522,
        longitude: -118.2437
      },
      {
        name: "Gourmet Burgers & Fries",
        address: "567 Hollywood Blvd, Los Angeles, CA 90028",
        category: "restaurant",
        phone: "+1 (323) 555-0567",
        rating: 4.5,
        photo: "https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=400",
        latitude: 34.1016,
        longitude: -118.3267
      }
    );
  }

  if (queryLower.includes('chinese') || queryLower.includes('asian')) {
    results.push(
      {
        name: "Golden Dragon Chinese Restaurant",
        address: "789 Chinatown Ave, San Francisco, CA 94108",
        category: "restaurant",
        phone: "+1 (415) 555-0789",
        rating: 4.3,
        photo: "https://images.unsplash.com/photo-1526318896980-cf78c088247c?w=400",
        latitude: 37.7946,
        longitude: -122.4068
      },
      {
        name: "Panda Express Plus",
        address: "123 Grant Ave, San Francisco, CA 94108",
        category: "restaurant",
        phone: "+1 (415) 555-0123",
        rating: 4.0,
        photo: "https://images.unsplash.com/photo-1563379091339-03246963d3d9?w=400",
        latitude: 37.7955,
        longitude: -122.4068
      }
    );
  }

  if (queryLower.includes('mexican') || queryLower.includes('taco')) {
    results.push(
      {
        name: "El Taco Loco",
        address: "890 Sunset Blvd, Los Angeles, CA 90026",
        category: "restaurant",
        phone: "+1 (213) 555-0890",
        rating: 4.1,
        photo: "https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=400",
        latitude: 34.0522,
        longitude: -118.2437
      },
      {
        name: "Authentic Mexican Cantina",
        address: "456 Olvera St, Los Angeles, CA 90012",
        category: "restaurant",
        phone: "+1 (213) 555-0456",
        rating: 4.4,
        photo: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400",
        latitude: 34.0570,
        longitude: -118.2368
      }
    );
  }

  // Add some default restaurants if no specific matches
  if (results.length === 0) {
    results.push(
      {
        name: "Local Bistro",
        address: "123 Main St, Your City, State 12345",
        category: "restaurant",
        phone: "+1 (555) 123-4567",
        rating: 4.0,
        photo: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400",
        latitude: 40.7128,
        longitude: -74.0060
      },
      {
        name: "Corner Cafe",
        address: "456 Oak Ave, Your City, State 12345", 
        category: "restaurant",
        phone: "+1 (555) 456-7890",
        rating: 3.9,
        photo: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400",
        latitude: 40.7589,
        longitude: -73.9851
      },
      {
        name: "Downtown Deli",
        address: "789 Business District, Your City, State 12345",
        category: "restaurant",
        phone: "+1 (555) 789-0123",
        rating: 4.1,
        photo: "https://images.unsplash.com/photo-1504754524776-8f4f37790ca0?w=400",
        latitude: 40.7614,
        longitude: -73.9776
      }
    );
  }

  return results.slice(0, 10); // Return max 10 results
}