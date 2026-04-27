const https = require("https");
const fs = require("fs");

const ILLER = {1:"Adana",2:"Adıyaman",3:"Afyonkarahisar",4:"Ağrı",5:"Amasya",6:"Ankara",7:"Antalya",8:"Artvin",9:"Aydın",10:"Balıkesir",11:"Bilecik",12:"Bingöl",13:"Bitlis",14:"Bolu",15:"Burdur",16:"Bursa",17:"Çanakkale",18:"Çankırı",19:"Çorum",20:"Denizli",21:"Diyarbakır",22:"Edirne",23:"Elazığ",24:"Erzincan",25:"Erzurum",26:"Eskişehir",27:"Gaziantep",28:"Giresun",29:"Gümüşhane",30:"Hakkari",31:"Hatay",32:"Isparta",33:"Mersin",34:"İstanbul",35:"İzmir",36:"Kars",37:"Kastamonu",38:"Kayseri",39:"Kırklareli",40:"Kırşehir",41:"Kocaeli",42:"Konya",43:"Kütahya",44:"Malatya",45:"Manisa",46:"Kahramanmaraş",47:"Mardin",48:"Muğla",49:"Muş",50:"Nevşehir",51:"Niğde",52:"Ordu",53:"Rize",54:"Sakarya",55:"Samsun",56:"Siirt",57:"Sinop",58:"Sivas",59:"Tekirdağ",60:"Tokat",61:"Trabzon",62:"Tunceli",63:"Şanlıurfa",64:"Uşak",65:"Van",66:"Yozgat",67:"Zonguldak",68:"Aksaray",69:"Bayburt",70:"Karaman",71:"Kırıkkale",72:"Batman",73:"Şırnak",74:"Bartın",75:"Ardahan",76:"Iğdır",77:"Yalova",78:"Karabük",79:"Kilis",80:"Osmaniye",81:"Düzce"};

// URL slug → Türkçe il adı
const SLUG_TO_IL = {
  'adana':'Adana','adiyaman':'Adıyaman','afyonkarahisar':'Afyonkarahisar','agri':'Ağrı',
  'aksaray':'Aksaray','amasya':'Amasya','ankara':'Ankara','antalya':'Antalya',
  'ardahan':'Ardahan','artvin':'Artvin','aydin':'Aydın','balikesir':'Balıkesir',
  'bartin':'Bartın','batman':'Batman','bayburt':'Bayburt','bilecik':'Bilecik',
  'bingol':'Bingöl','bitlis':'Bitlis','bolu':'Bolu','burdur':'Burdur','bursa':'Bursa',
  'canakkale':'Çanakkale','cankiri':'Çankırı','corum':'Çorum','denizli':'Denizli',
  'diyarbakir':'Diyarbakır','duzce':'Düzce','edirne':'Edirne','elazig':'Elazığ',
  'erzincan':'Erzincan','erzurum':'Erzurum','eskisehir':'Eskişehir','gaziantep':'Gaziantep',
  'giresun':'Giresun','gumushane':'Gümüşhane','hakkari':'Hakkari','hatay':'Hatay',
  'igdir':'Iğdır','isparta':'Isparta','istanbul':'İstanbul','izmir':'İzmir',
  'kahramanmaras':'Kahramanmaraş','karabuk':'Karabük','karaman':'Karaman','kars':'Kars',
  'kastamonu':'Kastamonu','kayseri':'Kayseri','kilis':'Kilis','kirikkale':'Kırıkkale',
  'kirklareli':'Kırklareli','kirsehir':'Kırşehir','kocaeli':'Kocaeli','konya':'Konya',
  'kutahya':'Kütahya','malatya':'Malatya','manisa':'Manisa','mardin':'Mardin',
  'mersin':'Mersin','mugla':'Muğla','mus':'Muş','nevsehir':'Nevşehir','nigde':'Niğde',
  'ordu':'Ordu','osmaniye':'Osmaniye','rize':'Rize','sakarya':'Sakarya','samsun':'Samsun',
  'sanliurfa':'Şanlıurfa','siirt':'Siirt','sinop':'Sinop','sirnak':'Şırnak','sivas':'Sivas',
  'tekirdag':'Tekirdağ','tokat':'Tokat','trabzon':'Trabzon','tunceli':'Tunceli',
  'usak':'Uşak','van':'Van','yalova':'Yalova','yozgat':'Yozgat','zonguldak':'Zonguldak',
};

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function fetchMutfak(ilID, sayfa = 1) {
  return new Promise((resolve) => {
    const body = JSON.stringify({
      sira: String(sayfa), sayi: "100", TurKod: "0", KategoriKod: "0",
      ilID: String(ilID), gorsel: false, nearest: false,
      aramaText: "", etiket: "", hariciEtiket: "", lat: "0", lang: "0"
    });
    const options = {
      hostname: "www.kulturportali.gov.tr",
      path: "/Moduller/GelenekselTurkMutfagi.aspx/GelenekselTurkMutfagiFilitreliGetir",
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=UTF-8",
        "Content-Length": Buffer.byteLength(body),
        "Accept": "*/*",
        "Origin": "https://www.kulturportali.gov.tr",
        "Referer": "https://www.kulturportali.gov.tr/turkiye/genel/neyenir",
        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15",
        "X-Requested-With": "XMLHttpRequest"
      }
    };
    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => {
        try {
          const parsed = JSON.parse(data);
          let inner = parsed.d ?? parsed;
          if (typeof inner === "string") inner = JSON.parse(inner);
          resolve(Array.isArray(inner) ? inner : []);
        } catch { resolve([]); }
      });
    });
    req.on("error", () => resolve([]));
    req.setTimeout(15000, () => { req.destroy(); resolve([]); });
    req.write(body);
    req.end();
  });
}

async function main() {
  console.log("🍽️  Türkiye Mutfak Scraper başlatılıyor...\n");

  // API'nin kendi ilID sistemi farklı — 1-100 arası tara, URL'den şehri tespit et
  const sehirMap = {}; // slug → { il_adi, yemekler[] }
  let basarili = 0, bos = 0;

  for (let ilID = 1; ilID <= 100; ilID++) {
    process.stdout.write(`[${String(ilID).padStart(3)}/100] ilID=${ilID} → `);

    let yemekler = await fetchMutfak(ilID, 1);

    if (yemekler.length === 0) {
      console.log("⚪ Boş");
      bos++;
      await sleep(300);
      continue;
    }

    // Sayfa 2 gerekiyor mu?
    if (yemekler.length >= 100) {
      const s2 = await fetchMutfak(ilID, 2);
      if (s2.length > 0) yemekler = [...yemekler, ...s2];
    }

    // URL'den şehir slug'ını çıkar: /turkiye/istanbul/neyenir/...
    const slug = yemekler[0]?.Url?.split("/")?.[2] ?? null;
    const ilAdi = (slug && SLUG_TO_IL[slug]) ? SLUG_TO_IL[slug] : `il_${ilID}`;

    if (!sehirMap[slug]) {
      sehirMap[slug] = { il_adi: ilAdi, yemekler: [] };
    }
    const mevcutUrls = new Set(sehirMap[slug].yemekler.map(y => y.Url));
    const yeni = yemekler.filter(y => !mevcutUrls.has(y.Url));
    sehirMap[slug].yemekler.push(...yeni);

    console.log(`✅ ${ilAdi.padEnd(20)} ${yemekler.length} yemek`);
    basarili++;
    await sleep(500);
  }

  // Çıktı formatını düzenle
  const result = {};
  for (const [slug, data] of Object.entries(sehirMap)) {
    result[data.il_adi] = {
      il_id: slug,
      yemekler: data.yemekler,
      toplam: data.yemekler.length
    };
  }

  const toplamYemek = Object.values(result).reduce((s, il) => s + il.yemekler.length, 0);

  fs.writeFileSync("scripts/turkiye_mutfak.json", JSON.stringify(result, null, 2), "utf-8");

  console.log("\n─────────────────────────────────────────");
  console.log("📊 ÖZET:");
  console.log(`  ✅ Veri olan: ${basarili}`);
  console.log(`  ⚪ Boş:       ${bos}`);
  console.log(`  🏙️  Şehir:    ${Object.keys(result).length}`);
  console.log(`  🍽️  Toplam:   ${toplamYemek} yemek`);
  console.log(`  💾 Kaydedildi: scripts/turkiye_mutfak.json`);
  console.log("─────────────────────────────────────────");
}

main();
