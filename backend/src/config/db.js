const { Pool } = require('pg');

// .env dosyasındaki bilgileri alıyoruz
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

// Bağlantı olaylarını dinleyelim (Loglama için)
pool.on('connect', () => {
    console.log('✅ Veritabanına başarıyla bağlanıldı!');
});

pool.on('error', (err) => {
    console.error('❌ Veritabanı hatası:', err);
});

module.exports = pool;