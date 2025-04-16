import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { z } from "zod";
import { nanoid } from "nanoid";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { dirname } from "path";

// ESM için __dirname alternatifi oluşturma
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Setup multer for file uploads with enhanced security
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      // Dosya tipine göre farklı klasörlere kaydet
      let uploadDir = path.join(__dirname, "../uploads");
      
      // Kimlik doğrulama dosyaları için özel klasör
      if (file.fieldname === 'frontId' || file.fieldname === 'backId' || file.fieldname === 'selfie') {
        uploadDir = path.join(__dirname, "../uploads/identity_verification");
      }
      
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      // Güvenli dosya adı oluşturma - orijinal dosya adını kullanmıyoruz
      const uniqueSuffix = `${Date.now()}-${nanoid(10)}`;
      // Dosya uzantısını güvenli bir şekilde alalım
      const fileExtension = file.originalname.split('.').pop()?.toLowerCase();
      const safeExtension = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExtension || '') 
        ? fileExtension 
        : 'jpg'; // Güvenli dosya uzantısı kontrolü
      
      cb(null, `${uniqueSuffix}.${safeExtension}`);
    }
  }),
  limits: {
    fileSize: 3 * 1024 * 1024, // 3MB max file size limit
    files: 3 // Kimlik doğrulama için 3 dosya (ön yüz, arka yüz, selfie)
  },
  fileFilter: (req, file, cb) => {
    // Güvenli MIME tipleri kontrolü
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Sadece jpeg, png, gif ve webp formatındaki görsel dosyaları yüklenebilir"));
    }
  }
});

// Middleware to check if user is authenticated
function isAuthenticated(req: any, res: any, next: any) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
}

// Middleware to check if user is admin
function isAdmin(req: any, res: any, next: any) {
  if (req.isAuthenticated() && req.user && req.user.isAdmin) {
    return next();
  }
  res.status(403).json({ message: "Forbidden" });
}

// CSRF token için endpoint oluştur
import csurf from "csurf";
import crypto from "crypto";
import nodemailer from "nodemailer";

// CSRF koruma ayarları
const csrfProtection = csurf({
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict"
  }
});

// Nodemailer transporter - development için test hesabı kullanıyoruz
// Gerçek uygulamada SMTP bilgilerinizi kullanın
const transporter = nodemailer.createTransport({
  host: "smtp.ethereal.email",
  port: 587,
  secure: false,
  auth: {
    user: "ethereal.user@ethereal.email", // Bu değerler geliştirme ortamı için
    pass: "ethereal_pass",                // Gerçek ortamda değiştirilmelidir
  },
});

export function registerRoutes(app: Express): Server {
  // Setup authentication routes
  setupAuth(app);
  
  // Ödeme hesapları endpoint'i
  app.get('/api/payment-accounts/active', isAuthenticated, async (req, res) => {
    try {
      const accounts = await storage.getActivePaymentAccounts();
      res.json(accounts);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // CSRF token endpoint'i
  app.get('/api/csrf-token', csrfProtection, (req, res) => {
    const token = req.csrfToken();
    console.log('Generated CSRF token:', token);
    res.json({ csrfToken: token });
  });
  
  // Şifre sıfırlama endpoints
  app.post("/api/forgot-password", csrfProtection, async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "E-posta adresi gereklidir" });
      }
      
      // Kullanıcıyı e-posta ile bul
      const user = await storage.getUserByEmail(email);
      if (!user) {
        // Güvenlik nedeniyle kullanıcı bulunamasa bile başarılı mesajı dönüyoruz
        return res.status(200).json({ 
          message: "Şifre sıfırlama talimatları e-posta adresinize gönderildi."
        });
      }
      
      // Sıfırlama token'ı oluştur
      const resetToken = crypto.randomBytes(32).toString('hex');
      
      // Token'ı kullanıcıya kaydet
      await storage.setResetToken(email, resetToken);
      
      // E-posta içeriğini hazırla
      const resetUrl = `${req.protocol}://${req.get('host')}/auth/reset-password/${resetToken}`;
      const mailOptions = {
        from: "reset@ebupay.com",
        to: email,
        subject: "Şifre Sıfırlama",
        html: `
          <h1>Şifre Sıfırlama İsteği</h1>
          <p>Şifrenizi sıfırlamak için aşağıdaki bağlantıya tıklayın:</p>
          <a href="${resetUrl}" target="_blank">Şifremi Sıfırla</a>
          <p>Bu bağlantı 1 saat sonra geçerliliğini yitirecektir.</p>
          <p>Eğer bu isteği siz yapmadıysanız, lütfen bu e-postayı dikkate almayın.</p>
        `
      };
      
      // E-postayı gönder
      const info = await transporter.sendMail(mailOptions);
      console.log("Şifre sıfırlama e-postası gönderildi: %s", info.messageId);
      
      res.status(200).json({ 
        message: "Şifre sıfırlama talimatları e-posta adresinize gönderildi."
      });
    } catch (error) {
      console.error("Şifre sıfırlama hatası:", error);
      res.status(500).json({ message: "Şifre sıfırlama işlemi sırasında bir hata oluştu." });
    }
  });
  
  app.post("/api/reset-password", csrfProtection, async (req, res) => {
    try {
      const { token, newPassword } = req.body;
      
      if (!token || !newPassword) {
        return res.status(400).json({ message: "Token ve yeni şifre gereklidir" });
      }
      
      // Token ile kullanıcıyı bul
      const user = await storage.getUserByResetToken(token);
      if (!user) {
        return res.status(400).json({ message: "Geçersiz veya süresi dolmuş token" });
      }
      
      // Şifreyi güncelle
      await storage.resetPassword(user.id, newPassword);
      
      res.status(200).json({ message: "Şifreniz başarıyla sıfırlandı. Şimdi giriş yapabilirsiniz." });
    } catch (error) {
      console.error("Şifre güncelleme hatası:", error);
      res.status(500).json({ message: "Şifre güncelleme sırasında bir hata oluştu." });
    }
  });

  // Exchange Rate API
  app.get("/api/exchange-rates", async (req, res) => {
    try {
      const rates = await storage.getAllExchangeRates();
      res.json(rates);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch exchange rates" });
    }
  });

  app.get("/api/exchange-rates/:pair", async (req, res) => {
    try {
      const rate = await storage.getExchangeRate(req.params.pair);
      if (!rate) {
        return res.status(404).json({ message: "Exchange rate not found" });
      }
      res.json(rate);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch exchange rate" });
    }
  });

  app.post("/api/exchange-rates", isAdmin, async (req, res) => {
    try {
      const rateSchema = z.object({
        currencyPair: z.string(),
        rate: z.string(),
        commissionRate: z.string()
      });
      
      const validatedData = rateSchema.parse(req.body);
      
      // Mevcut kur bilgilerini al
      const existingRate = await storage.getExchangeRate(validatedData.currencyPair);
      const isNew = !existingRate;
      
      // Kur bilgisini güncelle
      const rate = await storage.setExchangeRate({
        ...validatedData,
        updatedBy: req.user?.id || 0
      });
      
      // Tüm kullanıcılara bildirim gönder
      if (isNew) {
        // Yeni eklenen kur için bildirim
        await storage.createNotification({
          userId: null, // Tüm kullanıcılar için (null)
          title: "Yeni Kur Eklendi",
          message: `${validatedData.currencyPair} için yeni kur oranı eklendi: ${validatedData.rate}`,
          type: "info",
          relatedEntityType: "exchange_rate",
          relatedEntityId: rate.id,
          isRead: false
        });
      } else {
        // Kur güncellemesi için bildirim
        const rateChange = parseFloat(validatedData.rate) > parseFloat(existingRate.rate) ? "arttı" : "düştü";
        await storage.createNotification({
          userId: null, // Tüm kullanıcılar için (null)
          title: "Kur Oranı Güncellendi",
          message: `${validatedData.currencyPair} kur oranı ${rateChange}: ${validatedData.rate}`,
          type: "info",
          relatedEntityType: "exchange_rate",
          relatedEntityId: rate.id,
          isRead: false
        });
      }
      
      res.status(201).json(rate);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update exchange rate" });
    }
  });

  // Transaction APIs
  app.get("/api/transactions", isAuthenticated, async (req, res) => {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const transactions = await storage.getUserTransactions(req.user.id);
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch transactions" });
    }
  });

  app.post("/api/transactions", isAuthenticated, async (req, res) => {
    try {
      const transactionSchema = z.object({
        type: z.string(),
        sourceAmount: z.string(),
        sourceCurrency: z.string(),
        targetAmount: z.string(),
        targetCurrency: z.string(),
        rate: z.string(),
        commissionRate: z.string(),
        commissionAmount: z.string(),
        status: z.string(),
        paymentMethod: z.string().optional(),
        paymentDetails: z.string().optional()
      });
      
      const validatedData = transactionSchema.parse(req.body);
      
      // Create transaction
      const transaction = await storage.createTransaction({
        ...validatedData,
        userId: req.user.id,
        paymentScreenshot: null
      });
      
      res.status(201).json(transaction);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create transaction" });
    }
  });

  // Upload payment screenshot
  app.post("/api/transactions/:id/payment-proof", isAuthenticated, upload.single("screenshot"), async (req, res) => {
    try {
      const transactionId = parseInt(req.params.id);
      const transaction = await storage.getTransaction(transactionId);
      
      if (!transaction) {
        return res.status(404).json({ message: "Transaction not found" });
      }
      
      if (transaction.userId !== req.user.id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      
      const filePath = `/uploads/${req.file.filename}`;
      
      await storage.updateTransaction(transaction.id, {
        paymentScreenshot: filePath,
        status: "processing", // Update status to processing
        updatedAt: new Date()
      });
      
      res.status(200).json({ message: "Payment proof uploaded successfully", filePath });
    } catch (error) {
      res.status(500).json({ message: "Failed to upload payment proof" });
    }
  });

  // Get user balance
  app.get("/api/balance", isAuthenticated, async (req, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      res.json({ balance: user?.balance || "0" });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch balance" });
    }
  });
  
  // Bildirim API'ları
  app.get("/api/notifications", isAuthenticated, async (req, res) => {
    try {
      const notifications = await storage.getUserNotifications(req.user.id);
      res.json(notifications);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });
  
  app.get("/api/notifications/unread", isAuthenticated, async (req, res) => {
    try {
      const notifications = await storage.getUnreadUserNotifications(req.user.id);
      res.json(notifications);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch unread notifications" });
    }
  });
  
  app.patch("/api/notifications/:id/read", isAuthenticated, async (req, res) => {
    try {
      const notificationId = parseInt(req.params.id);
      const notification = await storage.markNotificationAsRead(notificationId);
      
      if (!notification) {
        return res.status(404).json({ message: "Notification not found" });
      }
      
      res.json(notification);
    } catch (error) {
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });
  
  app.post("/api/notifications/mark-all-read", isAuthenticated, async (req, res) => {
    try {
      await storage.markAllUserNotificationsAsRead(req.user.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to mark all notifications as read" });
    }
  });
  
  app.delete("/api/notifications/:id", isAuthenticated, async (req, res) => {
    try {
      const notificationId = parseInt(req.params.id);
      const success = await storage.deleteNotification(notificationId);
      
      if (!success) {
        return res.status(404).json({ message: "Notification not found or could not be deleted" });
      }
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete notification" });
    }
  });

  // Withdrawal request API
  app.post("/api/withdrawals", isAuthenticated, async (req, res) => {
    try {
      const withdrawalSchema = z.object({
        amount: z.string(),
        method: z.string(),
        details: z.string()
      });
      
      const validatedData = withdrawalSchema.parse(req.body);
      
      // Verify user has enough balance
      const user = await storage.getUser(req.user.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const requestedAmount = parseFloat(validatedData.amount);
      const currentBalance = parseFloat(user.balance);
      
      if (requestedAmount > currentBalance) {
        return res.status(400).json({ message: "Insufficient balance" });
      }
      
      // Create withdrawal request
      const withdrawal = await storage.createWithdrawalRequest({
        ...validatedData,
        userId: req.user.id,
        status: "pending"
      });
      
      // Create transaction record
      const transaction = await storage.createTransaction({
        userId: req.user.id,
        type: "withdrawal",
        sourceAmount: validatedData.amount,
        sourceCurrency: "TRY",
        targetAmount: validatedData.amount,
        targetCurrency: "TRY",
        rate: "1",
        commissionRate: "0",
        commissionAmount: "0",
        status: "pending",
        paymentMethod: validatedData.method,
        paymentDetails: validatedData.details,
        paymentScreenshot: null
      });
      
      // Update withdrawal request with transaction ID
      await storage.updateWithdrawalRequest(withdrawal.id, {
        transactionId: transaction.id
      });
      
      res.status(201).json({ withdrawal, transaction });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create withdrawal request" });
    }
  });

  app.get("/api/withdrawals", isAuthenticated, async (req, res) => {
    try {
      const withdrawals = await storage.getUserWithdrawalRequests(req.user.id);
      res.json(withdrawals);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch withdrawal requests" });
    }
  });

  // Admin APIs
  app.get("/api/admin/users", isAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      // Remove sensitive data
      const safeUsers = users.map(user => {
        const { password, verificationToken, twoFactorSecret, ...safeUser } = user;
        return safeUser;
      });
      res.json(safeUsers);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.get("/api/admin/transactions", isAdmin, async (req, res) => {
    try {
      // Get all transactions by iterating through users
      const users = await storage.getAllUsers();
      let allTransactions: any[] = [];
      
      for (const user of users) {
        const userTransactions = await storage.getUserTransactions(user.id);
        allTransactions = [...allTransactions, ...userTransactions];
      }
      
      // Sort by date, newest first
      allTransactions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      
      res.json(allTransactions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch transactions" });
    }
  });

  app.get("/api/admin/pending-transactions", isAdmin, async (req, res) => {
    try {
      const pendingTransactions = await storage.getPendingTransactions();
      res.json(pendingTransactions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch pending transactions" });
    }
  });

  app.get("/api/admin/withdrawals", isAdmin, async (req, res) => {
    try {
      const pendingWithdrawals = await storage.getPendingWithdrawalRequests();
      res.json(pendingWithdrawals);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch pending withdrawals" });
    }
  });

  app.patch("/api/admin/transactions/:id", isAdmin, async (req, res) => {
    try {
      const transactionId = parseInt(req.params.id);
      const transaction = await storage.getTransaction(transactionId);
      
      if (!transaction) {
        return res.status(404).json({ message: "Transaction not found" });
      }
      
      const updateSchema = z.object({
        status: z.string(),
        adminNotes: z.string().optional()
      });
      
      const validatedData = updateSchema.parse(req.body);
      
      // Update transaction
      const updatedTransaction = await storage.updateTransaction(transaction.id, {
        status: validatedData.status,
        adminNotes: validatedData.adminNotes,
        updatedAt: new Date()
      });
      
      // If the transaction is approved and it's a conversion, update user balance
      if (validatedData.status === "completed" && transaction.type === "conversion") {
        const user = await storage.getUser(transaction.userId);
        if (user) {
          const newBalance = (parseFloat(user.balance) + parseFloat(transaction.targetAmount)).toString();
          await storage.updateUser(user.id, { balance: newBalance });
          
          // Kullanıcıya bildirim gönder
          await storage.createNotification({
            userId: user.id,
            title: "İşleminiz Onaylandı",
            message: `${transaction.sourceAmount} ${transaction.sourceCurrency} dönüşüm işleminiz onaylandı. ${transaction.targetAmount} ${transaction.targetCurrency} bakiyenize eklendi.`,
            type: "success",
            relatedEntityType: "transaction",
            relatedEntityId: transaction.id,
            isRead: false
          });
        }
      } else if (validatedData.status === "cancelled" && transaction.type === "conversion") {
        const user = await storage.getUser(transaction.userId);
        if (user) {
          // Kullanıcıya bildirim gönder
          await storage.createNotification({
            userId: user.id,
            title: "İşleminiz Reddedildi",
            message: `${transaction.sourceAmount} ${transaction.sourceCurrency} dönüşüm işleminiz reddedildi. Sebep: ${validatedData.adminNotes || "Belirtilmemiş"}`,
            type: "error",
            relatedEntityType: "transaction",
            relatedEntityId: transaction.id,
            isRead: false
          });
        }
      }
      
      // If it's a withdrawal request and it's completed, update the user's balance
      if (validatedData.status === "completed" && transaction.type === "withdrawal") {
        const user = await storage.getUser(transaction.userId);
        if (user) {
          const newBalance = (parseFloat(user.balance) - parseFloat(transaction.sourceAmount)).toString();
          await storage.updateUser(user.id, { balance: newBalance });
          
          // Kullanıcıya para çekme bildirimi gönder
          await storage.createNotification({
            userId: user.id,
            title: "Para Çekme İşleminiz Onaylandı",
            message: `${transaction.sourceAmount} ${transaction.sourceCurrency} para çekme işleminiz onaylandı.`,
            type: "success",
            relatedEntityType: "transaction",
            relatedEntityId: transaction.id,
            isRead: false
          });
        }
      } else if (validatedData.status === "cancelled" && transaction.type === "withdrawal") {
        const user = await storage.getUser(transaction.userId);
        if (user) {
          // Kullanıcıya para çekme işleminin reddedildiğini bildir
          await storage.createNotification({
            userId: user.id,
            title: "Para Çekme İşleminiz Reddedildi",
            message: `${transaction.sourceAmount} ${transaction.sourceCurrency} para çekme işleminiz reddedildi. Sebep: ${validatedData.adminNotes || "Belirtilmemiş"}`,
            type: "error",
            relatedEntityType: "transaction",
            relatedEntityId: transaction.id,
            isRead: false
          });
        }
      }
      
      res.json(updatedTransaction);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update transaction" });
    }
  });

  app.patch("/api/admin/withdrawals/:id", isAdmin, async (req, res) => {
    try {
      const withdrawalId = parseInt(req.params.id);
      const withdrawal = await storage.getWithdrawalRequest(withdrawalId);
      
      if (!withdrawal) {
        return res.status(404).json({ message: "Withdrawal request not found" });
      }
      
      const updateSchema = z.object({
        status: z.string(),
        adminNotes: z.string().optional()
      });
      
      const validatedData = updateSchema.parse(req.body);
      
      // Update withdrawal request
      const updatedWithdrawal = await storage.updateWithdrawalRequest(withdrawal.id, {
        status: validatedData.status,
        adminNotes: validatedData.adminNotes,
        updatedAt: new Date()
      });
      
      // Also update the associated transaction if it exists
      if (withdrawal.transactionId) {
        await storage.updateTransaction(withdrawal.transactionId, {
          status: validatedData.status,
          adminNotes: validatedData.adminNotes,
          updatedAt: new Date()
        });
      }
      
      res.json(updatedWithdrawal);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update withdrawal request" });
    }
  });

  app.patch("/api/admin/users/:id", isAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const updateSchema = z.object({
        isVerified: z.boolean().optional(),
        isAdmin: z.boolean().optional(),
        balance: z.string().optional(),
        isTwoFactorEnabled: z.boolean().optional(),
        identityVerified: z.boolean().optional()
      });
      
      const validatedData = updateSchema.parse(req.body);
      
      // Update user
      const updatedUser = await storage.updateUser(user.id, validatedData);
      
      // Kimlik doğrulama durumu değiştiyse bildirim gönder
      if (validatedData.identityVerified !== undefined && 
          validatedData.identityVerified !== user.identityVerified) {
        
        if (validatedData.identityVerified) {
          // Kullanıcıya kimlik doğrulama onayı bildirimi
          await storage.createNotification({
            userId: user.id,
            title: "Kimlik Doğrulama Onaylandı",
            message: "Kimlik doğrulama işleminiz başarıyla tamamlanmıştır. Artık tüm hizmetlerimizden faydalanabilirsiniz.",
            type: "success",
            relatedEntityType: "user",
            relatedEntityId: user.id,
            isRead: false
          });
        } else {
          // Kullanıcıya kimlik doğrulama reddi bildirimi
          await storage.createNotification({
            userId: user.id,
            title: "Kimlik Doğrulama Reddedildi",
            message: "Kimlik doğrulama işleminiz reddedilmiştir. Lütfen doğru ve geçerli belgeleri yükleyiniz.",
            type: "error",
            relatedEntityType: "user",
            relatedEntityId: user.id,
            isRead: false
          });
        }
      }
      
      // Remove sensitive data
      if (updatedUser) {
        const { password, verificationToken, twoFactorSecret, ...safeUser } = updatedUser;
        res.json(safeUser);
      } else {
        res.status(404).json({ message: "User not found" });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update user" });
    }
  });
  
  // Mağaza API'ları
  app.get("/api/store/products", async (req, res) => {
    try {
      const products = await storage.getActiveStoreProducts();
      res.json(products);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch store products" });
    }
  });
  
  app.get("/api/store/products/:id", async (req, res) => {
    try {
      const productId = parseInt(req.params.id);
      const product = await storage.getStoreProduct(productId);
      
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      
      res.json(product);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch product" });
    }
  });
  
  app.post("/api/store/orders", isAuthenticated, async (req, res) => {
    try {
      const orderSchema = z.object({
        totalAmount: z.string(),
        items: z.array(z.object({
          productId: z.number(),
          quantity: z.number(),
          price: z.string(),
          totalPrice: z.string()
        }))
      });
      
      const validatedData = orderSchema.parse(req.body);
      
      // Kullanıcı bakiyesini kontrol et
      const user = await storage.getUser(req.user.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const orderAmount = parseFloat(validatedData.totalAmount);
      const currentBalance = parseFloat(user.balance);
      
      if (orderAmount > currentBalance) {
        return res.status(400).json({ message: "Insufficient balance" });
      }
      
      // Siparişi oluştur
      const order = await storage.createStoreOrder({
        userId: req.user.id,
        totalAmount: validatedData.totalAmount,
        status: "processing"
      });
      
      // Sipariş öğelerini ekle
      const orderItems = [];
      for (const item of validatedData.items) {
        orderItems.push({
          orderId: order.id,
          productId: item.productId,
          quantity: item.quantity,
          price: item.price.toString(),
          totalPrice: item.totalPrice.toString()
        });
      }
      
      // Kullanıcı bakiyesini güncelle
      const newBalance = (currentBalance - orderAmount).toString();
      await storage.updateUser(user.id, { balance: newBalance });
      
      // Bildirim oluştur
      await storage.createNotification({
        userId: user.id,
        title: "Yeni Sipariş Oluşturuldu",
        message: `${validatedData.totalAmount} TL tutarında yeni siparişiniz oluşturuldu. Sipariş numarası: ${order.orderNumber}`,
        type: "info",
        relatedEntityType: "order",
        relatedEntityId: order.id,
        isRead: false
      });
      
      res.status(201).json(order);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create order" });
    }
  });
  
  app.get("/api/store/orders", isAuthenticated, async (req, res) => {
    try {
      const orders = await storage.getUserStoreOrders(req.user.id);
      res.json(orders);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch orders" });
    }
  });
  
  app.get("/api/store/orders/:id", isAuthenticated, async (req, res) => {
    try {
      const orderId = parseInt(req.params.id);
      const orderDetails = await storage.getStoreOrderDetails(orderId);
      
      // Kullanıcı sadece kendi siparişlerini görebilmeli
      if (orderDetails.order.userId !== req.user.id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      res.json(orderDetails);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch order details" });
    }
  });
  
  // Admin mağaza API'ları
  app.post("/api/admin/store/products", isAdmin, upload.single("image"), async (req, res) => {
    try {
      const productSchema = z.object({
        name: z.string(),
        description: z.string(),
        price: z.string(),
        category: z.string(),
        stockQuantity: z.string().transform(val => parseInt(val)),
        isActive: z.enum(["true", "false"]).transform(val => val === "true")
      });
      
      const validatedData = productSchema.parse(req.body);
      
      // Resim yüklendiyse
      let imageUrl = null;
      if (req.file) {
        imageUrl = `/uploads/${req.file.filename}`;
      }
      
      // Ürünü oluştur
      const product = await storage.createStoreProduct({
        ...validatedData,
        imageUrl
      });
      
      res.status(201).json(product);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create product" });
    }
  });
  
  app.get("/api/admin/store/products", isAdmin, async (req, res) => {
    try {
      const products = await storage.getAllStoreProducts();
      res.json(products);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });
  
  app.patch("/api/admin/store/products/:id", isAdmin, upload.single("image"), async (req, res) => {
    try {
      const productId = parseInt(req.params.id);
      const product = await storage.getStoreProduct(productId);
      
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      
      const productSchema = z.object({
        name: z.string().optional(),
        description: z.string().optional(),
        price: z.string().optional(),
        category: z.string().optional(),
        stockQuantity: z.string().transform(val => parseInt(val)).optional(),
        isActive: z.enum(["true", "false"]).transform(val => val === "true").optional()
      });
      
      const validatedData = productSchema.parse(req.body);
      
      // Resim yüklendiyse
      if (req.file) {
        validatedData.imageUrl = `/uploads/${req.file.filename}`;
      }
      
      // Ürünü güncelle
      const updatedProduct = await storage.updateStoreProduct(productId, validatedData);
      
      res.json(updatedProduct);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update product" });
    }
  });
  
  app.delete("/api/admin/store/products/:id", isAdmin, async (req, res) => {
    try {
      const productId = parseInt(req.params.id);
      const success = await storage.deleteStoreProduct(productId);
      
      if (!success) {
        return res.status(404).json({ message: "Product not found or could not be deleted" });
      }
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete product" });
    }
  });

  // Payment Accounts Admin API routes
  app.get("/api/admin/payment-accounts", isAdmin, async (req, res) => {
    try {
      const accounts = await storage.getAllPaymentAccounts();
      res.json(accounts);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch payment accounts" });
    }
  });
  
  app.post("/api/admin/payment-accounts", isAdmin, async (req, res) => {
    try {
      // Veri doğrulama şeması
      const accountSchema = z.object({
        accountType: z.string().min(1, "Hesap tipi gereklidir"),
        accountName: z.string().min(1, "Hesap adı gereklidir"),
        accountNumber: z.string().min(1, "Hesap numarası/email gereklidir"),
        bankName: z.string().optional(),
        iban: z.string().optional(),
        swiftCode: z.string().optional(),
        branchCode: z.string().optional(),
        additionalInfo: z.string().optional(),
        isActive: z.boolean().default(true)
      });
      
      const validatedData = accountSchema.parse(req.body);
      const newAccount = await storage.createPaymentAccount(validatedData);
      res.status(201).json(newAccount);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Geçersiz hesap bilgileri", 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Failed to create payment account" });
    }
  });
  
  app.patch("/api/admin/payment-accounts/:id", isAdmin, async (req, res) => {
    try {
      // Veri doğrulama şeması - güncelleme için tüm alanlar opsiyonel
      const accountSchema = z.object({
        accountType: z.string().min(1, "Hesap tipi gereklidir").optional(),
        accountName: z.string().min(1, "Hesap adı gereklidir").optional(),
        accountNumber: z.string().min(1, "Hesap numarası/email gereklidir").optional(),
        bankName: z.string().optional(),
        iban: z.string().optional(),
        swiftCode: z.string().optional(),
        branchCode: z.string().optional(),
        additionalInfo: z.string().optional(),
        isActive: z.boolean().optional()
      });
      
      const validatedData = accountSchema.parse(req.body);
      const id = parseInt(req.params.id);
      const updatedAccount = await storage.updatePaymentAccount(id, validatedData);
      
      if (!updatedAccount) {
        return res.status(404).json({ message: "Payment account not found" });
      }
      
      res.json(updatedAccount);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Geçersiz hesap bilgileri", 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Failed to update payment account" });
    }
  });
  
  app.delete("/api/admin/payment-accounts/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deletePaymentAccount(id);
      
      if (!success) {
        return res.status(404).json({ message: "Payment account not found or could not be deleted" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete payment account" });
    }
  });
  
  // Kimlik doğrulama endpoint'i
  app.post("/api/identity-verification", isAuthenticated, upload.fields([
    { name: 'frontId', maxCount: 1 },
    { name: 'backId', maxCount: 1 },
    { name: 'selfie', maxCount: 1 }
  ]), async (req, res) => {
    try {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      
      if (!files.frontId || !files.backId || !files.selfie) {
        return res.status(400).json({ 
          message: "Kimlik doğrulama için ön yüz, arka yüz ve selfie görüntülerini yüklemeniz gerekmektedir." 
        });
      }
      
      const frontIdPath = `/uploads/identity_verification/${files.frontId[0].filename}`;
      const backIdPath = `/uploads/identity_verification/${files.backId[0].filename}`;
      const selfiePath = `/uploads/identity_verification/${files.selfie[0].filename}`;
      
      // Kullanıcı bilgisini güncelle
      const user = await storage.getUser(req.user.id);
      if (!user) {
        return res.status(404).json({ message: "Kullanıcı bulunamadı" });
      }
      
      // Kimlik doğrulama durumunu güncelle
      const updatedUser = await storage.updateUser(user.id, {
        identityVerified: false,
        identityDocuments: [frontIdPath, backIdPath, selfiePath]
      });
      
      // Admin'e bildirim gönder
      await storage.createNotification({
        userId: null, // Tüm adminlere gönderilecek
        title: "Yeni Kimlik Doğrulama Talebi",
        message: `${user.firstName} ${user.lastName} (${user.email}) kullanıcısı kimlik doğrulama belgelerini yükledi. İncelemeniz gerekmektedir.`,
        type: "identity_verification",
        relatedEntityType: "user",
        relatedEntityId: user.id,
        isRead: false
      });
      
      // Kullanıcıya bildirim gönder
      await storage.createNotification({
        userId: user.id,
        title: "Kimlik Doğrulama Talebiniz Alındı",
        message: "Kimlik doğrulama belgeleriniz alındı. En kısa sürede incelenecektir. Bu işlem genellikle 24-48 saat içinde tamamlanır.",
        type: "info",
        relatedEntityType: "user",
        relatedEntityId: user.id,
        isRead: false
      });
      
      res.status(200).json({ 
        message: "Kimlik doğrulama belgeleriniz başarıyla yüklendi. İnceleme sonrası size bilgi verilecektir.",
        status: "pending"
      });
    } catch (error) {
      console.error("Identity verification error:", error);
      res.status(500).json({ message: "Kimlik doğrulama işlemi sırasında bir hata oluştu" });
    }
  });
  
  // Admin: Kimlik doğrulama onaylama/reddetme endpoint'i
  app.patch("/api/admin/users/:id/verify-identity", isAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "Kullanıcı bulunamadı" });
      }
      
      const verificationSchema = z.object({
        verified: z.boolean(),
        notes: z.string().optional()
      });
      
      const { verified, notes } = verificationSchema.parse(req.body);
      
      // Kullanıcının kimlik durumunu güncelle
      const updatedUser = await storage.verifyUserIdentity(userId, verified);
      
      if (!updatedUser) {
        return res.status(500).json({ message: "Kullanıcı güncellenemedi" });
      }
      
      // Kullanıcıya bildirim gönder
      if (verified) {
        await storage.createNotification({
          userId: userId,
          title: "Kimlik Doğrulamanız Onaylandı",
          message: "Kimlik doğrulamanız başarıyla tamamlandı. Artık tüm platform özelliklerini kullanabilirsiniz.",
          type: "success",
          relatedEntityType: "user",
          relatedEntityId: userId,
          isRead: false
        });
      } else {
        await storage.createNotification({
          userId: userId,
          title: "Kimlik Doğrulamanız Reddedildi",
          message: notes || "Kimlik doğrulamanız reddedildi. Lütfen destek ekibiyle iletişime geçin.",
          type: "warning",
          relatedEntityType: "user",
          relatedEntityId: userId,
          isRead: false
        });
      }
      
      res.json({ 
        message: verified ? "Kullanıcı kimliği doğrulandı" : "Kullanıcı kimliği reddedildi",
        status: verified ? "verified" : "rejected"
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to verify user identity" });
    }
  });
  
  // Admin: Tüm kullanıcılara bildirim gönderme endpoint'i
  app.post("/api/admin/notifications", isAdmin, async (req, res) => {
    try {
      const notificationSchema = z.object({
        title: z.string().min(1, "Başlık gereklidir"),
        message: z.string().min(1, "Mesaj içeriği gereklidir"),
        type: z.string().default("info"),
        userId: z.number().optional(), // Belirli bir kullanıcıya gönderilecekse
        urgent: z.boolean().default(false)
      });
      
      const validatedData = notificationSchema.parse(req.body);
      
      if (validatedData.userId) {
        // Belirli bir kullanıcıya bildirim gönder
        const user = await storage.getUser(validatedData.userId);
        if (!user) {
          return res.status(404).json({ message: "Kullanıcı bulunamadı" });
        }
        
        const notification = await storage.createNotification({
          userId: validatedData.userId,
          title: validatedData.title,
          message: validatedData.message,
          type: validatedData.type,
          isRead: false,
          relatedEntityType: "admin",
          relatedEntityId: req.user.id
        });
        
        res.status(201).json({
          message: "Bildirim başarıyla gönderildi",
          notification
        });
      } else {
        // Tüm kullanıcılara bildirim gönder
        const notification = await storage.createNotification({
          userId: null, // Tüm kullanıcılara
          title: validatedData.title,
          message: validatedData.message,
          type: validatedData.type,
          isRead: false,
          relatedEntityType: "admin",
          relatedEntityId: req.user.id
        });
        
        res.status(201).json({
          message: "Bildirim tüm kullanıcılara başarıyla gönderildi",
          notification
        });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to send notification" });
    }
  });

  // Create HTTP server
  const httpServer = createServer(app);

  return httpServer;
}
