/*
 * HarvestShield: index insurance logic built on FAO methods.
 * Pure functions, no DOM and no network, so everything here is unit-testable in Node.
 *
 * Method, in order:
 *  1. Daily crop water need  ETc = Kc x ET0         (FAO-56; ET0 is FAO Penman-Monteith from the weather data)
 *  2. Daily root-zone water balance with a stress factor Ks   (FAO-56 chapter 8)
 *  3. Per growth stage: water need met = sum(ETa) / sum(ETc)
 *  4. Yield effect per stage = Ky x (1 - need met), multiplied across stages   (FAO-33)
 *  5. Payout = share of cover that rises linearly between a strike and an exit loss (policy design)
 *  6. Premium = average payout over the back-test seasons, plus a loading
 *
 * Crop and soil numbers carry their source in the `sources` field. Anything that is a
 * product-design choice rather than agronomy lives in DEFAULT_TERMS and is labelled as such.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.HarvestLogic = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const DAY_MS = 86400000;

  // Policy design choices (NOT agronomy). Real insurers set these from their own risk appetite.
  const DEFAULT_TERMS = Object.freeze({
    strikeLoss: 0.20,   // estimated yield loss below this pays nothing
    exitLoss: 0.60,     // estimated yield loss at or above this pays the full cover
    loading: 0.35,      // assumed margin for costs and risk, added to the average payout
    minCoverage: 0.9,   // seasons with less than 90% daily data are left out
    dataLagDays: 6,     // the weather archive trails real time by about five days
    spinUpDays: 30      // days simulated before planting so the soil starts from a realistic state
  });

  // Total available water per metre of soil (mm/m): FAO-56 chapter 8, Example 36.
  const SOILS = {
    loamy_sand: { label: 'Sandy (loamy sand)', tawPerM: 90 },
    silty_clay: { label: 'Clay-rich (silty clay)', tawPerM: 120 },
    silt: { label: 'Silty (silt)', tawPerM: 170 }
  };

  const FAO56 = 'https://www.fao.org/4/x0490e/x0490e0b.htm';
  const FAO56_SOIL = 'https://www.fao.org/4/x0490e/x0490e0e.htm';
  const FAO_MAIZE = 'https://www.fao.org/land-water/databases-and-software/crop-information/maize/en/';
  const FAO_GROUNDNUT = 'https://www.fao.org/land-water/databases-and-software/crop-information/groundnut/en/';

  const CROPS = {
    maize: {
      label: 'Maize (grain)',
      kc: { ini: 0.30, mid: 1.20, end: 0.50 },
      rootDepthM: 1.0,
      depletionP: 0.55,
      stages: [
        { key: 'initial', name: 'Initial', days: 20, ky: 0.40 },
        { key: 'development', name: 'Development', days: 35, ky: 0.40 },
        { key: 'mid', name: 'Mid-season (flowering, grain set)', days: 40, ky: 1.30 },
        { key: 'late', name: 'Late season (ripening)', days: 30, ky: 0.50 }
      ],
      sources: [
        { what: 'Stage lengths 20 / 35 / 40 / 30 days (125 total)', where: 'FAO-56 Table 11, maize (grain), Nigeria (humid), June planting', url: FAO56 },
        { what: 'Crop coefficient Kc: 0.30 initial, 1.20 mid-season, 0.50 late', where: 'FAO crop information page for maize (Kc table); mid-season also in FAO-56 Table 12', url: FAO_MAIZE },
        { what: 'Yield response factor Ky: 0.40 / 0.40 / 1.30 / 0.50 by stage (1.25 whole season)', where: 'FAO crop information page for maize, which names flowering as the most water-sensitive stage', url: FAO_MAIZE },
        { what: 'Depletion fraction p = 0.55', where: 'FAO-56 Table 22, maize (grain)', url: FAO56_SOIL },
        { what: 'Root depth 1.0 m (low end of the 1.0 to 1.7 m range)', where: 'FAO-56 Table 22, maize (grain)', url: FAO56_SOIL },
        { what: 'Soil water 90, 120 or 170 mm per metre', where: 'FAO-56 chapter 8, Example 36 (loamy sand, silty clay, silt)', url: FAO56_SOIL }
      ]
    },
    groundnut: {
      label: 'Groundnut',
      kc: { ini: 0.40, mid: 1.05, end: 0.60 },
      rootDepthM: 0.5,
      depletionP: 0.50,
      stages: [
        { key: 'initial', name: 'Initial', days: 25, ky: 0.20 },
        { key: 'development', name: 'Development (flowering)', days: 35, ky: 0.80 },
        { key: 'mid', name: 'Mid-season (pegging, pod filling)', days: 45, ky: 0.60 },
        { key: 'late', name: 'Late season (ripening)', days: 25, ky: 0.20 }
      ],
      sources: [
        { what: 'Stage lengths 25 / 35 / 45 / 25 days (130 total)', where: 'FAO groundnut crop page, West Africa column; same row in FAO-56 Table 11', url: FAO_GROUNDNUT },
        { what: 'Crop coefficient Kc: 0.40 initial, 1.05 mid-season, 0.60 late', where: 'FAO groundnut crop page (Kc table). FAO-56 Table 12 gives a slightly higher mid-season Kc of 1.15', url: FAO_GROUNDNUT },
        { what: 'Yield response factor Ky: 0.20 / 0.80 / 0.60 / 0.20 by stage (0.70 whole season)', where: 'FAO groundnut crop page, which names flowering as the most water-sensitive period', url: FAO_GROUNDNUT },
        { what: 'Depletion fraction p = 0.50', where: 'FAO-56 Table 22, groundnut', url: FAO56_SOIL },
        { what: 'Root depth 0.5 m (low end of the 0.5 to 1.0 m range)', where: 'FAO-56 Table 22, groundnut', url: FAO56_SOIL },
        { what: 'Soil water 90, 120 or 170 mm per metre', where: 'FAO-56 chapter 8, Example 36 (loamy sand, silty clay, silt)', url: FAO56_SOIL }
      ]
    }
  };

  // ---- date helpers (UTC, ISO "YYYY-MM-DD") ----
  function parseISO(iso) {
    const p = iso.split('-').map(Number);
    return Date.UTC(p[0], p[1] - 1, p[2]);
  }
  function toISO(ms) { return new Date(ms).toISOString().slice(0, 10); }
  function addDays(iso, n) { return toISO(parseISO(iso) + n * DAY_MS); }
  function todayISO(d) { return (d || new Date()).toISOString().slice(0, 10); }

  const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
  const round1 = (x) => Math.round(x * 10) / 10;
  const isNum = (v) => typeof v === 'number' && Number.isFinite(v);

  function cropLengthDays(cropKey) {
    return CROPS[cropKey].stages.reduce((a, s) => a + s.days, 0);
  }

  /** Daily Kc across the season: flat, linear rise, flat, linear fall (FAO-56 figure 34). */
  function kcCurve(crop) {
    const out = [];
    const st = crop.stages, kc = crop.kc;
    for (let i = 0; i < st[0].days; i++) out.push(kc.ini);
    for (let i = 0; i < st[1].days; i++) out.push(kc.ini + (kc.mid - kc.ini) * (i + 1) / st[1].days);
    for (let i = 0; i < st[2].days; i++) out.push(kc.mid);
    for (let i = 0; i < st[3].days; i++) out.push(kc.mid + (kc.end - kc.mid) * (i + 1) / st[3].days);
    return out;
  }

  /**
   * One day of the FAO-56 root-zone water balance.
   * dr = depletion at the end of the previous day (0 = full, taw = empty), in mm.
   */
  function stepWaterBalance(dr, rain, etc, taw, depletionP) {
    const raw = depletionP * taw;
    const ks = dr <= raw ? 1 : Math.max(0, (taw - dr) / (taw - raw));
    const eta = ks * etc;
    return { ks: ks, eta: eta, dr: clamp(dr - rain + eta, 0, taw) };
  }

  /** FAO-33 stage-wise response: yield ratio = product of (1 - Ky x (1 - water need met)). */
  function yieldFromStages(wrsis, kys) {
    let ratio = 1;
    const factors = [];
    for (let i = 0; i < wrsis.length; i++) {
      const f = Math.max(0, 1 - kys[i] * (1 - wrsis[i]));
      factors.push(f);
      ratio *= f;
    }
    return { ratio: ratio, factors: factors };
  }

  /** Linear payout share between the strike and exit levels of estimated yield loss. */
  function payoutFromLoss(loss, strike, exit) {
    return clamp((loss - strike) / (exit - strike), 0, 1);
  }

  // Open-Meteo archive JSON -> { rain: Map, et0: Map, lat, lon, elevation }
  function seriesFromOpenMeteo(json) {
    const rain = new Map(), et0 = new Map();
    if (json && json.daily && Array.isArray(json.daily.time)) {
      const t = json.daily.time;
      const p = json.daily.precipitation_sum || [];
      const e = json.daily.et0_fao_evapotranspiration || [];
      for (let i = 0; i < t.length; i++) { rain.set(t[i], p[i]); et0.set(t[i], e[i]); }
    }
    return {
      rain: rain, et0: et0,
      lat: json && json.latitude, lon: json && json.longitude, elevation: json && json.elevation
    };
  }

  /**
   * Score one season.
   * @param {{rain: Map, et0: Map}} series  date -> mm/day maps
   */
  function evaluateSeason(series, plantingISO, cropKey, soilKey, terms) {
    terms = terms || DEFAULT_TERMS;
    const crop = CROPS[cropKey];
    const soil = SOILS[soilKey];
    if (!crop) throw new Error('Unknown crop: ' + cropKey);
    if (!soil) throw new Error('Unknown soil: ' + soilKey);

    const taw = soil.tawPerM * crop.rootDepthM;
    const kcs = kcCurve(crop);

    // Spin-up: start with an empty root zone 30 days before planting at the initial Kc.
    let dr = taw;
    for (let k = terms.spinUpDays; k >= 1; k--) {
      const d = addDays(plantingISO, -k);
      const p = series.rain.get(d), e = series.et0.get(d);
      dr = stepWaterBalance(dr, isNum(p) ? p : 0, crop.kc.ini * (isNum(e) ? e : 0), taw, crop.depletionP).dr;
    }

    const daily = [];
    const stages = [];
    let missing = 0, seasonRain = 0, seasonEtc = 0, day = 0;

    for (const st of crop.stages) {
      let rainSum = 0, etcSum = 0, etaSum = 0;
      const startDate = addDays(plantingISO, day);
      for (let i = 0; i < st.days; i++, day++) {
        const date = addDays(plantingISO, day);
        const p = series.rain.get(date), e = series.et0.get(date);
        const ok = isNum(p) && isNum(e);
        if (!ok) missing++;
        const rain = isNum(p) ? p : 0;
        const etc = kcs[day] * (isNum(e) ? e : 0);
        const step = stepWaterBalance(dr, rain, etc, taw, crop.depletionP);
        dr = step.dr;
        rainSum += rain; etcSum += etc; etaSum += step.eta;
        daily.push({ date: date, mm: ok ? p : null, etc: etc, eta: step.eta, ks: step.ks });
      }
      seasonRain += rainSum; seasonEtc += etcSum;
      stages.push({
        name: st.name, start: startDate, end: addDays(plantingISO, day - 1), days: st.days, ky: st.ky,
        rainMm: round1(rainSum), etcMm: round1(etcSum), etaMm: round1(etaSum),
        wrsi: etcSum > 0 ? etaSum / etcSum : 1
      });
    }

    const y = yieldFromStages(stages.map((s) => s.wrsi), stages.map((s) => s.ky));
    stages.forEach((s, i) => { s.yieldFactor = y.factors[i]; s.yieldEffect = 1 - y.factors[i]; });
    const loss = 1 - y.ratio;

    return {
      plantingISO: plantingISO,
      harvestISO: addDays(plantingISO, day - 1),
      seasonRainMm: round1(seasonRain),
      seasonEtcMm: round1(seasonEtc),
      stages: stages,
      yieldRatio: y.ratio,
      lossFraction: loss,
      totalFraction: payoutFromLoss(loss, terms.strikeLoss, terms.exitLoss),
      coverage: 1 - missing / day,
      daily: daily
    };
  }

  /**
   * Re-run the same policy on past years to see what it would have paid.
   * Returns the most recent `years` complete seasons, oldest first.
   */
  function backtest(series, cropKey, soilKey, monthDay, opts) {
    opts = opts || {};
    const terms = opts.terms || DEFAULT_TERMS;
    const years = opts.years || 30;
    if (!opts.today) throw new Error('backtest needs opts.today (YYYY-MM-DD)');
    const lastData = addDays(opts.today, -terms.dataLagDays);
    const thisYear = Number(opts.today.slice(0, 4));
    const out = [];
    for (let yr = thisYear; yr >= thisYear - 70 && out.length < years; yr--) {
      const ev = evaluateSeason(series, yr + '-' + monthDay, cropKey, soilKey, terms);
      if (ev.harvestISO > lastData) continue;        // season not finished yet
      if (ev.coverage < terms.minCoverage) continue; // not enough data
      out.push(Object.assign({ year: yr }, ev));
    }
    return out.sort((a, b) => a.year - b.year);
  }

  /** Turn back-test results into a quote. */
  function price(results, sumInsured, terms) {
    terms = terms || DEFAULT_TERMS;
    const n = results.length;
    if (!n) return null;
    const sum = results.reduce((a, r) => a + r.totalFraction, 0);
    const burn = sum / n;                       // average payout as a share of cover
    const rate = burn * (1 + terms.loading);
    const premium = rate * sumInsured;
    const paid = results.filter((r) => r.totalFraction > 0);
    const worst = results.reduce((a, b) => (b.totalFraction > a.totalFraction ? b : a), results[0]);
    const totalPayouts = sum * sumInsured;
    const totalPremiums = premium * n;
    return {
      years: n,
      burnFraction: burn,
      rate: rate,
      premium: premium,
      paidYears: paid.length,
      returnPeriodYears: paid.length ? n / paid.length : null,
      avgPayoutWhenPaid: paid.length ? (paid.reduce((a, r) => a + r.totalFraction, 0) / paid.length) * sumInsured : 0,
      worstYear: worst.year,
      worstPayout: worst.totalFraction * sumInsured,
      totalPremiums: totalPremiums,
      totalPayouts: totalPayouts,
      lossRatio: totalPremiums > 0 ? totalPayouts / totalPremiums : 0
    };
  }

  /**
   * Premium rate for every planting week from 1 March to 30 September, so a farmer can see
   * how much timing matters. Uses the same back-test and pricing as the main quote.
   */
  // Descriptive statistics of season rainfall and crop water need across the back-test seasons.
  function seasonClimate(results) {
    const n = results.length;
    if (!n) return null;
    const rain = results.map((r) => r.seasonRainMm), need = results.map((r) => r.seasonEtcMm);
    const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
    const sd = (a) => { const m = mean(a); return Math.sqrt(a.reduce((x, y) => x + (y - m) * (y - m), 0) / (a.length - 1 || 1)); };
    let dry = results[0], wet = results[0];
    results.forEach((r) => { if (r.seasonRainMm < dry.seasonRainMm) dry = r; if (r.seasonRainMm > wet.seasonRainMm) wet = r; });
    const mr = mean(rain), mn = mean(need), sr = n > 1 ? sd(rain) : 0;
    return { years: n, meanRainMm: mr, sdRainMm: sr, cvRain: mr > 0 ? sr / mr : 0, meanNeedMm: mn,
      rainToNeed: mn > 0 ? mr / mn : 0, driestYear: dry.year, driestRainMm: dry.seasonRainMm, wettestYear: wet.year, wettestRainMm: wet.seasonRainMm };
  }

  // Great-circle distance in km between two points.
  function haversineKm(lat1, lon1, lat2, lon2) {
    const rad = Math.PI / 180, dLat = (lat2 - lat1) * rad, dLon = (lon2 - lon1) * rad;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2;
    return 6371 * 2 * Math.asin(Math.sqrt(a));
  }

  // Validation helpers: compare model yield ratios with recorded yields after removing the yield trend.
  function detrendRatio(points) { // points: [{year, value}] -> [{year, ratio}] actual / linear-trend value
    const n = points.length;
    if (n < 3) return [];
    const mx = points.reduce((a, p) => a + p.year, 0) / n, my = points.reduce((a, p) => a + p.value, 0) / n;
    let sxy = 0, sxx = 0;
    points.forEach((p) => { sxy += (p.year - mx) * (p.value - my); sxx += (p.year - mx) * (p.year - mx); });
    const slope = sxx ? sxy / sxx : 0;
    return points.map((p) => ({ year: p.year, ratio: p.value / (my + slope * (p.year - mx)) }));
  }
  function pearson(a, b) {
    const n = a.length;
    if (n < 3) return null;
    const ma = a.reduce((x, y) => x + y, 0) / n, mb = b.reduce((x, y) => x + y, 0) / n;
    let sab = 0, saa = 0, sbb = 0;
    for (let i = 0; i < n; i++) { sab += (a[i] - ma) * (b[i] - mb); saa += (a[i] - ma) ** 2; sbb += (b[i] - mb) ** 2; }
    return saa && sbb ? sab / Math.sqrt(saa * sbb) : null;
  }

  function plantingSensitivity(series, cropKey, soilKey, opts) {
    opts = opts || {};
    const terms = opts.terms || DEFAULT_TERMS;
    const stepDays = opts.stepDays || 7;
    const out = [];
    for (let d = '2001-03-01'; d <= '2001-09-30'; d = addDays(d, stepDays)) {
      const md = d.slice(5);
      const res = backtest(series, cropKey, soilKey, md, { today: opts.today, years: opts.years || 30, terms: terms });
      if (res.length < 10) continue;
      const q = price(res, 1, terms);
      out.push({ monthDay: md, rate: q.rate, burn: q.burnFraction, paidYears: q.paidYears, years: q.years });
    }
    return out;
  }

  return {
    plantingSensitivity: plantingSensitivity, seasonClimate: seasonClimate, detrendRatio: detrendRatio, pearson: pearson, haversineKm: haversineKm,
    CROPS: CROPS, SOILS: SOILS, DEFAULT_TERMS: DEFAULT_TERMS,
    addDays: addDays, todayISO: todayISO, cropLengthDays: cropLengthDays,
    kcCurve: kcCurve, stepWaterBalance: stepWaterBalance,
    yieldFromStages: yieldFromStages, payoutFromLoss: payoutFromLoss,
    seriesFromOpenMeteo: seriesFromOpenMeteo,
    evaluateSeason: evaluateSeason, backtest: backtest, price: price
  };
}));
