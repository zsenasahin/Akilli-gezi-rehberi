import { CITY_CENTERS } from '../constants/cities';
import turkeyCitiesGeo from '../data/tr_cities_geo.json';

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
            color = '#3D7A62'; emoji = ''; zIndex = 800;
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

const COLLECTION_COLORS = [
    '#E76F51',
    '#2A9D8F',
    '#E9C46A',
    '#457B9D',
    '#F4A261',
    '#8E7DBE',
    '#D1495B',
    '#118AB2',
    '#06D6A0',
    '#EF476F',
    '#7CB342',
    '#F77F00',
];

const COLLECTION_CITY_ALIASES = {
    Afyonkarahisar: 'Afyon',
};

const escapeHtml = (value = '') => String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const mercatorY = (lat) => {
    const rad = lat * Math.PI / 180;
    return Math.log(Math.tan(Math.PI / 4 + rad / 2));
};

const getGeometryPolygons = (geometry) => {
    if (!geometry?.coordinates) return [];
    if (geometry.type === 'Polygon') return [geometry.coordinates];
    if (geometry.type === 'MultiPolygon') return geometry.coordinates;
    return [];
};

const collectGeoPoints = (geometry) => {
    const points = [];

    getGeometryPolygons(geometry).forEach((polygon) => {
        polygon.forEach((ring) => {
            ring.forEach(([lng, lat]) => points.push([lng, mercatorY(lat)]));
        });
    });

    return points;
};

const getGeoBounds = (features) => {
    const bounds = {
        minX: Infinity,
        maxX: -Infinity,
        minY: Infinity,
        maxY: -Infinity,
    };

    features.forEach((feature) => {
        collectGeoPoints(feature.geometry).forEach(([x, y]) => {
            bounds.minX = Math.min(bounds.minX, x);
            bounds.maxX = Math.max(bounds.maxX, x);
            bounds.minY = Math.min(bounds.minY, y);
            bounds.maxY = Math.max(bounds.maxY, y);
        });
    });

    return bounds;
};

const projectPoint = ([lng, lat], bounds, width, height, padding) => {
    const xRange = bounds.maxX - bounds.minX;
    const yRange = bounds.maxY - bounds.minY;
    const mercY = mercatorY(lat);
    const x = padding + ((lng - bounds.minX) / xRange) * (width - padding * 2);
    const y = padding + ((bounds.maxY - mercY) / yRange) * (height - padding * 2);
    return [Number(x.toFixed(1)), Number(y.toFixed(1))];
};

const geometryToPath = (geometry, bounds, width, height, padding) => {
    return getGeometryPolygons(geometry).map((polygon) =>
        polygon.map((ring) => {
            const commands = ring.map((point, index) => {
                const [x, y] = projectPoint(point, bounds, width, height, padding);
                return `${index === 0 ? 'M' : 'L'}${x},${y}`;
            }).join(' ');

            return `${commands} Z`;
        }).join(' ')
    ).join(' ');
};

const getGeometryLabelPoint = (geometry, bounds, width, height, padding) => {
    const projected = [];

    getGeometryPolygons(geometry).forEach((polygon) => {
        polygon.forEach((ring) => {
            ring.forEach((point) => projected.push(projectPoint(point, bounds, width, height, padding)));
        });
    });

    if (!projected.length) return [width / 2, height / 2];

    const xs = projected.map(([x]) => x);
    const ys = projected.map(([, y]) => y);
    return [
        Number(((Math.min(...xs) + Math.max(...xs)) / 2).toFixed(1)),
        Number(((Math.min(...ys) + Math.max(...ys)) / 2).toFixed(1)),
    ];
};

/**
 * Şehir koleksiyonu ekranı için kompakt Türkiye haritası üretir.
 * Gezilen şehirleri farklı renklerle, diğer illeri gri alanlar olarak gösterir.
 *
 * @param {{ cityName: string, planCount?: number, completedCount?: number }[]} collectionCities
 * @param {'light'|'dark'} themeKey
 * @returns {string}
 */
export function generateCityCollectionMapHtml(collectionCities = [], themeKey = 'light') {
    const isDark = themeKey === 'dark';
    const collectionMap = collectionCities.reduce((acc, city, index) => {
        if (!city?.cityName) return acc;
        const mapName = COLLECTION_CITY_ALIASES[city.cityName] || city.cityName;
        acc[mapName] = {
            color: COLLECTION_COLORS[index % COLLECTION_COLORS.length],
            planCount: city.planCount || 0,
            completedCount: city.completedCount || 0,
            displayName: city.cityName,
        };
        return acc;
    }, {});

    const width = 960;
    const height = 420;
    const padding = 14;
    const bounds = getGeoBounds(turkeyCitiesGeo.features);
    const mutedFill = isDark ? '#45534E' : '#D3DAD5';
    const stroke = isDark ? '#18231F' : '#FFFFFF';
    const labelColor = isDark ? '#EDF7F3' : '#13231C';
    const background = isDark ? '#17211E' : '#FFFFFF';
    const cityPaths = turkeyCitiesGeo.features.map((feature, index) => {
        const name = feature.properties.name;
        const collectionItem = collectionMap[name];
        const isVisited = Boolean(collectionItem);
        const fill = collectionItem?.color || mutedFill;
        const title = collectionItem?.displayName || name;
        const subtitle = isVisited
            ? `${collectionItem.planCount} plan • ${collectionItem.completedCount} tamamlanan`
            : 'Koleksiyonda yok';
        const path = geometryToPath(feature.geometry, bounds, width, height, padding);

        return `
            <path
                class="province ${isVisited ? 'visited' : 'muted'}"
                d="${path}"
                fill="${fill}"
                data-title="${escapeHtml(title)}"
                data-subtitle="${escapeHtml(subtitle)}"
                style="animation-delay:${Math.min(index * 10, 520)}ms"
            />`;
    }).join('\n');

    const cityLabels = turkeyCitiesGeo.features.map((feature) => {
        const name = feature.properties.name;
        const collectionItem = collectionMap[name];
        const [x, y] = getGeometryLabelPoint(feature.geometry, bounds, width, height, padding);
        const fontSize = name.length > 12 ? 9.5 : 11;

        return `
            <text
                class="province-label ${collectionItem ? 'visited' : ''}"
                x="${x}"
                y="${y}"
                font-size="${fontSize}"
            >${escapeHtml(collectionItem?.displayName || name)}</text>`;
    }).join('\n');

    return `
<!DOCTYPE html>
<html>
<head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html, body {
            width: 100%;
            height: 100%;
            overflow: hidden;
            background: ${background};
            font-family: -apple-system, BlinkMacSystemFont, sans-serif;
        }
        .wrap {
            width: 100%;
            height: 100%;
            padding: 2px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        svg {
            width: 100%;
            max-width: 100%;
            height: 100%;
        }
        .province {
            stroke: ${stroke};
            stroke-width: 1.3;
            vector-effect: non-scaling-stroke;
            transform-box: fill-box;
            transform-origin: center;
            opacity: 0;
            animation: provinceIn 420ms cubic-bezier(.2,.8,.2,1) forwards;
            transition: fill 180ms ease, opacity 180ms ease, transform 180ms ease;
        }
        .province.muted { opacity: 0.92; }
        .province.visited { opacity: 1; }
        .province:hover {
            transform: scale(1.015);
            opacity: 1;
        }
        .province-label {
            fill: ${labelColor};
            font-weight: 700;
            text-anchor: middle;
            dominant-baseline: middle;
            paint-order: stroke;
            stroke: ${background};
            stroke-width: 3px;
            stroke-linejoin: round;
            pointer-events: none;
            opacity: 0.74;
        }
        .province-label.visited {
            fill: ${isDark ? '#FFFFFF' : '#0B1E19'};
            opacity: 0.94;
        }
        .tooltip {
            position: fixed;
            left: 0;
            top: 0;
            z-index: 4;
            transform: translate(-50%, -120%);
            padding: 8px 10px;
            border-radius: 10px;
            background: ${isDark ? 'rgba(13,20,18,0.94)' : 'rgba(19,35,28,0.92)'};
            color: #fff;
            box-shadow: 0 10px 24px rgba(0,0,0,0.24);
            pointer-events: none;
            opacity: 0;
            transition: opacity 140ms ease;
            white-space: nowrap;
        }
        .tooltip strong,
        .tooltip small {
            display: block;
        }
        .tooltip strong { font-size: 12px; line-height: 16px; }
        .tooltip small { margin-top: 2px; font-size: 10px; opacity: 0.78; }
        @keyframes provinceIn {
            from { transform: scale(.985); opacity: 0; }
            to { transform: scale(1); opacity: 1; }
        }
    </style>
</head>
<body>
    <div class="wrap">
        <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Türkiye şehir koleksiyonu haritası">
            <rect width="${width}" height="${height}" fill="${background}"></rect>
            <g>
                ${cityPaths}
            </g>
            <g>
                ${cityLabels}
            </g>
        </svg>
    </div>
    <div id="tooltip" class="tooltip"></div>
    <script>
        function sendToRN(type, data) {
            if (window.ReactNativeWebView) {
                window.ReactNativeWebView.postMessage(JSON.stringify({ type: type, data: data }));
            }
        }

        var tooltip = document.getElementById('tooltip');
        document.querySelectorAll('.province').forEach(function(path) {
            path.addEventListener('mousemove', function(event) {
                tooltip.innerHTML = '<strong>' + path.dataset.title + '</strong><small>' + path.dataset.subtitle + '</small>';
                tooltip.style.left = event.clientX + 'px';
                tooltip.style.top = event.clientY + 'px';
                tooltip.style.opacity = '1';
            });
            path.addEventListener('mouseleave', function() {
                tooltip.style.opacity = '0';
            });
        });

        setTimeout(function() { sendToRN('mapReady', {}); }, 260);
    </script>
</body>
</html>`;
}
