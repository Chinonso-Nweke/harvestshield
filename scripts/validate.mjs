// Compare the model's estimated yield with recorded yields.
//
//   node scripts/validate.mjs <lat> <lon> <MM-DD> <soil> <crop> <yields.csv>
//   node scripts/validate.mjs 7.7337 8.5214 05-15 loamy_sand maize benue_maize.csv
//
// yields.csv: a header line, then "year,yield" rows (any consistent unit, e.g. t/ha or hg/ha).
// Use a state or national series for the same crop and area as the location you simulate.
// Recorded yields rise over time with seeds, fertiliser and area changes, so a straight-line trend
// is removed first and the ratio actual/trend is compared with the model's yield ratio.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const L = createRequire(import.meta.url)('../src/logic.js');

const [lat, lon, monthDay, soil = 'loamy_sand', crop = 'maize', file] = process.argv.slice(2);
if (!lat || !lon || !monthDay || !file) { console.error('Usage: node scripts/validate.mjs <lat> <lon> <MM-DD> <soil> <crop> <yields.csv>'); process.exit(1); }
if (!L.CROPS[crop]) { console.error('Unknown crop. Choose one of: ' + Object.keys(L.CROPS).join(', ')); process.exit(1); }

const rows = readFileSync(file, 'utf8').split(/\r?\n/).slice(1).map((l) => l.split(',')).map((c) => ({ year: Number(c[0]), value: Number(c[1]) }))
  .filter((r) => Number.isFinite(r.year) && Number.isFinite(r.value) && r.value > 0);
if (rows.length < 8) { console.error('Need at least 8 years of yields; found ' + rows.length); process.exit(1); }

const today = L.todayISO();
const start = (Number(today.slice(0, 4)) - 32) + '-01-01';
const end = L.addDays(today, -L.DEFAULT_TERMS.dataLagDays);
const url = 'https://archive-api.open-meteo.com/v1/archive?latitude=' + lat + '&longitude=' + lon + '&start_date=' + start + '&end_date=' + end +
  '&daily=precipitation_sum,et0_fao_evapotranspiration&timezone=Africa%2FLagos';
const res = await fetch(url);
if (!res.ok) { console.error('Open-Meteo returned HTTP ' + res.status); process.exit(1); }
const series = L.seriesFromOpenMeteo(await res.json());
const model = L.backtest(series, crop, soil, monthDay, { today, years: 30 });

const trend = L.detrendRatio(rows);
const byYear = new Map(model.map((m) => [m.year, m]));
const pairs = trend.filter((t) => byYear.has(t.year)).map((t) => ({ year: t.year, actual: t.ratio, model: byYear.get(t.year).yieldRatio }));
console.log('year  recorded yield / trend   model yield ratio');
pairs.forEach((p) => console.log(p.year + '  ' + p.actual.toFixed(3).padStart(14) + '  ' + p.model.toFixed(3).padStart(20)));
const r = L.pearson(pairs.map((p) => p.actual), pairs.map((p) => p.model));
console.log('\nOverlapping years: ' + pairs.length);
console.log('Pearson correlation: ' + (r == null ? 'not defined (too few years or no variation)' : r.toFixed(2)));
console.log('A positive value means seasons the model calls drier also had lower recorded yields. Judge it against the number of years: with few years, a single season can swing it.');
