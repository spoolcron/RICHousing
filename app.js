"use strict";

const PALETTE = {
  avg: "#2563eb",
  med: "#c2610a",
  area: ["#0f766e", "#6d28d9", "#be123c", "#4d7c0f"],
  dom: "#64748b",
  rent: "#7c3aed",
  rate: "#b91c1c",
  pay: "#0f766e",
  payAlt: "#94a3b8",
};
const NAME = { avg: "Average", med: "Median" };
const SHORT = {
  "Hanover County": "Hanover",
  "Chesterfield County": "Chesterfield",
  "Henrico County": "Henrico",
  "Richmond City": "Richmond City",
};

const state = { metric: "avg", mode: "usd", ytd: true, down: DATA.loan.defaultDown, areas: [true, true, true, true] };

/* ---------- formatting ---------- */
const money = (n) => "$" + Math.round(n).toLocaleString("en-US");
const compact = (n) => "$" + Math.round(n / 1000) + "k";
const pctTxt = (p) => (p > 0 ? "+" : "") + p.toFixed(1) + "%";
const pctCls = (p) => (p > 0 ? "pos" : p < 0 ? "neg" : "");
const change = (a, b) => (a / b - 1) * 100;
const svgEl = (tag, attrs, text) => {
  let s = `<${tag}`;
  for (const k in attrs) if (attrs[k] !== undefined && attrs[k] !== null) s += ` ${k}="${attrs[k]}"`;
  return text === undefined ? `${s}/>` : `${s}>${text}</${tag}>`;
};

/* ---------- mortgage maths ---------- */
function monthlyPay(price, ratePct, downPct) {
  const L = price * (1 - downPct / 100);
  const r = ratePct / 100 / 12;
  const n = DATA.loan.years * 12;
  return r === 0 ? L / n : (L * r) / (1 - Math.pow(1 + r, -n));
}
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function monthAt(i) {
  const [y, m] = DATA.rate.monthly.start.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + i, 1));
  return { year: d.getUTCFullYear(), mon: d.getUTCMonth(), label: MONTH_NAMES[d.getUTCMonth()] + " ’" + String(d.getUTCFullYear()).slice(2) };
}
function monthIndexOf(ym) {
  const [y, m] = ym.split("-").map(Number);
  const [sy, sm] = DATA.rate.monthly.start.split("-").map(Number);
  return (y - sy) * 12 + (m - sm);
}
const priceForYear = (y) => { const i = DATA.years.indexOf(y); return i >= 0 ? DATA.metro.avg[i] : DATA.ytd.avg; };

/* ---------- columns ---------- */
function columns() {
  const cols = DATA.years.map((y, i) => ({
    label: String(y),
    sub: "",
    avg: DATA.metro.avg[i],
    med: DATA.metro.med[i],
    sales: DATA.metro.sales[i],
    dom: DATA.dom.years[i],
    prevDom: i > 0 ? DATA.dom.years[i - 1] : DATA.dom.baseline.days,
    rate: DATA.rate.annual[i],
    prev: i > 0 ? { avg: DATA.metro.avg[i - 1], med: DATA.metro.med[i - 1] } : { avg: DATA.baseline.avg, med: DATA.baseline.med },
    prevLabel: i > 0 ? String(y - 1) : String(DATA.baseline.year),
  }));
  if (state.ytd) {
    cols.push({
      label: "2026",
      sub: "YTD",
      avg: DATA.ytd.avg,
      med: DATA.ytd.med,
      sales: DATA.ytd.sales,
      dom: DATA.dom.ytd,
      prevDom: DATA.dom.ytdPrior,
      prev: { avg: DATA.ytd.prior.avg, med: DATA.ytd.prior.med },
      prevLabel: "Jan–Aug 2025",
      rate: DATA.rate.ytd,
      partial: true,
    });
  }

  // The final month of the record, standing on its own at the right edge so the recent turn
  // in the market is readable next to the yearly bars. Always shown — the toggle is about 2026 YTD.
  cols.push({
    label: "Aug ’26",
    sub: "single month",
    monthly: true,
    avg: DATA.last.avg,
    med: DATA.last.med,
    sales: DATA.last.sales,
    dom: DATA.last.dom,
    prevDom: DATA.last.domPrior,
    prev: { avg: DATA.last.avgPrior, med: DATA.last.medPrior },
    prevLabel: "Aug 2025",
    rate: DATA.rate.monthly.rate[monthIndexOf(DATA.last.month)],
  });
  return cols;
}

const keys = () => (state.metric === "both" ? ["avg", "med"] : [state.metric]);
const scale = (key, v) => (state.mode === "usd" ? v : (v / DATA.metro[key][0]) * 100);
const fmtVal = (v) => (state.mode === "usd" ? compact(v) : v.toFixed(1));

function tickStep(max) {
  const steps = state.mode === "usd" ? [25000, 50000, 100000, 200000] : [5, 10, 25, 50];
  for (const s of steps) if (Math.ceil((max * 1.06) / s) <= 6) return s;
  return steps[steps.length - 1];
}

function yearLabel(c, narrow) {
  if (c.monthly) return narrow ? "Aug" : "Aug ’26";
  if (!narrow) return c.partial ? c.label + " YTD" : c.label;
  return "’" + c.label.slice(2) + (c.partial ? "*" : "");
}

/* ---------- main chart ---------- */
function renderMain() {
  const box = document.getElementById("main");
  const W = Math.max(340, box.clientWidth || 960);
  const narrow = W < 560;
  const H = narrow ? 360 : 420;
  const M = { t: 24, r: 14, b: narrow ? 56 : 62, l: narrow ? 46 : 62 };
  const iw = W - M.l - M.r;
  const ih = H - M.t - M.b;

  const cols = columns();
  const ks = keys();
  const showVals = !(narrow && ks.length > 1);
  let peak = 0;
  for (const c of cols) for (const k of ks) peak = Math.max(peak, scale(k, c[k]));

  const step = tickStep(peak);
  const top = Math.ceil((peak * 1.06) / step) * step;
  const y = (v) => M.t + ih - (v / top) * ih;
  const groupW = iw / cols.length;

  let s = "";
  for (let t = 0; t <= top + 1; t += step) {
    s += svgEl("line", { class: "grid", x1: M.l, x2: W - M.r, y1: y(t), y2: y(t) });
    s += svgEl("text", { class: "axis-y", x: M.l - 8, y: y(t) + 4, "text-anchor": "end" },
      state.mode === "usd" ? compact(t) : String(t));
  }

  cols.forEach((c, i) => {
    const cx = M.l + groupW * (i + 0.5);
    const bw = Math.min(58, (groupW * 0.72) / ks.length);
    const dim = c.partial || c.monthly;
    ks.forEach((k, j) => {
      const x = cx - (bw * ks.length) / 2 + bw * j;
      const v = scale(k, c[k]);
      const h = M.t + ih - y(v);
      const fill = PALETTE[k];
      s += svgEl("rect", {
        x: x.toFixed(1), y: y(v).toFixed(1), width: (bw - (ks.length > 1 ? 3 : 0)).toFixed(1),
        height: Math.max(1, h).toFixed(1), rx: 3, fill,
        opacity: dim ? 0.55 : 1,
        "stroke-dasharray": dim ? "4 3" : undefined,
        stroke: dim ? fill : "none", "stroke-width": dim ? 1 : undefined,
      });
      if (showVals)
        s += svgEl("text", { class: "vlabel" + (dim ? " weak" : ""), x: (x + bw / 2 - 1).toFixed(1), y: (y(v) - 6).toFixed(1), "text-anchor": "middle" },
          fmtVal(v));
    });
    s += svgEl("text", { class: "axis-x", x: cx.toFixed(1), y: H - M.b + 20, "text-anchor": "middle" },
      yearLabel(c, narrow));
    const p = change(c[ks[0]], c.prev[ks[0]]);
    s += svgEl("text", { class: "yoy " + pctCls(p), x: cx.toFixed(1), y: H - M.b + 36, "text-anchor": "middle" }, pctTxt(p));
    s += svgEl("rect", { class: "hit", x: (M.l + groupW * i).toFixed(1), y: M.t, width: groupW.toFixed(1), height: ih, "data-col": i });
  });

  s += svgEl("line", { class: "grid", x1: M.l, x2: W - M.r, y1: M.t + ih, y2: M.t + ih, stroke: "var(--ink-2)" });
  box.innerHTML = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Home prices by year, with August 2026 shown on its own">${s}</svg>`;

  box.querySelectorAll(".hit").forEach((r) => {
    r.addEventListener("mousemove", (e) => showTip(e, cols[+r.dataset.col], ks));
    r.addEventListener("mouseleave", hideTip);
  });

  const k0 = ks[0];
  const since = change(DATA.metro[k0][4], DATA.metro[k0][0]);
  const last = DATA.last;
  const lkey = k0 === "avg" ? "avgPrior" : "medPrior";
  document.getElementById("maincap").textContent =
    `Bars start at zero. ${state.mode === "usd" ? "Dollar values, not inflation-adjusted" : "Values indexed to 2021 = 100"}. ` +
    `The figure under each column is the one-year change in ${NAME[k0].toLowerCase()} price: 2021 against 2020, the 2026 YTD column against Jan–Aug 2025, the last column against August 2025. ` +
    `${NAME[k0]} price moved ${pctTxt(since)} from 2021 to 2025. The last month on record, August 2026, is ${money(last[k0])}, ${pctTxt(change(last[k0], last[lkey]))} on the year and ${pctTxt(change(last[k0], DATA.metro[k0][0]))} since 2021. ` +
    `Hover or tap a column for exact figures.`;
}

function showTip(e, c, ks) {
  const wrap = document.getElementById("main").parentElement;
  const tip = document.getElementById("tip");
  const rows = ks
    .map((k) => {
      const p = change(c[k], c.prev[k]);
      return `<tr><td class="k">${NAME[k]} price</td><td>${money(c[k])}</td></tr>
              <tr><td class="k">vs ${c.prevLabel}</td><td class="${pctCls(p)}">${pctTxt(p)}</td></tr>`;
    })
    .join("");
  const other = ks.length === 1 ? ks[0] === "avg" ? "med" : "avg" : null;
  const extra = other
    ? `<tr><td class="k">${NAME[other]} price</td><td>${money(c[other])}</td></tr>`
    : "";
  tip.innerHTML =
    `<h4>${c.sub ? c.label + " " + c.sub : c.label}</h4><table>${rows}${extra}
      <tr><td class="k">Days on market</td><td>${c.dom} days</td></tr>
      <tr><td class="k">30-yr rate</td><td>${c.rate.toFixed(2)}%</td></tr>
      <tr><td class="k">Payment, ${state.down}% down</td><td>${money(monthlyPay(c.avg, c.rate, state.down))}/mo</td></tr>
      <tr><td class="k">Closed sales</td><td>${c.sales.toLocaleString("en-US")}</td></tr></table>
      ${c.monthly ? '<p class="note">One month only. A month turns over a few hundred sales, so it swings on what happened to close — read it as the recent turn, not a trend.</p>' : c.partial ? '<p class="note">Jan–Aug only, not a full year.</p>' : ""}`;
  tip.hidden = false;
  const wb = wrap.getBoundingClientRect();
  const x = e.clientX - wb.left + 14;
  const yTop = e.clientY - wb.top - 10;
  tip.style.left = Math.min(Math.max(8, x), wb.width - tip.offsetWidth - 8) + "px";
  tip.style.top = Math.max(4, yTop) + "px";
}
function hideTip() {
  document.getElementById("tip").hidden = true;
}

/* ---------- days on market ---------- */
function renderDom() {
  const box = document.getElementById("dom");
  const W = Math.max(340, box.clientWidth || 960);
  const narrow = W < 560;
  const H = narrow ? 250 : 290;
  const M = { t: 30, r: 14, b: narrow ? 42 : 46, l: narrow ? 38 : 48 };
  const iw = W - M.l - M.r;
  const ih = H - M.t - M.b;
  const cols = columns();
  const peak = Math.max(...cols.map((c) => c.dom));
  const step = [1, 2, 5, 10].find((s) => Math.ceil((peak * 1.08) / s) <= 8) || 10;
  const top = Math.ceil((peak * 1.08) / step) * step;
  const y = (v) => M.t + ih - (v / top) * ih;
  const groupW = iw / cols.length;

  let s = "";
  for (let t = 0; t <= top + 0.5; t += step) {
    s += svgEl("line", { class: "grid", x1: M.l, x2: W - M.r, y1: y(t), y2: y(t) });
    s += svgEl("text", { class: "axis-y", x: M.l - 8, y: y(t) + 4, "text-anchor": "end" }, t);
  }
  s += svgEl("text", { class: "axis-y", x: M.l - 8, y: M.t - 12, "text-anchor": "end" }, "days");

  cols.forEach((c, i) => {
    const cx = M.l + groupW * (i + 0.5);
    const bw = Math.min(58, groupW * 0.6);
    const v = c.dom;
    const col = PALETTE.dom;
    const dim = c.partial || c.monthly;
    s += svgEl("rect", {
      x: (cx - bw / 2).toFixed(1), y: y(v).toFixed(1), width: bw.toFixed(1),
      height: Math.max(1, M.t + ih - y(v)).toFixed(1), rx: 3, fill: col,
      opacity: dim ? 0.5 : 1,
      "stroke-dasharray": dim ? "4 3" : undefined,
      stroke: dim ? col : "none", "stroke-width": dim ? 1 : undefined,
    });
    s += svgEl("text", { class: "vlabel" + (dim ? " weak" : ""), x: cx.toFixed(1), y: (y(v) - 6).toFixed(1), "text-anchor": "middle" }, v);
    s += svgEl("text", { class: "axis-x", x: cx.toFixed(1), y: H - M.b + 18, "text-anchor": "middle" }, yearLabel(c, narrow));
    const d = v - c.prevDom;
    s += svgEl("text", { class: "yoy", x: cx.toFixed(1), y: H - M.b + 34, "text-anchor": "middle", fill: "var(--ink-2)" },
      (d > 0 ? "+" : "") + d + " d");
  });
  s += svgEl("line", { class: "grid", x1: M.l, x2: W - M.r, y1: M.t + ih, y2: M.t + ih, stroke: "var(--ink-2)" });
  box.innerHTML = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Average days on market by year, with August 2026 shown on its own">${s}</svg>`;
}

/* ---------- asking rent ---------- */
function rentColumns() {
  const m = DATA.rent.months.rent;
  const janYtd = DATA.years.length * 12;
  const cols = DATA.years.map((y, i) => ({
    label: String(y),
    sub: "",
    rent: DATA.rent.annual[i],
    prevRent: i > 0 ? DATA.rent.annual[i - 1] : DATA.rent.baseline.annual,
    prevLabel: i > 0 ? String(y - 1) : String(DATA.rent.baseline.year),
    first: m[i * 12],
    last: m[i * 12 + 11],
    endMon: "Dec",
  }));
  if (state.ytd) {
    cols.push({
      label: "2026",
      sub: "YTD",
      rent: DATA.rent.ytd,
      prevRent: DATA.rent.ytdPrior,
      prevLabel: "Jan–Aug 2025",
      first: m[janYtd],
      last: m[m.length - 1],
      endMon: MONTH_NAMES[m.length - 1 - janYtd],
      partial: true,
    });
  }
  cols.push({
    label: "Aug ’26",
    sub: "single month",
    monthly: true,
    rent: DATA.last.rent,
    prevRent: DATA.last.rentPrior,
    prevLabel: "Aug 2025",
    first: DATA.last.rentPrior,
    last: DATA.last.rent,
    endMon: "Aug",
  });
  return cols;
}

function renderRent() {
  const box = document.getElementById("rent");
  const W = Math.max(340, box.clientWidth || 960);
  const narrow = W < 560;
  const H = narrow ? 320 : 370;
  const M = { t: 24, r: 14, b: narrow ? 56 : 62, l: narrow ? 54 : 62 };
  const iw = W - M.l - M.r;
  const ih = H - M.t - M.b;
  const cols = rentColumns();
  const groupW = iw / cols.length;
  const peak = Math.max(...cols.map((c) => c.rent));
  const step = [100, 200, 500, 1000].find((s) => Math.ceil((peak * 1.06) / s) <= 6) || 1000;
  const top = Math.ceil((peak * 1.06) / step) * step;
  const y = (v) => M.t + ih - (v / top) * ih;

  let s = "";
  for (let t = 0; t <= top + 1; t += step) {
    s += svgEl("line", { class: "grid", x1: M.l, x2: W - M.r, y1: y(t), y2: y(t) });
    s += svgEl("text", { class: "axis-y", x: M.l - 8, y: y(t) + 4, "text-anchor": "end" }, "$" + t.toLocaleString("en-US"));
  }
  cols.forEach((c, i) => {
    const cx = M.l + groupW * (i + 0.5);
    const bw = Math.min(58, groupW * 0.6);
    const dim = c.partial || c.monthly;
    s += svgEl("rect", {
      x: (cx - bw / 2).toFixed(1), y: y(c.rent).toFixed(1), width: bw.toFixed(1),
      height: Math.max(1, M.t + ih - y(c.rent)).toFixed(1), rx: 3, fill: PALETTE.rent,
      opacity: dim ? 0.5 : 1,
      "stroke-dasharray": dim ? "4 3" : undefined,
      stroke: dim ? PALETTE.rent : "none", "stroke-width": dim ? 1 : undefined,
    });
    s += svgEl("text", { class: "vlabel" + (dim ? " weak" : ""), x: cx.toFixed(1), y: (y(c.rent) - 6).toFixed(1), "text-anchor": "middle" }, money(c.rent));
    s += svgEl("text", { class: "axis-x", x: cx.toFixed(1), y: H - M.b + 20, "text-anchor": "middle" }, yearLabel(c, narrow));
    const p = change(c.rent, c.prevRent);
    s += svgEl("text", { class: "yoy " + pctCls(p), x: cx.toFixed(1), y: H - M.b + 36, "text-anchor": "middle" }, pctTxt(p));
    s += svgEl("rect", { class: "hit", x: (M.l + groupW * i).toFixed(1), y: M.t, width: groupW.toFixed(1), height: ih, "data-col": i });
  });
  s += svgEl("line", { class: "grid", x1: M.l, x2: W - M.r, y1: M.t + ih, y2: M.t + ih, stroke: "var(--ink-2)" });
  box.innerHTML = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Average asking rent by year, with August 2026 shown on its own">${s}</svg>`;
  box.querySelectorAll(".hit").forEach((r) => {
    r.addEventListener("mousemove", (e) => showRentTip(e, cols[+r.dataset.col]));
    r.addEventListener("mouseleave", () => { document.getElementById("renttip").hidden = true; });
  });

  const r21 = DATA.rent.annual[0];
  const r25 = DATA.rent.annual[4];
  const yoy = DATA.rent.annual.map((v, i) => (i ? change(v, DATA.rent.annual[i - 1]) : change(v, DATA.rent.baseline.annual)));
  const steepest = yoy.indexOf(Math.max(...yoy));
  const pay21 = monthlyPay(DATA.metro.avg[0], DATA.rate.annual[0], state.down);
  const pay25 = monthlyPay(DATA.metro.avg[4], DATA.rate.annual[4], state.down);
  document.getElementById("rentcap").textContent =
    `Asking rent for a typical 1,910 sq ft single-family home, metro-wide, smoothed, utilities excluded. ` +
    `${money(r21)}/mo in 2021 → ${money(r25)}/mo in 2025, ${pctTxt(change(r25, r21))}, steepest in ${DATA.years[steepest]} at ${pctTxt(yoy[steepest])}. ` +
    `2026 year-to-date ${money(DATA.rent.ytd)}/mo, ${pctTxt(change(DATA.rent.ytd, DATA.rent.ytdPrior))} against the same months of 2025. ` +
    `The last bar is August 2026 alone at ${money(DATA.last.rent)}/mo, ${pctTxt(change(DATA.last.rent, DATA.last.rentPrior))} on the year. ` +
    `Over the same window the payment on the average metro price went from ${money(pay21)}/mo to ${money(pay25)}/mo (` +
    `${pctTxt(change(pay25, pay21))} in principal and interest at ${state.down}% down), so rent rose by about a quarter as much as buying.`;
}

function showRentTip(e, c) {
  const wrap = document.getElementById("rent").parentElement;
  const tip = document.getElementById("renttip");
  const p = change(c.rent, c.prevRent);
  tip.innerHTML =
    `<h4>${c.sub ? c.label + " " + c.sub : c.label}</h4><table>
      <tr><td class="k">Average asking rent</td><td>${money(c.rent)}/mo</td></tr>
      <tr><td class="k">vs ${c.prevLabel}</td><td class="${pctCls(p)}">${pctTxt(p)}</td></tr>
      <tr><td class="k">${c.monthly ? "Aug 2025 → Aug 2026" : "Jan → " + c.endMon}</td><td>${money(c.first)} → ${money(c.last)}</td></tr>
      <tr><td class="k">vs 2021</td><td>${pctTxt(change(c.rent, DATA.rent.annual[0]))}</td></tr></table>
      <p class="note">Asking rent, utilities excluded — what landlords list, not what sitting tenants pay.</p>${c.monthly ? '<p class="note">One month only — the latest reading, not a trend.</p>' : ""}`;
  tip.hidden = false;
  const wb = wrap.getBoundingClientRect();
  tip.style.left = Math.min(Math.max(8, e.clientX - wb.left + 14), wb.width - tip.offsetWidth - 8) + "px";
  tip.style.top = Math.max(4, e.clientY - wb.top - 10) + "px";
}

/* ---------- 30-year rate ---------- */
function renderRate() {
  const box = document.getElementById("rate");
  const W = Math.max(340, box.clientWidth || 960);
  const narrow = W < 560;
  const H = narrow ? 300 : 340;
  const M = { t: 26, r: 14, b: 38, l: narrow ? 46 : 56 };
  const iw = W - M.l - M.r;
  const ih = H - M.t - M.b;
  const rows = DATA.rate.monthly.rate.map((r, i) => ({ m: monthAt(i), rate: r }));
  const lo0 = Math.min(...rows.map((d) => d.rate));
  const hi0 = Math.max(...rows.map((d) => d.rate));
  const pad = (hi0 - lo0) * 0.1;
  const step = [0.25, 0.5, 1, 2].find((s) => Math.ceil((hi0 + pad) / s) - Math.floor((lo0 - pad) / s) <= 7) || 2;
  let lo = Math.floor(lo0 / step) * step;
  let hi = Math.ceil(hi0 / step) * step;
  if (hi - hi0 < (hi - lo) * 0.06) hi = +(hi + step).toFixed(2);
  if (lo0 - lo < (hi - lo) * 0.06) lo = +(lo - step).toFixed(2);
  const dp = step < 0.5 ? 2 : 1;
  const x = (i) => M.l + (iw * i) / (rows.length - 1);
  const y = (v) => M.t + ih - ((v - lo) / (hi - lo)) * ih;
  const half = iw / (rows.length - 1) / 2;
  const end = rows.length - 1;

  let s = "";
  for (let t = lo; t <= hi + 1e-6; t += step) {
    s += svgEl("line", { class: "grid", x1: M.l, x2: W - M.r, y1: y(t).toFixed(1), y2: y(t).toFixed(1) });
    s += svgEl("text", { class: "axis-y", x: M.l - 8, y: (y(t) + 4).toFixed(1), "text-anchor": "end" }, t.toFixed(dp) + "%");
  }
  rows.forEach((d, i) => {
    if (d.m.mon !== 0) return;
    s += svgEl("line", { class: "grid", x1: x(i).toFixed(1), x2: x(i).toFixed(1), y1: M.t, y2: M.t + ih });
    if (x(end) - x(i) > 34) s += svgEl("text", { class: "axis-x", x: x(i).toFixed(1), y: H - M.b + 18, "text-anchor": "middle" }, "’" + String(d.m.year).slice(2));
  });
  s += svgEl("text", { class: "axis-x", x: x(end).toFixed(1), y: H - M.b + 18, "text-anchor": "middle" }, rows[end].m.label);

  // Freddie Mac changed the survey's methodology in Nov 2022, so the series either side of
  // this month is not measured the same way: it gets a marker rather than being smoothed over.
  const ch = monthIndexOf(DATA.rate.methodChange);
  const chLabel = MONTH_NAMES[Number(DATA.rate.methodChange.slice(5)) - 1] + " " + DATA.rate.methodChange.slice(0, 4);
  s += svgEl("line", { x1: x(ch).toFixed(1), x2: x(ch).toFixed(1), y1: M.t, y2: (M.t + ih).toFixed(1), stroke: "var(--ink-2)", "stroke-width": 1, "stroke-dasharray": "2 3" });
  s += svgEl("text", { class: "axis-x", x: (x(ch) - 5).toFixed(1), y: (M.t + ih - 8).toFixed(1), fill: "var(--ink-2)", "text-anchor": "end" }, narrow ? "method change" : "survey method change");

  s += svgEl("polyline", { fill: "none", stroke: PALETTE.rate, "stroke-width": 2.5, "stroke-linejoin": "round", points: rows.map((d, i) => `${x(i).toFixed(1)},${y(d.rate).toFixed(1)}`).join(" ") });
  s += svgEl("circle", { cx: x(end).toFixed(1), cy: y(rows[end].rate).toFixed(1), r: 4, fill: PALETTE.rate });
  s += svgEl("text", { class: "endlabel", x: (x(end) - 7).toFixed(1), y: (y(rows[end].rate) - 9).toFixed(1), fill: PALETTE.rate, "text-anchor": "end" }, rows[end].rate.toFixed(2) + "%");
  s += svgEl("line", { class: "grid", x1: M.l, x2: W - M.r, y1: M.t + ih, y2: M.t + ih, stroke: "var(--ink-2)" });
  rows.forEach((d, i) => {
    s += svgEl("rect", { class: "hit", x: (x(i) - half).toFixed(1), y: M.t, width: (half * 2).toFixed(1), height: ih, "data-i": i });
  });
  box.innerHTML = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="30-year fixed mortgage rate by month">${s}</svg>`;
  box.querySelectorAll(".hit").forEach((r) => {
    r.addEventListener("mousemove", (e) => showRateTip(e, rows[+r.dataset.i], +r.dataset.i));
    r.addEventListener("mouseleave", () => { document.getElementById("ratetip").hidden = true; });
  });

  const lowAt = rows.findIndex((d) => d.rate === lo0);
  const peakAt = rows.findIndex((d) => d.rate === hi0);
  const per100k = (r) => monthlyPay(100000, r, 0);
  const first = rows[0].rate;
  const last = rows[end].rate;
  document.getElementById("ratecap").textContent =
    `Freddie Mac 30-year fixed survey average: the weekly observations inside each calendar month, averaged (FRED series MORTGAGE30US). ` +
    `The axis starts at ${lo.toFixed(dp)}%, not zero — the range is the point here, not the level. ` +
    `Low ${lo0.toFixed(2)}% in ${rows[lowAt].m.label}, peak ${hi0.toFixed(2)}% in ${rows[peakAt].m.label}, latest ${last.toFixed(2)}% in ${rows[end].m.label} (${(last - first >= 0 ? "+" : "") + (last - first).toFixed(2)} pts against Jan 2021). ` +
    `The dotted line is ${chLabel}, when Freddie Mac changed the survey's methodology; the series is not measured the same way either side of it. ` +
    `At ${last.toFixed(2)}% the principal and interest on $100,000 borrowed over 30 years is ${money(per100k(last))}/mo — ${money(per100k(lo0))}/mo at the ${lo0.toFixed(2)}% low.`;
}

function showRateTip(e, d, i) {
  const wrap = document.getElementById("rate").parentElement;
  const tip = document.getElementById("ratetip");
  const rates = DATA.rate.monthly.rate;
  const pts = (v) => (v > 0 ? "+" : "") + v.toFixed(2) + " pts";
  const ago = i >= 12 ? rates[i - 12] : null;
  tip.innerHTML =
    `<h4>${d.m.label}</h4><table>
      <tr><td class="k">30-yr fixed, monthly average</td><td>${d.rate.toFixed(2)}%</td></tr>
      ${ago === null ? "" : `<tr><td class="k">vs ${monthAt(i - 12).label}</td><td>${pts(d.rate - ago)}</td></tr>`}
      <tr><td class="k">vs Jan 2021</td><td>${pts(d.rate - rates[0])}</td></tr>
      <tr><td class="k">P&amp;I per $100,000, 30 yr</td><td>${money(monthlyPay(100000, d.rate, 0))}/mo</td></tr></table>
      <p class="note">Survey average of what lenders quoted that week — not the offer any one borrower was given.</p>`;
  tip.hidden = false;
  const wb = wrap.getBoundingClientRect();
  tip.style.left = Math.min(Math.max(8, e.clientX - wb.left + 14), wb.width - tip.offsetWidth - 8) + "px";
  tip.style.top = Math.max(4, e.clientY - wb.top - 10) + "px";
}

/* ---------- monthly payment ---------- */
function renderPay() {
  const box = document.getElementById("pay");
  const W = Math.max(340, box.clientWidth || 960);
  const narrow = W < 560;
  const H = narrow ? 300 : 360;
  const M = { t: 26, r: 14, b: 38, l: narrow ? 54 : 62 };
  const iw = W - M.l - M.r;
  const ih = H - M.t - M.b;
  const rows = DATA.rate.monthly.rate.map((r, i) => {
    const m = monthAt(i);
    const price = priceForYear(m.year);
    return { m, rate: r, price, pay: monthlyPay(price, r, state.down), payOld: monthlyPay(DATA.metro.avg[0], r, state.down) };
  });
  const first = rows[0].pay;
  const peak = Math.max(...rows.map((d) => d.pay));
  const step = [100, 250, 500, 1000].find((s) => Math.ceil((peak * 1.06) / s) <= 6) || 1000;
  const top = Math.ceil((peak * 1.06) / step) * step;
  const x = (i) => M.l + (iw * i) / (rows.length - 1);
  const y = (v) => M.t + ih - (v / top) * ih;
  const half = iw / (rows.length - 1) / 2;
  const end = rows.length - 1;

  let s = "";
  for (let t = 0; t <= top + 1; t += step) {
    s += svgEl("line", { class: "grid", x1: M.l, x2: W - M.r, y1: y(t), y2: y(t) });
    s += svgEl("text", { class: "axis-y", x: M.l - 8, y: y(t) + 4, "text-anchor": "end" }, "$" + t.toLocaleString("en-US"));
  }
  rows.forEach((d, i) => {
    if (d.m.mon !== 0) return;
    s += svgEl("line", { class: "grid", x1: x(i).toFixed(1), x2: x(i).toFixed(1), y1: M.t, y2: M.t + ih });
    if (x(end) - x(i) > 34) s += svgEl("text", { class: "axis-x", x: x(i).toFixed(1), y: H - M.b + 18, "text-anchor": "middle" }, "’" + String(d.m.year).slice(2));
  });
  s += svgEl("text", { class: "axis-x", x: x(end).toFixed(1), y: H - M.b + 18, "text-anchor": "middle" }, rows[end].m.label);
  const line = (f) => rows.map((d, i) => `${x(i).toFixed(1)},${y(f(d)).toFixed(1)}`).join(" ");
  s += svgEl("polyline", { fill: "none", stroke: PALETTE.payAlt, "stroke-width": 1.8, "stroke-dasharray": "5 4", points: line((d) => d.payOld) });
  s += svgEl("polyline", { fill: "none", stroke: PALETTE.pay, "stroke-width": 2.5, "stroke-linejoin": "round", points: line((d) => d.pay) });
  s += svgEl("circle", { cx: x(end).toFixed(1), cy: y(rows[end].pay).toFixed(1), r: 4, fill: PALETTE.pay });
  s += svgEl("text", { class: "endlabel", x: (x(end) - 7).toFixed(1), y: (y(rows[end].pay) - 9).toFixed(1), fill: PALETTE.pay, "text-anchor": "end" }, money(rows[end].pay) + "/mo");
  s += svgEl("text", { class: "endlabel", x: (x(end) - 7).toFixed(1), y: (y(rows[end].payOld) - 10).toFixed(1), fill: PALETTE.payAlt, "text-anchor": "end" }, "2021 price only");
  s += svgEl("line", { class: "grid", x1: M.l, x2: W - M.r, y1: M.t + ih, y2: M.t + ih, stroke: "var(--ink-2)" });
  rows.forEach((d, i) => {
    s += svgEl("rect", { class: "hit", x: (x(i) - half).toFixed(1), y: M.t, width: (half * 2).toFixed(1), height: ih, "data-i": i });
  });
  box.innerHTML = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Estimated monthly payment by month">${s}</svg>`;
  box.querySelectorAll(".hit").forEach((r) => {
    r.addEventListener("mousemove", (e) => showPayTip(e, rows[+r.dataset.i], first));
    r.addEventListener("mouseleave", () => { document.getElementById("paytip").hidden = true; });
  });

  const p21 = monthlyPay(DATA.metro.avg[0], DATA.rate.annual[0], state.down);
  const p25 = monthlyPay(DATA.metro.avg[4], DATA.rate.annual[4], state.down);
  const pRate = monthlyPay(DATA.metro.avg[0], DATA.rate.annual[4], state.down);
  const pPrice = monthlyPay(DATA.metro.avg[4], DATA.rate.annual[0], state.down);
  document.getElementById("paycap").textContent =
    `Solid line: that month's average 30-year rate on that calendar year's average metro price, ${state.down}% down, principal and interest. ` +
    `Dashed: the same monthly rates on the 2021 average price, which isolates what the rate did on its own. ` +
    `2021 ${money(p21)}/mo → 2025 ${money(p25)}/mo, ${pctTxt(change(p25, p21))}. ` +
    `2025 rates on the 2021 price would be ${money(pRate)}/mo (${pctTxt(change(pRate, p21))}); 2021 rates on the 2025 price ${money(pPrice)}/mo (${pctTxt(change(pPrice, p21))}).`;
}

function showPayTip(e, d, first) {
  const wrap = document.getElementById("pay").parentElement;
  const tip = document.getElementById("paytip");
  const delta = change(d.pay, first);
  tip.innerHTML =
    `<h4>${d.m.label}</h4><table>
      <tr><td class="k">30-yr rate</td><td>${d.rate.toFixed(2)}%</td></tr>
      <tr><td class="k">${d.m.year} average price</td><td>${money(d.price)}</td></tr>
      <tr><td class="k">Payment, ${state.down}% down</td><td>${money(d.pay)}/mo</td></tr>
      <tr><td class="k">vs Jan 2021</td><td>${pctTxt(delta)}</td></tr></table>
      <p class="note">Principal and interest only — no taxes, insurance or PMI.</p>`;
  tip.hidden = false;
  const wb = wrap.getBoundingClientRect();
  tip.style.left = Math.min(Math.max(8, e.clientX - wb.left + 14), wb.width - tip.offsetWidth - 8) + "px";
  tip.style.top = Math.max(4, e.clientY - wb.top - 10) + "px";
}

/* ---------- locality chart ---------- */
function renderAreas() {
  const box = document.getElementById("areas");
  const W = Math.max(340, box.clientWidth || 960);
  const narrow = W < 560;
  const H = narrow ? 340 : 380;
  const M = { t: 18, r: narrow ? 74 : 104, b: 34, l: narrow ? 46 : 62 };
  const iw = W - M.l - M.r;
  const ih = H - M.t - M.b;
  const n = DATA.years.length;
  const x = (i) => M.l + (iw * i) / (n - 1);
  const vals = [];
  DATA.areas.forEach((a, i) => { if (state.areas[i]) a.med.forEach((v) => vals.push(scale("med", v))); });
  const peak = vals.length ? Math.max(...vals) : 100;
  const step = tickStep(peak);
  const top = Math.ceil((peak * 1.06) / step) * step;
  const y = (v) => M.t + ih - (v / top) * ih;

  let s = "";
  for (let t = 0; t <= top + 1; t += step) {
    s += svgEl("line", { class: "grid", x1: M.l, x2: M.l + iw, y1: y(t), y2: y(t) });
    s += svgEl("text", { class: "axis-y", x: M.l - 8, y: y(t) + 4, "text-anchor": "end" },
      state.mode === "usd" ? compact(t) : String(t));
  }
  DATA.years.forEach((yr, i) => {
    s += svgEl("text", { class: "axis-x", x: x(i).toFixed(1), y: H - M.b + 18, "text-anchor": "middle" }, yr);
  });

  const labels = [];
  DATA.areas.forEach((a, ai) => {
    if (!state.areas[ai]) return;
    const col = PALETTE.area[ai];
    const pts = a.med.map((v, i) => [x(i), y(scale("med", v))]);
    s += svgEl("polyline", { fill: "none", stroke: col, "stroke-width": 2.5, "stroke-linejoin": "round", points: pts.map((p) => p.map((q) => q.toFixed(1)).join(",")).join(" ") });
    pts.forEach((p, i) => {
      s += svgEl("circle", { cx: p[0].toFixed(1), cy: p[1].toFixed(1), r: i === n - 1 ? 4 : 2.5, fill: col });
    });
    labels.push({ px: pts[n - 1][0], py: pts[n - 1][1], ly: pts[n - 1][1], col, text: SHORT[a.name] });
  });

  // Localities end at nearly the same price; push labels apart so they stay readable.
  const gap = 13;
  labels.sort((p, q) => p.ly - q.ly);
  for (let i = 1; i < labels.length; i++) labels[i].ly = Math.max(labels[i].ly, labels[i - 1].ly + gap);
  const spill = labels.length ? labels[labels.length - 1].ly - (M.t + ih) : 0;
  if (spill > 0) labels.forEach((L) => (L.ly -= spill));
  for (let i = labels.length - 2; i >= 0; i--) labels[i].ly = Math.min(labels[i].ly, labels[i + 1].ly - gap);
  const lx = M.l + iw + 9;
  labels.forEach((L) => {
    s += svgEl("line", { x1: (L.px + 4).toFixed(1), y1: L.py.toFixed(1), x2: (lx - 2).toFixed(1), y2: L.ly.toFixed(1), stroke: L.col, "stroke-width": 1, opacity: 0.45 });
    s += svgEl("text", { class: "endlabel" + (narrow ? " narrow" : ""), x: lx.toFixed(1), y: (L.ly + 3.5).toFixed(1), fill: L.col }, L.text);
  });

  box.innerHTML = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Median price by locality">${s}</svg>`;
}

function renderLegend() {
  const el = document.getElementById("legend");
  el.innerHTML = DATA.areas
    .map((a, i) => `<button class="${state.areas[i] ? "" : "off"}" data-i="${i}" style="--sw:${PALETTE.area[i]}"><i></i>${SHORT[a.name]}</button>`)
    .join("");
  el.querySelectorAll("button").forEach((b) =>
    b.addEventListener("click", () => {
      const i = +b.dataset.i;
      if (state.areas.filter(Boolean).length === 1 && state.areas[i]) return;
      state.areas[i] = !state.areas[i];
      renderLegend();
      renderAreas();
    })
  );
}

/* ---------- tables + stats ---------- */
function pctCell(p) {
  return `<td class="${pctCls(p)}">${pctTxt(p)}</td>`;
}

function renderTables() {
  const head = `<thead><tr><th>Year</th><th>Average price</th><th>YoY</th><th>Median price</th><th>YoY</th><th>Closed sales</th><th>Days on market</th></tr></thead>`;
  const rows = DATA.years
    .map((y, i) => {
      const pAvg = change(DATA.metro.avg[i], i > 0 ? DATA.metro.avg[i - 1] : DATA.baseline.avg);
      const pMed = change(DATA.metro.med[i], i > 0 ? DATA.metro.med[i - 1] : DATA.baseline.med);
      const sales = DATA.metro.sales[i];
      const salesPrev = i > 0 ? DATA.metro.sales[i - 1] : DATA.baseline.sales;
      const dom = DATA.dom.years[i];
      const domPrev = i > 0 ? DATA.dom.years[i - 1] : DATA.dom.baseline.days;
      return `<tr><td>${y}</td><td>${money(DATA.metro.avg[i])}</td>${pctCell(pAvg)}<td>${money(DATA.metro.med[i])}</td>${pctCell(pMed)}<td>${sales.toLocaleString("en-US")} ${pctTxt(change(sales, salesPrev))}</td><td>${dom} ${pctTxt(change(dom, domPrev))}</td></tr>`;
    })
    .join("");
  const ytdRow = `<tr class="total"><td>2026 Jan–Aug</td><td>${money(DATA.ytd.avg)}</td>${pctCell(change(DATA.ytd.avg, DATA.ytd.prior.avg))}<td>${money(DATA.ytd.med)}</td>${pctCell(change(DATA.ytd.med, DATA.ytd.prior.med))}<td>${DATA.ytd.sales.toLocaleString("en-US")} ${pctTxt(change(DATA.ytd.sales, DATA.ytd.prior.sales))}</td><td>${DATA.dom.ytd} ${pctTxt(change(DATA.dom.ytd, DATA.dom.ytdPrior))}</td></tr>`;
  document.getElementById("t-metro").innerHTML =
    `<table class="data"><caption>Richmond metro — all residential</caption>${head}<tbody>${rows}${ytdRow}</tbody></table>`;

  const ahead = `<thead><tr><th>Locality</th>${DATA.years.map((y) => `<th>${y}</th>`).join("")}<th>2021 → 2025</th></tr></thead>`;
  const arows = DATA.areas
    .map(
      (a) =>
        `<tr><td>${a.name}</td>${a.med.map((v) => `<td>${money(v)}</td>`).join("")}${pctCell(change(a.med[4], a.med[0]))}</tr>`
    )
    .join("");
  document.getElementById("t-areas").innerHTML =
    `<table class="data"><caption>Median sale price by locality</caption>${ahead}<tbody>${arows}</tbody></table>`;

  const down = state.down;
  const phead = `<thead><tr><th>Year</th><th>Average price</th><th>30-yr rate</th><th>Loan, ${100 - down}% of price</th><th>Monthly P&amp;I</th><th>Change</th></tr></thead>`;
  const payYear = (i) => monthlyPay(DATA.metro.avg[i], DATA.rate.annual[i], down);
  const prows = DATA.years
    .map((y, i) => {
      const prev = monthlyPay(i > 0 ? DATA.metro.avg[i - 1] : DATA.baseline.avg, i > 0 ? DATA.rate.annual[i - 1] : DATA.rate.baseline, down);
      return `<tr><td>${y}</td><td>${money(DATA.metro.avg[i])}</td><td>${DATA.rate.annual[i].toFixed(2)}%</td><td>${money(DATA.metro.avg[i] * (1 - down / 100))}</td><td>${money(payYear(i))}</td><td>${pctTxt(change(payYear(i), prev))}</td></tr>`;
    })
    .join("");
  const pNow = monthlyPay(DATA.ytd.avg, DATA.rate.ytd, down);
  const pThen = monthlyPay(DATA.ytd.prior.avg, DATA.rate.ytdPrior, down);
  document.getElementById("t-pay").innerHTML =
    `<table class="data"><caption>Monthly principal and interest — ${DATA.loan.years}-year fixed, ${down}% down</caption>${phead}<tbody>${prows}` +
    `<tr class="total"><td>2026 Jan–Aug</td><td>${money(DATA.ytd.avg)}</td><td>${DATA.rate.ytd.toFixed(2)}%</td><td>${money(DATA.ytd.avg * (1 - down / 100))}</td><td>${money(pNow)}</td><td>${pctTxt(change(pNow, pThen))}</td></tr></tbody></table>`;
}

function renderStats() {
  const avg = DATA.metro.avg, med = DATA.metro.med;
  const growth = avg.map((v, i) => (i === 0 ? change(v, DATA.baseline.avg) : change(v, avg[i - 1])));
  const best = growth.indexOf(Math.max(...growth));
  const cards = [
    { v: money(avg[4]), s: `average price, 2025 · ${pctTxt(change(avg[4], avg[0]))} since 2021` },
    { v: money(med[4]), s: `median price, 2025 · ${pctTxt(change(med[4], med[0]))} since 2021` },
    { v: money(avg[4] - avg[0]), s: "added to the average price since 2021" },
    { v: growth[best].toFixed(1) + "%", s: `average-price gain in ${DATA.years[best]} — the steepest year` },
    { v: money(DATA.ytd.avg), s: `average price, ${DATA.ytd.months} · ${pctTxt(change(DATA.ytd.avg, DATA.ytd.prior.avg))} vs same months 2025` },
    { v: DATA.dom.years[4] + " days", s: `average time to an accepted offer in 2025, from ${DATA.dom.years[0]} days in 2021` },
    { v: DATA.rate.monthly.rate.at(-1).toFixed(2) + "%", s: `30-year fixed in ${monthAt(DATA.rate.monthly.rate.length - 1).label}, from ${DATA.rate.monthly.rate[0].toFixed(2)}% in Jan 2021 — ${money(monthlyPay(100000, DATA.rate.monthly.rate.at(-1), 0))}/mo per $100,000 borrowed against ${money(monthlyPay(100000, DATA.rate.monthly.rate[0], 0))}/mo then` },
    { v: money(monthlyPay(avg[4], DATA.rate.annual[4], state.down)) + "/mo", s: `principal and interest on the 2025 price at the 2025 rate, ${state.down}% down — ${money(monthlyPay(avg[0], DATA.rate.annual[0], state.down))} for the same shape in 2021` },
  ];
  document.getElementById("stats").innerHTML = cards
    .map((c) => `<div class="stat"><b>${c.v}</b><span>${c.s}</span></div>`)
    .join("");
}

/* ---------- page ---------- */
function render() {
  renderMain();
  renderDom();
  renderRent();
  renderRate();
  renderPay();
  renderAreas();
}

document.getElementById("region").textContent = DATA.region;
document.getElementById("stamp").textContent =
  `Calendar-year closed sales, MLS data. Page built ${DATA.builtOn}. Rolling 12-month median as of ${DATA.rolling12.asOf}: ${money(DATA.rolling12.med)}.`;
document.getElementById("notes").innerHTML = DATA.notes.map((n) => `<li>${n}</li>`).join("");
document.getElementById("src").innerHTML = DATA.sources
  .map((s) => `<li>${s.what} — <a href="${s.url}">${s.url}</a></li>`)
  .join("");

document.querySelectorAll("#metric button").forEach((b) =>
  b.addEventListener("click", () => {
    state.metric = b.dataset.metric;
    document.querySelectorAll("#metric button").forEach((x) => x.classList.toggle("on", x === b));
    renderMain();
  })
);
document.querySelectorAll("#mode button").forEach((b) =>
  b.addEventListener("click", () => {
    state.mode = b.dataset.mode;
    document.querySelectorAll("#mode button").forEach((x) => x.classList.toggle("on", x === b));
    render();
  })
);
document.getElementById("ytd").addEventListener("change", (e) => {
  state.ytd = e.target.checked;
  renderDom();
  renderRent();
  renderMain();
});
document.getElementById("down").addEventListener("change", (e) => {
  state.down = +e.target.value;
  renderPay();
  renderTables();
  renderStats();
  renderMain();
});

renderLegend();
renderStats();
renderTables();
render();

let raf = 0;
const ro = new ResizeObserver(() => {
  cancelAnimationFrame(raf);
  raf = requestAnimationFrame(render);
});
ro.observe(document.getElementById("main"));
ro.observe(document.getElementById("dom"));
ro.observe(document.getElementById("pay"));
