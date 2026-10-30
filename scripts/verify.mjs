// Real-data check. Fetches 30+ years of daily weather from Open-Meteo and prints the full ledger.
//
//   node scripts/verify.mjs                                   (Enugu, maize, planted 15 April, sandy soil)
//   node scripts/verify.mjs 7.3775 3.947 05-15 silty_clay groundnut
//
// Arguments: latitude longitude MM-DD soil crop
//   soil: loamy_sand | silty_clay | silt     crop: maize | groundnut
// Needs Node 18 or newer (built-in fetch). Uses the same logic file as the web app.

import { createRequire } from 'node:module';
const L = createRequire(import.meta.url)('../src/logic.js');

const [lat = '6.4584', lon = '7.5464', monthDay = '04-15', soil = 'loamy_sand', crop = 'maize'] = process.argv.slice(2);
if (!L.CROPS[crop]) { console.error('Unknown crop "' + crop + '". Choose one of: ' + Object.keys(L.CROPS).join(', ')); process.exit(1); }
const today = L.todayISO();
const start = (Number(today.slice(0, 4)) - 32) + '-01-01';
const end = L.addDays(today, -L.DEFAULT_TERMS.dataLagDays);
const url = 'https://archive-api.open-meteo.com/v1/archive?latitude=' + lat + '&longitude=' + lon +
  '&start_date=' + start + '&end_date=' + end +
  '&daily=precipitation_sum,et0_fao_evapotranspiration&timezone=Africa%2FLagos';

const res = await fetch(url);
if (!res.ok) { console.error('Open-Meteo returned HTTP ' + res.status + ': ' + (await res.text()).slice(0, 300)); process.exit(1); }
const json = await res.json();
if (!json.daily || !json.daily.et0_fao_evapotranspiration) {
  console.error('Response had no et0_fao_evapotranspiration. Keys: ' + Object.keys(json.daily || json).join(', '));
  process.exit(1);
}

const series = L.seriesFromOpenMeteo(json);
const days = json.daily.time.length;
const missingRain = json.daily.precipitation_sum.filter((v) => v == null).length;
const missingEt0 = json.daily.et0_fao_evapotranspiration.filter((v) => v == null).length;
console.log('Grid point: ' + json.latitude + ', ' + json.longitude + '  elevation ' + json.elevation + ' m');
console.log('Days: ' + days + '  missing rain: ' + missingRain + '  missing ET0: ' + missingEt0);
console.log('Soil: ' + soil + '  planting: ' + monthDay + '  crop: ' + crop + '\n');

const results = L.backtest(series, crop, soil, monthDay, { today, years: 30 });
const sumInsured = 1000000;
const q = L.price(results, sumInsured);

const f = (x, w, d = 0) => String(d ? x.toFixed(d) : Math.round(x)).padStart(w);
console.log('year  rain_mm  need_mm  need met % by stage (1 to 4)   loss%  payout%');
for (const r of results) {
  const w = r.stages.map((s) => f(s.wrsi * 100, 5));
  console.log(r.year + '  ' + f(r.seasonRainMm, 7) + '  ' + f(r.seasonEtcMm, 7) + '      ' + w.join('') + '   ' + f(r.lossFraction * 100, 5) + '  ' + f(r.totalFraction * 100, 7));
}
console.log('\nSeasons: ' + q.years + '  paid: ' + q.paidYears + '  average payout (burn cost): ' + (q.burnFraction * 100).toFixed(2) + '% of cover');
console.log('Premium rate with ' + (L.DEFAULT_TERMS.loading * 100) + '% margin: ' + (q.rate * 100).toFixed(2) + '% of cover');
const avgRain = results.reduce((a, r) => a + r.seasonRainMm, 0) / results.length;
const avgNeed = results.reduce((a, r) => a + r.seasonEtcMm, 0) / results.length;
console.log('Average season: ' + avgRain.toFixed(0) + ' mm rain vs ' + avgNeed.toFixed(0) + ' mm crop water need');
