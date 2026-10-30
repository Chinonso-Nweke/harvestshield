'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const L = require('../src/logic.js');

const close = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} !~ ${b}`);

// Build a series covering [from, to] from functions of (index, date).
function series(from, to, rainFn, et0Fn) {
  const rain = new Map(), et0 = new Map();
  let d = from, i = 0;
  while (d <= to) { rain.set(d, rainFn(i, d)); et0.set(d, et0Fn(i, d)); d = L.addDays(d, 1); i++; }
  return { rain, et0 };
}
const ET0 = () => 4;

test('addDays handles month, year and leap boundaries', () => {
  assert.equal(L.addDays('2024-02-28', 2), '2024-03-01');
  assert.equal(L.addDays('2023-02-28', 1), '2023-03-01');
  assert.equal(L.addDays('2025-12-31', 1), '2026-01-01');
  assert.equal(L.addDays('2026-03-01', -1), '2026-02-28');
});

test('maize stage lengths and Ky match the FAO figures', () => {
  const c = L.CROPS.maize;
  assert.deepEqual(c.stages.map((s) => s.days), [20, 35, 40, 30]);
  assert.deepEqual(c.stages.map((s) => s.ky), [0.4, 0.4, 1.3, 0.5]);
  assert.equal(L.cropLengthDays('maize'), 125);
});

test('groundnut stage lengths and Ky match the FAO figures', () => {
  const c = L.CROPS.groundnut;
  assert.deepEqual(c.stages.map((s) => s.days), [25, 35, 45, 25]);
  assert.deepEqual(c.stages.map((s) => s.ky), [0.2, 0.8, 0.6, 0.2]);
  assert.equal(L.cropLengthDays('groundnut'), 130);
  assert.equal(c.depletionP, 0.5);
  assert.equal(c.rootDepthM, 0.5);
});

test('every crop has four stages, a Kc curve as long as its season, and a source for each value', () => {
  for (const [key, c] of Object.entries(L.CROPS)) {
    assert.equal(c.stages.length, 4, key);
    assert.equal(L.kcCurve(c).length, L.cropLengthDays(key), key);
    assert.ok(c.sources.length >= 5, key);
    c.sources.forEach((s) => assert.ok(s.url.startsWith('https://www.fao.org/'), key));
  }
});

test('groundnut: a dry spell during flowering costs more than the same spell during ripening', () => {
  const planting = '2020-05-01';
  const dry = (from, to) => (i, d) => {
    const day = Math.round((Date.parse(d) - Date.parse(planting)) / 86400000);
    return day >= from && day <= to ? 0 : 20;
  };
  const flowering = L.evaluateSeason(series('2020-02-01', '2020-12-31', dry(25, 59), ET0), planting, 'groundnut', 'loamy_sand');
  const ripening = L.evaluateSeason(series('2020-02-01', '2020-12-31', dry(105, 129), ET0), planting, 'groundnut', 'loamy_sand');
  assert.ok(flowering.lossFraction > ripening.lossFraction);
  assert.ok(flowering.stages[1].wrsi < 1);
});

test('Kc curve: flat, linear rise, flat, linear fall', () => {
  const k = L.kcCurve(L.CROPS.maize);
  assert.equal(k.length, 125);
  assert.equal(k[0], 0.3);
  assert.equal(k[19], 0.3);
  close(k[20], 0.3 + 0.9 / 35);          // first development day
  close(k[54], 1.2);                      // last development day reaches Kc mid
  assert.equal(k[55], 1.2);               // mid-season flat
  assert.equal(k[94], 1.2);
  close(k[95], 1.2 - 0.7 / 30);           // first late-season day
  close(k[124], 0.5);                     // last day ends at Kc end
});

test('water balance step: below the depletion threshold there is no stress', () => {
  const taw = 90, p = 0.55; // RAW = 49.5
  let s = L.stepWaterBalance(0, 0, 5, taw, p);
  assert.equal(s.ks, 1); assert.equal(s.eta, 5); assert.equal(s.dr, 5);
  s = L.stepWaterBalance(49.5, 0, 5, taw, p);
  assert.equal(s.ks, 1);
});

test('water balance step: stress grows linearly from RAW to TAW', () => {
  const taw = 90, p = 0.55;
  let s = L.stepWaterBalance(69.75, 0, 5, taw, p);   // halfway between 49.5 and 90
  close(s.ks, 0.5); close(s.eta, 2.5); close(s.dr, 72.25);
  s = L.stepWaterBalance(90, 0, 5, taw, p);          // empty root zone
  assert.equal(s.ks, 0); assert.equal(s.eta, 0); assert.equal(s.dr, 90);
});

test('water balance step: heavy rain refills the root zone and the excess drains away', () => {
  const s = L.stepWaterBalance(89, 100, 5, 90, 0.55);
  assert.equal(s.dr, 0);
});

test('FAO-33 stage response multiplies the stage factors', () => {
  let y = L.yieldFromStages([1, 1, 0.5, 1], [0.4, 0.4, 1.3, 0.5]);
  close(y.ratio, 0.35);                              // 1 - 1.3 x 0.5
  y = L.yieldFromStages([0.8, 1, 1, 1], [0.4, 0.4, 1.3, 0.5]);
  close(y.ratio, 0.92);
  y = L.yieldFromStages([0.9, 0.9, 0.9, 0.9], [0.4, 0.4, 1.3, 0.5]);
  close(y.ratio, 0.96 * 0.96 * 0.87 * 0.95);
  y = L.yieldFromStages([0, 0, 0, 0], [0.4, 0.4, 1.3, 0.5]);
  assert.equal(y.ratio, 0);                          // Ky above 1 cannot push a factor negative
});

test('payout rises linearly between strike and exit', () => {
  assert.equal(L.payoutFromLoss(0.1, 0.2, 0.6), 0);
  assert.equal(L.payoutFromLoss(0.2, 0.2, 0.6), 0);
  close(L.payoutFromLoss(0.4, 0.2, 0.6), 0.5);
  assert.equal(L.payoutFromLoss(0.6, 0.2, 0.6), 1);
  assert.equal(L.payoutFromLoss(0.95, 0.2, 0.6), 1);
});

test('plentiful rain: every stage fully supplied, no loss, no payout', () => {
  const s = series('2020-02-01', '2020-12-31', () => 20, ET0);
  const ev = L.evaluateSeason(s, '2020-05-01', 'maize', 'loamy_sand');
  ev.stages.forEach((st) => close(st.wrsi, 1));
  close(ev.lossFraction, 0);
  assert.equal(ev.totalFraction, 0);
  assert.equal(ev.coverage, 1);
  assert.equal(ev.harvestISO, '2020-09-02'); // 1 May + 124 days
});

test('no rain at all: nothing is supplied and the full cover pays', () => {
  const s = series('2020-02-01', '2020-12-31', () => 0, ET0);
  const ev = L.evaluateSeason(s, '2020-05-01', 'maize', 'loamy_sand');
  ev.stages.forEach((st) => assert.equal(st.wrsi, 0));
  assert.equal(ev.lossFraction, 1);
  assert.equal(ev.totalFraction, 1);
});

test('a dry flowering stage after wet weather matches an independent hand loop', () => {
  // Rain 20 mm/day except zero during the mid-season stage (days 55 to 94). ET0 = 4 mm/day.
  const planting = '2020-05-01';
  const s = series('2020-02-01', '2020-12-31', (i, d) => {
    const day = Math.round((Date.parse(d) - Date.parse(planting)) / 86400000);
    return day >= 55 && day <= 94 ? 0 : 20;
  }, ET0);
  const ev = L.evaluateSeason(s, planting, 'maize', 'loamy_sand');

  // Independent re-implementation of the same FAO-56 recipe for the dry stage.
  const taw = 90, raw = 0.55 * 90;
  let dr = 0, etaSum = 0, etcSum = 0;
  for (let n = 0; n < 40; n++) {
    const etc = 1.2 * 4;
    const ks = dr <= raw ? 1 : (taw - dr) / (taw - raw);
    const eta = ks * etc;
    dr = Math.min(taw, Math.max(0, dr + eta));
    etaSum += eta; etcSum += etc;
  }
  const mid = ev.stages[2];
  close(mid.wrsi, etaSum / etcSum, 1e-9);
  // 40 dry days at 4.8 mm/day need 192 mm; 90 mm of soil water cannot cover that, so supply is under half.
  assert.ok(mid.wrsi > 0.4 && mid.wrsi < 0.5, 'got ' + mid.wrsi);
  close(ev.stages[0].wrsi, 1); close(ev.stages[1].wrsi, 1);
  // The late stage restarts from a depleted root zone, so it is mildly stressed on its first days.
  assert.ok(ev.stages[3].wrsi > 0.9 && ev.stages[3].wrsi <= 1);
  assert.ok(ev.lossFraction > 0.4);
  assert.ok(ev.totalFraction > 0 && ev.totalFraction <= 1);
});

test('a sandy soil stresses earlier than a silty soil under the same dry spell', () => {
  const planting = '2020-05-01';
  const rainFn = (i, d) => {
    const day = Math.round((Date.parse(d) - Date.parse(planting)) / 86400000);
    return day >= 55 && day <= 94 ? 0 : 20;
  };
  const s = series('2020-02-01', '2020-12-31', rainFn, ET0);
  const sand = L.evaluateSeason(s, planting, 'maize', 'loamy_sand');
  const silt = L.evaluateSeason(s, planting, 'maize', 'silt');
  assert.ok(sand.stages[2].wrsi < silt.stages[2].wrsi);
  assert.ok(sand.lossFraction > silt.lossFraction);
});

test('missing days lower coverage', () => {
  const s = series('2020-05-01', '2020-05-30', () => 8, ET0);
  const ev = L.evaluateSeason(s, '2020-05-01', 'maize', 'loamy_sand');
  assert.ok(ev.coverage < 0.3);
});

test('backtest returns the latest complete seasons, oldest first', () => {
  const s = series('1990-01-01', '2026-10-20', () => 8, ET0);
  const res = L.backtest(s, 'maize', 'loamy_sand', '05-01', { today: '2026-10-26', years: 30 });
  assert.equal(res.length, 30);
  assert.equal(res[0].year, 1997);
  assert.equal(res[29].year, 2026);
  assert.deepEqual(res.map((r) => r.year), res.map((r) => r.year).slice().sort((a, b) => a - b));
});

test('backtest skips seasons that have not finished yet', () => {
  const s = series('1990-01-01', '2026-10-20', () => 8, ET0);
  const res = L.backtest(s, 'maize', 'loamy_sand', '09-01', { today: '2026-10-26', years: 5 });
  assert.equal(res[res.length - 1].year, 2025);
});

test('backtest skips seasons with no data', () => {
  const s = series('2005-01-01', '2026-10-20', () => 8, ET0);
  const res = L.backtest(s, 'maize', 'loamy_sand', '05-01', { today: '2026-10-26', years: 30 });
  assert.equal(res.length, 22);
  assert.equal(res[0].year, 2005);
});

test('price: average payout, loading and premium', () => {
  // 10 seasons, one pays 50%, the rest pay 0. Burn cost = 5%.
  const results = Array.from({ length: 10 }, (_, i) => ({ year: 2000 + i, totalFraction: i === 3 ? 0.5 : 0 }));
  const q = L.price(results, 1000000);
  close(q.burnFraction, 0.05);
  close(q.rate, 0.05 * 1.35);
  close(q.premium, 67500);
  assert.equal(q.paidYears, 1);
  assert.equal(q.returnPeriodYears, 10);
  assert.equal(q.worstYear, 2003);
  close(q.worstPayout, 500000);
  close(q.totalPayouts, 500000);
  close(q.totalPremiums, 675000);
  close(q.lossRatio, 500000 / 675000);
});

test('price: a history that never pays costs nothing and says so', () => {
  const results = Array.from({ length: 30 }, (_, i) => ({ year: 1996 + i, totalFraction: 0 }));
  const q = L.price(results, 500000);
  assert.equal(q.premium, 0);
  assert.equal(q.paidYears, 0);
  assert.equal(q.returnPeriodYears, null);
});

test('seriesFromOpenMeteo parses rain, ET0 and the grid cell', () => {
  const s = L.seriesFromOpenMeteo({
    latitude: 6.5, longitude: 7.5, elevation: 200,
    daily: { time: ['2024-05-01', '2024-05-02'], precipitation_sum: [1.5, null], et0_fao_evapotranspiration: [3.9, 4.1] }
  });
  assert.equal(s.rain.get('2024-05-01'), 1.5);
  assert.equal(s.rain.get('2024-05-02'), null);
  assert.equal(s.et0.get('2024-05-02'), 4.1);
  assert.equal(s.lat, 6.5);
  assert.equal(L.seriesFromOpenMeteo(null).rain.size, 0);
});

test('planting sensitivity: one entry per planting week, March to September', () => {
  const s = series('1990-01-01', '2026-10-20', () => 20, ET0);
  const out = L.plantingSensitivity(s, 'maize', 'loamy_sand', { today: '2026-10-26', years: 30 });
  assert.equal(out[0].monthDay, '03-01');
  assert.equal(out[1].monthDay, '03-08');
  assert.ok(out.length >= 28 && out.length <= 31, 'got ' + out.length);
  out.forEach((e) => assert.equal(e.rate, 0));
});

test('planting sensitivity: a dry start to the rains makes early planting cost more than late planting', () => {
  // No rain from January to the end of May every year, plentiful rain afterwards.
  const s = series('1990-01-01', '2026-10-20', (i, d) => (d.slice(5) <= '05-31' ? 0 : 20), ET0);
  const out = L.plantingSensitivity(s, 'maize', 'loamy_sand', { today: '2026-10-26', years: 30 });
  const early = out.find((e) => e.monthDay === '03-01');
  const late = out.find((e) => e.monthDay === '07-05') || out.find((e) => e.monthDay > '07-01');
  assert.ok(early.rate > 0.5, 'early ' + early.rate);
  assert.equal(late.rate, 0);
});

test('seasonClimate summarises rain and need', () => {
  const r = [{ year: 2001, seasonRainMm: 400, seasonEtcMm: 500 }, { year: 2002, seasonRainMm: 600, seasonEtcMm: 500 }, { year: 2003, seasonRainMm: 500, seasonEtcMm: 500 }];
  const c = L.seasonClimate(r);
  assert.equal(c.meanRainMm, 500);
  assert.equal(c.sdRainMm, 100);
  assert.equal(c.cvRain, 0.2);
  assert.equal(c.rainToNeed, 1);
  assert.equal(c.driestYear, 2001);
  assert.equal(c.wettestYear, 2002);
  assert.equal(L.seasonClimate([]), null);
});

test('haversineKm matches known distances', () => {
  assert.equal(L.haversineKm(6, 7, 6, 7), 0);
  // one degree of latitude is about 111.2 km
  assert.ok(Math.abs(L.haversineKm(6, 7, 7, 7) - 111.19) < 0.1);
});

test('detrendRatio removes a linear trend', () => {
  const pts = [2000, 2001, 2002, 2003].map((y) => ({ year: y, value: 100 + 10 * (y - 2000) }));
  L.detrendRatio(pts).forEach((r) => assert.ok(Math.abs(r.ratio - 1) < 1e-9));
  assert.deepEqual(L.detrendRatio(pts.slice(0, 2)), []);
});

test('pearson gives 1, -1 and null', () => {
  assert.ok(Math.abs(L.pearson([1, 2, 3, 4], [2, 4, 6, 8]) - 1) < 1e-9);
  assert.ok(Math.abs(L.pearson([1, 2, 3, 4], [8, 6, 4, 2]) + 1) < 1e-9);
  assert.equal(L.pearson([1, 2], [1, 2]), null);
  assert.equal(L.pearson([1, 1, 1], [1, 2, 3]), null);
});
