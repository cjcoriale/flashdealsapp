import {
  pgTable,
  text,
  varchar,
  integer,
  timestamp,
  boolean,
  serial,
  jsonb,
  index,
  uniqueIndex,
  real,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Auth sessions table for simple auth
export const authSessions = pgTable("auth_sessions", {
  token: varchar("token").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// User storage table for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique().notNull(),
  password: varchar("password"), // For users who sign up directly (optional for Replit auth)
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role").default("customer"), // customer, merchant, super_merchant
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const merchants = pgTable("merchants", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id), // Link to user account
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").notNull(),
  latitude: real("latitude").notNull(),
  longitude: real("longitude").notNull(),
  address: text("address").notNull(),
  phone: text("phone"),
  imageUrl: text("image_url"),
  rating: real("rating").default(0),
  reviewCount: integer("review_count").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  // Unique constraint: one merchant per name-address combination
  // Allows same business at multiple locations, prevents duplicates at same address
  uniqueIndex("unique_merchant_location").on(table.name, table.address),
]);

export const deals = pgTable("deals", {
  id: serial("id").primaryKey(),
  merchantId: integer("merchant_id").references(() => merchants.id).notNull(),
  title: text("title").notNull(),
  description: text("description"),
  originalPrice: real("original_price").notNull(),
  discountedPrice: real("discounted_price").notNull(),
  discountPercentage: integer("discount_percentage").notNull(),
  category: text("category").notNull(),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  maxRedemptions: integer("max_redemptions").default(100),
  currentRedemptions: integer("current_redemptions").default(0),
  isActive: boolean("is_active").default(true),
  isRecurring: boolean("is_recurring").default(false),
  recurringInterval: text("recurring_interval"), // daily, weekly, monthly
  lastRecurredAt: timestamp("last_recurred_at"),
  coverColor: text("cover_color").default("bg-blue-500"),
  dealEmoji: text("deal_emoji").default("🏷️"),
  status: varchar("status").default("active"), // active, expired, deleted, archived
  archivedAt: timestamp("archived_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// User saved deals
export const savedDeals = pgTable("saved_deals", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  dealId: integer("deal_id").references(() => deals.id).notNull(),
  savedAt: timestamp("saved_at").defaultNow(),
});

// Deal claims/redemptions
export const dealClaims = pgTable("deal_claims", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  dealId: integer("deal_id").references(() => deals.id).notNull(),
  claimedAt: timestamp("claimed_at").defaultNow(),
  status: varchar("status").default("claimed"), // claimed, used, expired
  isArchived: boolean("is_archived").default(false),
});

export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id),
  action: text("action").notNull(),
  details: text("details"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  status: text("status").notNull().default("success"),
  timestamp: timestamp("timestamp").defaultNow(),
});

export const enabledStates = pgTable("enabled_states", {
  id: serial("id").primaryKey(),
  stateName: varchar("state_name").notNull().unique(),
  isEnabled: boolean("is_enabled").default(false),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Application configuration settings
export const appSettings = pgTable("app_settings", {
  id: serial("id").primaryKey(),
  key: varchar("key").notNull().unique(),
  value: text("value").notNull(),
  description: text("description"),
  category: varchar("category").default("general"),
  updatedAt: timestamp("updated_at").defaultNow(),
  updatedBy: varchar("updated_by").references(() => users.id),
});

// User preferences and merchant settings
export const userPreferences = pgTable("user_preferences", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  preferenceKey: varchar("preference_key").notNull(),
  preferenceValue: text("preference_value"),
  category: varchar("category").default("general"),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  // Composite unique index for user + preference key
  index("user_preference_idx").on(table.userId, table.preferenceKey),
]);

// Notifications table
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  type: varchar("type").notNull(), // deal_created, deal_claimed, deal_expired, deal_reminder, system
  title: text("title").notNull(),
  message: text("message").notNull(),
  dealId: integer("deal_id").references(() => deals.id),
  merchantId: integer("merchant_id").references(() => merchants.id),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  readAt: timestamp("read_at"),
});

// Favorite merchants table
export const favoriteMerchants = pgTable("favorite_merchants", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  merchantId: integer("merchant_id").references(() => merchants.id).notNull(),
  favoritedAt: timestamp("favorited_at").defaultNow(),
}, (table) => [
  // Ensure one favorite per user-merchant pair
  index("user_merchant_favorite_idx").on(table.userId, table.merchantId),
]);

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  merchants: many(merchants),
  savedDeals: many(savedDeals),
  dealClaims: many(dealClaims),
  auditLogs: many(auditLogs),
  notifications: many(notifications),
  favoriteMerchants: many(favoriteMerchants),
}));

export const merchantsRelations = relations(merchants, ({ one, many }) => ({
  user: one(users, {
    fields: [merchants.userId],
    references: [users.id],
  }),
  deals: many(deals),
  favoritedBy: many(favoriteMerchants),
}));

export const dealsRelations = relations(deals, ({ one, many }) => ({
  merchant: one(merchants, {
    fields: [deals.merchantId],
    references: [merchants.id],
  }),
  savedDeals: many(savedDeals),
  dealClaims: many(dealClaims),
}));

export const savedDealsRelations = relations(savedDeals, ({ one }) => ({
  user: one(users, {
    fields: [savedDeals.userId],
    references: [users.id],
  }),
  deal: one(deals, {
    fields: [savedDeals.dealId],
    references: [deals.id],
  }),
}));

export const dealClaimsRelations = relations(dealClaims, ({ one }) => ({
  user: one(users, {
    fields: [dealClaims.userId],
    references: [users.id],
  }),
  deal: one(deals, {
    fields: [dealClaims.dealId],
    references: [deals.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
  deal: one(deals, {
    fields: [notifications.dealId],
    references: [deals.id],
  }),
  merchant: one(merchants, {
    fields: [notifications.merchantId],
    references: [merchants.id],
  }),
}));

export const favoriteMerchantsRelations = relations(favoriteMerchants, ({ one }) => ({
  user: one(users, {
    fields: [favoriteMerchants.userId],
    references: [users.id],
  }),
  merchant: one(merchants, {
    fields: [favoriteMerchants.merchantId],
    references: [merchants.id],
  }),
}));

// Schema types
export const insertUserSchema = createInsertSchema(users).omit({ createdAt: true, updatedAt: true });
export const insertMerchantSchema = createInsertSchema(merchants).omit({ id: true, createdAt: true });
export const insertDealSchema = createInsertSchema(deals).omit({ id: true, createdAt: true, lastRecurredAt: true });
export const insertSavedDealSchema = createInsertSchema(savedDeals).omit({ id: true, savedAt: true });
export const insertDealClaimSchema = createInsertSchema(dealClaims).omit({ id: true, claimedAt: true });
export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({ id: true, timestamp: true });
export const insertEnabledStateSchema = createInsertSchema(enabledStates).omit({ id: true, updatedAt: true });
export const insertAppSettingSchema = createInsertSchema(appSettings).omit({ id: true, updatedAt: true });
export const insertUserPreferenceSchema = createInsertSchema(userPreferences).omit({ id: true, updatedAt: true });
export const insertNotificationSchema = createInsertSchema(notifications).omit({ id: true, createdAt: true, readAt: true });
export const insertFavoriteMerchantSchema = createInsertSchema(favoriteMerchants).omit({ id: true, favoritedAt: true });

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type InsertMerchant = z.infer<typeof insertMerchantSchema>;
export type Merchant = typeof merchants.$inferSelect;
export type InsertDeal = z.infer<typeof insertDealSchema>;
export type Deal = typeof deals.$inferSelect;
export type InsertSavedDeal = z.infer<typeof insertSavedDealSchema>;
export type SavedDeal = typeof savedDeals.$inferSelect;
export type InsertDealClaim = z.infer<typeof insertDealClaimSchema>;
export type DealClaim = typeof dealClaims.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertEnabledState = z.infer<typeof insertEnabledStateSchema>;
export type EnabledState = typeof enabledStates.$inferSelect;
export type InsertAppSetting = z.infer<typeof insertAppSettingSchema>;
export type AppSetting = typeof appSettings.$inferSelect;
export type InsertUserPreference = z.infer<typeof insertUserPreferenceSchema>;
export type UserPreference = typeof userPreferences.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;
export type InsertFavoriteMerchant = z.infer<typeof insertFavoriteMerchantSchema>;
export type FavoriteMerchant = typeof favoriteMerchants.$inferSelect;

export type DealWithMerchant = Deal & {
  merchant: Merchant;
};

export type SavedDealWithDetails = SavedDeal & {
  deal: DealWithMerchant;
};

export type DealClaimWithDetails = DealClaim & {
  deal: DealWithMerchant;
};

// Auth session types
export type AuthSession = typeof authSessions.$inferSelect;
export type InsertAuthSession = typeof authSessions.$inferInsert;