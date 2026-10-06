// Richmond, VA metro home prices by calendar year.
// Source: Central Virginia Regional MLS (CVMLS) annual/monthly reports published by ShowingTime.
// Coverage: Chesterfield County, Hanover County, Henrico County, Richmond City. Residential (SF + THC), all properties.
// Prices are closed-sale prices, seller concessions excluded.

const DATA = {
  region:
    "Richmond, VA metro — Central Virginia Regional MLS area (Chesterfield · Hanover · Henrico · Richmond City)",
  builtOn: "2026-10-05",

  years: [2021, 2022, 2023, 2024, 2025],

  // Full calendar years, latest vintage (annual report current as of 2026-01-10).
  metro: {
    avg: [366359, 414642, 438513, 473106, 483092],
    med: [325000, 364950, 382500, 410000, 418880],
    sales: [18959, 15540, 12625, 12918, 13098],
  },

  // Context: the year before the window.
  baseline: { year: 2020, avg: 329474, med: 292000, sales: 17849 },

  // 2026 is not a completed year: Jan–Aug 2026 year-to-date, all residential.
  ytd: {
    label: "2026 YTD",
    months: "Jan–Aug 2026",
    avg: 502299,
    med: 425000,
    sales: 9353,
    prior: { avg: 486033, med: 420000, sales: 9079 },
  },

  // Average days from listing to an accepted offer (report metric: "Days on Market Until Sale"),
  // same Quick Facts pages as the prices. 2026 is the Jan–Aug year-to-date figure.
  dom: {
    years: [15, 16, 21, 26, 28],
    baseline: { year: 2020, days: 27 },
    ytd: 27,
    ytdPrior: 26,
    split2025: { singleFamily: 25, condoTown: 37 },
    byArea2025: "Henrico +13.6%, Richmond City +9.1%, Chesterfield +7.1%, Hanover 0.0%",
  },

  // Median sale price by locality (annual report 2025, p.9 "Area Historical Median Prices").
  areas: [
    { name: "Hanover County", med: [365000, 425000, 450000, 470000, 473500] },
    { name: "Chesterfield County", med: [330000, 370000, 387000, 413408, 421288] },
    { name: "Henrico County", med: [310191, 345000, 371925, 400000, 400000] },
    { name: "Richmond City", med: [320000, 341000, 350000, 390900, 400000] },
  ],

  // Rolling 12 months ending Aug 2026 (all properties), for a "right now" reference.
  rolling12: { asOf: "Aug 2026", med: 420000, yoy: 0.0 },

  // 30-year fixed mortgage rate: Freddie Mac Primary Mortgage Market Survey weekly averages,
  // via FRED series MORTGAGE30US (copy saved at data/mortgage30us.csv, pulled 2026-10-05).
  // Averages are over the weekly observations inside each calendar month / year, so 2022 straddles
  // the survey's 2022-11-17 methodology change and differs slightly from Freddie's own yearly table.
  rate: {
    annual: [2.96, 5.34, 6.81, 6.72, 6.6],
    baseline: 3.11,
    ytd: 6.35,
    ytdPrior: 6.76,
    methodChange: "2022-11",
    monthly: {
      start: "2021-01",
      last: "2026-09",
      rate: [
        2.73, 2.81, 3.08, 3.06, 2.96, 2.98, 2.87, 2.84, 2.90, 3.07,
        3.07, 3.10, 3.45, 3.76, 4.17, 4.98, 5.23, 5.52, 5.41, 5.22,
        6.11, 6.90, 6.80, 6.36, 6.27, 6.26, 6.54, 6.34, 6.42, 6.71,
        6.84, 7.07, 7.20, 7.62, 7.44, 6.82, 6.64, 6.78, 6.82, 6.99,
        7.06, 6.92, 6.85, 6.50, 6.18, 6.43, 6.80, 6.71, 6.96, 6.84,
        6.65, 6.72, 6.82, 6.82, 6.72, 6.59, 6.35, 6.25, 6.24, 6.19,
        6.10, 6.05, 6.18, 6.33, 6.44, 6.49, 6.54, 6.67, 6.86,
      ],
    },
  },

  // Average asking rent: Zillow Observed Rent Index (ZORI), Richmond, VA MSA — the smoothed market
  // rate rent for a typical 1,910 sq ft single-family home. Metro geography, so it covers the same
  // four localities plus the rest of the MSA. Copy saved at data/zori-metro.csv, pulled 2026-10-05.
  rent: {
    annual: [1324.65, 1479.47, 1532.02, 1600.67, 1664.25],
    baseline: { year: 2020, annual: 1209.92 },
    ytd: 1712.76,
    ytdPrior: 1658.89,
    months: {
      start: "2021-01",
      last: "2026-08",
      rent: [
        1236.53, 1243.96, 1263.15, 1283.04, 1306.43, 1327.29, 1348.99, 1362.24, 1369.49, 1375.14, 1383.01, 1396.5,
        1403.97, 1417.51, 1430.84, 1453.08, 1473.25, 1492.9, 1513.65, 1521.4, 1523, 1513.73, 1508.41, 1501.89,
        1500.19, 1504.12, 1515.29, 1526.96, 1535.7, 1541.06, 1542.66, 1545.02, 1547.71, 1545.76, 1543.51, 1536.25,
        1544.15, 1555.38, 1572.29, 1587.63, 1598.75, 1612, 1621.66, 1628.95, 1624.86, 1618.04, 1619.32, 1625.02,
        1627.23, 1631.5, 1643.75, 1657.09, 1667.15, 1673.48, 1684.97, 1685.93, 1682.95, 1673.37, 1670.67, 1672.91,
        1682.21, 1693.53, 1703.44, 1712.33, 1721.46, 1728.73, 1731.62, 1728.73,
      ],
    },
  },

  // The last month of data, shown on its own at the right edge of the charts. Same
  // all-residential basis as the yearly series above: the Key Metrics table of the August
  // 2026 monthly report (month vs the same month a year earlier), plus ZORI for that month.
  last: {
    month: "2026-08",
    avg: 502690, med: 427000, sales: 1106, dom: 27,
    avgPrior: 478585, medPrior: 410000, salesPrior: 1233, domPrior: 23,
    rent: 1728.73, rentPrior: 1685.93,
  },

  // Assumptions for the monthly-payment estimate.
  loan: { years: 30, defaultDown: 20 },

  sources: [
    {
      what: "Annual report 2021–2025 (median, average, closed sales by year; area medians)",
      url: "https://cvmls-public.stats.showingtime.com/docs/ann/x/RichmondMetro",
    },
    {
      what: "Monthly indicators, Aug 2026 (2026 and 2025 year-to-date, and August 2026 vs August 2025, all residential)",
      url: "https://cvmls-public.stats.showingtime.com/docs/mmi/x/RichmondMetro",
    },
    {
      what: "Housing supply overview, Aug 2026 (rolling 12-month median)",
      url: "https://cvmls-public.stats.showingtime.com/docs/hso/x/RichmondMetro",
    },
    {
      what: "30-year fixed mortgage rate, weekly (Freddie Mac PMMS via FRED, series MORTGAGE30US)",
      url: "https://fred.stlouisfed.org/data/MORTGAGE30US",
    },
    {
      what: "Average asking rent by month, 2021–2026 (Zillow Observed Rent Index, Richmond VA metro)",
      url: "https://files.zillowstatic.com/research/public_csvs/zori/Metro_zori_uc_sfrcondomfr_sm_month.csv",
    },
  ],

  notes: [
    "Average = mean closed-sale price, median = midpoint of closed sales. They diverge because the top of the market carries the mean.",
    "Earlier vintages restate the same year slightly (e.g. 2022 average first printed $414,795, now $414,642; Chesterfield 2024 median $412,900 → $413,408). Late-entered sales, ≤0.05%.",
    "Covered areas are the four CVMLS localities above. Powhatan, Prince George and other counties in the wider Richmond CSA are not in this report.",
    "MLS closings only: off-market and unlisted sales are excluded; price is contract price, not concession-adjusted.",
    "2026 is year-to-date (Jan–Aug), not a calendar year — the mix of homes sold late in the year moves the number.",
    "Monthly payment is principal and interest only: 30-year fixed, the down-payment share chosen, cash for the rest. No property taxes, insurance, PMI or HOA.",
    "Payment prices are calendar-year averages: the monthly report prints month-level prices only for the current month and its year-ago comparison, so the price steps once a year apart from the final August column, while the rate moves every month.",
    "Mortgage rates are Freddie Mac PMMS weekly averages via FRED; the survey changed methodology on 2022-11-17, so Freddie's own yearly-average table differs a little for 2022–2023.",
    "Rent is Zillow's observed rent index: asking rent for a typical 1,910 sq ft single-family home, metro-wide, smoothed, utilities excluded. It is what landlords ask, not what sitting tenants pay.",
    "Rent is metro-wide (Zillow geography), while prices are the four CVMLS localities — the wider MSA pulls the rent line a little.",
    "The last column on the price, rent and days-on-market charts is August 2026 alone, not a year. A single month turns over a few hundred sales, so it moves for reasons the yearly series averages out — it is there to show the recent turn, and its change figure is against August 2025.",
  ],
};
