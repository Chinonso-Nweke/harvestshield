(function () {
  'use strict';

  const L = window.HarvestLogic;
  const YEARS = 30;
  const T = L.DEFAULT_TERMS;

  // Approximate town-centre coordinates for instant suggestions. The weather grid is about 10 km wide,
  // so small differences do not matter; the grid point actually used is shown after each run.
  const PLACES = [
    ['Enugu', 'Enugu State', 6.4584, 7.5464], ['Nsukka', 'Enugu State', 6.8567, 7.3958],
    ['Abakaliki', 'Ebonyi State', 6.3249, 8.1137], ['Awka', 'Anambra State', 6.2107, 7.0719],
    ['Onitsha', 'Anambra State', 6.1498, 6.7857], ['Owerri', 'Imo State', 5.4836, 7.0333],
    ['Umuahia', 'Abia State', 5.525, 7.4944], ['Aba', 'Abia State', 5.1066, 7.3667],
    ['Port Harcourt', 'Rivers State', 4.8156, 7.0498], ['Uyo', 'Akwa Ibom State', 5.0377, 7.9128],
    ['Calabar', 'Cross River State', 4.9757, 8.3417], ['Benin City', 'Edo State', 6.335, 5.6037],
    ['Asaba', 'Delta State', 6.1986, 6.734], ['Warri', 'Delta State', 5.516, 5.75],
    ['Lagos', 'Lagos State', 6.5244, 3.3792], ['Abeokuta', 'Ogun State', 7.1475, 3.3619],
    ['Ibadan', 'Oyo State', 7.3775, 3.947], ['Ogbomosho', 'Oyo State', 8.1337, 4.24],
    ['Osogbo', 'Osun State', 7.7827, 4.5418], ['Akure', 'Ondo State', 7.2571, 5.1931],
    ['Ado-Ekiti', 'Ekiti State', 7.621, 5.2214], ['Ilorin', 'Kwara State', 8.4966, 4.5421],
    ['Lokoja', 'Kogi State', 7.8023, 6.7333], ['Makurdi', 'Benue State', 7.7337, 8.5214],
    ['Otukpo', 'Benue State', 7.1905, 8.13], ['Lafia', 'Nasarawa State', 8.4939, 8.5153],
    ['Jos', 'Plateau State', 9.8965, 8.8583], ['Abuja', 'Federal Capital Territory', 9.0765, 7.3986],
    ['Minna', 'Niger State', 9.6139, 6.5569], ['Jalingo', 'Taraba State', 8.8833, 11.3667],
    ['Yola', 'Adamawa State', 9.2035, 12.4954], ['Bauchi', 'Bauchi State', 10.3158, 9.8442],
    ['Kaduna', 'Kaduna State', 10.5105, 7.4165], ['Zaria', 'Kaduna State', 11.0855, 7.7199],
    ['Kano', 'Kano State', 12.0022, 8.5919], ['Katsina', 'Katsina State', 12.9908, 7.6018],
    ['Sokoto', 'Sokoto State', 13.0059, 5.2476], ['Maiduguri', 'Borno State', 11.8311, 13.151],
    ['Gusau', 'Zamfara State', 12.1628, 6.6614], ['Birnin Kebbi', 'Kebbi State', 12.4539, 4.1975],
    ['Dutse', 'Jigawa State', 11.7561, 9.3389], ['Hadejia', 'Jigawa State', 12.45, 10.04],
    ['Funtua', 'Katsina State', 11.5167, 7.3167], ['Kachia', 'Kaduna State', 9.8667, 7.95],
    ['Damaturu', 'Yobe State', 11.747, 11.9608], ['Gombe', 'Gombe State', 10.2897, 11.1673],
    ['Azare', 'Bauchi State', 11.6769, 10.1964], ['Mubi', 'Adamawa State', 10.2667, 13.2667],
    ['Bida', 'Niger State', 9.0833, 6.0167], ['Kontagora', 'Niger State', 10.4, 5.4667],
    ['Keffi', 'Nasarawa State', 8.85, 7.8667], ['Okene', 'Kogi State', 7.55, 6.2333],
    ['Gboko', 'Benue State', 7.3239, 9.0042], ['Wukari', 'Taraba State', 7.85, 9.7833],
    ['Saki', 'Oyo State', 8.6667, 3.4], ['Oyo', 'Oyo State', 7.85, 3.9333],
    ['Iseyin', 'Oyo State', 7.9667, 3.6], ['Ijebu-Ode', 'Ogun State', 6.82, 3.9167],
    ['Ile-Ife', 'Osun State', 7.4667, 4.5667], ['Ondo', 'Ondo State', 7.1, 4.8333],
    ['Ekpoma', 'Edo State', 6.75, 6.1333], ['Ikom', 'Cross River State', 5.9667, 8.7167],
    ['Ogoja', 'Cross River State', 6.65, 8.8], ['Afikpo', 'Ebonyi State', 5.89, 7.935]
  ].map((a) => ({ name: a[0], admin: a[1], lat: a[2], lon: a[3] }));
  const ZONES = {
    'South East': ['Enugu', 'Nsukka', 'Abakaliki', 'Awka', 'Onitsha', 'Owerri', 'Umuahia', 'Aba', 'Afikpo'],
    'South South': ['Port Harcourt', 'Uyo', 'Calabar', 'Benin City', 'Asaba', 'Warri', 'Ekpoma', 'Ikom', 'Ogoja'],
    'South West': ['Lagos', 'Abeokuta', 'Ibadan', 'Ogbomosho', 'Osogbo', 'Akure', 'Ado-Ekiti', 'Oyo', 'Iseyin', 'Saki', 'Ijebu-Ode', 'Ile-Ife', 'Ondo'],
    'North Central and Middle Belt': ['Ilorin', 'Lokoja', 'Makurdi', 'Otukpo', 'Lafia', 'Jos', 'Abuja', 'Minna', 'Bida', 'Kontagora', 'Keffi', 'Okene', 'Gboko'],
    'North East': ['Jalingo', 'Yola', 'Bauchi', 'Maiduguri', 'Wukari', 'Damaturu', 'Gombe', 'Azare', 'Mubi'],
    'North West': ['Kaduna', 'Zaria', 'Kano', 'Katsina', 'Sokoto', 'Gusau', 'Birnin Kebbi', 'Dutse', 'Hadejia', 'Funtua', 'Kachia']
  };
  PLACES.forEach((p) => { p.zone = Object.keys(ZONES).find((z) => ZONES[z].indexOf(p.name) >= 0); });
  const MONTHS = ['March', 'April', 'May', 'June', 'July', 'August', 'September'];
  const DAYS_IN_MONTH = { '03': 31, '04': 30, '05': 31, '06': 30, '07': 31, '08': 31, '09': 30 };

  const $ = (sel) => document.querySelector(sel);
  const els = {
    form: $('#form'), locSelect: $('#loc-select'), searchBox: $('#search-box'), loc: $('#loc'), list: $('#loc-list'),
    crop: $('#crop'), soil: $('#soil'), month: $('#plant-month'), day: $('#plant-day'),
    area: $('#area'), perHa: $('#per-ha'), run: $('#run'), status: $('#status'), results: $('#results')
  };

  const state = { loc: null, series: null, seriesKey: null, seriesDay: null, plantingTouched: false, view: null, selectedYear: null };

  // ---------- helpers ----------
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const naira = (n) => '₦' + Math.round(n).toLocaleString('en-NG');
  const pct = (f, d) => (f * 100).toFixed(d || 0) + '%';
  const pctTick = (f) => parseFloat((f * 100).toFixed(1)) + '%';
  const mm = (x) => (Number.isInteger(x) ? String(x) : x.toFixed(1)) + ' mm';
  const fmtDate = (iso) => new Date(iso + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
  const labelOf = (loc) => (loc.admin ? loc.name + ', ' + loc.admin : loc.name);
  const reducedMotion = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function setStatus(msg, isError) {
    els.status.textContent = msg || '';
    els.status.classList.toggle('error', !!isError);
  }

  // ---------- form setup ----------
  Object.keys(L.CROPS).forEach((k) => {
    els.crop.insertAdjacentHTML('beforeend', '<option value="' + k + '">' + esc(L.CROPS[k].label) + '</option>');
  });
  Object.keys(L.SOILS).forEach((k) => {
    els.soil.insertAdjacentHTML('beforeend', '<option value="' + k + '">' + esc(L.SOILS[k].label) + '</option>');
  });
  MONTHS.forEach((name, i) => {
    const v = String(i + 3).padStart(2, '0');
    els.month.insertAdjacentHTML('beforeend', '<option value="' + v + '">' + name + '</option>');
  });
  els.month.value = '04';

  // Hero graphic: yield sensitivity (FAO Ky) by growth stage; column width is stage length.
  function renderHeroArt(cropKey) {
    const crop = L.CROPS[cropKey], svg = $('#hero-art'), cap = $('#hero-cap');
    if (!crop || !svg) return;
    const W = 520, H = 250, m = { l: 6, r: 6, t: 36, b: 58 }, gap = 6;
    const total = L.cropLengthDays(cropKey);
    const iw = W - m.l - m.r - gap * (crop.stages.length - 1), ih = H - m.t - m.b, maxKy = 1.4;
    let x = m.l, out = '';
    crop.stages.forEach((st, k) => {
      const w = iw * st.days / total, h = (st.ky / maxKy) * ih, cx = x + w / 2;
      out += '<rect class="hs s' + k + '" x="' + x.toFixed(1) + '" y="' + (m.t + ih - h).toFixed(1) + '" width="' + w.toFixed(1) + '" height="' + h.toFixed(1) + '" rx="3"/>' +
        '<text class="hv" x="' + cx.toFixed(1) + '" y="' + (m.t + ih - h - 9).toFixed(1) + '" text-anchor="middle">' + st.ky.toFixed(2) + '</text>' +
        '<text class="hn" x="' + cx.toFixed(1) + '" y="' + (H - 32) + '" text-anchor="middle">' + esc(st.name.split(' (')[0]) + '</text>' +
        '<text class="hd" x="' + cx.toFixed(1) + '" y="' + (H - 14) + '" text-anchor="middle">' + st.days + ' days</text>';
      x += w + gap;
    });
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    svg.innerHTML = out;
    svg.setAttribute('aria-label', crop.label + ': yield sensitivity to water stress by growth stage');
    cap.textContent = crop.label + ': how much a water shortage in each growth stage costs yield (FAO factor Ky, taller means more). Column width is stage length.';
  }
  els.crop.addEventListener('change', () => renderHeroArt(els.crop.value));
  renderHeroArt(els.crop.value);
  Object.keys(ZONES).forEach((zone) => {
    const opts = PLACES.map((p, i) => [p, i]).filter((x) => x[0].zone === zone)
      .map((x) => '<option value="' + x[1] + '">' + esc(x[0].name) + ', ' + esc(x[0].admin) + '</option>').join('');
    els.locSelect.insertAdjacentHTML('beforeend', '<optgroup label="' + esc(zone) + '">' + opts + '</optgroup>');
  });
  els.locSelect.insertAdjacentHTML('beforeend', '<option value="other">Another town (search)…</option>');

  // Starting suggestion only: the farmer should enter the date they actually plant.
  function defaultPlanting(lat) {
    if (lat < 8) return { m: '04', d: 15 };
    if (lat < 10) return { m: '05', d: 15 };
    return { m: '06', d: 15 };
  }

  function setLocation(loc) {
    state.loc = loc;
    els.loc.value = labelOf(loc);
    hideList();
    if (!state.plantingTouched) {
      const p = defaultPlanting(loc.lat);
      els.month.value = p.m;
      els.day.value = p.d;
    }
    const idx = PLACES.findIndex((p) => p.lat === loc.lat && p.lon === loc.lon);
    els.locSelect.value = idx >= 0 ? String(idx) : 'other';
    els.searchBox.hidden = idx >= 0;
    setStatus('');
  }

  els.locSelect.addEventListener('change', () => {
    const v = els.locSelect.value;
    if (v === 'other') {
      state.loc = null;
      els.searchBox.hidden = false;
      els.loc.value = '';
      hideList();
      els.loc.focus();
      setStatus('');
    } else if (v === '') {
      state.loc = null;
      els.searchBox.hidden = true;
    } else {
      setLocation(PLACES[Number(v)]);
    }
  });
  els.month.addEventListener('change', () => { state.plantingTouched = true; });
  els.day.addEventListener('input', () => { state.plantingTouched = true; });

  // ---------- place search (Open-Meteo geocoding, Nigeria only) ----------
  let searchTimer = null;
  let searchToken = 0;

  function hideList() {
    els.list.hidden = true;
    els.list.innerHTML = '';
    els.loc.setAttribute('aria-expanded', 'false');
  }
  function showList(items, note) {
    let html = items.map((p, i) =>
      '<li role="option"><button type="button" data-i="' + i + '">' + esc(p.name) +
      (p.admin ? '<small>' + esc(p.admin) + '</small>' : '') + '</button></li>').join('');
    if (note) html += '<li class="none">' + esc(note) + '</li>';
    if (!html) html = '<li class="none">No match in Nigeria. Try a nearby town.</li>';
    els.list.innerHTML = html;
    els.list._items = items;
    els.list.hidden = false;
    els.loc.setAttribute('aria-expanded', 'true');
  }

  function localMatches(q) {
    const t = q.toLowerCase();
    return PLACES.filter((p) => p.name.toLowerCase().includes(t)).slice(0, 5);
  }
  const sameSpot = (a, b) => a.name.toLowerCase() === b.name.toLowerCase() || (Math.abs(a.lat - b.lat) < 0.1 && Math.abs(a.lon - b.lon) < 0.1);

  async function fetchGeocode(q, extra) {
    const url = 'https://geocoding-api.open-meteo.com/v1/search?name=' + encodeURIComponent(q) + '&language=en&format=json' + extra;
    const res = await fetch(url);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const json = await res.json();
    return (json.results || []).filter((r) => r.country_code === 'NG')
      .map((r) => ({ name: r.name, admin: r.admin1 || '', lat: r.latitude, lon: r.longitude }));
  }

  async function searchPlaces(q) {
    const token = ++searchToken;
    const local = localMatches(q);
    try {
      let found = await fetchGeocode(q, '&count=8&countryCode=NG');
      if (!found.length) found = await fetchGeocode(q, '&count=30'); // retry without the country filter
      if (token !== searchToken) return;
      showList(local.concat(found.filter((f) => !local.some((l) => sameSpot(l, f)))).slice(0, 8));
    } catch (err) {
      if (token !== searchToken) return;
      showList(local, local.length ? '' : 'Online place search failed (' + err.message + '). Pick a town from the list above or try again.');
    }
  }

  els.loc.addEventListener('input', () => {
    state.loc = null;
    clearTimeout(searchTimer);
    const q = els.loc.value.trim();
    if (q.length < 2) { searchToken++; hideList(); return; }
    const local = localMatches(q);
    if (local.length) showList(local); else showList([], 'Searching…');
    searchTimer = setTimeout(() => searchPlaces(q), 300);
  });
  els.list.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-i]');
    if (b) setLocation(els.list._items[Number(b.dataset.i)]);
  });
  els.loc.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') hideList();
    if (e.key === 'Enter' && !els.list.hidden && els.list._items && els.list._items.length) { e.preventDefault(); setLocation(els.list._items[0]); }
    if (e.key === 'ArrowDown') {
      const first = els.list.querySelector('button');
      if (first) { e.preventDefault(); first.focus(); }
    }
  });
  els.list.addEventListener('keydown', (e) => {
    const btns = Array.from(els.list.querySelectorAll('button'));
    const i = btns.indexOf(document.activeElement);
    if (e.key === 'ArrowDown' && i < btns.length - 1) { e.preventDefault(); btns[i + 1].focus(); }
    if (e.key === 'ArrowUp') { e.preventDefault(); (i > 0 ? btns[i - 1] : els.loc).focus(); }
    if (e.key === 'Escape') { hideList(); els.loc.focus(); }
  });
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.combo')) hideList();
  });

  // ---------- weather data: daily rain and FAO reference evapotranspiration ----------
  async function loadSeries(loc, today) {
    const key = loc.lat.toFixed(3) + ',' + loc.lon.toFixed(3);
    if (state.series && state.seriesKey === key && state.seriesDay === today) return state.series;
    const start = (Number(today.slice(0, 4)) - YEARS - 2) + '-01-01';
    const end = L.addDays(today, -T.dataLagDays);
    const url = 'https://archive-api.open-meteo.com/v1/archive?latitude=' + loc.lat + '&longitude=' + loc.lon +
      '&start_date=' + start + '&end_date=' + end +
      '&daily=precipitation_sum,et0_fao_evapotranspiration&timezone=Africa%2FLagos';
    const res = await fetch(url);
    if (!res.ok) { const e = new Error('archive ' + res.status); e.status = res.status; throw e; }
    const json = await res.json();
    if (json && json.error) { const e = new Error(json.reason || 'archive error'); e.status = 429; throw e; }
    if (!json.daily || !json.daily.et0_fao_evapotranspiration) throw Object.assign(new Error('no ET0'), { code: 'NOET0' });
    const series = L.seriesFromOpenMeteo(json);
    if (!series.rain.size) throw new Error('empty weather response');
    state.series = series; state.seriesKey = key; state.seriesDay = today;
    return series;
  }

  // ---------- run ----------
  els.form.addEventListener('submit', (e) => { e.preventDefault(); run(); });

  async function run() {
    if (!state.loc) {
      setStatus('Choose a location first, from the Location list.', true);
      els.locSelect.focus();
      return;
    }
    const area = parseFloat(els.area.value);
    const perHa = parseFloat(els.perHa.value);
    if (!(area > 0)) { setStatus('Enter a farm size above 0 hectares.', true); els.area.focus(); return; }
    if (!(perHa > 0)) { setStatus('Enter the cover per hectare in naira.', true); els.perHa.focus(); return; }
    const month = els.month.value;
    const dayNum = parseInt(els.day.value, 10);
    if (!(dayNum >= 1 && dayNum <= DAYS_IN_MONTH[month])) {
      setStatus('Pick a planting day between 1 and ' + DAYS_IN_MONTH[month] + ' for ' + MONTHS[Number(month) - 3] + '.', true);
      els.day.focus();
      return;
    }
    const monthDay = month + '-' + String(dayNum).padStart(2, '0');
    const cropKey = els.crop.value;
    const soilKey = els.soil.value;
    const loc = state.loc;

    els.run.disabled = true;
    setStatus('Fetching 30 years of weather for ' + loc.name + '…');
    try {
      const today = L.todayISO();
      const series = await loadSeries(loc, today);
      const results = L.backtest(series, cropKey, soilKey, monthDay, { today: today, years: YEARS });
      if (results.length < 10) throw Object.assign(new Error('too few seasons'), { code: 'FEW' });
      const sumInsured = area * perHa;
      const quote = L.price(results, sumInsured);
      const sens = L.plantingSensitivity(series, cropKey, soilKey, { today: today, years: YEARS });
      state.view = { loc, cropKey, soilKey, monthDay, area, perHa, sumInsured, results, quote, series, sens };
      const worst = quote.worstPayout > 0 ? quote.worstYear : results.reduce((a, b) => (b.lossFraction > a.lossFraction ? b : a)).year;
      state.selectedYear = worst;
      renderAll();
      setStatus('');
      if (window.innerWidth < 960) {
        els.results.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'start' });
      }
      els.results.focus({ preventScroll: true });
    } catch (err) {
      if (err.code === 'FEW') {
        setStatus('Not enough complete weather records for this spot and planting date. Try a nearby town.', true);
      } else if (err.code === 'NOET0') {
        setStatus('The weather service did not return evapotranspiration for this spot. Try again later.', true);
      } else if (err.status === 429) {
        setStatus('The free weather service is busy. Wait a minute, then run the simulation again.', true);
      } else {
        setStatus('Could not load weather data. Check your connection and run the simulation again.', true);
      }
    } finally {
      els.run.disabled = false;
    }
  }

  // ---------- rendering ----------
  function renderAll() {
    const v = state.view;
    const crop = L.CROPS[v.cropKey];
    const soil = L.SOILS[v.soilKey];
    const q = v.quote;
    const plantedLabel = fmtDate(new Date().getUTCFullYear() + '-' + v.monthDay);
    const cycle = L.cropLengthDays(v.cropKey);
    const first = v.results[0].year, last = v.results[v.results.length - 1].year;
    const yearOptions = v.results.slice().reverse().map((r) =>
      '<option value="' + r.year + '"' + (r.year === state.selectedYear ? ' selected' : '') + '>' + r.year +
      (r.totalFraction > 0 ? ' (paid)' : '') + '</option>').join('');
    const gridKm = v.series.lat != null ? L.haversineKm(v.loc.lat, v.loc.lon, v.series.lat, v.series.lon) : 0;
    const grid = v.series.lat != null
      ? 'Weather grid point ' + v.series.lat.toFixed(2) + '°N, ' + v.series.lon.toFixed(2) + '°E' + (v.series.elevation != null ? ', ' + Math.round(v.series.elevation) + ' m elevation' : '') +
        ', ' + gridKm.toFixed(1) + ' km from ' + v.loc.name + (gridKm > 25 ? ' (more than 25 km: check the location)' : '') + '. '
      : '';

    els.results.innerHTML =
      '<div class="result-head">' +
        '<h2>' + esc(crop.label) + ' near ' + esc(v.loc.name) + '</h2>' +
        '<p>Planted around ' + plantedLabel + ', ' + cycle + ' days to harvest, on ' + esc(soil.label.toLowerCase()) + ' soil. ' + v.area + ' ha insured for ' + naira(v.sumInsured) + '.</p>' +
      '</div>' +

      '<div class="figures">' +
        fig('Yearly premium', naira(q.premium), pct(q.burnFraction, 1) + ' average payout plus ' + pct(T.loading) + ' assumed margin', 'premium') +
        fig('Seasons paid', q.paidYears + ' of ' + q.years,
          q.paidYears ? 'About 1 year in ' + (Math.round(q.returnPeriodYears * 10) / 10) + '. Average payout ' + naira(q.avgPayoutWhenPaid) + '.' : 'No payouts since ' + first + '.', 'paid') +
        fig('Worst season', naira(q.worstPayout), q.worstPayout > 0 ? q.worstYear + ' season' : 'No season lost enough yield to pay', 'worst') +
        fig('Paid out in ' + q.years + ' seasons', naira(q.totalPayouts), 'against ' + naira(q.totalPremiums) + ' of premiums (' + pct(q.lossRatio) + ' returned)', 'total') +
      '</div>' +

      '<div class="actions"><button type="button" class="btn-quiet" id="csv">Download season data (CSV)</button><button type="button" class="btn-quiet" id="print">Print report</button><span class="grid-note">' + esc(grid) + 'Every figure above can be rebuilt from this file.</span></div>' +

      '<section class="block" aria-labelledby="h-ledger">' +
        '<h3 id="h-ledger">What the policy would have paid, ' + first + ' to ' + last + '</h3>' +
        '<p class="sub">Each bar is one season, as a share of your ' + naira(v.sumInsured) + ' cover. Select a season to see the water behind it.</p>' +
        '<div class="chart-wrap">' + yearlyChart(v) + '</div>' +
        '<div class="legend"><span><i class="sw paid"></i>Payout</span><span><i class="sw none"></i>No payout</span><span><i class="sw prem"></i>Yearly premium rate</span></div>' +
      '</section>' +

      climateSection(v) +

      timingSection(v) +

      '<section class="block" aria-labelledby="h-season">' +
        '<h3 id="h-season">Inside a single season</h3>' +
        '<div class="year-picker"><label for="year-sel">Season</label><select id="year-sel">' + yearOptions + '</select></div>' +
        '<div id="detail"></div>' +
      '</section>' +

      '<section class="block" aria-labelledby="h-terms">' +
        '<h3 id="h-terms">How this policy pays</h3>' +
        '<ul class="how">' +
          '<li>For every day of the season, the crop\'s water need is the weather station\'s reference evapotranspiration times the crop coefficient for that growth stage.</li>' +
          '<li>A daily soil water balance tracks how much of that need the rain actually met. When the root zone dries past the point where the crop starts to struggle, the crop gets less than it needs.</li>' +
          '<li>The share of need met in each stage, weighted by how sensitive that stage is to water, gives an estimated yield loss. Flowering counts most.</li>' +
          '<li>The policy pays nothing below ' + pct(T.strikeLoss) + ' estimated yield loss, rising evenly to the full cover at ' + pct(T.exitLoss) + '. There is no claim form and no loss adjuster.</li>' +
          '<li>The premium is the average payout over these ' + q.years + ' seasons plus a ' + pct(T.loading) + ' margin for costs and risk.</li>' +
        '</ul>' +
      '</section>' +

      '<section class="block" aria-labelledby="h-src">' +
        '<h3 id="h-src">Where every number comes from</h3>' +
        '<p class="sub">Crop and soil values are published FAO figures. The policy terms are our design choices, not agronomy.</p>' +
        sourcesTable(crop) +
        '<div class="table-scroll"><table><thead><tr><th>Policy term (design choice)</th><th class="num">Value</th></tr></thead><tbody>' +
          '<tr><td>No payout below this estimated yield loss</td><td class="num">' + pct(T.strikeLoss) + '</td></tr>' +
          '<tr><td>Full payout at or above this estimated yield loss</td><td class="num">' + pct(T.exitLoss) + '</td></tr>' +
          '<tr><td>Margin added to the average payout (an assumption)</td><td class="num">' + pct(T.loading) + '</td></tr>' +
          '<tr><td>Days simulated before planting so the soil starts realistic</td><td class="num">' + T.spinUpDays + '</td></tr>' +
        '</tbody></table></div>' +
      '</section>' +

      '<aside class="note">' +
        '<h3>Where this simulation falls short</h3>' +
        '<p><strong>Basis risk.</strong> The weather data is a gridded estimate of roughly 10 km, so a farm can have a drought while the data shows rain. Real products reduce this with local rain gauges and yield records.</p>' +
        '<p><strong>No yield validation.</strong> The estimated yield loss comes from FAO water-stress factors, not from Nigerian yield records, so it will not match a real harvest exactly.</p>' +
        '<p><strong>Simplifications.</strong> Runoff, waterlogging, pests, heat and planting delays are not modelled. Root depth is held at 1.0 m all season, and soil is one of three FAO example types.</p>' +
        '<p><strong>Premium.</strong> The margin is an assumption, so treat the premium as an estimate of risk, not a quote.</p>' +
      '</aside>';

    renderDetail();
    $('#csv').addEventListener('click', downloadCsv);
    $('#print').addEventListener('click', () => window.print());
  }

  function climateSection(v) {
    const c = L.seasonClimate(v.results);
    if (!c) return '';
    const mm = (x) => Math.round(x) + ' mm';
    return '<section class="block" aria-labelledby="h-clim">' +
      '<h3 id="h-clim">Season rainfall against crop water need</h3>' +
      '<p class="sub">Rain and crop water need from planting to harvest, across the same ' + c.years + ' seasons.</p>' +
      '<div class="table-scroll"><table><tbody>' +
        '<tr><td>Average rain in the season</td><td class="num">' + mm(c.meanRainMm) + '</td></tr>' +
        '<tr><td>Year-to-year spread (standard deviation, coefficient of variation)</td><td class="num">' + mm(c.sdRainMm) + ', ' + pct(c.cvRain) + '</td></tr>' +
        '<tr><td>Average crop water need (ETc)</td><td class="num">' + mm(c.meanNeedMm) + '</td></tr>' +
        '<tr><td>Average rain as a share of water need</td><td class="num">' + pct(c.rainToNeed) + '</td></tr>' +
        '<tr><td>Driest season</td><td class="num">' + c.driestYear + ': ' + mm(c.driestRainMm) + '</td></tr>' +
        '<tr><td>Wettest season</td><td class="num">' + c.wettestYear + ': ' + mm(c.wettestRainMm) + '</td></tr>' +
      '</tbody></table></div>' +
      '<p class="sub">Season totals do not show timing. A season with enough rain can still pay out if the rain misses a sensitive stage.</p>' +
    '</section>';
  }

  function fig(label, value, sub, accent) {
    return '<div class="fig' + (accent ? ' ' + accent : '') + '"><div class="fig-label">' + esc(label) + '</div>' +
      '<div class="fig-value">' + esc(value) + '</div><div class="fig-sub">' + esc(sub) + '</div></div>';
  }

  function sourcesTable(crop) {
    const rows = crop.sources.map((s) =>
      '<tr><td>' + esc(s.what) + '</td><td><a href="' + esc(s.url) + '" rel="noopener">' + esc(s.where) + '</a></td></tr>').join('');
    return '<div class="table-scroll"><table><thead><tr><th>Value used</th><th>Source</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
  }

  function yearlyChart(v) {
    const results = v.results, quote = v.quote;
    const W = 760, H = 280, m = { l: 48, r: 14, t: 16, b: 34 };
    const iw = W - m.l - m.r, ih = H - m.t - m.b;
    const maxF = Math.max(quote.rate, Math.max.apply(null, results.map((r) => r.totalFraction)));
    const ymax = Math.min(1, Math.max(0.2, Math.ceil(maxF * 1.15 * 10) / 10));
    const y = (f) => m.t + ih - (f / ymax) * ih;
    const n = results.length, step = iw / n, bw = Math.max(5, step * 0.66);
    let s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="group" aria-label="Payout in each of the last ' + n + ' seasons as a share of cover">';
    for (let i = 0; i <= 4; i++) {
      const f = ymax * i / 4, yy = y(f);
      s += '<line class="grid" x1="' + m.l + '" x2="' + (W - m.r) + '" y1="' + yy + '" y2="' + yy + '"/>' +
        '<text x="' + (m.l - 8) + '" y="' + (yy + 4) + '" text-anchor="end">' + pctTick(f) + '</text>';
    }
    results.forEach((r, i) => {
      const f = r.totalFraction;
      const cx = m.l + i * step;
      const x = cx + (step - bw) / 2;
      const h = f > 0 ? Math.max(3, (f / ymax) * ih) : 2;
      const label = r.year + ': ' + (f > 0 ? 'payout ' + pct(f, 1) + ' of cover, ' + naira(f * v.sumInsured) : 'no payout') + ', estimated yield loss ' + pct(r.lossFraction);
      s += '<g class="yr' + (r.year === state.selectedYear ? ' selected' : '') + '" data-year="' + r.year + '" tabindex="0" role="button" aria-label="' + label + '">' +
        '<title>' + label + '</title>' +
        '<rect class="hit" x="' + cx + '" y="' + m.t + '" width="' + step + '" height="' + ih + '"/>' +
        '<rect class="bar rise' + (f > 0 ? ' paid' : '') + '" style="--i:' + i + '" x="' + x + '" y="' + (m.t + ih - h) + '" width="' + bw + '" height="' + h + '"/>';
      if (r.year % 5 === 0) {
        s += '<text class="year-tick" x="' + (cx + step / 2) + '" y="' + (H - 12) + '" text-anchor="middle">' + r.year + '</text>';
      }
      s += '</g>';
    });
    s += '<line class="axis-line" x1="' + m.l + '" x2="' + (W - m.r) + '" y1="' + (m.t + ih) + '" y2="' + (m.t + ih) + '"/>';
    s += '<line class="prem" x1="' + m.l + '" x2="' + (W - m.r) + '" y1="' + y(quote.rate) + '" y2="' + y(quote.rate) + '"/>' +
      '<text class="prem-label" x="' + (W - m.r - 4) + '" y="' + (y(quote.rate) - 6) + '" text-anchor="end">Premium ' + pct(quote.rate, 1) + '</text>';
    return s + '</svg>';
  }

  // ---------- planting date sensitivity ----------
  function nearestWeek(sens, monthDay) {
    const t = Date.parse('2001-' + monthDay);
    return sens.reduce((a, b) => (Math.abs(Date.parse('2001-' + b.monthDay) - t) < Math.abs(Date.parse('2001-' + a.monthDay) - t) ? b : a));
  }

  function timingSection(v) {
    const s = v.sens;
    if (!s || s.length < 3) return '';
    const lo = s.reduce((a, b) => (b.rate < a.rate ? b : a));
    const hi = s.reduce((a, b) => (b.rate > a.rate ? b : a));
    const mine = nearestWeek(s, v.monthDay);
    const day = (e) => fmtDate('2001-' + e.monthDay);
    const line = hi.rate === 0
      ? 'No planting week from March to September would have paid out in these ' + v.quote.years + ' seasons.'
      : 'Planting around ' + day(lo) + ' would have cost ' + pct(lo.rate, 1) + ' of cover a year, and around ' + day(hi) + ' it would have cost ' + pct(hi.rate, 1) + '. Your date, ' + fmtDate('2001-' + v.monthDay) + ', costs ' + pct(v.quote.rate, 1) + '.';
    return '<section class="block" aria-labelledby="h-timing">' +
      '<h3 id="h-timing">How much does the planting date matter?</h3>' +
      '<p class="sub">' + esc(line) + ' Real farmers plant once the rains settle, so read this as the cost of planting too early or too late, not a forecast.</p>' +
      '<div class="chart-wrap">' + timingChart(v, mine) + '</div>' +
      '<div class="legend"><span><i class="sw pb"></i>Yearly premium rate for that planting week</span><span><i class="sw sel"></i>Your planting date</span></div>' +
      '</section>';
  }

  function timingChart(v, mine) {
    const s = v.sens;
    const W = 760, H = 240, m = { l: 48, r: 14, t: 16, b: 34 };
    const iw = W - m.l - m.r, ih = H - m.t - m.b;
    const ymax = Math.max(0.04, Math.ceil(Math.max.apply(null, s.map((e) => e.rate)) * 1.05 / 0.04) * 0.04); // four even gridlines
    const y = (f) => m.t + ih - (f / ymax) * ih;
    const step = iw / s.length, bw = Math.max(6, step * 0.7);
    let out = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Yearly premium rate for each planting week from March to September">';
    for (let i = 0; i <= 4; i++) {
      const f = ymax * i / 4;
      out += '<line class="grid" x1="' + m.l + '" x2="' + (W - m.r) + '" y1="' + y(f) + '" y2="' + y(f) + '"/>' +
        '<text x="' + (m.l - 8) + '" y="' + (y(f) + 4) + '" text-anchor="end">' + pctTick(f) + '</text>';
    }
    s.forEach((e, i) => {
      const x = m.l + i * step + (step - bw) / 2;
      const h = Math.max(e.rate > 0 ? 2 : 1, (e.rate / ymax) * ih);
      const label = 'Planting around ' + fmtDate('2001-' + e.monthDay) + ': premium ' + pct(e.rate, 1) + ' of cover, paid in ' + e.paidYears + ' of ' + e.years + ' seasons';
      out += '<rect class="pbar' + (e === mine ? ' sel' : '') + '" x="' + x + '" y="' + (m.t + ih - h) + '" width="' + bw + '" height="' + h + '"><title>' + label + '</title></rect>';
      if (Number(e.monthDay.slice(3)) <= 7) {
        out += '<text x="' + (m.l + i * step) + '" y="' + (H - 12) + '">' + fmtDate('2001-' + e.monthDay).split(' ')[1] + '</text>';
      }
    });
    out += '<line class="axis-line" x1="' + m.l + '" x2="' + (W - m.r) + '" y1="' + (m.t + ih) + '" y2="' + (m.t + ih) + '"/>';
    return out + '</svg>';
  }

  function seasonChart(ev) {
    const W = 760, H = 240, m = { l: 44, r: 12, t: 34, b: 34 };
    const n = ev.daily.length, step = (W - m.l - m.r) / n, ih = H - m.t - m.b;
    const peak = Math.max(10, Math.max.apply(null, ev.daily.map((d) => Math.max(d.mm || 0, d.etc))));
    const ymax = Math.ceil(peak / 10) * 10;
    const y = (val) => m.t + ih - (val / ymax) * ih;
    let s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Daily rain bars and crop water need line through the season, with growth stages shaded">';
    let idx = 0;
    ev.stages.forEach((st, k) => {
      const x = m.l + idx * step, w = st.days * step;
      s += '<rect class="band s' + k + '" x="' + x + '" y="' + m.t + '" width="' + w + '" height="' + ih + '"/>' +
        '<text class="stage-label" x="' + (x + 6) + '" y="' + (m.t - 12) + '">' + esc(st.name.split(' (')[0]) + '</text>' +
        '<text x="' + (x + 4) + '" y="' + (H - 12) + '">' + fmtDate(st.start) + '</text>';
      idx += st.days;
    });
    [0, 0.5, 1].forEach((t) => {
      const val = ymax * t;
      s += '<line class="grid" x1="' + m.l + '" x2="' + (W - m.r) + '" y1="' + y(val) + '" y2="' + y(val) + '"/>' +
        '<text x="' + (m.l - 6) + '" y="' + (y(val) + 4) + '" text-anchor="end">' + val + '</text>';
    });
    ev.daily.forEach((d, i) => {
      if (!d.mm) return;
      s += '<rect class="day" x="' + (m.l + i * step + 0.5) + '" y="' + y(d.mm) + '" width="' + Math.max(1, step - 1) + '" height="' + ((d.mm / ymax) * ih) + '"><title>' + fmtDate(d.date) + ': ' + d.mm + ' mm rain</title></rect>';
    });
    const pts = ev.daily.map((d, i) => (m.l + (i + 0.5) * step).toFixed(1) + ',' + y(d.etc).toFixed(1)).join(' ');
    s += '<polyline class="etc" points="' + pts + '"/>' +
      '<line class="axis-line" x1="' + m.l + '" x2="' + (W - m.r) + '" y1="' + (m.t + ih) + '" y2="' + (m.t + ih) + '"/>';
    return s + '</svg>';
  }

  function renderDetail() {
    const v = state.view;
    const ev = v.results.find((r) => r.year === state.selectedYear);
    const pay = ev.totalFraction * v.sumInsured;
    const hit = ev.stages.reduce((a, b) => (b.yieldEffect > a.yieldEffect ? b : a));
    let why;
    if (ev.lossFraction < 0.005) {
      why = 'Rain met the crop\'s water needs through every stage, so no yield loss was estimated and nothing was paid.';
    } else if (pay <= 0) {
      why = 'Estimated yield loss was ' + pct(ev.lossFraction, 1) + ', below the ' + pct(T.strikeLoss) + ' level where the policy starts to pay, so nothing was paid.';
    } else {
      why = 'The policy paid because estimated yield loss reached ' + pct(ev.lossFraction, 1) + '. The biggest hit was in the ' + hit.name.split(' (')[0].toLowerCase() + ' stage, where only ' + pct(hit.wrsi) + ' of the water need was met.';
    }

    let rows = '';
    ev.stages.forEach((st, k) => {
      const low = st.wrsi < 0.95;
      rows += '<tr><td><i class="dot s' + k + '"></i>' + esc(st.name) + '</td><td>' + fmtDate(st.start) + ' to ' + fmtDate(st.end) + '</td>' +
        '<td class="num">' + mm(st.rainMm) + '</td><td class="num">' + mm(st.etcMm) + '</td>' +
        '<td><span class="meter' + (low ? ' low' : '') + '" aria-hidden="true"><span style="width:' + Math.round(st.wrsi * 100) + '%"></span></span>' +
        '<span class="' + (low ? 'tag-short' : 'tag-ok') + '">' + pct(st.wrsi) + '</span></td>' +
        '<td class="num pay">' + (st.yieldEffect > 0.0005 ? pct(st.yieldEffect, 1) : '–') + '</td></tr>';
    });
    rows += '<tr class="total"><td colspan="5">Estimated yield loss for the season</td><td class="num">' + pct(ev.lossFraction, 1) + '</td></tr>';
    rows += '<tr class="total"><td colspan="5">Payout (' + (pay > 0 ? pct(ev.totalFraction, 1) + ' of cover' : 'none') + ')</td><td class="num">' + naira(pay) + '</td></tr>';

    $('#detail').innerHTML =
      '<div class="detail-head"><h4>' + ev.year + ': ' + (pay > 0 ? 'paid ' + naira(pay) : 'no payout') + '</h4>' +
      '<p>' + fmtDate(ev.plantingISO) + ' to ' + fmtDate(ev.harvestISO) + ', ' + mm(ev.seasonRainMm) + ' of rain against ' + mm(ev.seasonEtcMm) + ' of crop water need. ' + esc(why) + '</p></div>' +
      '<div class="chart-wrap">' + seasonChart(ev) + '</div>' +
      '<div class="legend"><span><i class="sw rain"></i>Daily rain (mm)</span><span><i class="sw etc"></i>Crop water need (mm per day)</span></div>' +
      '<div class="table-scroll"><table><thead><tr><th>Stage</th><th>Dates</th><th class="num">Rain</th><th class="num">Water need</th><th>Need met</th><th class="num">Yield effect</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
  }

  // ---------- CSV export so every figure can be audited ----------
  function downloadCsv() {
    const v = state.view;
    const head = ['year', 'planting', 'harvest', 'season_rain_mm', 'season_crop_water_need_mm'];
    v.results[0].stages.forEach((s, i) => head.push('stage' + (i + 1) + '_need_met'));
    head.push('estimated_yield_loss', 'payout_share_of_cover', 'payout_naira');
    const lines = [head.join(',')];
    v.results.forEach((r) => {
      const row = [r.year, r.plantingISO, r.harvestISO, r.seasonRainMm, r.seasonEtcMm];
      r.stages.forEach((s) => row.push(s.wrsi.toFixed(3)));
      row.push(r.lossFraction.toFixed(3), r.totalFraction.toFixed(3), Math.round(r.totalFraction * v.sumInsured));
      lines.push(row.join(','));
    });
    const blob = new Blob([lines.join('\n') + '\n'], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'harvestshield-' + v.loc.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + v.cropKey + '.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  // ---------- season selection ----------
  function selectYear(year) {
    state.selectedYear = year;
    document.querySelectorAll('.yr').forEach((g) => g.classList.toggle('selected', Number(g.dataset.year) === year));
    const sel = $('#year-sel');
    if (sel) sel.value = String(year);
    renderDetail();
  }
  els.results.addEventListener('click', (e) => {
    const g = e.target.closest('.yr');
    if (g) selectYear(Number(g.dataset.year));
  });
  els.results.addEventListener('keydown', (e) => {
    const g = e.target.closest('.yr');
    if (g && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); selectYear(Number(g.dataset.year)); }
  });
  els.results.addEventListener('change', (e) => {
    if (e.target.id === 'year-sel') selectYear(Number(e.target.value));
  });
})();
