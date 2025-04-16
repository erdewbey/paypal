// server/security/password.ts
// Şifre güvenliği için yardımcı fonksiyonlar

import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { z } from "zod";

const scryptAsync = promisify(scrypt);

// Şifre güvenliği için minimum gereksinimleri belirleyen Zod şeması
export const passwordSchema = z.string()
  .min(8, "Şifre en az 8 karakter olmalıdır")
  .regex(/[A-Z]/, "Şifre en az bir büyük harf içermelidir")
  .regex(/[a-z]/, "Şifre en az bir küçük harf içermelidir")
  .regex(/[0-9]/, "Şifre en az bir rakam içermelidir")
  .regex(/[^A-Za-z0-9]/, "Şifre en az bir özel karakter içermelidir");

// Şifre gücünü hesaplayan fonksiyon (0-100 arası puan)
export function calculatePasswordStrength(password: string): number {
  let score = 0;
  
  // Temel uzunluk puanı (40 puana kadar)
  score += Math.min(password.length * 4, 40);
  
  // Karakter çeşitliliği kontrolleri
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumbers = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  
  // Çeşitlilik için ek puanlar (her biri 10 puan)
  if (hasUppercase) score += 10;
  if (hasLowercase) score += 10;
  if (hasNumbers) score += 10;
  if (hasSpecial) score += 10;
  
  // Karmaşıklık kontrolleri
  const hasRepeatingChars = /(.)\1{2,}/.test(password); // 3+ aynı karakter tekrarı
  const hasSequentialChars = /(abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz|012|123|234|345|456|567|678|789)/i.test(password);
  
  // Karmaşıklık cezaları
  if (hasRepeatingChars) score -= 10;
  if (hasSequentialChars) score -= 10;
  
  // Sonucu 0-100 arasında sınırla
  return Math.max(0, Math.min(100, score));
}

// Güvenli şifre hashleme
export async function hashPassword(password: string): Promise<string> {
  // Rastgele tuz oluştur
  const salt = randomBytes(16).toString("hex");
  // Şifreyi scrypt ile hashle (güvenli, yavaş hash algoritması)
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  // Hash ve tuzu birleştirerek döndür
  return `${buf.toString("hex")}.${salt}`;
}

// Şifre doğrulama 
export async function comparePasswords(supplied: string, stored: string): Promise<boolean> {
  // Hash formatı kontrolü
  if (!stored || !stored.includes('.')) {
    return false; 
  }
  
  // Hash ve tuzu ayır
  const [hashed, salt] = stored.split(".");
  if (!hashed || !salt) {
    return false;
  }
  
  // Sağlanan şifreyi aynı tuz ile hashle
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  
  // Timing attack'lere karşı koruma sağlayan güvenli karşılaştırma
  return timingSafeEqual(hashedBuf, suppliedBuf);
}