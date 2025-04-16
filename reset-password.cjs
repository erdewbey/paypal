// Şifre sıfırlama betiği
const { Pool } = require('pg');
const crypto = require('crypto');
const util = require('util');

const scryptAsync = util.promisify(crypto.scrypt);

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64));
  return `${buf.toString("hex")}.${salt}`;
}

async function resetPassword(username, newPassword) {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  try {
    // Şifreyi hashle
    const hashedPassword = await hashPassword(newPassword);
    
    // Kullanıcının şifresini güncelle
    const result = await pool.query(
      'UPDATE users SET password = $1 WHERE username = $2 RETURNING id, username, email',
      [hashedPassword, username]
    );
    
    if (result.rows.length === 0) {
      console.error(`Kullanıcı bulunamadı: ${username}`);
      return false;
    }
    
    console.log(`Şifre başarıyla sıfırlandı: ${result.rows[0].username} (${result.rows[0].email})`);
    return true;
  } catch (error) {
    console.error('Şifre sıfırlama hatası:', error);
    return false;
  } finally {
    pool.end();
  }
}

// Kullanıcı adı ve yeni şifre
const username = process.argv[2];
const newPassword = process.argv[3];

if (!username || !newPassword) {
  console.error('Kullanım: node reset-password.cjs <kullanıcı_adı> <yeni_şifre>');
  process.exit(1);
}

resetPassword(username, newPassword);