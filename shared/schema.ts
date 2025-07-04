import { pgTable, text, serial, integer, boolean, timestamp, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const merchants = pgTable("merchants", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").notNull(),
  latitude: real("latitude").notNull(),
  longitude: real("longitude").notNull(),
  address: text("address").notNull(),
  phone: text("phone"),
  rating: real("rating").default(0),
  reviewCount: integer("review_count").default(0),
  isActive: boolean("is_active").default(true),
});

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
  isActive: boolean("is_active").default(true),
  maxRedemptions: integer("max_redemptions"),
  currentRedemptions: integer("current_redemptions").default(0),
});

export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  userId: text("user_id"),
  action: text("action").notNull(),
  details: text("details"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  timestamp: timestamp("timestamp").defaultNow(),
  status: text("status").notNull(), // success, error, warning
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export const insertMerchantSchema = createInsertSchema(merchants).omit({ id: true });
export const insertDealSchema = createInsertSchema(deals).omit({ id: true });
export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({ id: true, timestamp: true });

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertMerchant = z.infer<typeof insertMerchantSchema>;
export type Merchant = typeof merchants.$inferSelect;
export type InsertDeal = z.infer<typeof insertDealSchema>;
export type Deal = typeof deals.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;

export type DealWithMerchant = Deal & {
  merchant: Merchant;
};
