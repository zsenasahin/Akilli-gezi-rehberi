#!/usr/bin/env python3
"""
Kültür Portalı Koordinat Çekici (Batch Scraper) — v2 Hızlı versiyon

Kültür Portalı web sayfalarından koordinat bilgilerini çeker.
HTML içindeki Yandex Maps embed'indeki `center: [lat, lng]` verisini parse eder.

Kullanım:
  python3 scripts/scrape-coordinates.py

Çıktı:
  mobile/src/data/place_coordinates.json
"""

import json
import re
import time
import sys
import os
import urllib.request
import urllib.error
import ssl
from concurrent.futures import ThreadPoolExecutor, as_completed

BASE_URL = "https://www.kulturportali.gov.tr"
INPUT_FILE = "mobile/src/data/turkiye_gezilecek_yerler_detay.json"
OUTPUT_FILE = "mobile/src/data/place_coordinates.json"
RATE_LIMIT = 0.5  # saniye (daha hızlı, daha agresif ama tek thread)

# Koordinat regex: center: [41.005658,28.976414]
COORD_PATTERN = re.compile(r'center:\s*\[\s*([0-9]+\.[0-9]+)\s*,\s*([0-9]+\.[0-9]+)\s*\]')

# SSL bypass context
ssl_context = ssl._create_unverified_context()

def fetch_coordinates(url_path):
    """Bir Kültür Portalı sayfasından koordinatları çeker."""
    full_url = f"{BASE_URL}{url_path}"
    try:
        req = urllib.request.Request(full_url, headers={
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 SmartTravelGuide/1.0",
            "Accept-Language": "tr-TR,tr;q=0.9",
            "Accept": "text/html,application/xhtml+xml",
        })
        with urllib.request.urlopen(req, timeout=10, context=ssl_context) as response:
            html = response.read().decode("utf-8", errors="ignore")
        
        match = COORD_PATTERN.search(html)
        if match:
            lat = float(match.group(1))
            lng = float(match.group(2))
            # Koordinat geçerliliğini kontrol et (Türkiye sınırları)
            if 35.0 <= lat <= 43.0 and 25.0 <= lng <= 45.0:
                return {"lat": lat, "lng": lng}
        return None
    except Exception:
        return None

def save_results(results, output_file):
    """Sonuçları JSON dosyasına kaydet."""
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)

def main():
    # Veri setini oku
    with open(INPUT_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    # Mevcut çıktıyı oku (kaldığı yerden devam etmek için)
    existing = {}
    if os.path.exists(OUTPUT_FILE):
        try:
            with open(OUTPUT_FILE, "r", encoding="utf-8") as f:
                existing = json.load(f)
        except:
            existing = {}
    
    # Tüm URL'leri topla
    all_places = []
    for city_name, city_data in data.items():
        for yer in city_data.get("yerler", []):
            url = yer.get("Url", "")
            if url and url not in existing:
                all_places.append({
                    "url": url,
                    "name": yer.get("Baslik", ""),
                    "city": city_name,
                })
    
    total_all = sum(len(v.get('yerler',[])) for v in data.values())
    remaining = len(all_places)
    
    print(f"🚀 Toplam: {total_all} yer, Mevcut: {len(existing)}, Kalan: {remaining}")
    print(f"   Tahmini süre: {(remaining * RATE_LIMIT) / 60:.0f} dakika")
    print(f"   Çıktı: {OUTPUT_FILE}")
    print()
    
    fetched = 0
    failed = 0
    
    for i, place in enumerate(all_places):
        url = place["url"]
        
        # Rate limit
        if fetched > 0:
            time.sleep(RATE_LIMIT)
        
        coords = fetch_coordinates(url)
        fetched += 1
        
        if coords:
            existing[url] = coords
            status = "✅"
        else:
            failed += 1
            status = "❌"
        
        # Her seferinde kaydet (crash koruması)
        if fetched % 10 == 0 or coords:
            save_results(existing, OUTPUT_FILE)
        
        # İlerleme göster
        pct = ((len(existing)) / total_all * 100)
        sys.stdout.write(f"\r  {status} [{len(existing)}/{total_all}] ({pct:.0f}%) {place['city']} - {place['name'][:40]}{'...' if len(place['name'])>40 else ''}")
        sys.stdout.write(" " * 20)  # Önceki satırı temizle
        sys.stdout.flush()
        
        if fetched % 100 == 0:
            print(f"\n  💾 İlerleme: {len(existing)}/{total_all} ({pct:.0f}%) — {failed} başarısız")
    
    # Son kayıt
    save_results(existing, OUTPUT_FILE)
    
    print(f"\n\n{'='*60}")
    print(f"✅ Tamamlandı!")
    print(f"   Toplam koordinat: {len(existing)}/{total_all}")
    print(f"   Başarısız: {failed}")
    print(f"   Çıktı: {OUTPUT_FILE}")

if __name__ == "__main__":
    main()
