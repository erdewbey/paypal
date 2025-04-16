import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import csurf from "csurf";
import path from "path";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";

const app = express();
app.use(express.json({ limit: "1mb" })); // Limitleme ekledik
app.use(express.urlencoded({ extended: false, limit: "1mb" })); // Limitleme ekledik
app.use(cookieParser()); // Cookie parser etkinleştir - CSRF için gerekli

// Güvenlik başlıkları ekleyelim
app.use((req, res, next) => {
  // XSS koruması etkinleştir
  res.setHeader("X-XSS-Protection", "1; mode=block");
  
  // Clickjacking koruması
  res.setHeader("X-Frame-Options", "DENY");
  
  // Content-Type güvenliği
  res.setHeader("X-Content-Type-Options", "nosniff");
  
  // Referrer Policy
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  
  // HSTS (HTTPS zorunluluğu) - üretim ortamında etkinleştirin
  if (process.env.NODE_ENV === "production") {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  }
  
  next();
});

// CSRF koruması ayarı - API istekleri için
const csrfProtection = csurf({
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 3600 // 1 saat
  }
});

// Rate limiter ayarları - Farklı durumlar için farklı limitler
const standardLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 dakika
  max: 100, // Her IP için 15 dakikada maksimum 100 istek
  standardHeaders: true, // X-RateLimit-* başlıklarını dahil et
  legacyHeaders: false, // X-RateLimit-* başlıklarını eski sürüm formatında kullanma
  message: {
    message: 'Çok fazla istek gönderdiniz, lütfen 15 dakika sonra tekrar deneyin.'
  }
});

// Login/register gibi kimlik doğrulama endpointleri için daha sıkı sınırlar
const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 saat
  max: 10, // Her IP için saatte maksimum 10 istek
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: 'Çok fazla kimlik doğrulama isteği gönderdiniz, lütfen bir saat sonra tekrar deneyin.'
  }
});

// API'lere genel rate limiter uygula
app.use('/api', standardLimiter);

// Kimlik doğrulama işlemleri için daha sıkı rate limiter uygula
app.use('/api/login', authLimiter);
app.use('/api/register', authLimiter);

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // CSRF korumasını açalım - örnek olarak yazma islemleri için CSRF korumasını uygulayalım
  // Sadece GET istekleri için CSRF korumasını atla (api/csrf-token endpoint'i hariç)
  // CSRF korumasını sadece belirli kritik API'ler için uygula
  // Login ve kritik API'ler için özel koruma yapacağız
  app.use((req, res, next) => {
    // CSRF token endpoint'i için korumayı atla
    if (req.path === '/api/csrf-token') {
      return next();
    }
    
    // GET istekleri için CSRF korumasını atla
    if (req.method === 'GET') {
      return next();
    }
    
    // /api/login ve /api/register gibi kritik endpoint'ler hariç diğerleri için CSRF korumasını geçici olarak devre dışı bırakalım
    // Uygulama geliştirme aşamasındayken bu şekilde ilerleyelim
    if (req.path === '/api/login' || req.path === '/api/register') {
      // Bu kodlar devam edecek, ancak şimdilik devre dışı bırakıyoruz
      // return csrfProtection(req, res, next);
    }
    
    return next();
  });
  
  const server = await registerRoutes(app);

  // Gelişmiş hata işleme
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    // Hata kodunu belirle
    const status = err.status || err.statusCode || 500;
    
    // Güvenli hata mesajı
    let message = "Bir hata oluştu. Lütfen daha sonra tekrar deneyin.";
    
    // CSRF hata kontrolü
    if (err.code === 'EBADCSRFTOKEN') {
      return res.status(403).json({ 
        message: "Güvenlik doğrulaması başarısız. Lütfen sayfayı yenileyip tekrar deneyin."
      });
    }
    
    // Geliştirme modunda hata mesajı
    if (process.env.NODE_ENV === 'development') {
      message = err.message || "Internal Server Error";
      
      // Güvenli mesajları terminal üzerinde logla
      console.error(`Hata (${status}): ${err.message}`);
      console.error(err.stack);
      
      // Sadece geliştirme modunda detaylı hata mesajlarını dön
      return res.status(status).json({ 
        message,
        stack: err.stack,
        error: err.name
      });
    }
    
    // Üretim modunda olası yaygın hataları kullanıcı dostu hale getir
    if (status === 400) {
      message = "Geçersiz istek formatı";
    } else if (status === 401) {
      message = "Bu işlemi gerçekleştirmek için giriş yapmalısınız";
    } else if (status === 403) {
      message = "Bu işlemi gerçekleştirmek için yetkiniz bulunmamaktadır";
    } else if (status === 404) {
      message = "İstenen kaynak bulunamadı";
    } else if (status === 429) {
      message = "Çok fazla istek gönderdiniz. Lütfen daha sonra tekrar deneyin";
    }
    
    // Kullanıcıya güvenli hata mesajı döndür
    return res.status(status).json({ message });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
