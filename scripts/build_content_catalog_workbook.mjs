import fs from 'node:fs/promises';
import { Workbook, SpreadsheetFile } from '@oai/artifact-tool';

const outputDir = '/Users/zeynep/Documents/SmartTravelGuide/outputs/content-catalog/';
const workbook = Workbook.create();

const colors = {
  navy: '#17324D',
  blue: '#2563EB',
  lightBlue: '#EFF6FF',
  amber: '#FEF3C7',
  border: '#D9E2EC',
  text: '#1F2937',
  muted: '#64748B',
};

function addSheet(name, headers, rows, widths = []) {
  const sheet = workbook.worksheets.add(name);
  sheet.showGridLines = false;
  sheet.getRangeByIndexes(0, 0, 1, headers.length).values = [headers];
  if (rows.length) sheet.getRangeByIndexes(1, 0, rows.length, headers.length).values = rows;
  const header = sheet.getRangeByIndexes(0, 0, 1, headers.length);
  header.format = {
    fill: colors.navy,
    font: { bold: true, color: '#FFFFFF', name: 'Arial', size: 10 },
    horizontalAlignment: 'center',
    verticalAlignment: 'center',
    wrapText: true,
    borders: { preset: 'all', style: 'thin', color: '#FFFFFF' },
  };
  const used = sheet.getRangeByIndexes(0, 0, Math.max(rows.length + 1, 2), headers.length);
  used.format.font = { name: 'Arial', size: 10, color: colors.text };
  used.format.verticalAlignment = 'center';
  used.format.borders = { preset: 'outside', style: 'thin', color: colors.border };
  sheet.getRangeByIndexes(0, 0, 1, headers.length).format.rowHeight = 32;
  widths.forEach((width, index) => { sheet.getRangeByIndexes(0, index, Math.max(rows.length + 1, 2), 1).format.columnWidth = width; });
  sheet.freezePanes.freezeRows(1);
  return sheet;
}

const overview = workbook.worksheets.add('Overview');
overview.showGridLines = false;
overview.getRange('A2:H2').merge();
overview.getRange('A2').values = [['Şehir içerik kataloğu ve rota kaynak şablonu']];
overview.getRange('A2').format = { font: { name: 'Arial', size: 16, bold: true, color: colors.navy } };
overview.getRange('A3:H3').merge();
overview.getRange('A3').values = [['Bu dosya, yayın verisini Supabase tablolarına aktarmadan önce editoryal içerik ve kaynak kontrolü için kullanılır.']];
overview.getRange('A3').format = { font: { name: 'Arial', size: 10, italic: true, color: colors.muted } };
overview.getRange('A5:B5').values = [['İçe aktarma sırası', 'Amaç']];
overview.getRange('A6:B12').values = [
  ['1. Cities', 'Şehir anahtarları ve merkez koordinatları'],
  ['2. Places', 'Doğrulanmış gezilecek yer envanteri'],
  ['3. Specialties', 'Yöresel yemek, tatlı ve içecekler'],
  ['4. Venues', 'Restoran, kafe ve işletme bilgileri'],
  ['5. Venue specialties', 'İşletme ile sunduğu lezzet ilişkisi'],
  ['6. Route templates', 'Editoryal rota seçenekleri'],
  ['7. Route stops', 'Rota şablonundaki sıralı duraklar'],
];
overview.getRange('D5:E5').values = [['Yayın kuralı', 'Kontrol']];
overview.getRange('D6:E11').values = [
  ['Yer', 'Koordinat, süre, kategori ve kaynak URL zorunlu'],
  ['İşletme', 'Son doğrulama 90 günü geçmemeli'],
  ['Rota', 'En az iki durak ve süre toplamı gün bütçesine uymalı'],
  ['Lezzet', 'Şehir ve tür bilgisi zorunlu'],
  ['Kaynak', 'Resmî kaynak veya editoryal doğrulama notu'],
  ['Silme', 'Silmek yerine is_active alanını kapat'],
];
for (const range of ['A5:B5', 'D5:E5']) {
  overview.getRange(range).format = { fill: colors.navy, font: { name: 'Arial', size: 10, bold: true, color: '#FFFFFF' }, horizontalAlignment: 'center' };
}
overview.getRange('A6:B12').format = { fill: colors.lightBlue, font: { name: 'Arial', size: 10, color: colors.text }, wrapText: true, verticalAlignment: 'center' };
overview.getRange('D6:E11').format = { fill: colors.amber, font: { name: 'Arial', size: 10, color: colors.text }, wrapText: true, verticalAlignment: 'center' };
overview.getRange('A2:H12').format.borders = { preset: 'outside', style: 'thin', color: colors.border };
['A', 'B', 'D', 'E'].forEach(column => { overview.getRange(`${column}:${column}`).format.columnWidth = column === 'B' || column === 'E' ? 42 : 22; });

addSheet('Cities',
  ['city_key', 'name', 'country_code', 'center_lat', 'center_lng', 'editorial_status', 'source_url', 'last_verified_at', 'is_active'],
  [['istanbul', 'İstanbul', 'TR', 41.0082, 28.9784, 'draft', '', '', true]],
  [18, 20, 14, 14, 14, 18, 44, 18, 12],
);

addSheet('Places',
  ['place_key', 'city_key', 'name', 'category', 'lat', 'lng', 'short_description', 'visit_duration_min', 'arrival_buffer_min', 'opening_hours_note', 'entry_fee_try', 'popularity_rank', 'source_url', 'last_verified_at', 'is_active'],
  [
    ['ayasofya', 'istanbul', 'Ayasofya Camii', 'historic_religious', '', '', '', 75, 15, '', '', 1, '', '', true],
    ['sultanahmet-camii', 'istanbul', 'Sultanahmet Camii', 'historic_religious', '', '', '', 60, 15, '', '', 2, '', '', true],
    ['yerebatan-sarnici', 'istanbul', 'Yerebatan Sarnıcı', 'museum', '', '', '', 60, 15, '', '', 3, '', '', true],
    ['topkapi-sarayi', 'istanbul', 'Topkapı Sarayı', 'museum', '', '', '', 180, 20, '', '', 4, '', '', true],
    ['dolmabahce-sarayi', 'istanbul', 'Dolmabahçe Sarayı', 'museum', '', '', '', 150, 20, '', '', 5, '', '', true],
  ],
  [24, 18, 28, 22, 13, 13, 48, 18, 18, 28, 16, 16, 44, 18, 12],
);

addSheet('Specialties',
  ['specialty_key', 'city_key', 'name', 'kind', 'meal_period', 'popularity_rank', 'short_description', 'source_url', 'last_verified_at', 'is_active'],
  [['istanbul-simit', 'istanbul', 'İstanbul simidi', 'snack', 'breakfast', 1, '', '', '', true]],
  [24, 18, 28, 18, 18, 16, 48, 44, 18, 12],
);

addSheet('Venues',
  ['venue_key', 'city_key', 'name', 'venue_type', 'lat', 'lng', 'address', 'price_band', 'website_url', 'source_url', 'last_verified_at', 'is_active'],
  [['', 'istanbul', '', 'restaurant', '', '', '', '', '', '', '', true]],
  [24, 18, 28, 18, 13, 13, 44, 16, 36, 44, 18, 12],
);

addSheet('Venue specialties',
  ['venue_key', 'specialty_key', 'is_signature_item', 'source_url', 'last_verified_at'],
  [['', '', false, '', '']],
  [24, 24, 18, 44, 18],
);

addSheet('Route templates',
  ['route_key', 'city_key', 'name', 'days', 'theme', 'summary', 'popularity_rank', 'source_url', 'last_verified_at', 'is_active'],
  [
    ['istanbul-tarihi-yarimada-1g', 'istanbul', 'Tarihi Yarımada', 1, 'history', 'Ayasofya, Sultanahmet, Yerebatan ve Topkapı çevresinde yoğun rota.', 1, '', '', true],
    ['istanbul-bogaz-ve-saraylar-1g', 'istanbul', 'Boğaz ve Saraylar', 1, 'palace', 'Dolmabahçe ve Boğaz çevresine odaklanan rota.', 2, '', '', true],
  ],
  [32, 18, 30, 12, 18, 52, 16, 44, 18, 12],
);

addSheet('Route stops',
  ['route_key', 'sequence_no', 'place_key', 'planned_duration_min', 'travel_buffer_min', 'recommended_meal_period', 'notes'],
  [
    ['istanbul-tarihi-yarimada-1g', 1, 'ayasofya', 75, 15, '', ''],
    ['istanbul-tarihi-yarimada-1g', 2, 'sultanahmet-camii', 60, 15, '', ''],
    ['istanbul-tarihi-yarimada-1g', 3, 'yerebatan-sarnici', 60, 15, 'lunch', ''],
    ['istanbul-tarihi-yarimada-1g', 4, 'topkapi-sarayi', 180, 20, '', ''],
    ['istanbul-bogaz-ve-saraylar-1g', 1, 'dolmabahce-sarayi', 150, 20, 'lunch', ''],
  ],
  [32, 14, 28, 22, 20, 28, 42],
);

addSheet('Sources',
  ['source_key', 'source_name', 'source_type', 'url', 'license_or_usage_note', 'checked_at', 'status'],
  [
    ['culture-portal', 'Kültür Portalı', 'official', 'https://www.kulturportali.gov.tr/', 'Her kayıt için sayfa URLsi Places veya Specialties sekmesine yazılır.', '', 'approved'],
    ['editorial-review', 'Editoryal doğrulama', 'internal', '', 'Araştırmacı adı ve kısa doğrulama notu ilgili satırın source_url alanına eklenir.', '', 'draft'],
  ],
  [22, 28, 18, 48, 58, 18, 16],
);

for (const name of ['Cities', 'Places', 'Specialties', 'Venues', 'Venue specialties', 'Route templates', 'Route stops', 'Sources']) {
  const sheet = workbook.worksheets.getItem(name);
  sheet.getUsedRange().format.wrapText = false;
  sheet.getUsedRange().format.autofitRows();
}

workbook.recalculate();
await fs.mkdir(outputDir, { recursive: true });
const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(`${outputDir}smart-travel-content-catalog.xlsx`);

const check = await workbook.inspect({ kind: 'table', range: 'Route templates!A1:J4', include: 'values,formulas', tableMaxRows: 4, tableMaxCols: 10 });
console.log(check.ndjson);
const errors = await workbook.inspect({ kind: 'match', searchTerm: '#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!', options: { useRegex: true, maxResults: 50 }, summary: 'formula error scan' });
console.log(errors.ndjson);
const preview = await workbook.render({ sheetName: 'Overview', range: 'A1:H12', scale: 2 });
await fs.writeFile(`${outputDir}overview.png`, new Uint8Array(await preview.arrayBuffer()));
