import {
  users,
  merchants,
  deals,
  savedDeals,
  dealClaims,
  auditLogs,
  authSessions,
  enabledStates,
  appSettings,
  userPreferences,
  notifications,
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
  type EnabledState,
  type InsertEnabledState,
  type AppSetting,
  type InsertAppSetting,
  type UserPreference,
  type InsertUserPreference,
  type Notification,
  type InsertNotification,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, gte, lte, lt, sql, ne } from "drizzle-orm";

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
  getRecentMerchantDeals(merchantId: number, limit: number): Promise<DealWithMerchant[]>;
  getMerchantDealHistory(merchantId: number, offset: number, limit: number): Promise<DealWithMerchant[]>;
  getAllExpiredDeals(): Promise<Deal[]>;
  createDeal(deal: InsertDeal): Promise<Deal>;
  updateDeal(id: number, deal: Partial<InsertDeal>): Promise<Deal>;
  updateDealRedemptions(id: number): Promise<void>;
  deleteDeal(id: number): Promise<void>;
  
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

  // State management operations (for super merchants)
  getEnabledStates(): Promise<{ [key: string]: boolean }>;
  setEnabledStates(states: { [key: string]: boolean }): Promise<void>;
  
  // App settings operations
  getAppSetting(key: string): Promise<AppSetting | undefined>;
  setAppSetting(key: string, value: string, description?: string, category?: string, updatedBy?: string): Promise<AppSetting>;
  getAllAppSettings(): Promise<AppSetting[]>;
  
  // User preferences operations
  getUserPreference(userId: string, key: string): Promise<UserPreference | undefined>;
  setUserPreference(userId: string, key: string, value: string, category?: string): Promise<UserPreference>;

  // Notifications operations
  getNotifications(userId: string): Promise<Notification[]>;
  getUnreadNotificationsCount(userId: string): Promise<number>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationAsRead(notificationId: number, userId: string): Promise<void>;
  deleteNotification(notificationId: number, userId: string): Promise<void>;
  markAllNotificationsAsRead(userId: string): Promise<void>;

  // Search operations
  getSearchSuggestions(query: string): Promise<Array<{
    type: 'deal' | 'merchant' | 'city';
    id?: number;
    title: string;
    subtitle?: string;
    coordinates?: { lat: number; lng: number };
  }>>;
  getUserPreferences(userId: string, category?: string): Promise<UserPreference[]>;
  deleteUserPreference(userId: string, key: string): Promise<void>;
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
    return await db
      .select()
      .from(merchants)
      .where(
        and(
          eq(merchants.userId, userId),
          eq(merchants.isActive, true) // Only return active merchants
        )
      );
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
    // Soft delete merchant by marking as inactive instead of hard delete
    // This prevents foreign key constraint issues with archived deals
    await db
      .update(merchants)
      .set({ isActive: false })
      .where(eq(merchants.id, id));
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
      .where(
        and(
          eq(deals.merchantId, merchantId),
          ne(deals.status, "deleted") // Exclude deleted/archived deals
        )
      )
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

  async deleteDeal(id: number): Promise<void> {
    // Archive the deal instead of deleting it
    await db
      .update(deals)
      .set({ 
        status: "deleted",
        archivedAt: new Date(),
        isActive: false
      })
      .where(eq(deals.id, id));
  }

  async getRecentMerchantDeals(merchantId: number, limit: number): Promise<DealWithMerchant[]> {
    return await db
      .select()
      .from(deals)
      .innerJoin(merchants, eq(deals.merchantId, merchants.id))
      .where(
        and(
          eq(deals.merchantId, merchantId),
          ne(deals.status, "deleted") // Exclude deleted/archived deals
        )
      )
      .orderBy(desc(deals.createdAt))
      .limit(limit)
      .then(rows => rows.map(row => ({
        ...row.deals,
        merchant: row.merchants
      })));
  }

  async getMerchantDealHistory(merchantId: number, offset: number, limit: number): Promise<DealWithMerchant[]> {
    return await db
      .select()
      .from(deals)
      .innerJoin(merchants, eq(deals.merchantId, merchants.id))
      .where(eq(deals.merchantId, merchantId))
      .orderBy(desc(deals.createdAt))
      .offset(offset)
      .limit(limit)
      .then(rows => rows.map(row => ({
        ...row.deals,
        merchant: row.merchants
      })));
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

  // State management operations (for super merchants)
  async getEnabledStates(): Promise<{ [key: string]: boolean }> {
    const states = await db.select().from(enabledStates);
    
    // If no states in database, initialize with defaults
    if (states.length === 0) {
      await this.initializeDefaultStates();
      return await this.getEnabledStates();
    }
    
    const statesMap: { [key: string]: boolean } = {};
    states.forEach(state => {
      statesMap[state.stateName] = state.isEnabled || false;
    });
    
    return statesMap;
  }

  async setEnabledStates(states: { [key: string]: boolean }): Promise<void> {
    // Update or insert each state
    for (const [stateName, isEnabled] of Object.entries(states)) {
      await db
        .insert(enabledStates)
        .values({
          stateName,
          isEnabled,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: enabledStates.stateName,
          set: {
            isEnabled,
            updatedAt: new Date(),
          },
        });
    }
  }

  private async initializeDefaultStates(): Promise<void> {
    const defaultStates = {
      Arizona: true,
      California: false,
      Texas: false,
      Florida: false,
      NewYork: false,
      Washington: false,
      Illinois: false,
      Colorado: false
    };

    for (const [stateName, isEnabled] of Object.entries(defaultStates)) {
      await db
        .insert(enabledStates)
        .values({
          stateName,
          isEnabled,
        })
        .onConflictDoNothing();
    }
  }

  // App settings operations
  async getAppSetting(key: string): Promise<AppSetting | undefined> {
    const [setting] = await db
      .select()
      .from(appSettings)
      .where(eq(appSettings.key, key));
    return setting;
  }

  async setAppSetting(key: string, value: string, description?: string, category: string = "general", updatedBy?: string): Promise<AppSetting> {
    const [setting] = await db
      .insert(appSettings)
      .values({
        key,
        value,
        description,
        category,
        updatedBy,
      })
      .onConflictDoUpdate({
        target: appSettings.key,
        set: {
          value,
          description,
          category,
          updatedBy,
          updatedAt: new Date(),
        },
      })
      .returning();
    return setting;
  }

  async getAllAppSettings(): Promise<AppSetting[]> {
    return await db.select().from(appSettings);
  }

  // User preferences operations
  async getUserPreference(userId: string, key: string): Promise<UserPreference | undefined> {
    const [preference] = await db
      .select()
      .from(userPreferences)
      .where(and(
        eq(userPreferences.userId, userId),
        eq(userPreferences.preferenceKey, key)
      ));
    return preference;
  }

  async setUserPreference(userId: string, key: string, value: string, category: string = "general"): Promise<UserPreference> {
    const [preference] = await db
      .insert(userPreferences)
      .values({
        userId,
        preferenceKey: key,
        preferenceValue: value,
        category,
      })
      .onConflictDoUpdate({
        target: [userPreferences.userId, userPreferences.preferenceKey],
        set: {
          preferenceValue: value,
          category,
          updatedAt: new Date(),
        },
      })
      .returning();
    return preference;
  }

  async getUserPreferences(userId: string, category?: string): Promise<UserPreference[]> {
    if (category) {
      return await db
        .select()
        .from(userPreferences)
        .where(and(
          eq(userPreferences.userId, userId),
          eq(userPreferences.category, category)
        ));
    }
    return await db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.userId, userId));
  }

  async deleteUserPreference(userId: string, key: string): Promise<void> {
    await db
      .delete(userPreferences)
      .where(and(
        eq(userPreferences.userId, userId),
        eq(userPreferences.preferenceKey, key)
      ));
  }

  async getSearchSuggestions(query: string): Promise<Array<{
    type: 'deal' | 'merchant' | 'city';
    id?: number;
    title: string;
    subtitle?: string;
    coordinates?: { lat: number; lng: number };
  }>> {
    const suggestions: Array<{
      type: 'deal' | 'merchant' | 'city';
      id?: number;
      title: string;
      subtitle?: string;
      coordinates?: { lat: number; lng: number };
    }> = [];

    const searchTerm = `%${query}%`;

    // Search for deals
    const dealsQuery = db
      .select({
        id: deals.id,
        title: deals.title,
        description: deals.description,
        merchant: {
          name: merchants.name,
          address: merchants.address,
          latitude: merchants.latitude,
          longitude: merchants.longitude,
        }
      })
      .from(deals)
      .innerJoin(merchants, eq(deals.merchantId, merchants.id))
      .where(
        and(
          eq(deals.status, 'active'),
          gte(deals.endTime, new Date()),
          sql`LOWER(${deals.title}) LIKE LOWER(${searchTerm})`
        )
      )
      .limit(5);

    const dealResults = await dealsQuery;
    for (const deal of dealResults) {
      suggestions.push({
        type: 'deal',
        id: deal.id,
        title: deal.title,
        subtitle: deal.merchant.name,
        coordinates: {
          lat: deal.merchant.latitude,
          lng: deal.merchant.longitude
        }
      });
    }

    // Search for merchants
    const merchantsQuery = db
      .select({
        id: merchants.id,
        name: merchants.name,
        address: merchants.address,
        latitude: merchants.latitude,
        longitude: merchants.longitude,
        category: merchants.category,
      })
      .from(merchants)
      .where(
        and(
          eq(merchants.isActive, true),
          sql`LOWER(${merchants.name}) LIKE LOWER(${searchTerm})`
        )
      )
      .limit(5);

    const merchantResults = await merchantsQuery;
    for (const merchant of merchantResults) {
      suggestions.push({
        type: 'merchant',
        id: merchant.id,
        title: merchant.name,
        subtitle: `${merchant.category} • ${merchant.address}`,
        coordinates: {
          lat: merchant.latitude,
          lng: merchant.longitude
        }
      });
    }

    // Add some popular city suggestions for Arizona (since that's the enabled state)
    if (query.length >= 2) {
      const cities = [
        { name: 'Phoenix', state: 'Arizona', lat: 33.4484, lng: -112.0740 },
        { name: 'Tucson', state: 'Arizona', lat: 32.2540, lng: -110.9742 },
        { name: 'Mesa', state: 'Arizona', lat: 33.4152, lng: -111.8315 },
        { name: 'Chandler', state: 'Arizona', lat: 33.3062, lng: -111.8413 },
        { name: 'Scottsdale', state: 'Arizona', lat: 33.4942, lng: -111.9261 },
        { name: 'Glendale', state: 'Arizona', lat: 33.5387, lng: -112.1860 },
        { name: 'Tempe', state: 'Arizona', lat: 33.4255, lng: -111.9400 },
      ];

      for (const city of cities) {
        if (city.name.toLowerCase().includes(query.toLowerCase())) {
          console.log(`City match: ${city.name} matches query "${query}"`);
          suggestions.push({
            type: 'city',
            title: city.name,
            subtitle: city.state,
            coordinates: {
              lat: city.lat,
              lng: city.lng
            }
          });
        }
      }
    }

    return suggestions.slice(0, 8); // Limit total suggestions to 8
  }

  // Notifications operations
  async getNotifications(userId: string): Promise<Notification[]> {
    return await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
  }

  async getUnreadNotificationsCount(userId: string): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(notifications)
      .where(and(
        eq(notifications.userId, userId),
        eq(notifications.isRead, false)
      ));
    return result[0]?.count || 0;
  }

  async createNotification(notificationData: InsertNotification): Promise<Notification> {
    const [notification] = await db
      .insert(notifications)
      .values(notificationData)
      .returning();
    return notification;
  }

  async markNotificationAsRead(notificationId: number, userId: string): Promise<void> {
    await db
      .update(notifications)
      .set({
        isRead: true,
        readAt: new Date(),
      })
      .where(and(
        eq(notifications.id, notificationId),
        eq(notifications.userId, userId)
      ));
  }

  async deleteNotification(notificationId: number, userId: string): Promise<void> {
    await db
      .delete(notifications)
      .where(and(
        eq(notifications.id, notificationId),
        eq(notifications.userId, userId)
      ));
  }

  async markAllNotificationsAsRead(userId: string): Promise<void> {
    await db
      .update(notifications)
      .set({
        isRead: true,
        readAt: new Date(),
      })
      .where(and(
        eq(notifications.userId, userId),
        eq(notifications.isRead, false)
      ));
  }
}

export const storage = new DatabaseStorage();