// server/security/logger.ts
// Güvenli loglama işlemleri için yardımcı fonksiyonlar

import { log } from "../vite";

// Veri güvenliği için PII (Personally Identifiable Information) temizleme
function sanitizeLogData(message: string): string {
  // E-posta adresleri için regex
  const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi;
  
  // Olası kredi kartı numaraları için regex (basit örnek)
  const ccRegex = /\b(?:\d[ -]*?){13,16}\b/g;
  
  // JWT token formatı için regex
  const jwtRegex = /eyJ[a-zA-Z0-9_-]+\.eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g;
  
  // Telefon numaraları için regex (basit bir örnek)
  const phoneRegex = /\+?\d{1,3}[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
  
  // Hassas bilgileri maskele
  return message
    .replace(emailRegex, '***@***.***')
    .replace(ccRegex, '****-****-****-****')
    .replace(jwtRegex, 'JWT_TOKEN')
    .replace(phoneRegex, '***-***-****');
}

// Güvenli log işlemleri
export function secureLog(message: string, source = "security", level = "info") {
  // Hassas bilgileri temizle
  const sanitizedMessage = sanitizeLogData(message);
  
  // Orijinal log fonksiyonunu kullan
  log(`[${level.toUpperCase()}] ${sanitizedMessage}`, source);
}

// Güvenlik olaylarını loglama
export function logSecurityEvent(event: string, userId?: number, details?: object) {
  const eventMessage = `Security Event: ${event}${userId ? ` - User: ${userId}` : ''}${details ? ` - Details: ${JSON.stringify(details)}` : ''}`;
  secureLog(eventMessage, "security", "warn");
}

// Hata loglama
export function logError(error: Error, context: string, userId?: number) {
  const errorMessage = `Error in ${context}: ${error.message}${userId ? ` - User: ${userId}` : ''}`;
  secureLog(errorMessage, "error", "error");
  
  // Geliştirme modunda tüm hata yığınını da logla
  if (process.env.NODE_ENV === "development") {
    console.error(error.stack);
  }
}

// Giriş denemelerini loglama
export function logAuthAttempt(success: boolean, username: string, ip: string) {
  const sanitizedUsername = sanitizeLogData(username);
  const sanitizedIp = sanitizeLogData(ip);
  
  const authMessage = `Auth attempt ${success ? 'successful' : 'failed'} - Username: ${sanitizedUsername} - IP: ${sanitizedIp}`;
  secureLog(authMessage, "auth", success ? "info" : "warn");
}