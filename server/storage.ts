import { users, merchants, deals, auditLogs, type User, type InsertUser, type Merchant, type InsertMerchant, type Deal, type InsertDeal, type AuditLog, type InsertAuditLog, type DealWithMerchant } from "@shared/schema";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Merchant operations
  getMerchant(id: number): Promise<Merchant | undefined>;
  getAllMerchants(): Promise<Merchant[]>;
  createMerchant(merchant: InsertMerchant): Promise<Merchant>;
  
  // Deal operations
  getDeal(id: number): Promise<Deal | undefined>;
  getAllActiveDeals(): Promise<DealWithMerchant[]>;
  getDealsByLocation(lat: number, lng: number, radius: number): Promise<DealWithMerchant[]>;
  createDeal(deal: InsertDeal): Promise<Deal>;
  updateDealRedemptions(id: number): Promise<void>;
  
  // Audit log operations
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
  getAuditLogs(limit?: number): Promise<AuditLog[]>;
  getAuditStats(): Promise<{
    totalUsers: number;
    actionsToday: number;
    errors: number;
  }>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private merchants: Map<number, Merchant>;
  private deals: Map<number, Deal>;
  private auditLogs: Map<number, AuditLog>;
  private currentUserId: number = 1;
  private currentMerchantId: number = 1;
  private currentDealId: number = 1;
  private currentAuditId: number = 1;

  constructor() {
    this.users = new Map();
    this.merchants = new Map();
    this.deals = new Map();
    this.auditLogs = new Map();
    this.initializeMockData();
  }

  private initializeMockData() {
    // Initialize mock merchants
    const mockMerchants: InsertMerchant[] = [
      {
        name: "Tony's Pizzeria",
        description: "Tony's Pizzeria has been serving authentic Italian cuisine for over 20 years. Known for their wood-fired pizzas and fresh ingredients.",
        category: "Italian",
        latitude: 40.7128,
        longitude: -74.0060,
        address: "123 Main St, New York, NY 10001",
        phone: "+1 (555) 123-4567",
        rating: 4.5,
        reviewCount: 234,
        isActive: true,
      },
      {
        name: "Brew & Beans",
        description: "Artisan coffee shop with locally roasted beans and fresh pastries.",
        category: "Coffee",
        latitude: 40.7589,
        longitude: -73.9851,
        address: "456 Coffee Ave, New York, NY 10002",
        phone: "+1 (555) 987-6543",
        rating: 4.2,
        reviewCount: 156,
        isActive: true,
      },
      {
        name: "Fashion Hub",
        description: "Trendy clothing store with the latest fashion trends.",
        category: "Clothing",
        latitude: 40.7505,
        longitude: -73.9934,
        address: "789 Fashion St, New York, NY 10003",
        phone: "+1 (555) 456-7890",
        rating: 4.0,
        reviewCount: 89,
        isActive: true,
      },
      {
        name: "Zen Spa",
        description: "Relaxing spa services with professional treatments.",
        category: "Wellness",
        latitude: 40.7282,
        longitude: -73.9942,
        address: "321 Wellness Way, New York, NY 10004",
        phone: "+1 (555) 321-6547",
        rating: 4.8,
        reviewCount: 167,
        isActive: true,
      },
    ];

    mockMerchants.forEach(merchant => {
      this.createMerchant(merchant);
    });

    // Initialize mock deals
    const now = new Date();
    const mockDeals: InsertDeal[] = [
      {
        merchantId: 1,
        title: "Family Pizza Deal",
        description: "Large pizza with 3 toppings + garlic bread + 2L soda",
        originalPrice: 25.99,
        discountedPrice: 12.99,
        discountPercentage: 50,
        category: "Food",
        startTime: now,
        endTime: new Date(now.getTime() + 2 * 60 * 60 * 1000), // 2 hours from now
        isActive: true,
        maxRedemptions: 50,
        currentRedemptions: 15,
      },
      {
        merchantId: 2,
        title: "Coffee Deal",
        description: "Buy one coffee, get one free",
        originalPrice: 4.99,
        discountedPrice: 4.99,
        discountPercentage: 0,
        category: "Food",
        startTime: now,
        endTime: new Date(now.getTime() + 1 * 60 * 60 * 1000), // 1 hour from now
        isActive: true,
        maxRedemptions: 30,
        currentRedemptions: 8,
      },
      {
        merchantId: 3,
        title: "Fashion Sale",
        description: "30% off all clothing items",
        originalPrice: 50.00,
        discountedPrice: 35.00,
        discountPercentage: 30,
        category: "Clothing",
        startTime: now,
        endTime: new Date(now.getTime() + 3 * 60 * 60 * 1000), // 3 hours from now
        isActive: true,
        maxRedemptions: 20,
        currentRedemptions: 5,
      },
      {
        merchantId: 4,
        title: "Spa Treatment",
        description: "40% off relaxation massage",
        originalPrice: 80.00,
        discountedPrice: 48.00,
        discountPercentage: 40,
        category: "Wellness",
        startTime: now,
        endTime: new Date(now.getTime() + 4 * 60 * 60 * 1000), // 4 hours from now
        isActive: true,
        maxRedemptions: 15,
        currentRedemptions: 3,
      },
    ];

    mockDeals.forEach(deal => {
      this.createDeal(deal);
    });
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Merchant operations
  async getMerchant(id: number): Promise<Merchant | undefined> {
    return this.merchants.get(id);
  }

  async getAllMerchants(): Promise<Merchant[]> {
    return Array.from(this.merchants.values()).filter(merchant => merchant.isActive);
  }

  async createMerchant(insertMerchant: InsertMerchant): Promise<Merchant> {
    const id = this.currentMerchantId++;
    const merchant: Merchant = { ...insertMerchant, id };
    this.merchants.set(id, merchant);
    return merchant;
  }

  // Deal operations
  async getDeal(id: number): Promise<Deal | undefined> {
    return this.deals.get(id);
  }

  async getAllActiveDeals(): Promise<DealWithMerchant[]> {
    const activeDeals = Array.from(this.deals.values()).filter(deal => 
      deal.isActive && new Date(deal.endTime) > new Date()
    );
    
    return activeDeals.map(deal => ({
      ...deal,
      merchant: this.merchants.get(deal.merchantId)!
    }));
  }

  async getDealsByLocation(lat: number, lng: number, radius: number): Promise<DealWithMerchant[]> {
    const allDeals = await this.getAllActiveDeals();
    
    return allDeals.filter(deal => {
      const distance = this.calculateDistance(lat, lng, deal.merchant.latitude, deal.merchant.longitude);
      return distance <= radius;
    });
  }

  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  async createDeal(insertDeal: InsertDeal): Promise<Deal> {
    const id = this.currentDealId++;
    const deal: Deal = { ...insertDeal, id };
    this.deals.set(id, deal);
    return deal;
  }

  async updateDealRedemptions(id: number): Promise<void> {
    const deal = this.deals.get(id);
    if (deal) {
      deal.currentRedemptions = (deal.currentRedemptions || 0) + 1;
      this.deals.set(id, deal);
    }
  }

  // Audit log operations
  async createAuditLog(insertAuditLog: InsertAuditLog): Promise<AuditLog> {
    const id = this.currentAuditId++;
    const auditLog: AuditLog = { 
      ...insertAuditLog, 
      id,
      timestamp: new Date()
    };
    this.auditLogs.set(id, auditLog);
    return auditLog;
  }

  async getAuditLogs(limit: number = 50): Promise<AuditLog[]> {
    const logs = Array.from(this.auditLogs.values())
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
    return logs;
  }

  async getAuditStats(): Promise<{
    totalUsers: number;
    actionsToday: number;
    errors: number;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayLogs = Array.from(this.auditLogs.values()).filter(log => 
      new Date(log.timestamp) >= today
    );
    
    return {
      totalUsers: this.users.size,
      actionsToday: todayLogs.length,
      errors: todayLogs.filter(log => log.status === 'error').length
    };
  }
}

export const storage = new MemStorage();
