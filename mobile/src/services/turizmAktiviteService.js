import rawActivities from '../data/turkiye_turizm_aktiviteleri.json';

const BASE_URL = 'https://www.kulturportali.gov.tr';

const SLUG_TO_CITY = {
    adana: 'Adana', adiyaman: 'Adıyaman', afyonkarahisar: 'Afyonkarahisar',
    agri: 'Ağrı', aksaray: 'Aksaray', amasya: 'Amasya', ankara: 'Ankara',
    antalya: 'Antalya', ardahan: 'Ardahan', artvin: 'Artvin', aydin: 'Aydın',
    balikesir: 'Balıkesir', bartin: 'Bartın', batman: 'Batman', bayburt: 'Bayburt',
    bilecik: 'Bilecik', bingol: 'Bingöl', bitlis: 'Bitlis', bolu: 'Bolu',
    burdur: 'Burdur', bursa: 'Bursa', canakkale: 'Çanakkale', cankiri: 'Çankırı',
    corum: 'Çorum', denizli: 'Denizli', diyarbakir: 'Diyarbakır', duzce: 'Düzce',
    edirne: 'Edirne', elazig: 'Elazığ', erzincan: 'Erzincan', erzurum: 'Erzurum',
    eskisehir: 'Eskişehir', gaziantep: 'Gaziantep', giresun: 'Giresun',
    gumushane: 'Gümüşhane', hakkari: 'Hakkari', hatay: 'Hatay', igdir: 'Iğdır',
    isparta: 'Isparta', istanbul: 'İstanbul', izmir: 'İzmir',
    kahramanmaras: 'Kahramanmaraş', karabuk: 'Karabük', karaman: 'Karaman',
    kars: 'Kars', kastamonu: 'Kastamonu', kayseri: 'Kayseri', kilis: 'Kilis',
    kirikkale: 'Kırıkkale', kirklareli: 'Kırklareli', kirsehir: 'Kırşehir',
    kocaeli: 'Kocaeli', konya: 'Konya', kutahya: 'Kütahya', malatya: 'Malatya',
    manisa: 'Manisa', mardin: 'Mardin', mersin: 'Mersin', mugla: 'Muğla',
    mus: 'Muş', nevsehir: 'Nevşehir', nigde: 'Niğde', ordu: 'Ordu',
    osmaniye: 'Osmaniye', rize: 'Rize', sakarya: 'Sakarya', samsun: 'Samsun',
    sanliurfa: 'Şanlıurfa', siirt: 'Siirt', sinop: 'Sinop', sirnak: 'Şırnak',
    sivas: 'Sivas', tekirdag: 'Tekirdağ', tokat: 'Tokat', trabzon: 'Trabzon',
    tunceli: 'Tunceli', usak: 'Uşak', van: 'Van', yalova: 'Yalova',
    yozgat: 'Yozgat', zonguldak: 'Zonguldak',
};

const normalizeText = (value = '') => value
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c');

const toTitleCase = (value = '') => value
    .trim()
    .toLocaleLowerCase('tr-TR')
    .replace(/(?:^|\s|[-])\S/g, c => c.toLocaleUpperCase('tr-TR'))
    .replace(/\bVe\b/g, 've')
    .replace(/\bIle\b/g, 'ile');

const parseActivity = (item, index) => {
    const [rawType, ...nameParts] = (item.Baslik || '').split(' - ');
    const slug = item.Url?.split('/')?.[2] || '';
    const city = SLUG_TO_CITY[slug] || toTitleCase(slug.replace(/-/g, ' '));
    const name = nameParts.join(' - ').trim() || item.Baslik || '';

    return {
        id: `${slug}-${index}`,
        title: toTitleCase(name),
        type: toTitleCase(rawType || 'Turizm Aktivitesi'),
        city,
        citySlug: slug,
        imageUrl: item.Resim ? `${BASE_URL}${item.Resim}` : null,
        url: item.Url ? `${BASE_URL}${item.Url}` : null,
        total: item.KayitSayisi || 0,
        rawTitle: item.Baslik || '',
    };
};

const ALL_ACTIVITIES = rawActivities.map(parseActivity);

export const getTurizmAktiviteleri = ({ cityName, search } = {}) => {
    const cityKey = cityName ? normalizeText(cityName) : '';
    const query = search ? normalizeText(search) : '';

    return ALL_ACTIVITIES.filter((activity) => {
        const matchesCity = !cityKey || normalizeText(activity.city) === cityKey || normalizeText(activity.citySlug) === cityKey;
        const haystack = normalizeText(`${activity.title} ${activity.type} ${activity.city}`);
        const matchesQuery = !query || haystack.includes(query);
        return matchesCity && matchesQuery;
    });
};

export const turizmAktiviteleri = ALL_ACTIVITIES;
