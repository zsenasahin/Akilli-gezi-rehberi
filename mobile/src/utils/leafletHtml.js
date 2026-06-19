/**
 * Leaflet.js tabanlı harita HTML template'i.
 * React Native WebView içinde çalışır.
 * 
 * Özellikler:
 * - OpenStreetMap tile'ları
 * - Long-press ile konaklama noktası seçimi
 * - Marker'lar (konaklama, gezi noktaları, restoranlar)
 * - Polyline rota çizimi
 * - © OpenStreetMap contributors attribution
 */

export function generateLeafletHtml(initialCenter = { lat: 41.0082, lng: 28.9784 }, initialZoom = 13) {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html, body { width: 100%; height: 100%; overflow: hidden; }
        #map { width: 100%; height: 100%; }
        .leaflet-control-attribution {
            font-size: 11px !important;
            background: rgba(255,255,255,0.85) !important;
            padding: 2px 6px !important;
        }
        .custom-popup .leaflet-popup-content-wrapper {
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        .custom-popup .leaflet-popup-content {
            margin: 10px 14px;
            font-family: -apple-system, BlinkMacSystemFont, sans-serif;
            font-size: 13px;
        }
        .pulse-marker {
            width: 20px; height: 20px;
            border-radius: 50%;
            background: #3D7A62;
            border: 3px solid #fff;
            box-shadow: 0 0 0 rgba(61,122,98,0.4);
            animation: pulse 2s infinite;
        }
        @keyframes pulse {
            0% { box-shadow: 0 0 0 0 rgba(61,122,98,0.5); }
            70% { box-shadow: 0 0 0 12px rgba(61,122,98,0); }
            100% { box-shadow: 0 0 0 0 rgba(61,122,98,0); }
        }
    </style>
</head>
<body>
    <div id="map"></div>
    <script>
        // ─── MAP INIT ───
        var map = L.map('map', {
            zoomControl: true,
            attributionControl: true,
        }).setView([${initialCenter.lat}, ${initialCenter.lng}], ${initialZoom});

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 19,
        }).addTo(map);

        // ─── STATE ───
        var accommodationMarker = null;
        var placeMarkers = [];
        var restaurantMarkers = [];
        var hotelMarkers = [];
        var routePolyline = null;
        var routeDecorator = null;

        // ─── CUSTOM ICONS ───
        function createIcon(emoji, size) {
            return L.divIcon({
                html: '<div style="font-size:' + size + 'px;text-align:center;line-height:' + (size+8) + 'px;">' + emoji + '</div>',
                iconSize: [size + 8, size + 8],
                iconAnchor: [(size + 8) / 2, size + 8],
                popupAnchor: [0, -(size + 4)],
                className: '',
            });
        }

        var iconHotel = createIcon('🏨', 28);
        var iconAccommodation = createIcon('📍', 32);
        var iconPlace = createIcon('📌', 24);
        var iconRestaurant = createIcon('🍽️', 22);
        var iconPlaceNumbered = function(num) {
            return L.divIcon({
                html: '<div style="background:#3D7A62;color:#fff;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:bold;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.3);">' + num + '</div>',
                iconSize: [28, 28],
                iconAnchor: [14, 28],
                popupAnchor: [0, -28],
                className: '',
            });
        };

        // ─── LONG PRESS HANDLER ───
        var longPressTimer = null;
        var longPressCoords = null;

        map.on('mousedown touchstart', function(e) {
            if (e.latlng) {
                longPressCoords = e.latlng;
                longPressTimer = setTimeout(function() {
                    // Long press detected
                    sendToRN('longPress', {
                        lat: longPressCoords.lat,
                        lng: longPressCoords.lng,
                    });
                }, 600);
            }
        });

        map.on('mouseup touchend mousemove touchmove', function(e) {
            if (longPressTimer) {
                clearTimeout(longPressTimer);
                longPressTimer = null;
            }
        });

        // ─── COMMUNICATION WITH REACT NATIVE ───
        function sendToRN(type, data) {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: type, data: data }));
        }

        // ─── COMMANDS FROM REACT NATIVE ───
        function handleCommand(cmd) {
            switch (cmd.action) {
                case 'setAccommodation':
                    setAccommodation(cmd.lat, cmd.lng, cmd.name);
                    break;
                case 'setPlaces':
                    setPlaces(cmd.places);
                    break;
                case 'setRoute':
                    setRoute(cmd.coordinates);
                    break;
                case 'setHotels':
                    setHotels(cmd.hotels);
                    break;
                case 'setRestaurants':
                    setRestaurants(cmd.restaurants);
                    break;
                case 'clearRoute':
                    clearRoute();
                    break;
                case 'fitBounds':
                    fitAllMarkers();
                    break;
                case 'flyTo':
                    map.flyTo([cmd.lat, cmd.lng], cmd.zoom || 15, { duration: 1 });
                    break;
            }
        }

        // ─── MAP FUNCTIONS ───
        function setAccommodation(lat, lng, name) {
            if (accommodationMarker) map.removeLayer(accommodationMarker);
            accommodationMarker = L.marker([lat, lng], { icon: iconAccommodation })
                .addTo(map)
                .bindPopup('<b>🏠 Konaklama</b><br/>' + (name || 'Seçilen konum'), { className: 'custom-popup' });
            map.flyTo([lat, lng], 14, { duration: 0.8 });
        }

        function setPlaces(places) {
            // Clear old
            placeMarkers.forEach(function(m) { map.removeLayer(m); });
            placeMarkers = [];

            places.forEach(function(place, i) {
                var marker = L.marker([place.lat, place.lng], { icon: iconPlaceNumbered(i + 1) })
                    .addTo(map)
                    .bindPopup(
                        '<b>' + (i + 1) + '. ' + place.name + '</b>' +
                        (place.distance ? '<br/><small>📏 ' + place.distance + 'm</small>' : ''),
                        { className: 'custom-popup' }
                    );
                marker.on('click', function() {
                    sendToRN('placeClick', { id: place.id, index: i });
                });
                placeMarkers.push(marker);
            });
        }

        function setRoute(coordinates) {
            clearRoute();
            if (!coordinates || coordinates.length === 0) return;

            var latlngs = coordinates.map(function(c) { return [c[1], c[0]]; }); // ORS returns [lng, lat]
            routePolyline = L.polyline(latlngs, {
                color: '#3D7A62',
                weight: 4,
                opacity: 0.8,
                dashArray: null,
                smoothFactor: 1,
            }).addTo(map);

            // Fit bounds to route
            map.fitBounds(routePolyline.getBounds(), { padding: [40, 40] });
        }

        function setHotels(hotels) {
            hotelMarkers.forEach(function(m) { map.removeLayer(m); });
            hotelMarkers = [];

            hotels.forEach(function(hotel) {
                var marker = L.marker([hotel.lat, hotel.lng], { icon: iconHotel })
                    .addTo(map)
                    .bindPopup(
                        '<b>🏨 ' + hotel.name + '</b>' +
                        (hotel.stars ? '<br/>⭐ ' + hotel.stars : '') +
                        (hotel.address ? '<br/><small>' + hotel.address + '</small>' : ''),
                        { className: 'custom-popup' }
                    );
                marker.on('click', function() {
                    sendToRN('hotelClick', hotel);
                });
                hotelMarkers.push(marker);
            });
        }

        function setRestaurants(restaurants) {
            restaurantMarkers.forEach(function(m) { map.removeLayer(m); });
            restaurantMarkers = [];

            restaurants.forEach(function(rest) {
                var marker = L.marker([rest.lat, rest.lng], { icon: iconRestaurant })
                    .addTo(map)
                    .bindPopup(
                        '<b>🍽️ ' + rest.name + '</b>' +
                        (rest.cuisine ? '<br/><small>' + rest.cuisine + '</small>' : ''),
                        { className: 'custom-popup' }
                    );
                restaurantMarkers.push(marker);
            });
        }

        function clearRoute() {
            if (routePolyline) {
                map.removeLayer(routePolyline);
                routePolyline = null;
            }
        }

        function fitAllMarkers() {
            var bounds = L.latLngBounds([]);
            if (accommodationMarker) bounds.extend(accommodationMarker.getLatLng());
            placeMarkers.forEach(function(m) { bounds.extend(m.getLatLng()); });
            if (bounds.isValid()) {
                map.fitBounds(bounds, { padding: [50, 50] });
            }
        }

        // Listen for messages from React Native
        document.addEventListener('message', function(e) {
            try { handleCommand(JSON.parse(e.data)); } catch(err) { console.error(err); }
        });
        window.addEventListener('message', function(e) {
            try { handleCommand(JSON.parse(e.data)); } catch(err) { console.error(err); }
        });

        // Notify RN that map is ready
        setTimeout(function() { sendToRN('mapReady', {}); }, 500);
    </script>
</body>
</html>
`;
}
