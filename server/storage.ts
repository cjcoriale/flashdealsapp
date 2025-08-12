import {
  users,
  merchants,
  deals,
  savedDeals,
  dealClaims,
  auditLogs,
  authSessions,
  type User,
  type UpsertUser,
  type Merchant,
  type InsertMerchant,
  type Deal,
  type InsertDeal,
  type DealWithMerchant,
  type SavedDeal,
  type InsertSavedDeal,
  type SavedDealWithDetails,
  type DealClaim,
  type InsertDealClaim,
  type DealClaimWithDetails,
  type AuditLog,
  type InsertAuditLog,
  type AuthSession,
  type InsertAuthSession,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, gte, lte, lt, sql } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  promoteUserToMerchant(userId: string): Promise<User>;
  promoteUserToSuperMerchant(userId: string): Promise<User>;
  
  // Merchant operations
  getMerchant(id: number): Promise<Merchant | undefined>;
  getAllMerchants(): Promise<Merchant[]>;
  getMerchantsByUser(userId: string): Promise<Merchant[]>;
  createMerchant(merchant: InsertMerchant): Promise<Merchant>;
  updateMerchant(id: number, merchant: Partial<InsertMerchant>): Promise<Merchant>;
  deleteMerchant(id: number): Promise<void>;
  
  // Deal operations
  getDeal(id: number): Promise<Deal | undefined>;
  getAllActiveDeals(): Promise<DealWithMerchant[]>;
  getDealsByLocation(lat: number, lng: number, radius: number): Promise<DealWithMerchant[]>;
  getDealsByMerchant(merchantId: number): Promise<DealWithMerchant[]>;
  getExpiredDealsByMerchant(merchantId: number): Promise<DealWithMerchant[]>;
  getAllExpiredDeals(): Promise<Deal[]>;
  createDeal(deal: InsertDeal): Promise<Deal>;
  updateDeal(id: number, deal: Partial<InsertDeal>): Promise<Deal>;
  updateDealRedemptions(id: number): Promise<void>;
  
  // Saved deals operations
  getSavedDeals(userId: string): Promise<SavedDealWithDetails[]>;
  saveDeal(savedDeal: InsertSavedDeal): Promise<SavedDeal>;
  unsaveDeal(userId: string, dealId: number): Promise<void>;
  isDealSaved(userId: string, dealId: number): Promise<boolean>;
  
  // Deal claims operations
  getClaimedDeals(userId: string): Promise<DealClaimWithDetails[]>;
  claimDeal(dealClaim: InsertDealClaim): Promise<DealClaim>;
  
  // Audit log operations
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
  getAuditLogs(limit?: number): Promise<AuditLog[]>;
  getAuditStats(): Promise<{
    totalUsers: number;
    actionsToday: number;
    errors: number;
  }>;
  
  // Auth session operations
  createAuthSession(session: InsertAuthSession): Promise<AuthSession>;
  getAuthSession(token: string): Promise<AuthSession | undefined>;
  deleteAuthSession(token: string): Promise<void>;
  cleanupExpiredSessions(): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async promoteUserToMerchant(userId: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        role: 'merchant',
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async promoteUserToSuperMerchant(userId: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        role: 'super_merchant',
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  // Merchant operations
  async getMerchant(id: number): Promise<Merchant | undefined> {
    const [merchant] = await db.select().from(merchants).where(eq(merchants.id, id));
    return merchant;
  }

  async getAllMerchants(): Promise<Merchant[]> {
    return await db.select().from(merchants).where(eq(merchants.isActive, true));
  }

  async getMerchantsByUser(userId: string): Promise<Merchant[]> {
    return await db.select().from(merchants).where(eq(merchants.userId, userId));
  }

  async createMerchant(merchantData: InsertMerchant): Promise<Merchant> {
    const [merchant] = await db
      .insert(merchants)
      .values(merchantData)
      .returning();
    return merchant;
  }

  async updateMerchant(id: number, merchantData: Partial<InsertMerchant>): Promise<Merchant> {
    const [merchant] = await db
      .update(merchants)
      .set(merchantData)
      .where(eq(merchants.id, id))
      .returning();
    return merchant;
  }

  async deleteMerchant(id: number): Promise<void> {
    await db.delete(merchants).where(eq(merchants.id, id));
  }

  // Deal operations
  async getDeal(id: number): Promise<Deal | undefined> {
    const [deal] = await db.select().from(deals).where(eq(deals.id, id));
    return deal;
  }

  async getAllActiveDeals(): Promise<DealWithMerchant[]> {
    const now = new Date();
    return await db
      .select()
      .from(deals)
      .innerJoin(merchants, eq(deals.merchantId, merchants.id))
      .where(
        and(
          eq(deals.isActive, true),
          eq(merchants.isActive, true),
          gte(deals.endTime, now)
        )
      )
      .then(rows => rows.map(row => ({
        ...row.deals,
        merchant: row.merchants
      })));
  }

  async getDealsByLocation(lat: number, lng: number, radius: number): Promise<DealWithMerchant[]> {
    const now = new Date();
    // Using a simple bounding box for radius filtering
    const latRange = radius / 69; // Approximate miles to degrees
    const lngRange = radius / (69 * Math.cos(lat * Math.PI / 180));
    
    return await db
      .select()
      .from(deals)
      .innerJoin(merchants, eq(deals.merchantId, merchants.id))
      .where(
        and(
          eq(deals.isActive, true),
          eq(merchants.isActive, true),
          gte(deals.endTime, now),
          gte(merchants.latitude, lat - latRange),
          lte(merchants.latitude, lat + latRange),
          gte(merchants.longitude, lng - lngRange),
          lte(merchants.longitude, lng + lngRange)
        )
      )
      .then(rows => rows.map(row => ({
        ...row.deals,
        merchant: row.merchants
      })));
  }

  async getDealsByMerchant(merchantId: number): Promise<DealWithMerchant[]> {
    return await db
      .select()
      .from(deals)
      .innerJoin(merchants, eq(deals.merchantId, merchants.id))
      .where(eq(deals.merchantId, merchantId))
      .orderBy(desc(deals.createdAt))
      .then(rows => rows.map(row => ({
        ...row.deals,
        merchant: row.merchants
      })));
  }

  async getExpiredDealsByMerchant(merchantId: number): Promise<DealWithMerchant[]> {
    const now = new Date();
    return await db
      .select()
      .from(deals)
      .innerJoin(merchants, eq(deals.merchantId, merchants.id))
      .where(
        and(
          eq(deals.merchantId, merchantId),
          sql`${deals.endTime} < ${now}` // Deals that have ended
        )
      )
      .orderBy(desc(deals.endTime))
      .then(rows => rows.map(row => ({
        ...row.deals,
        merchant: row.merchants
      })));
  }

  async getAllExpiredDeals(): Promise<Deal[]> {
    const now = new Date();
    return await db
      .select()
      .from(deals)
      .where(sql`${deals.endTime} < ${now}`)
      .orderBy(desc(deals.endTime));
  }

  async createDeal(dealData: InsertDeal): Promise<Deal> {
    const [deal] = await db
      .insert(deals)
      .values(dealData)
      .returning();
    return deal;
  }

  async updateDeal(id: number, dealData: Partial<InsertDeal>): Promise<Deal> {
    const [deal] = await db
      .update(deals)
      .set(dealData)
      .where(eq(deals.id, id))
      .returning();
    return deal;
  }

  async updateDealRedemptions(id: number): Promise<void> {
    await db
      .update(deals)
      .set({ 
        currentRedemptions: sql`${deals.currentRedemptions} + 1` 
      })
      .where(eq(deals.id, id));
  }

  // Saved deals operations
  async getSavedDeals(userId: string): Promise<SavedDealWithDetails[]> {
    const now = new Date();
    return await db
      .select()
      .from(savedDeals)
      .innerJoin(deals, eq(savedDeals.dealId, deals.id))
      .innerJoin(merchants, eq(deals.merchantId, merchants.id))
      .where(
        and(
          eq(savedDeals.userId, userId),
          eq(deals.isActive, true),
          gte(deals.endTime, now)
        )
      )
      .orderBy(desc(savedDeals.savedAt))
      .then(rows => rows.map(row => ({
        ...row.saved_deals,
        deal: {
          ...row.deals,
          merchant: row.merchants
        }
      })));
  }

  async saveDeal(savedDealData: InsertSavedDeal): Promise<SavedDeal> {
    const [savedDeal] = await db
      .insert(savedDeals)
      .values(savedDealData)
      .onConflictDoNothing()
      .returning();
    return savedDeal;
  }

  async unsaveDeal(userId: string, dealId: number): Promise<void> {
    await db
      .delete(savedDeals)
      .where(
        and(
          eq(savedDeals.userId, userId),
          eq(savedDeals.dealId, dealId)
        )
      );
  }

  async isDealSaved(userId: string, dealId: number): Promise<boolean> {
    const [saved] = await db
      .select()
      .from(savedDeals)
      .where(
        and(
          eq(savedDeals.userId, userId),
          eq(savedDeals.dealId, dealId)
        )
      );
    return !!saved;
  }

  // Deal claims operations
  async getClaimedDeals(userId: string): Promise<DealClaimWithDetails[]> {
    return await db
      .select()
      .from(dealClaims)
      .innerJoin(deals, eq(dealClaims.dealId, deals.id))
      .innerJoin(merchants, eq(deals.merchantId, merchants.id))
      .where(eq(dealClaims.userId, userId))
      .orderBy(desc(dealClaims.claimedAt))
      .then(rows => rows.map(row => ({
        ...row.deal_claims,
        deal: {
          ...row.deals,
          merchant: row.merchants
        }
      })));
  }

  async claimDeal(dealClaimData: InsertDealClaim): Promise<DealClaim> {
    const [dealClaim] = await db
      .insert(dealClaims)
      .values(dealClaimData)
      .returning();
    
    // Update deal redemption count
    await this.updateDealRedemptions(dealClaimData.dealId);
    
    return dealClaim;
  }

  // Audit log operations
  async createAuditLog(logData: InsertAuditLog): Promise<AuditLog> {
    const [auditLog] = await db
      .insert(auditLogs)
      .values(logData)
      .returning();
    return auditLog;
  }

  async getAuditLogs(limit: number = 50): Promise<AuditLog[]> {
    return await db
      .select()
      .from(auditLogs)
      .orderBy(desc(auditLogs.timestamp))
      .limit(limit);
  }

  async getAuditStats(): Promise<{
    totalUsers: number;
    actionsToday: number;
    errors: number;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [{ totalUsers }] = await db
      .select({ totalUsers: sql<number>`count(*)` })
      .from(users);

    const [{ actionsToday }] = await db
      .select({ actionsToday: sql<number>`count(*)` })
      .from(auditLogs)
      .where(gte(auditLogs.timestamp, today));

    const [{ errors }] = await db
      .select({ errors: sql<number>`count(*)` })
      .from(auditLogs)
      .where(eq(auditLogs.status, "error"));

    return {
      totalUsers: totalUsers || 0,
      actionsToday: actionsToday || 0,
      errors: errors || 0,
    };
  }

  // Auth session operations
  async createAuthSession(sessionData: InsertAuthSession): Promise<AuthSession> {
    const [session] = await db
      .insert(authSessions)
      .values(sessionData)
      .returning();
    return session;
  }

  async getAuthSession(token: string): Promise<AuthSession | undefined> {
    const [session] = await db
      .select()
      .from(authSessions)
      .where(eq(authSessions.token, token));
    return session;
  }

  async deleteAuthSession(token: string): Promise<void> {
    await db.delete(authSessions).where(eq(authSessions.token, token));
  }

  async cleanupExpiredSessions(): Promise<void> {
    await db.delete(authSessions).where(lte(authSessions.expiresAt, new Date()));
  }
}

export const storage = new DatabaseStorage();