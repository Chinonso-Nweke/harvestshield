# HarvestShield

An index insurance simulator for Nigerian maize and groundnut farmers, built on FAO crop-water methods.

Pick a location, crop, planting date, soil and farm size. HarvestShield pulls 30 years of daily rainfall and FAO reference evapotranspiration, works out how much of the crop's water need the rain actually met in every growth stage, estimates the yield loss, and shows what a policy would have paid each season and what the cover should cost. No claim forms: the weather data decides the payout.

> Prototype for learning and portfolio use. It is not insurance. Real cover in Nigeria must be issued by a NAICOM-licensed insurer.

## The method

1. **Crop water need.** Daily ETc = Kc x ET0. ET0 is FAO Penman-Monteith evapotranspiration from the weather data; Kc follows the FAO-56 four-stage curve.
2. **Soil water balance.** A daily root-zone balance (FAO-56 chapter 8) tracks depletion. Once depletion passes the crop's threshold, the stress factor Ks falls and the crop gets less than it needs. A 30-day spin-up before planting lets the soil start from realistic conditions.
3. **Water need met per stage** = sum of actual crop evapotranspiration / sum of crop water need.
4. **Yield effect per stage** = Ky x (1 - need met), multiplied across stages (FAO-33). Flowering has the highest Ky (1.30), so a dry flowering period hurts most.
5. **Payout** rises linearly from 0 at 20% estimated yield loss to the full cover at 60%.
6. **Premium** = average payout over the back-test seasons plus a 35% margin.

## Where the numbers come from

Maize and groundnut are the crops with a complete published set (stage lengths, Kc, per-stage Ky, depletion fraction, root depth). Pages are linked in the app next to each value.

| Value | Maize | Groundnut |
| --- | --- | --- |
| Stage lengths (days) | 20 / 35 / 40 / 30, [FAO-56 Table 11](https://www.fao.org/4/x0490e/x0490e0b.htm), Nigeria (humid) | 25 / 35 / 45 / 25, [FAO groundnut page](https://www.fao.org/land-water/databases-and-software/crop-information/groundnut/en/), West Africa |
| Kc initial / mid / late | 0.30 / 1.20 / 0.50, [FAO maize page](https://www.fao.org/land-water/databases-and-software/crop-information/maize/en/) | 0.40 / 1.05 / 0.60, FAO groundnut page |
| Ky by stage | 0.40 / 0.40 / 1.30 / 0.50, FAO maize page | 0.20 / 0.80 / 0.60 / 0.20, FAO groundnut page |
| Depletion fraction p | 0.55, [FAO-56 Table 22](https://www.fao.org/4/x0490e/x0490e0e.htm) | 0.50, FAO-56 Table 22 |
| Root depth used | 1.0 m (range 1.0 to 1.7) | 0.5 m (range 0.5 to 1.0) |
| Soil water 90 / 120 / 170 mm per m | [FAO-56 chapter 8, Example 36](https://www.fao.org/4/x0490e/x0490e0e.htm) | same |
| Daily rain and ET0 | [Open-Meteo Historical Weather API](https://open-meteo.com/en/docs/historical-weather-api) (ERA5 reanalysis, CC BY 4.0) | same |

The Kc values and Ky factors were read from the FAO crop pages in their Chinese (maize) and Spanish (groundnut) versions; the English pages at the links above carry the same tables. Please check them against the links before relying on them.

**Design choices, not agronomy:** the 20% and 60% payout levels, the 35% margin, the 30-day spin-up, and constant root depth through the season. All are in `DEFAULT_TERMS` and `CROPS` in `src/logic.js`.

**Crops left out on purpose.** Cassava and yam, Nigeria's two largest crops, have no published yield-response factors that I could find (yam has no FAO coefficients at all). Soybean's FAO page gives no mid-season Ky, and the sorghum, upland rice and cotton FAO pages could not be read in the build environment. They will be added once every number can be sourced. Adding a crop means adding a sourced entry to `CROPS`.

## For research use

- **Season rainfall against crop water need:** mean, standard deviation and coefficient of variation of season rain, mean ETc, rain as a share of need, and the driest and wettest seasons.
- **Grid distance:** the distance between the chosen town and the weather grid point actually used, with a warning above 25 km.
- **Print report** button and a print stylesheet for including a run in a write-up.
- **CSV export** of every season, so each figure can be rebuilt.

## Check it against real data

```bash
node scripts/verify.mjs                                          # Enugu, maize, 15 April, sandy soil
node scripts/verify.mjs 7.3775 3.947 05-15 silty_clay groundnut  # Ibadan, groundnut, 15 May, clay-rich soil
```

This fetches live Open-Meteo data and prints, per season, rain, crop water need, need met in each stage, estimated yield loss and payout. The web app's **Download season data (CSV)** button exports the same table for whatever you ran.

## What real data showed

Back-test on real Open-Meteo data (run 28 October 2026, 30 seasons 1997 to 2026, sandy soil, premium includes the 35% margin):

| Place, crop, planting date | Seasons paid | Average payout | Premium |
| --- | --- | --- | --- |
| Enugu, maize, 15 April | 1 of 30 | 0.17% | 0.23% |
| Makurdi, maize, 15 May | 5 of 30 | 5.46% | 7.37% |
| Kaduna, maize, 1 June | 1 of 30 | 0.65% | 0.88% |
| Kaduna, groundnut, 1 June | 1 of 30 | 0.70% | 0.95% |

The same dry seasons show up across places (2021 in Makurdi and Kaduna, 2024 in Enugu and Makurdi), and most payouts come from water shortage in the first 20 days after planting. That is why the app includes a planting-date view: the premium depends heavily on when the crop goes in. These results did not correlate with national recorded yields (see Validation result).

## Validate against recorded yields

```bash
node scripts/validate.mjs 7.7337 8.5214 05-15 loamy_sand maize benue_maize.csv
```

`yields.csv` is a header line followed by `year,yield` rows for the same crop and area. The script removes a straight-line trend from the recorded yields, because seeds, fertiliser and area change them over time, then prints the recorded-to-trend ratio next to the model's yield ratio and their Pearson correlation. The check needs at least 8 years that overlap the weather data. State-level series match a point simulation better than national ones. This has not been run against real yields yet.

## Validation result (30 October 2026)

The model's yield ratio was compared with FAOSTAT national maize yields for Nigeria (1996 to 2024, kg/ha) after removing a straight-line trend. 28 years overlap.

| Location, planting date | Pearson correlation |
| --- | --- |
| Makurdi, 15 May | -0.01 |
| Kaduna, 1 June | -0.04 |
| Enugu, 15 April | -0.13 |

**Reading:** no relationship. With 28 years, a correlation would need to be about 0.37 or more to be distinguishable from chance, so the three values are consistent with none. This does not validate the model against national yields. Likely reasons, not tested: the yields are national while the model is one point; the model reports no yield loss in many seasons (16 of 28 at Enugu, 9 of 28 at Makurdi); national yields are also driven by inputs, area, insecurity and floods, none of which are modelled; and the 2022 to 2024 yield values come from an external organisation. The model's worst simulated seasons (for example 2021 at Kaduna and Makurdi, 2024 at Enugu and Makurdi) were not low-yield years in the national series. The next test is state-level yields.

## Run and deploy

No build step.

```bash
npm start     # serve the folder (needs Node)
npm test      # unit tests for the water balance, yield response, payout and pricing
```

To deploy: push the folder to GitHub, import it in Vercel with the **Other** framework preset, no build command.

## Project structure

```
index.html        page shell
styles.css        design
src/logic.js      pure model (no DOM, no network)
src/app.js        UI: search, fetch, charts, tables, CSV export
tests/            unit tests (node:test)
scripts/          real-data verification script
```

## Known limitations

- **Basis risk.** Gridded data (roughly 10 km) can differ from what fell on a specific farm.
- **No yield validation.** The yield loss comes from FAO water-stress factors, not from Nigerian yield records.
- **Place search** suggests towns from a built-in list of 64 towns grouped by geopolitical zone, chosen as regional agricultural and market centres (approximate town-centre coordinates, not a ranking) and from Open-Meteo geocoding. The weather grid point actually used is shown after every run.
- **Not modelled:** runoff, waterlogging, pests, heat stress, and late planting.
- **Reanalysis rainfall** is known to be less accurate than gauge data in parts of West Africa.
- **Planting date** is one fixed day each year; real farmers plant when the rains start. The planting-date view shows how much this matters.

## Next steps

- Validate the estimated loss against state or national maize yield statistics.
- Add cassava, yam, soybean, sorghum and rice once every coefficient can be sourced.
- Compare ERA5 rainfall against CHIRPS satellite rainfall to measure basis risk.
- Let the farmer adjust the payout levels and see the premium change.
- Add a Pidgin or Igbo "explain my policy" toggle.

## Resume line

> Built HarvestShield, an index insurance simulator that applies FAO-56 soil water balance and FAO-33 yield response to 30 years of ERA5 rainfall and evapotranspiration data to estimate maize and groundnut yield loss and price drought cover for Nigerian smallholder farmers (vanilla JS, Open-Meteo API, unit-tested, deployed on Vercel).

## Data included

`data/nigeria_maize_yield_faostat.csv`: Nigeria national maize yield in kg/ha, 1996 to 2024, downloaded from FAOSTAT (QCL domain, element Yield) on 30 October 2026. Flags: official values through 2018 and 2020 to 2021, estimated 2019, external-organisation values 2022 to 2024. National figures average over very different climates, so compare them with several locations rather than one.

```bash
node scripts/validate.mjs 7.7337 8.5214 05-15 loamy_sand maize data/nigeria_maize_yield_faostat.csv
```
