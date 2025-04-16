import { 
  users, transactions, exchangeRates, withdrawalRequests, paymentAccounts,
  notifications, storeProducts, storeOrders, storeOrderItems
} from "@shared/schema";
import { 
  User, InsertUser, 
  Transaction, InsertTransaction, 
  ExchangeRate, InsertExchangeRate,
  WithdrawalRequest, InsertWithdrawalRequest,
  PaymentAccount, InsertPaymentAccount,
  Notification, InsertNotification,
  StoreProduct, InsertStoreProduct,
  StoreOrder, InsertStoreOrder,
  StoreOrderItem, InsertStoreOrderItem
} from "@shared/schema";
import { nanoid } from "nanoid";
import session from "express-session";
import { db, pool } from "./db";
import { eq, desc, and, or, isNull, isNotNull } from "drizzle-orm";
import connectPg from "connect-pg-simple";
import { hashPassword } from "./security/password";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, userData: Partial<User>): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  verifyUserIdentity(userId: number, verified: boolean): Promise<User | undefined>;
  setResetToken(email: string, token: string): Promise<User | undefined>;
  getUserByResetToken(token: string): Promise<User | undefined>;
  resetPassword(userId: number, newPassword: string): Promise<User | undefined>;
  
  // Transaction methods
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  getTransaction(id: number): Promise<Transaction | undefined>;
  getTransactionByTransactionId(transactionId: string): Promise<Transaction | undefined>;
  getUserTransactions(userId: number): Promise<Transaction[]>;
  getPendingTransactions(): Promise<Transaction[]>;
  updateTransaction(id: number, transactionData: Partial<Transaction>): Promise<Transaction | undefined>;
  
  // Exchange rate methods
  getExchangeRate(currencyPair: string): Promise<ExchangeRate | undefined>;
  setExchangeRate(rate: InsertExchangeRate): Promise<ExchangeRate>;
  getAllExchangeRates(): Promise<ExchangeRate[]>;
  
  // Withdrawal methods
  createWithdrawalRequest(withdrawal: InsertWithdrawalRequest): Promise<WithdrawalRequest>;
  getWithdrawalRequest(id: number): Promise<WithdrawalRequest | undefined>;
  getUserWithdrawalRequests(userId: number): Promise<WithdrawalRequest[]>;
  getPendingWithdrawalRequests(): Promise<WithdrawalRequest[]>;
  updateWithdrawalRequest(id: number, withdrawalData: Partial<WithdrawalRequest>): Promise<WithdrawalRequest | undefined>;
  
  // Payment Account methods
  createPaymentAccount(account: InsertPaymentAccount): Promise<PaymentAccount>;
  getPaymentAccount(id: number): Promise<PaymentAccount | undefined>;
  getAllPaymentAccounts(): Promise<PaymentAccount[]>;
  getActivePaymentAccounts(): Promise<PaymentAccount[]>;
  updatePaymentAccount(id: number, accountData: Partial<PaymentAccount>): Promise<PaymentAccount | undefined>;
  deletePaymentAccount(id: number): Promise<boolean>;

  // Notification methods
  createNotification(notification: InsertNotification): Promise<Notification>;
  getUserNotifications(userId: number): Promise<Notification[]>;
  getUnreadUserNotifications(userId: number): Promise<Notification[]>;
  markNotificationAsRead(id: number): Promise<Notification | undefined>;
  markAllUserNotificationsAsRead(userId: number): Promise<boolean>;
  deleteNotification(id: number): Promise<boolean>;

  // Store Product methods
  createStoreProduct(product: InsertStoreProduct): Promise<StoreProduct>;
  getStoreProduct(id: number): Promise<StoreProduct | undefined>;
  getAllStoreProducts(): Promise<StoreProduct[]>;
  getActiveStoreProducts(): Promise<StoreProduct[]>;
  updateStoreProduct(id: number, productData: Partial<StoreProduct>): Promise<StoreProduct | undefined>;
  deleteStoreProduct(id: number): Promise<boolean>;

  // Store Order methods
  createStoreOrder(order: InsertStoreOrder): Promise<StoreOrder>;
  getStoreOrder(id: number): Promise<StoreOrder | undefined>;
  getUserStoreOrders(userId: number): Promise<StoreOrder[]>;
  updateStoreOrder(id: number, orderData: Partial<StoreOrder>): Promise<StoreOrder | undefined>;
  getStoreOrderDetails(orderId: number): Promise<{order: StoreOrder, items: StoreOrderItem[]}>;
  
  // Session store
  sessionStore: any; // Express session store
}

export class DatabaseStorage implements IStorage {
  sessionStore: any; // Express session store

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true,
    } as any);
    
    // Initialize system with default data if needed
    this.initializeDefaultData();
  }

  private async initializeDefaultData() {
    try {
      // Check if we already have an exchange rate for USD_TRY
      const existingRate = await this.getExchangeRate("USD_TRY");
      if (!existingRate) {
        // Initialize default exchange rate
        await this.setExchangeRate({
          currencyPair: "USD_TRY",
          rate: "35.42",
          commissionRate: "0.0235",
          updatedBy: null
        });
      }
      
      // Check if we have an admin user
      const adminUser = await this.getUserByUsername("admin");
      if (!adminUser) {
        // Create admin user
        await this.createUser({
          firstName: "Admin",
          lastName: "User",
          username: "admin",
          email: "admin@ebupay.com",
          phone: "+905001234567",
          idNumber: "11111111111", // TC kimlik numarası
          birthDate: "01/01/1980", // Doğum tarihi
          password: "adminpassword", // in production, this would be hashed
          isAdmin: true,
          isVerified: true
        });
      }
      
      // Test kullanıcısı kontrolü ve oluşturma
      const testUser = await this.getUserByUsername("test");
      if (!testUser) {
        // Test kullanıcısı oluştur
        await this.createUser({
          firstName: "Test",
          lastName: "Kullanıcı",
          username: "test",
          email: "test@ebupay.com",
          phone: "+905009876543",
          idNumber: "22222222222", // TC kimlik numarası
          birthDate: "01/01/1990", // Doğum tarihi
          password: "Test1234!", // Güvenli bir şifre
          isAdmin: false,
          isVerified: true
        });
      }
    } catch (error) {
      console.error("Error initializing default data:", error);
    }
  }

  // User Methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const verificationToken = nanoid(32);
    
    // Parolanın hash'lendiğinden emin olalım
    const hashedPassword = await hashPassword(insertUser.password);
    
    const [user] = await db
      .insert(users)
      .values({
        ...insertUser,
        password: hashedPassword, // Hash'lenmiş parola kullan
        balance: "0",
        isVerified: insertUser.isVerified ?? false,
        isAdmin: insertUser.isAdmin ?? false,
        isTwoFactorEnabled: false,
        twoFactorSecret: null,
        verificationToken
      })
      .returning();
    
    return user;
  }

  async updateUser(id: number, userData: Partial<User>): Promise<User | undefined> {
    // Eğer şifre güncelleniyorsa, hash'leyelim
    if (userData.password) {
      userData.password = await hashPassword(userData.password);
    }
    
    const [updatedUser] = await db
      .update(users)
      .set(userData)
      .where(eq(users.id, id))
      .returning();
    
    return updatedUser;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }
  
  async verifyUserIdentity(userId: number, verified: boolean): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set({
        identityVerified: verified
      })
      .where(eq(users.id, userId))
      .returning();
    
    return updatedUser;
  }
  
  // Şifre sıfırlama için gerekli metodlar
  async setResetToken(email: string, token: string): Promise<User | undefined> {
    // Önce kullanıcıyı bul
    const user = await this.getUserByEmail(email);
    if (!user) {
      return undefined;
    }
    
    // Reset token'ı güncelle ve kullanıcıyı döndür
    const [updatedUser] = await db
      .update(users)
      .set({
        verificationToken: token
      })
      .where(eq(users.id, user.id))
      .returning();
    
    return updatedUser;
  }
  
  async getUserByResetToken(token: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.verificationToken, token))
      .limit(1);
    
    return user;
  }
  
  async resetPassword(userId: number, newPassword: string): Promise<User | undefined> {
    // Şifreyi hashle
    const hashedPassword = await hashPassword(newPassword);
    
    // Şifreyi ve token'ı güncelle (token'ı temizliyoruz)
    const [updatedUser] = await db
      .update(users)
      .set({
        password: hashedPassword,
        verificationToken: null // Token'ı temizle
      })
      .where(eq(users.id, userId))
      .returning();
    
    return updatedUser;
  }

  // Transaction Methods
  async createTransaction(insertTransaction: InsertTransaction): Promise<Transaction> {
    const transactionId = `TRX-${nanoid(4).toUpperCase()}`;
    
    const [transaction] = await db
      .insert(transactions)
      .values({
        ...insertTransaction,
        transactionId,
        adminNotes: null
      })
      .returning();
    
    return transaction;
  }

  async getTransaction(id: number): Promise<Transaction | undefined> {
    const [transaction] = await db
      .select()
      .from(transactions)
      .where(eq(transactions.id, id))
      .limit(1);
    
    return transaction;
  }

  async getTransactionByTransactionId(transactionId: string): Promise<Transaction | undefined> {
    const [transaction] = await db
      .select()
      .from(transactions)
      .where(eq(transactions.transactionId, transactionId))
      .limit(1);
    
    return transaction;
  }

  async getUserTransactions(userId: number): Promise<Transaction[]> {
    return await db
      .select()
      .from(transactions)
      .where(eq(transactions.userId, userId))
      .orderBy(desc(transactions.createdAt));
  }

  async getPendingTransactions(): Promise<Transaction[]> {
    return await db
      .select()
      .from(transactions)
      .where(
        or(
          eq(transactions.status, 'pending'),
          eq(transactions.status, 'processing')
        )
      )
      .orderBy(desc(transactions.createdAt));
  }

  async updateTransaction(id: number, transactionData: Partial<Transaction>): Promise<Transaction | undefined> {
    const [updatedTransaction] = await db
      .update(transactions)
      .set({
        ...transactionData,
        updatedAt: new Date()
      })
      .where(eq(transactions.id, id))
      .returning();
    
    return updatedTransaction;
  }

  // Exchange Rate Methods
  async getExchangeRate(currencyPair: string): Promise<ExchangeRate | undefined> {
    const [rate] = await db
      .select()
      .from(exchangeRates)
      .where(eq(exchangeRates.currencyPair, currencyPair))
      .limit(1);
    
    return rate;
  }

  async setExchangeRate(insertRate: InsertExchangeRate): Promise<ExchangeRate> {
    const existingRate = await this.getExchangeRate(insertRate.currencyPair);
    
    if (existingRate) {
      const [updatedRate] = await db
        .update(exchangeRates)
        .set({
          rate: insertRate.rate,
          commissionRate: insertRate.commissionRate,
          updatedBy: insertRate.updatedBy,
          updatedAt: new Date()
        })
        .where(eq(exchangeRates.currencyPair, insertRate.currencyPair))
        .returning();
      
      return updatedRate;
    } else {
      const [newRate] = await db
        .insert(exchangeRates)
        .values({
          ...insertRate,
          updatedAt: new Date()
        })
        .returning();
      
      return newRate;
    }
  }

  async getAllExchangeRates(): Promise<ExchangeRate[]> {
    return await db.select().from(exchangeRates);
  }

  // Withdrawal Request Methods
  async createWithdrawalRequest(insertWithdrawal: InsertWithdrawalRequest): Promise<WithdrawalRequest> {
    const [withdrawal] = await db
      .insert(withdrawalRequests)
      .values({
        ...insertWithdrawal,
        transactionId: null,
        adminNotes: null
      })
      .returning();
    
    return withdrawal;
  }

  async getWithdrawalRequest(id: number): Promise<WithdrawalRequest | undefined> {
    const [withdrawal] = await db
      .select()
      .from(withdrawalRequests)
      .where(eq(withdrawalRequests.id, id))
      .limit(1);
    
    return withdrawal;
  }

  async getUserWithdrawalRequests(userId: number): Promise<WithdrawalRequest[]> {
    return await db
      .select()
      .from(withdrawalRequests)
      .where(eq(withdrawalRequests.userId, userId))
      .orderBy(desc(withdrawalRequests.createdAt));
  }

  async getPendingWithdrawalRequests(): Promise<WithdrawalRequest[]> {
    return await db
      .select()
      .from(withdrawalRequests)
      .where(
        or(
          eq(withdrawalRequests.status, 'pending'),
          eq(withdrawalRequests.status, 'processing')
        )
      )
      .orderBy(desc(withdrawalRequests.createdAt));
  }

  async updateWithdrawalRequest(id: number, withdrawalData: Partial<WithdrawalRequest>): Promise<WithdrawalRequest | undefined> {
    const [updatedWithdrawal] = await db
      .update(withdrawalRequests)
      .set({
        ...withdrawalData,
        updatedAt: new Date()
      })
      .where(eq(withdrawalRequests.id, id))
      .returning();
    
    return updatedWithdrawal;
  }

  // Payment Account Methods
  async createPaymentAccount(account: InsertPaymentAccount): Promise<PaymentAccount> {
    const [newAccount] = await db
      .insert(paymentAccounts)
      .values({
        ...account,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    
    return newAccount;
  }

  async getPaymentAccount(id: number): Promise<PaymentAccount | undefined> {
    const [account] = await db
      .select()
      .from(paymentAccounts)
      .where(eq(paymentAccounts.id, id))
      .limit(1);
    
    return account;
  }

  async getAllPaymentAccounts(): Promise<PaymentAccount[]> {
    return await db
      .select()
      .from(paymentAccounts)
      .orderBy(paymentAccounts.accountType);
  }

  async getActivePaymentAccounts(): Promise<PaymentAccount[]> {
    return await db
      .select()
      .from(paymentAccounts)
      .where(eq(paymentAccounts.isActive, true))
      .orderBy(paymentAccounts.accountType);
  }

  async updatePaymentAccount(id: number, accountData: Partial<PaymentAccount>): Promise<PaymentAccount | undefined> {
    const [updatedAccount] = await db
      .update(paymentAccounts)
      .set({
        ...accountData,
        updatedAt: new Date()
      })
      .where(eq(paymentAccounts.id, id))
      .returning();
    
    return updatedAccount;
  }

  async deletePaymentAccount(id: number): Promise<boolean> {
    try {
      await db
        .delete(paymentAccounts)
        .where(eq(paymentAccounts.id, id));
      
      return true;
    } catch (error) {
      console.error("Error deleting payment account:", error);
      return false;
    }
  }
  
  // Notification Methods
  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [newNotification] = await db
      .insert(notifications)
      .values({
        ...notification,
        isRead: false,
        createdAt: new Date()
      })
      .returning();
    
    return newNotification;
  }
  
  async getUserNotifications(userId: number): Promise<Notification[]> {
    return await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
  }
  
  async getUnreadUserNotifications(userId: number): Promise<Notification[]> {
    return await db
      .select()
      .from(notifications)
      .where(and(
        eq(notifications.userId, userId),
        eq(notifications.isRead, false)
      ))
      .orderBy(desc(notifications.createdAt));
  }
  
  async markNotificationAsRead(id: number): Promise<Notification | undefined> {
    const [updatedNotification] = await db
      .update(notifications)
      .set({
        isRead: true
      })
      .where(eq(notifications.id, id))
      .returning();
    
    return updatedNotification;
  }
  
  async markAllUserNotificationsAsRead(userId: number): Promise<boolean> {
    try {
      await db
        .update(notifications)
        .set({
          isRead: true
        })
        .where(and(
          eq(notifications.userId, userId),
          eq(notifications.isRead, false)
        ));
      
      return true;
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      return false;
    }
  }
  
  async deleteNotification(id: number): Promise<boolean> {
    try {
      await db
        .delete(notifications)
        .where(eq(notifications.id, id));
      
      return true;
    } catch (error) {
      console.error("Error deleting notification:", error);
      return false;
    }
  }
  
  // Store Product Methods
  async createStoreProduct(product: InsertStoreProduct): Promise<StoreProduct> {
    const [newProduct] = await db
      .insert(storeProducts)
      .values({
        ...product,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    
    return newProduct;
  }
  
  async getStoreProduct(id: number): Promise<StoreProduct | undefined> {
    const [product] = await db
      .select()
      .from(storeProducts)
      .where(eq(storeProducts.id, id))
      .limit(1);
    
    return product;
  }
  
  async getAllStoreProducts(): Promise<StoreProduct[]> {
    return await db
      .select()
      .from(storeProducts)
      .orderBy(storeProducts.name);
  }
  
  async getActiveStoreProducts(): Promise<StoreProduct[]> {
    return await db
      .select()
      .from(storeProducts)
      .where(eq(storeProducts.isActive, true))
      .orderBy(storeProducts.name);
  }
  
  async updateStoreProduct(id: number, productData: Partial<StoreProduct>): Promise<StoreProduct | undefined> {
    const [updatedProduct] = await db
      .update(storeProducts)
      .set({
        ...productData,
        updatedAt: new Date()
      })
      .where(eq(storeProducts.id, id))
      .returning();
    
    return updatedProduct;
  }
  
  async deleteStoreProduct(id: number): Promise<boolean> {
    try {
      await db
        .delete(storeProducts)
        .where(eq(storeProducts.id, id));
      
      return true;
    } catch (error) {
      console.error("Error deleting store product:", error);
      return false;
    }
  }
  
  // Store Order Methods
  async createStoreOrder(order: InsertStoreOrder): Promise<StoreOrder> {
    const orderNumber = `ORD-${nanoid(6).toUpperCase()}`;
    
    const [newOrder] = await db
      .insert(storeOrders)
      .values({
        ...order,
        orderNumber,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    
    return newOrder;
  }
  
  async getStoreOrder(id: number): Promise<StoreOrder | undefined> {
    const [order] = await db
      .select()
      .from(storeOrders)
      .where(eq(storeOrders.id, id))
      .limit(1);
    
    return order;
  }
  
  async getUserStoreOrders(userId: number): Promise<StoreOrder[]> {
    return await db
      .select()
      .from(storeOrders)
      .where(eq(storeOrders.userId, userId))
      .orderBy(desc(storeOrders.createdAt));
  }
  
  async updateStoreOrder(id: number, orderData: Partial<StoreOrder>): Promise<StoreOrder | undefined> {
    const [updatedOrder] = await db
      .update(storeOrders)
      .set({
        ...orderData,
        updatedAt: new Date()
      })
      .where(eq(storeOrders.id, id))
      .returning();
    
    return updatedOrder;
  }
  
  async getStoreOrderDetails(orderId: number): Promise<{order: StoreOrder, items: StoreOrderItem[]}> {
    const order = await this.getStoreOrder(orderId);
    
    if (!order) {
      throw new Error(`Order not found with ID: ${orderId}`);
    }
    
    const items = await db
      .select()
      .from(storeOrderItems)
      .where(eq(storeOrderItems.orderId, orderId));
    
    return { order, items };
  }
}

export const storage = new DatabaseStorage();
