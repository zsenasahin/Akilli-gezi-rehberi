import { CITY_CENTERS } from '../constants/cities';

/**
 * Türkiye haritası için Leaflet HTML üretir.
 * 81 ilin tamamını tıklanabilir marker olarak gösterir.
 *
 * @param {number[]} visitedCityNames  - 'visited' durumundaki şehir adları
 * @param {number[]} wishlistCityNames - 'wishlist' durumundaki şehir adları
 * @returns {string} WebView için HTML string
 */
export function generateTurkeyMapHtml(visitedCityNames = [], wishlistCityNames = []) {
    const visitedSet = new Set(visitedCityNames);
    const wishlistSet = new Set(wishlistCityNames);

    // Her şehir için marker tanımı oluştur
    const markersJs = Object.entries(CITY_CENTERS).map(([name, coords]) => {
        // Alternatif isimler (Bodrum, Kapadokya, Maraş, Urfa, Antep) — ana şehir listesinde gösterme
        const skipNames = ['Bodrum', 'Kapadokya', 'Maraş', 'Urfa', 'Antep'];
        if (skipNames.includes(name)) return '';

        let color, emoji, zIndex;
        if (visitedSet.has(name)) {
            color = '#22C55E'; emoji = '✓'; zIndex = 1000;
        } else if (wishlistSet.has(name)) {
            color = '#EF4444'; emoji = '♡'; zIndex = 900;
        } else {
            color = '#0891B2'; emoji = ''; zIndex = 800;
        }

        const iconHtml = emoji
            ? `<div style="background:${color};color:#fff;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:bold;border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.3);">${emoji}</div>`
            : `<div style="background:${color};width:22px;height:22px;border-radius:50%;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.25);"></div>`;

        return `
(function() {
    var icon = L.divIcon({
        html: '${iconHtml.replace(/'/g, "\\'")}',
        iconSize: [28, 28],
        iconAnchor: [14, 14],
        popupAnchor: [0, -16],
        className: '',
    });
    var m = L.marker([${coords.lat}, ${coords.lng}], { icon: icon, zIndexOffset: ${zIndex} })
        .addTo(map)
        .bindTooltip('${name.replace(/'/g, "\\'")}', { permanent: false, direction: 'top', className: 'city-tooltip' });
    m.on('click', function() {
        sendToRN('markerClick', { name: '${name.replace(/'/g, "\\'")}', lat: ${coords.lat}, lng: ${coords.lng} });
    });
})();`;
    }).join('\n');

    return `
<!DOCTYPE html>
<html>
<head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html, body { width: 100%; height: 100%; overflow: hidden; background: #f0f4f8; }
        #map { width: 100%; height: 100%; }
        .leaflet-control-attribution {
            font-size: 10px !important;
            background: rgba(255,255,255,0.8) !important;
        }
        .city-tooltip {
            background: rgba(15,20,40,0.88);
            color: #fff;
            border: none;
            border-radius: 6px;
            font-family: -apple-system, BlinkMacSystemFont, sans-serif;
            font-size: 12px;
            font-weight: 600;
            padding: 4px 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            white-space: nowrap;
        }
        .city-tooltip::before { display: none; }
    </style>
</head>
<body>
    <div id="map"></div>
    <script>
        var map = L.map('map', {
            zoomControl: true,
            attributionControl: true,
            minZoom: 4,
            maxZoom: 13,
        }).setView([39.0, 35.0], 5);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
            maxZoom: 19,
        }).addTo(map);

        function sendToRN(type, data) {
            if (window.ReactNativeWebView) {
                window.ReactNativeWebView.postMessage(JSON.stringify({ type: type, data: data }));
            }
        }

        // Tüm şehir marker'ları
        ${markersJs}

        // Harita hazır bildirimi
        setTimeout(function() { sendToRN('mapReady', {}); }, 600);

        // RN'den gelen komutlar
        function handleCommand(cmd) {
            if (cmd.action === 'flyTo') {
                map.flyTo([cmd.lat, cmd.lng], cmd.zoom || 8, { duration: 1 });
            }
        }
        document.addEventListener('message', function(e) {
            try { handleCommand(JSON.parse(e.data)); } catch(err) {}
        });
        window.addEventListener('message', function(e) {
            try { handleCommand(JSON.parse(e.data)); } catch(err) {}
        });
    </script>
</body>
</html>`;
}
