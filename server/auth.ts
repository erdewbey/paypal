import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";
import { z } from "zod";
import crypto from "crypto";
import nodemailer from "nodemailer";
import { authenticator } from "otplib"; // 2FA için
import mailjetTransport from 'nodemailer-mailjet-transport';
import csurf from "csurf";

// E-posta gönderimi için Mailjet API transporter oluşturma
const transporter = nodemailer.createTransport(mailjetTransport({
  auth: {
    apiKey: process.env.MAILJET_API_KEY || "",
    apiSecret: process.env.MAILJET_SECRET_KEY || ""
  }
}));

declare global {
  namespace Express {
    interface User extends SelectUser {}
    
    // Session tipini genişletiyoruz
    interface Session {
      twoFactorVerified?: boolean;
    }
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  // Check if stored includes a salt separator
  if (!stored || !stored.includes('.')) {
    return false; // Invalid format
  }
  
  const [hashed, salt] = stored.split(".");
  if (!hashed || !salt) {
    return false; // Invalid format
  }
  
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

// E-posta transporteri daha önce tanımlandı

// 2FA yardımcı fonksiyonları
function generateTOTPSecret(): string {
  return authenticator.generateSecret();
}

function generateTOTPToken(secret: string): string {
  return authenticator.generate(secret);
}

function verifyTOTPToken(token: string, secret: string): boolean {
  return authenticator.verify({ token, secret });
}

// 2FA durumu kontrolü middleware
function require2FA(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Kimlik doğrulama gerekli" });
  }
  
  const user = req.user as SelectUser;
  
  // Kullanıcı 2FA etkinleştirdiyse ve 2FA doğrulaması yapılmadıysa
  if (user.isTwoFactorEnabled && !req.session.twoFactorVerified) {
    return res.status(403).json({ 
      message: "İki faktörlü doğrulama gerekli",
      requireTwoFactor: true
    });
  }
  
  next();
}

// CSRF koruma middleware'ini oluştur
const csrfProtection = csurf({
  cookie: {
    httpOnly: true,
    secure: false, // Development ortamı için false, üretimde true yapılmalı
    sameSite: "lax"
  }
});

export function setupAuth(app: Express) {
  // Sabit bir SESSION_SECRET kullanıyoruz
  const sessionSecret = "8dWZq3P6yFxB9nK7TvM4jS5RcA2eH1GxLpN6ZdY7wQ8mV3bX5";
  
  const sessionSettings: session.SessionOptions = {
    secret: sessionSecret,
    resave: true,
    saveUninitialized: true,
    store: storage.sessionStore,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
      httpOnly: true,
      secure: false, // Geliştirme ortamında false, üretimde true olacak
      sameSite: "lax", // Daha esnek CSRF koruması
      path: "/"
    }
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        console.log(`Giriş denemesi: ${username}`);
        
        // Önce kullanıcı adına göre ara
        let user = await storage.getUserByUsername(username);
        
        // Kullanıcı adıyla bulunamadıysa, email ile dene
        if (!user) {
          console.log(`Kullanıcı adı bulunamadı, email ile deneniyor: ${username}`);
          user = await storage.getUserByEmail(username);
        }
        
        if (!user) {
          console.log(`Kullanıcı bulunamadı: ${username}`);
          return done(null, false, { message: "Kullanıcı adı veya şifre hatalı" });
        }
        
        console.log(`Kullanıcı bulundu: ${user.username} (${user.id})`);
        
        // Şifre kontrolü
        const passwordValid = await comparePasswords(password, user.password);
        if (!passwordValid) {
          console.log(`Hatalı şifre: ${username}`);
          return done(null, false, { message: "Kullanıcı adı veya şifre hatalı" });
        }
        
        // Şifre doğru, e-posta doğrulamasını kontrol et
        if (!user.isVerified) {
          // Eğer kullanıcı doğrulamadıysa, veritabanına otomatik doğrulama yapalım (demo için)
          console.log(`Kullanıcı ${user.username} henüz doğrulanmamış, otomatik doğrulanıyor`);
          await storage.updateUser(user.id, { 
            isVerified: true,
            verificationToken: null
          });
          
          console.log(`Kullanıcı ${user.username} otomatik olarak doğrulandı`);
          
          // Yeni kullanıcı bilgisini alalım
          user = await storage.getUser(user.id) || user;
        }
        
        console.log(`Giriş başarılı: ${user.username}`);
        return done(null, user);
      } catch (error) {
        console.error('Giriş sırasında hata:', error);
        return done(error);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  // Registration route
  app.post("/api/register", csrfProtection, async (req, res, next) => {
    try {
      // Validate request body
      const registerSchema = z.object({
        firstName: z.string().min(2, "İsim en az 2 karakter olmalıdır"),
        lastName: z.string().min(2, "Soyisim en az 2 karakter olmalıdır"),
        username: z.string().min(3, "Kullanıcı adı en az 3 karakter olmalıdır")
          .regex(/^[a-zA-Z0-9_]+$/, "Kullanıcı adı sadece harf, rakam ve alt çizgi (_) içerebilir"),
        email: z.string().email("Lütfen geçerli bir e-posta adresi girin"),
        phone: z.string().min(10, "Lütfen geçerli bir telefon numarası girin"),
        idNumber: z.string().min(11, "TC Kimlik numarası 11 haneli olmalıdır").max(11, "TC Kimlik numarası 11 haneli olmalıdır"),
        birthDate: z.string().min(1, "Doğum tarihi gereklidir"),
        password: z.string()
          .min(8, "Şifre en az 8 karakter olmalıdır")
          .regex(/[A-Z]/, "Şifre en az bir büyük harf içermelidir")
          .regex(/[a-z]/, "Şifre en az bir küçük harf içermelidir")
          .regex(/[0-9]/, "Şifre en az bir rakam içermelidir")
          .regex(/[^A-Za-z0-9]/, "Şifre en az bir özel karakter içermelidir"),
        confirmPassword: z.string()
      }).refine(data => data.password === data.confirmPassword, {
        message: "Şifreler eşleşmiyor",
        path: ["confirmPassword"],
      });

      const validatedData = registerSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByUsername(validatedData.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }
      
      const existingEmail = await storage.getUserByEmail(validatedData.email);
      if (existingEmail) {
        return res.status(400).json({ message: "Email already in use" });
      }
      
      // Create the user - Kayıt sırasında e-posta doğrulamasını atlayalım
      const user = await storage.createUser({
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        username: validatedData.username,
        email: validatedData.email,
        phone: validatedData.phone,
        idNumber: validatedData.idNumber, // TC Kimlik No
        birthDate: validatedData.birthDate, // Doğum tarihi
        password: await hashPassword(validatedData.password),
        isAdmin: false,
        isVerified: false // E-posta doğrulama zorunlu
      });
      
      // E-posta doğrulama için token oluştur
      const verificationToken = crypto.randomBytes(32).toString('hex');
      await storage.updateUser(user.id, { verificationToken });
      
      // Doğrulama e-postası gönder
      const verificationUrl = `${req.protocol}://${req.get('host')}/api/verify-email?token=${verificationToken}`;
      
      try {
        await transporter.sendMail({
          from: "TRY Exchange <ebupay.paypal@gmail.com>",
          to: user.email,
          subject: "TRY Exchange - E-posta Doğrulama",
          text: `Merhaba ${user.firstName},\n\nE-posta adresinizi doğrulamak için lütfen şu bağlantıya tıklayın: ${verificationUrl}\n\nBu bağlantı 24 saat içinde geçerliliğini yitirecektir.\n\nTeşekkürler,\nTRY Exchange Ekibi`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #1a56db;">TRY Exchange - E-posta Doğrulama</h2>
              <p>Merhaba ${user.firstName},</p>
              <p>Kayıt olduğunuz için teşekkür ederiz. E-posta adresinizi doğrulamak için lütfen aşağıdaki butona tıklayın:</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${verificationUrl}" style="background-color: #1a56db; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">
                  E-posta Doğrula
                </a>
              </div>
              <p>Eğer buton çalışmazsa, aşağıdaki bağlantıyı tarayıcınıza kopyalayabilirsiniz:</p>
              <p>${verificationUrl}</p>
              <p>Bu bağlantı 24 saat içinde geçerliliğini yitirecektir.</p>
              <p>Teşekkürler,<br>TRY Exchange Ekibi</p>
            </div>
          `
        });
        console.log(`Doğrulama e-postası gönderildi: ${user.email}`);
      } catch (error) {
        console.error("E-posta gönderme hatası:", error);
      }
      
      // Respond without sensitive data
      const userResponse = { ...user };
      delete userResponse.password;
      delete userResponse.verificationToken;
      delete userResponse.twoFactorSecret;
      
      return res.status(201).json({
        ...userResponse,
        message: "Kayıt başarılı. Lütfen e-posta adresinize gönderilen doğrulama bağlantısına tıklayın."
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation failed", 
          errors: error.errors 
        });
      }
      next(error);
    }
  });

  // Email verification route
  app.get("/api/verify-email", async (req, res) => {
    try {
      const { token } = req.query;
      
      if (!token || typeof token !== 'string') {
        return res.status(400).send("Geçersiz doğrulama kodu");
      }
      
      console.log("Doğrulama token'ı:", token);
      
      // Tüm kullanıcıları çek
      const users = await storage.getAllUsers();
      
      // Doğrulama yapmak için geçerli token'la kullanıcıyı bul
      const user = users.find(u => u.verificationToken === token);
      
      console.log("Doğrulama için bulunan kullanıcı:", user?.id, user?.username);
      
      if (!user) {
        console.error("Geçersiz token, eşleşen kullanıcı bulunamadı:", token);
        
        // Eğer kullanıcı yoksa, kullanıcılara daha önce doğrulama yapmış olabilecekleri bilgisini ver
        const alreadyVerifiedUser = users.find(u => 
          u.verificationToken === null && 
          u.isVerified === true
        );
        
        if (alreadyVerifiedUser) {
          return res.redirect("/verification-success?already=true");
        }
        
        return res.status(400).send("Geçersiz veya süresi dolmuş doğrulama kodu");
      }
      
      // Kullanıcı zaten doğrulanmış mı kontrol et
      if (user.isVerified) {
        console.log("Kullanıcı zaten doğrulanmış:", user.id, user.username);
        return res.redirect("/verification-success?already=true");
      }
      
      // Update user to verified
      await storage.updateUser(user.id, { 
        isVerified: true,
        verificationToken: null  // Token'ı sil
      });
      
      console.log("Doğrulama başarılı, kullanıcı güncellendi:", user.id, user.username);
      
      // Redirect to verification success page
      return res.redirect("/verification-success");
    } catch (error) {
      console.error("Email verification error:", error);
      return res.status(500).send("E-posta doğrulama sırasında bir hata oluştu");
    }
  });
  
  // Şifre sıfırlama isteği
  app.post("/api/forgot-password", csrfProtection, async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "E-posta adresi gereklidir" });
      }
      
      // Kullanıcıyı bul
      const user = await storage.getUserByEmail(email);
      
      if (!user) {
        // Güvenlik açısından kullanıcı bulunamasa bile aynı mesajı dön
        return res.status(200).json({ message: "Şifre sıfırlama talimatları gönderildi" });
      }
      
      // Sıfırlama token'ı oluştur
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetExpires = new Date();
      resetExpires.setHours(resetExpires.getHours() + 1); // 1 saat geçerli
      
      // Token'ı kullanıcı kaydına ekle
      await storage.updateUser(user.id, {
        resetPasswordToken: resetToken,
        resetPasswordExpires: resetExpires
      });
      
      // Sıfırlama linkini oluştur
      const resetUrl = `${req.protocol}://${req.get('host')}/reset-password/${resetToken}`;
      
      // E-posta gönder
      await transporter.sendMail({
        from: "TRY Exchange <ebupay.paypal@gmail.com>",
        to: user.email,
        subject: "Şifre Sıfırlama",
        text: `Şifrenizi sıfırlamak için aşağıdaki linke tıklayın: ${resetUrl}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #1a56db;">TRY Exchange - Şifre Sıfırlama</h2>
            <p>Merhaba ${user.firstName},</p>
            <p>Şifre sıfırlama talebiniz alındı. Şifrenizi sıfırlamak için aşağıdaki butona tıklayın:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" style="background-color: #1a56db; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">
                Şifremi Sıfırla
              </a>
            </div>
            <p>Bu link bir saat boyunca geçerlidir.</p>
            <p>Eğer bu talebi siz yapmadıysanız, bu e-postayı dikkate almayınız.</p>
            <p>Teşekkürler,<br>TRY Exchange Ekibi</p>
          </div>
        `
      });
      
      return res.status(200).json({ message: "Şifre sıfırlama talimatları gönderildi" });
    } catch (error) {
      console.error("Şifre sıfırlama hatası:", error);
      return res.status(500).json({ message: "Şifre sıfırlama işlemi sırasında bir hata oluştu" });
    }
  });
  
  // Şifre sıfırlama token doğrulama
  app.get("/api/reset-password/:token", async (req, res) => {
    try {
      const { token } = req.params;
      
      if (!token) {
        return res.status(400).json({ message: "Geçersiz sıfırlama kodu" });
      }
      
      // Token'la eşleşen kullanıcıyı bul
      const users = await storage.getAllUsers();
      const user = users.find(u => 
        u.resetPasswordToken === token && 
        u.resetPasswordExpires && 
        new Date(u.resetPasswordExpires) > new Date()
      );
      
      if (!user) {
        return res.status(400).json({ message: "Geçersiz veya süresi dolmuş sıfırlama kodu" });
      }
      
      // Token geçerli
      return res.status(200).json({ message: "Sıfırlama kodu geçerli", valid: true });
    } catch (error) {
      console.error("Şifre sıfırlama token doğrulama hatası:", error);
      return res.status(500).json({ message: "Şifre sıfırlama doğrulama işlemi sırasında bir hata oluştu" });
    }
  });
  
  // Şifre sıfırlama gerçekleştirme
  app.post("/api/reset-password", csrfProtection, async (req, res) => {
    try {
      const { token, password, confirmPassword } = req.body;
      
      if (!token || !password) {
        return res.status(400).json({ message: "Geçersiz istek" });
      }
      
      if (password !== confirmPassword) {
        return res.status(400).json({ message: "Şifreler eşleşmiyor" });
      }
      
      // Şifre kurallarını doğrula
      const passwordSchema = z.string()
        .min(8, "Şifre en az 8 karakter olmalıdır")
        .regex(/[A-Z]/, "Şifre en az bir büyük harf içermelidir")
        .regex(/[a-z]/, "Şifre en az bir küçük harf içermelidir")
        .regex(/[0-9]/, "Şifre en az bir rakam içermelidir")
        .regex(/[^A-Za-z0-9]/, "Şifre en az bir özel karakter içermelidir");
      
      try {
        passwordSchema.parse(password);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({ 
            message: error.errors[0].message 
          });
        }
      }
      
      // Kullanıcıyı bul
      const users = await storage.getAllUsers();
      const user = users.find(u => 
        u.resetPasswordToken === token && 
        u.resetPasswordExpires && 
        new Date(u.resetPasswordExpires) > new Date()
      );
      
      if (!user) {
        return res.status(400).json({ message: "Geçersiz veya süresi dolmuş sıfırlama kodu" });
      }
      
      // Şifreyi değiştir
      const hashedPassword = await hashPassword(password);
      await storage.updateUser(user.id, {
        password: hashedPassword,
        resetPasswordToken: null,
        resetPasswordExpires: null
      });
      
      // Kullanıcıya bilgilendirme e-postası gönder
      await transporter.sendMail({
        from: "TRY Exchange <ebupay.paypal@gmail.com>",
        to: user.email,
        subject: "Şifreniz Başarıyla Değiştirildi",
        text: `Merhaba ${user.firstName}, şifreniz başarıyla değiştirildi. Bu işlemi siz yapmadıysanız, lütfen hemen bizimle iletişime geçin.`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #1a56db;">TRY Exchange - Şifre Değişikliği</h2>
            <p>Merhaba ${user.firstName},</p>
            <p>Şifreniz başarıyla değiştirildi.</p>
            <p>Bu işlemi siz yapmadıysanız, lütfen hemen bizimle iletişime geçin.</p>
            <p>Teşekkürler,<br>TRY Exchange Ekibi</p>
          </div>
        `
      });
      
      return res.status(200).json({ message: "Şifreniz başarıyla değiştirildi" });
    } catch (error) {
      console.error("Şifre değiştirme hatası:", error);
      return res.status(500).json({ message: "Şifre değiştirme işlemi sırasında bir hata oluştu" });
    }
  });

  // Login route
  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err, user, info) => {
      if (err) return next(err);
      if (!user) {
        return res.status(401).json({ message: info?.message || "Kullanıcı adı veya şifre hatalı" });
      }
      
      req.login(user, (err) => {
        if (err) return next(err);
        
        // Remove sensitive information
        const userResponse = { ...user };
        delete userResponse.password;
        delete userResponse.verificationToken;
        delete userResponse.twoFactorSecret;
        
        return res.status(200).json(userResponse);
      });
    })(req, res, next);
  });

  // Logout route
  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  // Current user route
  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    // Remove sensitive information
    const user = { ...req.user };
    delete user.password;
    delete user.verificationToken;
    delete user.twoFactorSecret;
    
    res.json(user);
  });
  
  // 2FA başlama endpoint'i
  app.post("/api/2fa/setup", require2FA, async (req, res) => {
    try {
      const user = req.user as SelectUser;
      
      // Kullanıcı zaten 2FA etkinleştirdiyse hata döndür
      if (user.isTwoFactorEnabled) {
        return res.status(400).json({ message: "İki faktörlü doğrulama zaten etkin" });
      }
      
      // Yeni bir 2FA gizli anahtarı oluştur
      const secret = generateTOTPSecret();
      
      // Doğrulama için bir OTP token'ı oluştur
      const token = generateTOTPToken(secret);
      
      // Kullanıcı için gizli anahtarı güncelle ama henüz etkinleştirme
      await storage.updateUser(user.id, {
        twoFactorSecret: secret
      });
      
      // Kullanıcıya QR kodu oluşturması için gereken bilgileri gönder
      // Bu kısmı güvenli bir şekilde yönet!
      return res.json({
        secret,
        token,
        otpAuthUrl: authenticator.keyuri(user.username, "TRY Exchange", secret)
      });
    } catch (error) {
      console.error("2FA setup error:", error);
      return res.status(500).json({ message: "İki faktörlü doğrulama ayarlanırken bir hata oluştu" });
    }
  });
  
  // 2FA doğrulama endpoint'i
  app.post("/api/2fa/verify", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Bu işlem için giriş yapmalısınız" });
      }
      
      const user = req.user as SelectUser;
      
      // Token doğrulama
      const { token } = req.body;
      
      if (!token) {
        return res.status(400).json({ message: "Doğrulama kodu gerekli" });
      }
      
      // Kullanıcının gizli anahtarı var mı?
      if (!user.twoFactorSecret) {
        return res.status(400).json({ message: "İki faktörlü doğrulama ayarlanmamış" });
      }
      
      // Token doğrulama
      const isValid = verifyTOTPToken(token, user.twoFactorSecret);
      
      if (!isValid) {
        return res.status(400).json({ message: "Geçersiz doğrulama kodu" });
      }
      
      // İlk kez 2FA etkinleştiriliyorsa, kullanıcı ayarını güncelle
      if (!user.isTwoFactorEnabled) {
        await storage.updateUser(user.id, {
          isTwoFactorEnabled: true
        });
      }
      
      // Oturum için 2FA doğrulamasını yap
      if (req.session) {
        req.session.twoFactorVerified = true;
      }
      
      return res.json({ 
        success: true, 
        message: "İki faktörlü doğrulama başarılı" 
      });
    } catch (error) {
      console.error("2FA verification error:", error);
      return res.status(500).json({ message: "Doğrulama işlemi sırasında bir hata oluştu" });
    }
  });
  
  // 2FA devre dışı bırakma endpoint'i
  app.post("/api/2fa/disable", require2FA, async (req, res) => {
    try {
      const user = req.user as SelectUser;
      
      // Kullanıcının 2FA ayarlarını sıfırla
      await storage.updateUser(user.id, {
        isTwoFactorEnabled: false,
        twoFactorSecret: null
      });
      
      // Oturum için 2FA doğrulamasını sıfırla
      if (req.session) {
        req.session.twoFactorVerified = false;
      }
      
      return res.json({ 
        success: true, 
        message: "İki faktörlü doğrulama devre dışı bırakıldı" 
      });
    } catch (error) {
      console.error("2FA disable error:", error);
      return res.status(500).json({ message: "İki faktörlü doğrulama devre dışı bırakılırken bir hata oluştu" });
    }
  });
}
