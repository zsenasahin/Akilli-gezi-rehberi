require('dotenv').config(); // Gizli değişkenleri yükle
const db = require('./src/config/db');

const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// --- Middleware (Ara Yazılımlar) ---
app.use(cors()); // Her yerden gelen isteklere izin ver (Geliştirme aşamasında)
app.use(express.json()); // Gelen veriyi JSON olarak oku

// --- Test Rotası ---
// Sunucu çalışıyor mu diye kontrol etmek için basit bir cevap
app.get('/', (req, res) => {
    res.json({ message: 'Akıllı Gezi Rehberi Backend Çalışıyor! 🚀' });
});

// --- Sunucuyu Başlat ---
app.listen(PORT, () => {
    console.log(`Sunucu http://localhost:${PORT} adresinde çalışıyor...`);
});