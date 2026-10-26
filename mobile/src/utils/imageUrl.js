/**
 * imageUrl.js — Uzak görsel adreslerini güvenli hâle getirir.
 *
 * Kültür Portalı adresleri kodlanmamış boşluk ve parantez içerir
 * (ör. ".../ISTANBUL SULTANAHMET CAMI (1) kopya.jpg"). Yeni expo-image sürümü
 * bu adresleri yükleyemez; kodlanmış hâlleri sorunsuz çalışır. Zaten kodlanmış
 * adresler (`%20`) iki kez kodlanmasın diye önce çözülüp tekrar kodlanır.
 */
export function normalizeImageUrl(url) {
    if (!url || typeof url !== 'string') return null;
    let trimmed = url.trim();
    if (!trimmed) return null;
    if (!/^https?:\/\//i.test(trimmed)) return trimmed;
    let secure = trimmed.replace(/^http:\/\//i, 'https://');

    // Birden fazla eğik çizgiyi teke indir (protokol sonrası)
    const protoIndex = secure.indexOf('://');
    if (protoIndex !== -1) {
        const proto = secure.slice(0, protoIndex + 3);
        const rest = secure.slice(protoIndex + 3).replace(/\/+/g, '/');
        secure = proto + rest;
    }

    try {
        const parsed = new URL(secure);
        // Önceden %20 gibi kodlanmışları tek tipleştir
        let decodedPath = parsed.pathname;
        try {
            decodedPath = decodeURI(parsed.pathname);
        } catch {
            // decode hatası olursa olduğu gibi devam et
        }
        // Yol bölümlerini kodla — parantez, boşluk ve Türkçe karakterleri güvenli hâle getir
        parsed.pathname = decodedPath
            .split('/')
            .map(seg =>
                encodeURIComponent(seg).replace(/[()']/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase())
            )
            .join('/');
        return parsed.toString();
    } catch {
        return encodeURI(secure).replace(/[()']/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase());
    }
}

export const normalizeImageList = (list) => (Array.isArray(list) ? list.map(normalizeImageUrl).filter(Boolean) : []);

/**
 * Liste ve kartlar için küçük görsel adresi.
 * Kültür Portalı her görselin `/small/` sürümünü de sunar.
 */
export function thumbnailUrl(url) {
    const normalized = normalizeImageUrl(url);
    if (!normalized) return null;
    if (!/kulturportali\.gov\.tr/i.test(normalized)) return normalized;
    return normalized.replace(/\/repoKulturPortali\/large\//i, '/repoKulturPortali/small/');
}
