import { pgTable, text, serial, integer, boolean, timestamp, decimal, real, varchar, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  phone: text("phone").notNull(),
  idNumber: text("id_number").notNull().unique(), // TC Kimlik Numarası
  birthDate: text("birth_date").notNull(), // Doğum tarihi
  password: text("password").notNull(),
  balance: decimal("balance", { precision: 10, scale: 2 }).default("0").notNull(),
  isVerified: boolean("is_verified").default(false).notNull(),
  isAdmin: boolean("is_admin").default(false).notNull(),
  identityVerified: boolean("identity_verified").default(false).notNull(),
  isTwoFactorEnabled: boolean("is_two_factor_enabled").default(false).notNull(),
  twoFactorSecret: text("two_factor_secret"),
  verificationToken: text("verification_token"),
  resetPasswordToken: text("reset_password_token"),
  resetPasswordExpires: timestamp("reset_password_expires"),
  identityDocuments: text("identity_documents").array(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Transaction schema
export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  transactionId: varchar("transaction_id", { length: 20 }).notNull().unique(),
  type: text("type").notNull(), // 'conversion', 'withdrawal'
  sourceAmount: decimal("source_amount", { precision: 10, scale: 2 }).notNull(),
  sourceCurrency: text("source_currency").notNull(), // 'USD', 'TRY'
  targetAmount: decimal("target_amount", { precision: 10, scale: 2 }).notNull(),
  targetCurrency: text("target_currency").notNull(), // 'TRY'
  rate: decimal("rate", { precision: 10, scale: 4 }).notNull(),
  commissionRate: decimal("commission_rate", { precision: 5, scale: 4 }).notNull(),
  commissionAmount: decimal("commission_amount", { precision: 10, scale: 2 }).notNull(),
  status: text("status").notNull(), // 'pending', 'processing', 'completed', 'cancelled'
  paymentMethod: text("payment_method"), // For withdrawals: 'bank', 'crypto'
  paymentDetails: text("payment_details"), // Bank info or crypto wallet address
  paymentScreenshot: text("payment_screenshot"), // URL or base64 of payment screenshot
  adminNotes: text("admin_notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Exchange Rate schema
export const exchangeRates = pgTable("exchange_rates", {
  id: serial("id").primaryKey(),
  currencyPair: text("currency_pair").notNull().unique(), // 'USD_TRY'
  rate: decimal("rate", { precision: 10, scale: 4 }).notNull(),
  commissionRate: decimal("commission_rate", { precision: 5, scale: 4 }).notNull(),
  updatedBy: integer("updated_by").references(() => users.id),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Withdrawal Request schema
export const withdrawalRequests = pgTable("withdrawal_requests", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  transactionId: integer("transaction_id").references(() => transactions.id),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  method: text("method").notNull(), // 'bank', 'crypto'
  details: text("details").notNull(), // Bank info or crypto wallet address
  status: text("status").notNull(), // 'pending', 'processing', 'completed', 'cancelled'
  adminNotes: text("admin_notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Payment Account schema
export const paymentAccounts = pgTable("payment_accounts", {
  id: serial("id").primaryKey(),
  accountType: text("account_type").notNull(),
  accountName: text("account_name").notNull(),
  accountNumber: text("account_number").notNull(),
  bankName: text("bank_name"),
  iban: text("iban"),
  swiftCode: text("swift_code"),
  branchCode: text("branch_code"),
  additionalInfo: text("additional_info"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Notification schema
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type").notNull(), // 'info', 'success', 'warning', 'error', 'transaction'
  isRead: boolean("is_read").default(false).notNull(),
  relatedEntityType: text("related_entity_type"), // 'transaction', 'withdrawal', 'identity', 'store'
  relatedEntityId: integer("related_entity_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Store Product schema
export const storeProducts = pgTable("store_products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  imageUrl: text("image_url"),
  stockQuantity: integer("stock_quantity").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  category: text("category").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Store Order schema
export const storeOrders = pgTable("store_orders", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  orderNumber: varchar("order_number", { length: 20 }).notNull().unique(),
  status: text("status").notNull(), // 'pending', 'processing', 'completed', 'cancelled'
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Store Order Item schema
export const storeOrderItems = pgTable("store_order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().references(() => storeOrders.id),
  productId: integer("product_id").notNull().references(() => storeProducts.id),
  quantity: integer("quantity").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  totalPrice: decimal("total_price", { precision: 10, scale: 2 }).notNull(),
});

// Define relations
export const usersRelations = relations(users, ({ many }) => ({
  transactions: many(transactions),
  withdrawalRequests: many(withdrawalRequests),
  notifications: many(notifications),
  storeOrders: many(storeOrders)
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  user: one(users, { fields: [transactions.userId], references: [users.id] }),
}));

export const withdrawalRequestsRelations = relations(withdrawalRequests, ({ one }) => ({
  user: one(users, { fields: [withdrawalRequests.userId], references: [users.id] }),
  transaction: one(transactions, { fields: [withdrawalRequests.transactionId], references: [transactions.id] }),
}));

export const exchangeRatesRelations = relations(exchangeRates, ({ one }) => ({
  updatedByUser: one(users, { fields: [exchangeRates.updatedBy], references: [users.id] }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, { fields: [notifications.userId], references: [users.id] }),
}));

export const storeOrdersRelations = relations(storeOrders, ({ one, many }) => ({
  user: one(users, { fields: [storeOrders.userId], references: [users.id] }),
  items: many(storeOrderItems)
}));

export const storeOrderItemsRelations = relations(storeOrderItems, ({ one }) => ({
  order: one(storeOrders, { fields: [storeOrderItems.orderId], references: [storeOrders.id] }),
  product: one(storeProducts, { fields: [storeOrderItems.productId], references: [storeProducts.id] }),
}));

export const storeProductsRelations = relations(storeProducts, ({ many }) => ({
  orderItems: many(storeOrderItems)
}));

// Define insert schemas using drizzle-zod
export const insertUserSchema = createInsertSchema(users, {
  isVerified: z.boolean().optional(),
  isAdmin: z.boolean().optional(),
}).omit({
  id: true,
  balance: true,
  isTwoFactorEnabled: true,
  twoFactorSecret: true,
  verificationToken: true,
  resetPasswordToken: true,
  resetPasswordExpires: true,
  createdAt: true
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  transactionId: true,
  adminNotes: true,
  createdAt: true,
  updatedAt: true
});

export const insertExchangeRateSchema = createInsertSchema(exchangeRates).omit({
  id: true,
  updatedAt: true
});

export const insertWithdrawalRequestSchema = createInsertSchema(withdrawalRequests).omit({
  id: true,
  transactionId: true,
  adminNotes: true,
  createdAt: true,
  updatedAt: true
});

export const insertPaymentAccountSchema = createInsertSchema(paymentAccounts).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true
});

export const insertStoreProductSchema = createInsertSchema(storeProducts).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertStoreOrderSchema = createInsertSchema(storeOrders).omit({
  id: true,
  orderNumber: true,
  createdAt: true,
  updatedAt: true
});

export const insertStoreOrderItemSchema = createInsertSchema(storeOrderItems).omit({
  id: true
});

// Identity verification schema
export const identityVerificationSchema = z.object({
  userId: z.number(),
  documentType: z.string(),
  documentNumber: z.string(),
  documentFiles: z.array(z.string())
});

// LoginData schema for authentication
export const loginSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(6)
});

// Define types using z.infer
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type InsertExchangeRate = z.infer<typeof insertExchangeRateSchema>;
export type InsertWithdrawalRequest = z.infer<typeof insertWithdrawalRequestSchema>;
export type InsertPaymentAccount = z.infer<typeof insertPaymentAccountSchema>;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type InsertStoreProduct = z.infer<typeof insertStoreProductSchema>;
export type InsertStoreOrder = z.infer<typeof insertStoreOrderSchema>;
export type InsertStoreOrderItem = z.infer<typeof insertStoreOrderItemSchema>;
export type IdentityVerification = z.infer<typeof identityVerificationSchema>;
export type LoginData = z.infer<typeof loginSchema>;

// Define database types using typeof table.$inferSelect
export type User = typeof users.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type ExchangeRate = typeof exchangeRates.$inferSelect;
export type WithdrawalRequest = typeof withdrawalRequests.$inferSelect;
export type PaymentAccount = typeof paymentAccounts.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type StoreProduct = typeof storeProducts.$inferSelect;
export type StoreOrder = typeof storeOrders.$inferSelect;
export type StoreOrderItem = typeof storeOrderItems.$inferSelect;
