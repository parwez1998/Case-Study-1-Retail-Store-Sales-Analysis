/* ==========================================================================
   FASHIONWAVE RETAIL STORE SALES ANALYSIS — 12-SLIDE STORY-DRIVEN ENGINE
   Load: ./fashionwave_sales.csv -> ./data.js (RAW_FASHIONWAVE_CSV) -> Picker
   ========================================================================== */
(() => {
  'use strict';

  const REQUIRED_COLS = [
    'InvoiceNo', 'Date', 'StoreID', 'ProductID', 'Category',
    'Quantity', 'UnitPrice', 'Discount', 'CostPerUnit', 'CustomerType', 'PaymentMode'
  ];

  const CAT_COLORS = { Clothing: '#7C3AED', Shoes: '#E11D48', Accessories: '#D97706' };
  const BAND_ORDER = ['No Discount', 'Low (1-5%)', 'Medium (6-15%)', 'High (16-30%)'];
  const DAY_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const SEASON_ORDER = ['Festive (Oct-Nov)', 'Winter (Dec-Jan)', 'Regular (Feb-Sep)'];

  const SLIDE_META = [
    { title: 'Case Study Overview', notes: ['Introduce FashionWave (50 stores across India) and the core problem: stagnant weekend sales vs steady weekdays.', 'Frame the 3 objectives (+15% weekend sales, product profitability, smart discounting) and 30% policy cap.'] },
    { title: 'Executive Summary', notes: ['Present the 5 headline KPIs and 3-4 live data-driven findings.', 'Note the Weekend/Weekday sales ratio and 34.78% operating margin.'] },
    { title: 'Data Overview & Cleaning', notes: ['Show raw blanks: 135 Discount blanks (imputed to 0%), 156 CustomerType blanks & 66 PaymentMode blanks (imputed to Unknown).', 'Verify 0% violations above the 30% discount policy cap.'] },
    { title: 'Sales KPI Dashboard', notes: ['Point out October festive peaks in the trend chart and how Story Panel numbers update dynamically with slicers.'] },
    { title: 'Category & Product Performance (Q1)', notes: ['Clothing anchors volume; Shoes drives 40.3% revenue from 20.2% units; Accessories leads margin at 35.25%.', 'Highlight the Volume-vs-Margin quadrant flagging low-margin items.'] },
    { title: 'Weekend vs Weekday (Q2)', notes: ['Friday (#1) and Monday (#2) beat Saturday. Show how festival weeks lift both weekday and weekend baskets.'] },
    { title: 'Discount Impact (Q3)', notes: ['Zero volume elasticity (r = -0.0034): 16-30% discounts slash margin from 40.2% to 21.5% without expanding basket size.'] },
    { title: 'Store Performance (Q4)', notes: ['Contrast Top 10 vs Bottom 10 (7.1x gap between Store_16 and Store_25). Explain hypotheses clearly: footwear mix & order velocity.'] },
    { title: 'Customer Segmentation (Q5)', notes: ['No CustomerID exists, so segments are built from CustomerType, basket value, discount reliance, and day preference.'] },
    { title: 'Weekend Growth Simulator', notes: ['Demonstrate how targeted weekend bundles and capped promos close the +15% weekend growth target (indicative scenario only).'] },
    { title: 'Recommendations Roadmap', notes: ['Walk through Quick Wins (0-30d) vs Long-Term (1-6m) with owners, risks, and success metrics.'] },
    { title: 'Final Recommendations & Assumptions', notes: ['Close with the Top 5 prioritized actions explicitly linked to Assumptions [A1]-[A6].'] }
  ];

  const state = {
    rawRows: [],
    cleanRows: [],
    cleaningStats: { rawCount: 0, cleanCount: 0, blankDisc: 0, blankCust: 0, blankPay: 0, over30: 0, duplicates: 0 },
    currentSlide: 0,
    zoomLevel: 100,
    theme: 'light',
    s5TableView: false,
    s8AllStores: false,
    filters: {
      dateStart: '', dateEnd: '',
      categories: new Set(), store: '', dayTypes: new Set(), daysOfWeek: new Set(),
      seasons: new Set(), discountBands: new Set(), customerTypes: new Set(),
      excludeMissing: false
    },
    sim: { wkndDisc: 10, wkndCat: 'All', wkndTraffic: 8, wkndAov: 7 },
    resizeObservers: new Map()
  };

  const safeDiv = (n, d, fb = 0) => (d && Number.isFinite(d) && d !== 0 ? n / d : fb);

  function fmtINR(val, compact = false) {
    if (!Number.isFinite(val)) return '₹0';
    const abs = Math.abs(val);
    const sign = val < 0 ? '-' : '';
    if (compact) {
      if (abs >= 10000000) return `${sign}₹${(abs / 10000000).toFixed(2)} Cr`;
      if (abs >= 100000) return `${sign}₹${(abs / 100000).toFixed(2)}L`;
      if (abs >= 1000) return `${sign}₹${(abs / 1000).toFixed(1)}K`;
    }
    return `${sign}₹${Math.round(abs).toLocaleString('en-IN')}`;
  }

  const fmtNum = v => (Number.isFinite(v) ? Math.round(v).toLocaleString('en-IN') : '0');
  const fmtPct = (v, d = 2) => (Number.isFinite(v) ? `${v.toFixed(d)}%` : '0.00%');

  function getSeason(monthNum) {
    if (monthNum === 10 || monthNum === 11) return 'Festive (Oct-Nov)';
    if (monthNum === 12 || monthNum === 1) return 'Winter (Dec-Jan)';
    return 'Regular (Feb-Sep)';
  }

  function getDiscountBand(d) {
    if (d <= 0) return 'No Discount';
    if (d <= 5) return 'Low (1-5%)';
    if (d <= 15) return 'Medium (6-15%)';
    return 'High (16-30%)';
  }

  // =========================================================================
  // DATA CLEANING & DERIVED FIELDS
  // =========================================================================
  function parseAndClean(rows, sourceName, via) {
    if (!rows || !rows.length) return false;
    const cols = Object.keys(rows[0]);
    const missing = REQUIRED_COLS.filter(c => !cols.includes(c));
    if (missing.length) { alert(`Missing columns: ${missing.join(', ')}`); return false; }

    const seen = new Set();
    let blankDisc = 0, blankCust = 0, blankPay = 0, over30 = 0, duplicates = 0;
    const cleaned = [];

    for (const r of rows) {
      const inv = String(r.InvoiceNo || '').trim();
      if (!inv) continue;
      if (seen.has(inv)) { duplicates++; continue; }
      seen.add(inv);

      const rawDiscStr = String(r.Discount ?? '').trim();
      const rawCustStr = String(r.CustomerType ?? '').trim();
      const rawPayStr = String(r.PaymentMode ?? '').trim();

      const hasBlankDisc = rawDiscStr === '';
      const hasBlankCust = rawCustStr === '';
      const hasBlankPay = rawPayStr === '';
      if (hasBlankDisc) blankDisc++;
      if (hasBlankCust) blankCust++;
      if (hasBlankPay) blankPay++;

      const qty = Number(r.Quantity) || 0;
      const unitPrice = Number(r.UnitPrice) || 0;
      const discount = hasBlankDisc ? 0 : (Number(rawDiscStr) || 0);
      if (discount > 30) over30++;
      const costPerUnit = Number(r.CostPerUnit) || 0;
      const cust = hasBlankCust ? 'Unknown' : rawCustStr;
      const pay = hasBlankPay ? 'Unknown' : rawPayStr;
      const dateStr = String(r.Date || '').trim().slice(0, 10);

      const dt = new Date(dateStr + 'T00:00:00');
      const monthNum = dt.getMonth() + 1;
      const dayIdx = (dt.getDay() + 6) % 7;
      const dayOfWeek = DAY_ORDER[dayIdx] || 'Monday';
      const dayType = dayIdx >= 5 ? 'Weekend' : 'Weekday';
      const season = getSeason(monthNum);
      const monthKey = dateStr.slice(0, 7);

      const grossSales = qty * unitPrice;
      const discountAmt = grossSales * (discount / 100);
      const netRev = grossSales - discountAmt;
      const totalCost = qty * costPerUnit;
      const profit = netRev - totalCost;

      cleaned.push({
        InvoiceNo: inv, Date: dateStr, MonthKey: monthKey, Season: season,
        DayOfWeek: dayOfWeek, DayType: dayType,
        StoreID: String(r.StoreID || '').trim(),
        ProductID: String(r.ProductID || '').trim(),
        Category: String(r.Category || '').trim(),
        Quantity: qty, UnitPrice: unitPrice, Discount: discount,
        DiscountBand: getDiscountBand(discount),
        CostPerUnit: costPerUnit, CustomerType: cust, PaymentMode: pay,
        GrossSales: grossSales, DiscountAmount: discountAmt,
        NetRevenue: netRev, TotalCost: totalCost, Profit: profit,
        ProfitMargin: safeDiv(profit, netRev) * 100,
        HasMissingRaw: hasBlankDisc || hasBlankCust || hasBlankPay
      });
    }

    state.rawRows = rows;
    state.cleanRows = cleaned;
    state.cleaningStats = { rawCount: rows.length, cleanCount: cleaned.length, blankDisc, blankCust, blankPay, over30, duplicates };

    const dates = cleaned.map(d => d.Date).sort();
    state.filters.dateStart = dates[0] || '2024-11-18';
    state.filters.dateEnd = dates[dates.length - 1] || '2026-11-18';

    document.getElementById('data-status-text').textContent = `Data source: ${sourceName} · ${cleaned.length.toLocaleString('en-IN')} rows · loaded via ${via}`;
    initSlicerOptions();
    renderAll();
    return true;
  }

  async function loadInitialData() {
    try {
      const resp = await fetch('./fashionwave_sales.csv');
      if (resp.ok && window.Papa) {
        const parsed = window.Papa.parse(await resp.text(), { header: true, skipEmptyLines: true });
        if (parseAndClean(parsed.data, 'fashionwave_sales.csv', 'CSV fetch')) return;
      }
    } catch (_) {}

    if (Array.isArray(window.RAW_FASHIONWAVE_CSV) && window.RAW_FASHIONWAVE_CSV.length) {
      if (parseAndClean(window.RAW_FASHIONWAVE_CSV, 'fashionwave_sales.csv', 'backup (data.js)')) return;
    }

    document.getElementById('fallback-loader').classList.add('open');
  }

  // =========================================================================
  // FILTER STORE & PURE AGGREGATIONS
  // =========================================================================
  function getFilteredRows() {
    const f = state.filters;
    return state.cleanRows.filter(r => {
      if (f.dateStart && r.Date < f.dateStart) return false;
      if (f.dateEnd && r.Date > f.dateEnd) return false;
      if (f.categories.size && !f.categories.has(r.Category)) return false;
      if (f.store && r.StoreID !== f.store) return false;
      if (f.dayTypes.size && !f.dayTypes.has(r.DayType)) return false;
      if (f.daysOfWeek.size && !f.daysOfWeek.has(r.DayOfWeek)) return false;
      if (f.seasons.size && !f.seasons.has(r.Season)) return false;
      if (f.discountBands.size && !f.discountBands.has(r.DiscountBand)) return false;
      if (f.customerTypes.size && !f.customerTypes.has(r.CustomerType)) return false;
      if (f.excludeMissing && r.HasMissingRaw) return false;
      return true;
    });
  }

  function computeSummary(rows) {
    let gross = 0, discAmt = 0, netRev = 0, cost = 0, profit = 0, units = 0, discSum = 0;
    let wkndRev = 0, wkdyRev = 0, wkndOrders = 0, wkdyOrders = 0;
    const stores = new Set();
    for (const r of rows) {
      gross += r.GrossSales; discAmt += r.DiscountAmount; netRev += r.NetRevenue;
      cost += r.TotalCost; profit += r.Profit; units += r.Quantity; discSum += r.Discount;
      stores.add(r.StoreID);
      if (r.DayType === 'Weekend') { wkndRev += r.NetRevenue; wkndOrders++; }
      else { wkdyRev += r.NetRevenue; wkdyOrders++; }
    }
    const orders = rows.length;
    return {
      orders, units, storesCount: stores.size, gross, discAmt, netRev, cost, profit,
      marginPct: safeDiv(profit, netRev) * 100,
      aov: safeDiv(netRev, orders),
      asp: safeDiv(netRev, units),
      avgDisc: safeDiv(discSum, orders),
      basketSize: safeDiv(units, orders),
      wkndRev, wkdyRev, wkndOrders, wkdyOrders,
      wkndRatio: safeDiv(wkndRev, wkdyRev),
      wkndShare: safeDiv(wkndRev, netRev) * 100,
      salesPerStoreWeek: safeDiv(netRev, Math.max(1, stores.size) * 104)
    };
  }

  function groupBy(rows, keyFn) {
    const map = new Map();
    for (const r of rows) {
      const k = keyFn(r);
      let g = map.get(k);
      if (!g) {
        g = { key: k, orders: 0, units: 0, netRev: 0, profit: 0, gross: 0, discSum: 0, wkndRev: 0, shoeOrders: 0 };
        map.set(k, g);
      }
      g.orders++; g.units += r.Quantity; g.netRev += r.NetRevenue; g.profit += r.Profit;
      g.gross += r.GrossSales; g.discSum += r.Discount;
      if (r.DayType === 'Weekend') g.wkndRev += r.NetRevenue;
      if (r.Category === 'Shoes') g.shoeOrders++;
    }
    for (const g of map.values()) {
      g.marginPct = safeDiv(g.profit, g.netRev) * 100;
      g.aov = safeDiv(g.netRev, g.orders);
      g.avgDisc = safeDiv(g.discSum, g.orders);
      g.wkndShare = safeDiv(g.wkndRev, g.netRev) * 100;
    }
    return map;
  }

  function pearsonR(xs, ys) {
    const n = xs.length;
    if (n < 2) return 0;
    let sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0;
    for (let i = 0; i < n; i++) { sx += xs[i]; sy += ys[i]; sxx += xs[i]*xs[i]; syy += ys[i]*ys[i]; sxy += xs[i]*ys[i]; }
    return safeDiv(n * sxy - sx * sy, Math.sqrt((n * sxx - sx * sx) * (n * syy - sy * sy)));
  }

  // =========================================================================
  // TOOLTIPS & STORY PANEL BUILDER
  // =========================================================================
  function ttCard(title, rows) {
    return `<div style="max-width:270px; font-family:Inter,sans-serif; font-size:12px; line-height:1.4;">
      <div class="tt-title">${title}</div>
      ${rows.map(r => `<div class="tt-row"><span class="tt-lbl">${r.color ? `<span class="tt-dot" style="background:${r.color}"></span>` : ''}${r.label}</span><span class="tt-val">${r.value}</span></div>`).join('')}
    </div>`;
  }

  function renderStoryPanel(elId, { keyLabel, keyValue, keySub, bullets, why, actionLabel, actionText }) {
    const el = document.getElementById(elId);
    if (!el) return;
    el.innerHTML = `
      <div class="story-key-card">
        <span class="story-key-label">${keyLabel}</span>
        <span class="story-key-value">${keyValue}</span>
        <span class="story-key-sub">${keySub}</span>
      </div>
      <div class="story-section">
        <span class="story-section-hdr">What the data shows</span>
        <ul class="story-bullets">${bullets.map(b => `<li>${b}</li>`).join('')}</ul>
      </div>
      <div class="story-section">
        <span class="story-section-hdr">Why it matters</span>
        <div class="story-why">${why}</div>
      </div>
      <div class="story-action-box">
        <span class="action-chip">${actionLabel}</span>
        <span class="story-action-text">${actionText}</span>
      </div>`;
  }

  const floatingTip = document.getElementById('fw-floating-tooltip');
  function showFloatingTip(targetEl, title, rows) {
    floatingTip.innerHTML = ttCard(title, rows);
    floatingTip.classList.add('visible');
    const rect = targetEl.getBoundingClientRect();
    const tw = floatingTip.offsetWidth || 260, th = floatingTip.offsetHeight || 90;
    let left = Math.max(12, Math.min(window.innerWidth - tw - 12, rect.left + rect.width / 2 - tw / 2));
    let top = rect.bottom + 8;
    if (top + th > window.innerHeight - 12) top = rect.top - th - 8;
    floatingTip.style.left = `${left}px`;
    floatingTip.style.top = `${top}px`;
  }
  const hideFloatingTip = () => floatingTip.classList.remove('visible');

  function bindFloatingTooltips() {
    document.querySelectorAll('[data-info]').forEach(el => {
      el.onmouseenter = () => showFloatingTip(el, 'How to Read This Chart', [{ label: el.dataset.info, value: '' }]);
      el.onmouseleave = hideFloatingTip;
    });
    document.querySelectorAll('[data-kpi-tip]').forEach(el => {
      el.onmouseenter = () => { try { const i = JSON.parse(el.dataset.kpiTip); showFloatingTip(el, i.title, i.rows); } catch (_) {} };
      el.onmouseleave = hideFloatingTip;
    });
    document.querySelectorAll('table.bi-table td').forEach(td => {
      if (td.scrollWidth > td.clientWidth) {
        td.onmouseenter = () => showFloatingTip(td, 'Full Value', [{ label: td.textContent, value: '' }]);
        td.onmouseleave = hideFloatingTip;
      }
    });
  }

  // =========================================================================
  // ECHARTS ENGINE WITH LAZY INIT & RESIZE OBSERVER
  // =========================================================================
  function getThemeColors() {
    const dark = state.theme === 'dark';
    return {
      text: dark ? '#CBD5E1' : '#475569',
      title: dark ? '#F8FAFC' : '#0F172A',
      grid: dark ? '#1E293B' : '#E2E8F0',
      tooltipBg: dark ? '#111A2E' : '#FFFFFF',
      tooltipBorder: dark ? '#334155' : '#CBD5E1'
    };
  }

  function renderChart(containerId, optionBuilder, hasData = true, onClickHandler = null) {
    const el = document.getElementById(containerId);
    if (!el) return;
    const oldEmpty = el.querySelector('.chart-empty-state');
    if (oldEmpty) oldEmpty.remove();

    if (!hasData || !window.echarts) {
      const inst = window.echarts ? window.echarts.getInstanceByDom(el) : null;
      if (inst) inst.clear();
      const empty = document.createElement('div');
      empty.className = 'chart-empty-state';
      empty.innerHTML = `<strong>No data for this selection</strong><span>Reset or adjust active slicers.</span>`;
      el.appendChild(empty);
      return;
    }

    try {
      let chart = window.echarts.getInstanceByDom(el);
      if (!chart) {
        chart = window.echarts.init(el);
        if (!state.resizeObservers.has(containerId)) {
          let raf;
          const ro = new ResizeObserver(() => {
            cancelAnimationFrame(raf);
            raf = requestAnimationFrame(() => {
              const inst = window.echarts.getInstanceByDom(el);
              if (inst && el.offsetWidth > 0 && el.offsetHeight > 0) inst.resize();
            });
          });
          ro.observe(el);
          state.resizeObservers.set(containerId, ro);
        }
      }
      const tc = getThemeColors();
      const opt = optionBuilder(tc);
      opt.animationDuration = 320;
      if (opt.tooltip) {
        opt.tooltip.confine = true;
        opt.tooltip.backgroundColor = tc.tooltipBg;
        opt.tooltip.borderColor = tc.tooltipBorder;
        opt.tooltip.borderWidth = 1;
        opt.tooltip.textStyle = { color: tc.title, fontFamily: 'Inter, sans-serif', fontSize: 12 };
        opt.tooltip.extraCssText = 'border-radius:12px; box-shadow:0 10px 26px rgba(15,23,42,0.18); padding:10px 12px;';
      }
      chart.setOption(opt, true);
      chart.off('click');
      if (onClickHandler) chart.on('click', onClickHandler);
    } catch (err) {
      el.innerHTML = `<div class="chart-empty-state"><strong>Visual Error</strong><span>${err.message}</span></div>`;
    }
  }

  function resizeActiveSlideCharts() {
    const active = document.querySelector('.slide.active');
    if (!active || !window.echarts) return;
    active.querySelectorAll('.chart-container').forEach(el => {
      const inst = window.echarts.getInstanceByDom(el);
      if (inst && el.offsetWidth > 0 && el.offsetHeight > 0) inst.resize();
    });
  }

  // =========================================================================
  // SLICERS
  // =========================================================================
  function toggleSet(setObj, val) {
    if (setObj.has(val)) setObj.delete(val); else setObj.add(val);
    renderAll();
  }

  function initSlicerOptions() {
    const storeSel = document.getElementById('filter-store-select');
    const stores = [...new Set(state.cleanRows.map(r => r.StoreID))].sort();
    storeSel.innerHTML = `<option value="">All ${stores.length} Stores</option>` + stores.map(s => `<option value="${s}">${s}</option>`).join('');
    const dates = state.cleanRows.map(r => r.Date).sort();
    document.getElementById('filter-date-start').value = state.filters.dateStart = dates[0];
    document.getElementById('filter-date-end').value = state.filters.dateEnd = dates[dates.length - 1];
    renderSlicerChips();
  }

  function renderSlicerChips() {
    const rows = state.cleanRows;
    const renderGroup = (id, vals, setObj, fn) => {
      const cnts = new Map();
      rows.forEach(r => { const k = fn(r); cnts.set(k, (cnts.get(k) || 0) + 1); });
      const wrap = document.getElementById(id);
      wrap.innerHTML = vals.map(v => `<button class="slicer-chip ${setObj.has(v) ? 'active' : ''}" data-val="${v}" title="${v}: ${cnts.get(v)||0} rows — Click to filter"><span>${v}</span><span class="chip-count">${cnts.get(v)||0}</span></button>`).join('');
      wrap.querySelectorAll('.slicer-chip').forEach(b => b.onclick = () => toggleSet(setObj, b.dataset.val));
    };
    renderGroup('slicer-category-chips', ['Clothing', 'Shoes', 'Accessories'], state.filters.categories, r => r.Category);
    renderGroup('slicer-daytype-chips', ['Weekday', 'Weekend'], state.filters.dayTypes, r => r.DayType);
    renderGroup('slicer-season-chips', SEASON_ORDER, state.filters.seasons, r => r.Season);
    renderGroup('slicer-discount-chips', BAND_ORDER, state.filters.discountBands, r => r.DiscountBand);
    renderGroup('slicer-customer-chips', ['Returning', 'New', 'Unknown'], state.filters.customerTypes, r => r.CustomerType);
  }

  function renderFilterPills(count) {
    document.getElementById('slicer-row-counter').textContent = `${fmtNum(count)} of ${fmtNum(state.cleanRows.length)} rows`;
    const f = state.filters, pills = [];
    f.categories.forEach(v => pills.push({ l: `Cat: ${v}`, c: () => f.categories.delete(v) }));
    if (f.store) pills.push({ l: `Store: ${f.store}`, c: () => { f.store = ''; document.getElementById('filter-store-select').value = ''; } });
    f.dayTypes.forEach(v => pills.push({ l: `Day: ${v}`, c: () => f.dayTypes.delete(v) }));
    f.daysOfWeek.forEach(v => pills.push({ l: `DoW: ${v}`, c: () => f.daysOfWeek.delete(v) }));
    f.seasons.forEach(v => pills.push({ l: `${v}`, c: () => f.seasons.delete(v) }));
    f.discountBands.forEach(v => pills.push({ l: `${v}`, c: () => f.discountBands.delete(v) }));
    f.customerTypes.forEach(v => pills.push({ l: `Cust: ${v}`, c: () => f.customerTypes.delete(v) }));
    if (f.excludeMissing) pills.push({ l: `Exclude Raw Blanks`, c: () => { f.excludeMissing = false; document.getElementById('toggle-exclude-missing').checked = false; } });

    const wrap = document.getElementById('active-filter-pills');
    wrap.innerHTML = pills.map((p, i) => `<span class="filter-pill" data-i="${i}">${p.l} ✕</span>`).join('');
    wrap.querySelectorAll('.filter-pill').forEach(el => el.onclick = () => { pills[Number(el.dataset.i)].c(); renderAll(); });
  }

  // =========================================================================
  // RENDER ALL 12 SLIDES
  // =========================================================================
  function renderAll() {
    renderSlicerChips();
    const rows = getFilteredRows();
    renderFilterPills(rows.length);
    const sum = computeSummary(rows);
    const base = computeSummary(state.cleanRows);

    renderSlide2(rows, sum, base);
    renderSlide3(rows);
    renderSlide4(rows, sum);
    renderSlide5(rows, sum);
    renderSlide6(rows, sum);
    renderSlide7(rows, sum);
    renderSlide8(rows, sum);
    renderSlide9(rows, sum);
    renderSlide10(rows, sum);

    bindFloatingTooltips();
    updateDiagnostics();
  }

  // --- SLIDE 2: EXECUTIVE SUMMARY ---
  function renderSlide2(rows, sum, base) {
    const kpis = [
      { cls: '', l: 'Total Sales (Net)', v: fmtINR(sum.netRev, true), b: `${fmtINR(sum.salesPerStoreWeek, true)}/store/wk`, s: `${fmtNum(sum.orders)} orders · ${sum.storesCount} stores`, tip: { title: 'Total Net Sales', rows: [{ label: 'Formula', value: 'Gross × (1 − Disc%)' }, { label: 'Filtered', value: fmtINR(sum.netRev) }, { label: 'Baseline', value: fmtINR(base.netRev) }] } },
      { cls: 'kpi-teal', l: 'Average Order Value', v: fmtINR(sum.aov), b: `${fmtINR(sum.asp)} ASP`, s: `${sum.basketSize.toFixed(2)} units / order`, tip: { title: 'Average Order Value', rows: [{ label: 'Formula', value: 'Net Revenue / Orders' }, { label: 'Filtered', value: fmtINR(sum.aov) }, { label: 'Baseline', value: fmtINR(base.aov) }] } },
      { cls: 'kpi-green', l: 'Profit Margin %', v: fmtPct(sum.marginPct), b: fmtINR(sum.profit, true), s: 'Target Benchmark: 35.0%', tip: { title: 'Operating Profit Margin', rows: [{ label: 'Formula', value: '(Profit / NetRev) × 100' }, { label: 'Filtered', value: fmtPct(sum.marginPct) }, { label: 'Baseline', value: fmtPct(base.marginPct) }] } },
      { cls: 'kpi-gold', l: 'Units Sold', v: fmtNum(sum.units), b: `${fmtPct(sum.avgDisc)} Avg Disc`, s: 'Across 3 product categories', tip: { title: 'Total Units Sold', rows: [{ label: 'Sum of Quantity', value: fmtNum(sum.units) }, { label: 'Baseline', value: fmtNum(base.units) }] } },
      { cls: 'kpi-rose', l: 'Weekend / Weekday Ratio', v: `${sum.wkndRatio.toFixed(2)}x`, b: `${fmtPct(sum.wkndShare, 1)} Wknd Share`, s: `${fmtINR(sum.wkndRev, true)} vs ${fmtINR(sum.wkdyRev, true)}`, tip: { title: 'Weekend / Weekday Sales Ratio', rows: [{ label: 'Formula', value: 'Weekend Rev / Weekday Rev' }, { label: 'Weekend Rev', value: fmtINR(sum.wkndRev) }, { label: 'Weekday Rev', value: fmtINR(sum.wkdyRev) }] } }
    ];
    document.getElementById('s2-kpi-cards').innerHTML = kpis.map(k => `
      <div class="kpi-card ${k.cls}" data-kpi-tip='${JSON.stringify(k.tip).replace(/'/g, "&apos;")}'>
        <div class="kpi-header-row"><span class="kpi-label">${k.l}</span><span class="kpi-delta-badge neutral">${k.b}</span></div>
        <div class="kpi-val-row"><span class="kpi-value">${k.v}</span></div>
        <span class="kpi-sub">${k.s}</span>
      </div>`).join('');

    renderChart('s2-chart-gauge', tc => ({
      tooltip: { formatter: () => ttCard('Operating Margin', [{ color: '#7C3AED', label: 'Current', value: fmtPct(sum.marginPct) }, { color: '#059669', label: 'Target', value: '35.00%' }]) },
      series: [{
        type: 'gauge', startAngle: 195, endAngle: -15, min: 0, max: 50,
        progress: { show: true, width: 14, roundCap: true, itemStyle: { color: sum.marginPct >= 35 ? '#059669' : '#7C3AED' } },
        axisLine: { lineStyle: { width: 14, color: [[1, tc.grid]] } },
        pointer: { show: false }, axisTick: { show: false }, splitLine: { show: false }, axisLabel: { show: false },
        detail: { formatter: v => `${v.toFixed(2)}%`, color: tc.title, fontSize: 24, fontWeight: 800, offsetCenter: [0, '6%'] },
        data: [{ value: Number(sum.marginPct.toFixed(2)) }]
      }]
    }), rows.length > 0);
    document.getElementById('s2-insight-gauge').innerHTML = `Blended margin is <strong>${fmtPct(sum.marginPct)}</strong> (${fmtINR(sum.profit, true)} profit).`;

    const catMap = groupBy(rows, r => r.Category);
    const cats = [...catMap.values()].sort((a, b) => b.netRev - a.netRev);
    renderChart('s2-chart-donut', tc => ({
      tooltip: { trigger: 'item', formatter: p => ttCard(p.name, [{ color: CAT_COLORS[p.name], label: 'Net Revenue', value: fmtINR(p.data.raw.netRev) }, { label: 'Share', value: fmtPct(safeDiv(p.data.raw.netRev, sum.netRev) * 100, 1) }, { label: 'Margin', value: fmtPct(p.data.raw.marginPct) }]) },
      legend: { bottom: 0, textStyle: { color: tc.text, fontSize: 11 } },
      series: [{
        type: 'pie', radius: ['48%', '74%'], center: ['50%', '43%'], label: { show: false },
        itemStyle: { borderRadius: 5, borderColor: tc.tooltipBg, borderWidth: 2 },
        data: cats.map(c => ({ name: c.key, value: Math.round(c.netRev), raw: c, itemStyle: { color: CAT_COLORS[c.key] || '#6366F1' } }))
      }],
      graphic: [{ type: 'text', left: 'center', top: '38%', style: { text: fmtINR(sum.netRev, true), font: '800 17px Inter,sans-serif', fill: tc.title } }]
    }), rows.length > 0, p => toggleSet(state.filters.categories, p.name));
    document.getElementById('s2-insight-donut').innerHTML = cats[0] ? `<strong>${cats[0].key}</strong> leads with <strong>${fmtPct(safeDiv(cats[0].netRev, sum.netRev) * 100, 1)}</strong> revenue share.` : 'No data.';

    const noDisc = rows.filter(r => r.Discount === 0), hiDisc = rows.filter(r => r.Discount >= 16);
    const m0 = safeDiv(noDisc.reduce((a, b) => a + b.Profit, 0), noDisc.reduce((a, b) => a + b.NetRevenue, 0)) * 100;
    const mHi = safeDiv(hiDisc.reduce((a, b) => a + b.Profit, 0), hiDisc.reduce((a, b) => a + b.NetRevenue, 0)) * 100;
    document.getElementById('s2-key-findings').innerHTML = `
      <li><strong>Weekend Stagnation:</strong> Weekends represent <strong>${fmtPct(sum.wkndShare, 1)}</strong> of revenue (ratio <strong>${sum.wkndRatio.toFixed(2)}x</strong> vs weekdays).</li>
      <li><strong>Discount Margin Erosion:</strong> Margin falls from <strong>${fmtPct(m0)}</strong> (0% off) to <strong>${fmtPct(mHi)}</strong> on 16–30% discounts.</li>
      <li><strong>Category Roles:</strong> Shoes drives <strong>₹4,841</strong> AOV while Accessories yields top margin.</li>
      <li><strong>Store Dispersion:</strong> Footwear inventory gaps explain the 7x spread between top and bottom stores.</li>`;
  }

  // --- SLIDE 3: DATA CLEANING ---
  function renderSlide3(rows) {
    const cs = state.cleaningStats;
    document.getElementById('s3-hygiene-kpis').innerHTML = [
      { cls: 'kpi-green', l: 'Raw -> Active Rows', v: `${fmtNum(rows.length)} / ${fmtNum(cs.rawCount)}`, b: `${cs.duplicates} Dupes`, s: state.filters.excludeMissing ? 'Excluding raw blanks' : 'Imputed defaults active' },
      { cls: 'kpi-gold', l: 'Missing Discount (Raw)', v: fmtNum(cs.blankDisc), b: fmtPct(safeDiv(cs.blankDisc, cs.rawCount) * 100, 1), s: 'Default cleaning: Blank → 0%' },
      { cls: 'kpi-rose', l: 'Missing CustomerType', v: fmtNum(cs.blankCust), b: fmtPct(safeDiv(cs.blankCust, cs.rawCount) * 100, 1), s: 'Default cleaning: Blank → "Unknown"' },
      { cls: 'kpi-teal', l: 'Discounts > 30% Policy', v: fmtNum(cs.over30), b: cs.over30 === 0 ? '100% Compliant' : 'Violation', s: 'Corporate max discount cap = 30%' }
    ].map(k => `<div class="kpi-card ${k.cls}"><div class="kpi-header-row"><span class="kpi-label">${k.l}</span><span class="kpi-delta-badge neutral">${k.b}</span></div><div class="kpi-val-row"><span class="kpi-value">${k.v}</span></div><span class="kpi-sub">${k.s}</span></div>`).join('');

    const labels = ['Blank Discount', 'Blank CustomerType', 'Blank PaymentMode', 'Discounts > 30%'];
    const vals = [cs.blankDisc, cs.blankCust, cs.blankPay, cs.over30];
    renderChart('s3-chart-audit', tc => ({
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: p => ttCard(labels[p[0].dataIndex], [{ color: p[0].color, label: 'Raw Records', value: fmtNum(vals[p[0].dataIndex]) }, { label: '% of Dataset', value: fmtPct(safeDiv(vals[p[0].dataIndex], cs.rawCount) * 100, 1) }]) },
      grid: { left: 48, right: 20, top: 20, bottom: 32 },
      xAxis: { type: 'category', data: labels, axisLabel: { color: tc.text, fontSize: 11 } },
      yAxis: { type: 'value', axisLabel: { color: tc.text }, splitLine: { lineStyle: { color: tc.grid } } },
      series: [{ type: 'bar', barMaxWidth: 46, itemStyle: { borderRadius: [6, 6, 0, 0], color: p => ['#D97706', '#E11D48', '#7C3AED', '#059669'][p.dataIndex] }, data: vals }]
    }), true);

    document.getElementById('s3-insight-audit').innerHTML = `Raw CSV had <strong>${cs.blankDisc}</strong> blank Discounts and <strong>${cs.blankCust}</strong> blank CustomerTypes. Current view: <strong>${fmtNum(rows.length)}</strong> rows.`;
  }

  // --- SLIDE 4: SALES KPI DASHBOARD ---
  function renderSlide4(rows, sum) {
    const mMap = groupBy(rows, r => r.MonthKey);
    const months = [...mMap.keys()].sort();
    const mData = months.map(m => mMap.get(m));

    renderChart('s4-chart-trend', tc => ({
      tooltip: {
        trigger: 'axis',
        formatter: p => {
          const i = p[0].dataIndex, cur = mData[i], prev = i > 0 ? mData[i - 1] : null;
          const mom = prev ? safeDiv(cur.netRev - prev.netRev, prev.netRev) * 100 : null;
          return ttCard(`Month: ${cur.key}`, [
            { color: '#7C3AED', label: 'Net Revenue', value: fmtINR(cur.netRev) },
            { color: '#059669', label: 'Margin %', value: fmtPct(cur.marginPct) },
            { label: 'MoM Rev Change', value: mom !== null ? `${mom >= 0 ? '+' : ''}${mom.toFixed(1)}%` : 'Start' }
          ]);
        }
      },
      legend: { top: 0, textStyle: { color: tc.text, fontSize: 11 } },
      grid: { left: 52, right: 44, top: 30, bottom: 26 },
      xAxis: { type: 'category', data: months, axisLabel: { color: tc.text, fontSize: 10 } },
      yAxis: [
        { type: 'value', axisLabel: { color: tc.text, fontSize: 10, formatter: v => fmtINR(v, true) }, splitLine: { lineStyle: { color: tc.grid } } },
        { type: 'value', min: 20, max: 50, axisLabel: { color: tc.text, fontSize: 10, formatter: '{value}%' }, splitLine: { show: false } }
      ],
      series: [
        {
          name: 'Net Revenue', type: 'line', smooth: true, lineStyle: { width: 3, color: '#7C3AED' }, itemStyle: { color: '#7C3AED' },
          areaStyle: { color: 'rgba(124,58,237,0.16)' },
          markPoint: { data: [{ type: 'max', name: 'Peak' }], label: { formatter: p => fmtINR(p.value, true) } },
          markLine: { silent: true, data: [{ type: 'average', name: 'Avg' }] },
          data: mData.map(d => Math.round(d.netRev))
        },
        { name: 'Margin %', type: 'line', yAxisIndex: 1, smooth: true, lineStyle: { width: 2, color: '#059669' }, itemStyle: { color: '#059669' }, data: mData.map(d => Number(d.marginPct.toFixed(2))) }
      ]
    }), months.length > 0);

    const catMap = groupBy(rows, r => r.Category);
    const cats = ['Clothing', 'Shoes', 'Accessories'].map(c => catMap.get(c) || { key: c, netRev: 0, profit: 0, marginPct: 0, orders: 0 });
    renderChart('s4-chart-catstore', tc => ({
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: p => { const c = cats[p[0].dataIndex]; return ttCard(c.key, [{ color: CAT_COLORS[c.key], label: 'Net Revenue', value: fmtINR(c.netRev) }, { label: 'Share', value: fmtPct(safeDiv(c.netRev, sum.netRev)*100, 1) }, { label: 'Profit', value: fmtINR(c.profit) }]); } },
      grid: { left: 52, right: 16, top: 18, bottom: 26 },
      xAxis: { type: 'category', data: cats.map(c => c.key), axisLabel: { color: tc.text } },
      yAxis: { type: 'value', axisLabel: { color: tc.text, formatter: v => fmtINR(v, true) }, splitLine: { lineStyle: { color: tc.grid } } },
      series: [{ type: 'bar', barMaxWidth: 46, itemStyle: { borderRadius: [6, 6, 0, 0], color: p => CAT_COLORS[cats[p.dataIndex].key] }, data: cats.map(c => Math.round(c.netRev)) }]
    }), rows.length > 0, p => toggleSet(state.filters.categories, p.name));

    const peakM = [...mData].sort((a, b) => b.netRev - a.netRev)[0];
    renderStoryPanel('s4-story', {
      keyLabel: 'Sales / Store / Week',
      keyValue: fmtINR(sum.salesPerStoreWeek),
      keySub: `Total ${fmtINR(sum.netRev, true)} across ${sum.storesCount} stores`,
      bullets: [
        peakM ? `Peak monthly sales reached <strong>${fmtINR(peakM.netRev)}</strong> in <strong>${peakM.key}</strong> (festive surge).` : 'No monthly data.',
        `Network blended margin holds at <strong>${fmtPct(sum.marginPct)}</strong> (${fmtINR(sum.profit, true)} profit).`,
        `Average order value is <strong>${fmtINR(sum.aov)}</strong> across ${fmtNum(sum.orders)} transactions.`
      ],
      why: 'Identifying seasonal festive spikes vs steady baseline months prevents pre-Diwali stockouts and guides inventory allocation.',
      actionLabel: 'Action: Lock Inventory',
      actionText: 'Lock festive inventory builds by September 15th to capture 100% of October peak demand.'
    });
  }

  // --- SLIDE 5: CATEGORY & PRODUCT PERFORMANCE (Q1) ---
  function renderSlide5(rows, sum) {
    const catMap = groupBy(rows, r => r.Category);
    const cats = ['Clothing', 'Shoes', 'Accessories'].map(c => catMap.get(c) || { key: c, netRev: 0, profit: 0, marginPct: 0, units: 0, aov: 0 });

    renderChart('s5-chart-catbar', tc => ({
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: p => { const c = cats[p[0].dataIndex]; return ttCard(c.key, [{ color: '#7C3AED', label: 'Net Revenue', value: fmtINR(c.netRev) }, { color: '#059669', label: 'Profit', value: fmtINR(c.profit) }, { label: 'Margin %', value: fmtPct(c.marginPct) }, { label: 'AOV', value: fmtINR(c.aov) }]); } },
      legend: { top: 0, textStyle: { color: tc.text, fontSize: 11 } },
      grid: { left: 52, right: 16, top: 30, bottom: 26 },
      xAxis: { type: 'category', data: cats.map(c => c.key), axisLabel: { color: tc.text } },
      yAxis: { type: 'value', axisLabel: { color: tc.text, formatter: v => fmtINR(v, true) }, splitLine: { lineStyle: { color: tc.grid } } },
      series: [
        { name: 'Net Revenue', type: 'bar', barMaxWidth: 34, itemStyle: { color: '#7C3AED', borderRadius: [5, 5, 0, 0] }, data: cats.map(c => Math.round(c.netRev)) },
        { name: 'Profit', type: 'bar', barMaxWidth: 34, itemStyle: { color: '#059669', borderRadius: [5, 5, 0, 0] }, data: cats.map(c => Math.round(c.profit)) }
      ]
    }), rows.length > 0, p => toggleSet(state.filters.categories, p.name));

    const prodMap = groupBy(rows, r => `${r.ProductID}|${r.Category}`);
    const prods = [...prodMap.values()].sort((a, b) => b.netRev - a.netRev);
    const sampleProds = prods.slice(0, 60);
    const medUnits = sampleProds.length ? [...sampleProds].sort((a, b) => a.units - b.units)[Math.floor(sampleProds.length / 2)].units : 2;
    const medMarg = sampleProds.length ? [...sampleProds].sort((a, b) => a.marginPct - b.marginPct)[Math.floor(sampleProds.length / 2)].marginPct : 35;

    renderChart('s5-chart-quad', tc => ({
      tooltip: { formatter: p => { const d = p.data.raw; const [pid, cat] = d.key.split('|'); return ttCard(`${pid} (${cat})`, [{ color: CAT_COLORS[cat], label: 'Units Sold', value: fmtNum(d.units) }, { label: 'Margin %', value: fmtPct(d.marginPct) }, { label: 'Net Revenue', value: fmtINR(d.netRev) }]); } },
      grid: { left: 46, right: 18, top: 18, bottom: 28 },
      xAxis: { type: 'value', name: 'Units', axisLabel: { color: tc.text, fontSize: 10 }, splitLine: { lineStyle: { color: tc.grid } } },
      yAxis: { type: 'value', name: 'Margin%', axisLabel: { color: tc.text, fontSize: 10, formatter: '{value}%' }, splitLine: { lineStyle: { color: tc.grid } } },
      series: [{
        type: 'scatter', symbolSize: 9,
        markLine: { silent: true, lineStyle: { type: 'dashed', color: tc.text }, data: [{ xAxis: medUnits }, { yAxis: medMarg }] },
        data: sampleProds.map(d => ({ value: [d.units, Number(d.marginPct.toFixed(1))], raw: d, itemStyle: { color: d.marginPct < 25 ? '#DC2626' : (CAT_COLORS[d.key.split('|')[1]] || '#7C3AED'), opacity: 0.82 } }))
      }]
    }), sampleProds.length > 0);

    document.getElementById('s5-table-wrap').innerHTML = `<table class="bi-table"><thead><tr><th>Product</th><th>Category</th><th>Units</th><th>Net Rev</th><th>Profit</th><th>Margin %</th></tr></thead><tbody>${prods.slice(0, 25).map(p => { const [id, c] = p.key.split('|'); return `<tr><td>${id}</td><td>${c}</td><td>${p.units}</td><td>${fmtINR(p.netRev)}</td><td>${fmtINR(p.profit)}</td><td>${fmtPct(p.marginPct)}</td></tr>`; }).join('')}</tbody></table>`;

    const underPerf = prods.filter(p => p.marginPct < 25).length;
    renderStoryPanel('s5-story', {
      keyLabel: 'Top Margin Category',
      keyValue: `${cats[2].key} (${fmtPct(cats[2].marginPct)})`,
      keySub: `Shoes AOV: ${fmtINR(cats[1].aov)} vs Clothing ${fmtINR(cats[0].aov)}`,
      bullets: [
        `<strong>Clothing</strong> generates <strong>${fmtINR(cats[0].netRev, true)}</strong> (${fmtPct(safeDiv(cats[0].netRev, sum.netRev) * 100, 1)} share).`,
        `<strong>Shoes</strong> delivers <strong>${fmtPct(safeDiv(cats[1].netRev, sum.netRev) * 100, 1)}</strong> revenue from high ₹4,841 AOV.`,
        `<strong>${underPerf}</strong> active SKUs fall below 25% margin due to deep markdowns.`
      ],
      why: 'Answers Q1 & Objective 2: pairing high-margin Accessories with high-ticket Shoes multiplies operating profit per basket.',
      actionLabel: 'Action: Bundle & Prune',
      actionText: 'Bundle Accessories at checkout with Clothing/Shoes and restrict >15% discounts on low-margin SKUs.'
    });
  }

  // --- SLIDE 6: WEEKEND VS WEEKDAY (Q2) ---
  function renderSlide6(rows, sum) {
    const dowMap = groupBy(rows, r => r.DayOfWeek);
    const dow = DAY_ORDER.map(d => dowMap.get(d) || { key: d, netRev: 0, orders: 0, aov: 0, marginPct: 0 });
    const avgDow = safeDiv(sum.netRev, 7);

    renderChart('s6-chart-dow', tc => ({
      tooltip: { trigger: 'axis', formatter: p => { const d = dow[p[0].dataIndex]; return ttCard(d.key, [{ color: p[0].color, label: 'Net Revenue', value: fmtINR(d.netRev) }, { label: 'Orders', value: fmtNum(d.orders) }, { label: 'AOV', value: fmtINR(d.aov) }, { label: 'vs 7-Day Avg', value: `${d.netRev >= avgDow ? '+' : ''}${fmtINR(d.netRev - avgDow)}` }]); } },
      grid: { left: 52, right: 16, top: 22, bottom: 26 },
      xAxis: { type: 'category', data: DAY_ORDER.map(d => d.slice(0, 3)), axisLabel: { color: tc.text } },
      yAxis: { type: 'value', axisLabel: { color: tc.text, formatter: v => fmtINR(v, true) }, splitLine: { lineStyle: { color: tc.grid } } },
      series: [{
        type: 'bar', barMaxWidth: 38,
        markLine: { silent: true, data: [{ type: 'average', name: 'Avg' }] },
        itemStyle: { borderRadius: [6, 6, 0, 0], color: p => (p.dataIndex >= 5 ? '#E11D48' : '#7C3AED') },
        data: dow.map(d => Math.round(d.netRev))
      }]
    }), rows.length > 0, p => toggleSet(state.filters.daysOfWeek, DAY_ORDER[p.dataIndex]));

    // Festival vs Regular Weeks (Weekday vs Weekend avg per day)
    const festWknd = rows.filter(r => r.Season === 'Festive (Oct-Nov)' && r.DayType === 'Weekend').reduce((a, b) => a + b.NetRevenue, 0);
    const festWkdy = rows.filter(r => r.Season === 'Festive (Oct-Nov)' && r.DayType === 'Weekday').reduce((a, b) => a + b.NetRevenue, 0);
    const regWknd = rows.filter(r => r.Season !== 'Festive (Oct-Nov)' && r.DayType === 'Weekend').reduce((a, b) => a + b.NetRevenue, 0);
    const regWkdy = rows.filter(r => r.Season !== 'Festive (Oct-Nov)' && r.DayType === 'Weekday').reduce((a, b) => a + b.NetRevenue, 0);

    renderChart('s6-chart-fest', tc => ({
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: p => ttCard(p[0].name, p.map(s => ({ color: s.color, label: s.seriesName, value: fmtINR(s.value) }))) },
      legend: { top: 0, textStyle: { color: tc.text, fontSize: 11 } },
      grid: { left: 52, right: 16, top: 30, bottom: 26 },
      xAxis: { type: 'category', data: ['Festive (Oct-Nov)', 'Non-Festive'], axisLabel: { color: tc.text } },
      yAxis: { type: 'value', axisLabel: { color: tc.text, formatter: v => fmtINR(v, true) }, splitLine: { lineStyle: { color: tc.grid } } },
      series: [
        { name: 'Weekday Revenue', type: 'bar', barMaxWidth: 36, itemStyle: { color: '#7C3AED', borderRadius: [5, 5, 0, 0] }, data: [Math.round(festWkdy), Math.round(regWkdy)] },
        { name: 'Weekend Revenue', type: 'bar', barMaxWidth: 36, itemStyle: { color: '#E11D48', borderRadius: [5, 5, 0, 0] }, data: [Math.round(festWknd), Math.round(regWknd)] }
      ]
    }), rows.length > 0);

    const peakDay = [...dow].sort((a, b) => b.netRev - a.netRev)[0];
    renderStoryPanel('s6-story', {
      keyLabel: 'Weekend / Weekday Ratio',
      keyValue: `${sum.wkndRatio.toFixed(2)}x`,
      keySub: `Weekends = ${fmtPct(sum.wkndShare, 1)} of revenue (28.6% of days)`,
      bullets: [
        peakDay ? `<strong>${peakDay.key}</strong> is the #1 sales day (<strong>${fmtINR(peakDay.netRev)}</strong>, ${fmtNum(peakDay.orders)} orders).` : 'No daily data.',
        `Saturday logs fewer orders than Friday and Monday, confirming weekend stagnation.`,
        `Festive weekends generate <strong>${fmtINR(festWknd, true)}</strong>, showing event-driven promos work.`
      ],
      why: 'Answers Q2 & Objective 1: Weekend volume matches calendar proportion (~28.7%), leaving +15% headroom untapped.',
      actionLabel: 'Action: Weekend Events',
      actionText: 'Launch weekend-exclusive "Complete the Look" bundle offers and shift baseline staffing toward Friday–Monday.'
    });
  }

  // --- SLIDE 7: DISCOUNT IMPACT (Q3) ---
  function renderSlide7(rows) {
    const rates = [0, 5, 10, 15, 20, 25, 30];
    const rateData = rates.map(rt => {
      const sub = rows.filter(r => r.Discount === rt);
      const rev = sub.reduce((a, b) => a + b.NetRevenue, 0);
      const prof = sub.reduce((a, b) => a + b.Profit, 0);
      const qty = sub.reduce((a, b) => a + b.Quantity, 0);
      return { rate: `${rt}%`, marginPct: safeDiv(prof, rev) * 100, basket: safeDiv(qty, sub.length), orders: sub.length };
    });

    renderChart('s7-chart-disc', tc => ({
      tooltip: { trigger: 'axis', formatter: p => { const d = rateData[p[0].dataIndex]; return ttCard(`Discount: ${d.rate}`, [{ color: '#E11D48', label: 'Margin %', value: fmtPct(d.marginPct) }, { color: '#7C3AED', label: 'Units/Order', value: `${d.basket.toFixed(2)} u` }, { label: 'Orders', value: fmtNum(d.orders) }]); } },
      legend: { top: 0, textStyle: { color: tc.text, fontSize: 11 } },
      grid: { left: 46, right: 44, top: 30, bottom: 26 },
      xAxis: { type: 'category', data: rateData.map(d => d.rate), axisLabel: { color: tc.text } },
      yAxis: [
        { type: 'value', min: 0, max: 50, axisLabel: { color: tc.text, formatter: '{value}%' }, splitLine: { lineStyle: { color: tc.grid } } },
        { type: 'value', min: 0, max: 4, axisLabel: { color: tc.text, formatter: '{value}u' }, splitLine: { show: false } }
      ],
      series: [
        { name: 'Margin %', type: 'bar', barMaxWidth: 32, markLine: { silent: true, lineStyle: { color: '#DC2626', type: 'dashed' }, data: [{ xAxis: '30%', label: { formatter: '30% Policy Cap' } }] }, itemStyle: { color: '#E11D48', borderRadius: [5, 5, 0, 0] }, data: rateData.map(d => Number(d.marginPct.toFixed(2))) },
        { name: 'Units / Order', type: 'line', yAxisIndex: 1, lineStyle: { width: 3, color: '#7C3AED' }, itemStyle: { color: '#7C3AED' }, data: rateData.map(d => Number(d.basket.toFixed(2))) }
      ]
    }), rows.length > 0);

    const cats = ['Clothing', 'Shoes', 'Accessories'];
    const mNo = cats.map(c => { const s = rows.filter(r => r.Category === c && r.Discount === 0); return Number((safeDiv(s.reduce((a, b) => a + b.Profit, 0), s.reduce((a, b) => a + b.NetRevenue, 0)) * 100).toFixed(2)); });
    const mHi = cats.map(c => { const s = rows.filter(r => r.Category === c && r.Discount >= 16); return Number((safeDiv(s.reduce((a, b) => a + b.Profit, 0), s.reduce((a, b) => a + b.NetRevenue, 0)) * 100).toFixed(2)); });

    renderChart('s7-chart-catdisc', tc => ({
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: p => ttCard(p[0].name, p.map(s => ({ color: s.color, label: s.seriesName, value: fmtPct(s.value) }))) },
      legend: { top: 0, textStyle: { color: tc.text, fontSize: 11 } },
      grid: { left: 46, right: 16, top: 30, bottom: 26 },
      xAxis: { type: 'category', data: cats, axisLabel: { color: tc.text } },
      yAxis: { type: 'value', min: 0, max: 50, axisLabel: { color: tc.text, formatter: '{value}%' }, splitLine: { lineStyle: { color: tc.grid } } },
      series: [
        { name: '0% Discount Margin', type: 'bar', barMaxWidth: 34, itemStyle: { color: '#059669', borderRadius: [5, 5, 0, 0] }, data: mNo },
        { name: '16-30% Discount Margin', type: 'bar', barMaxWidth: 34, itemStyle: { color: '#DC2626', borderRadius: [5, 5, 0, 0] }, data: mHi }
      ]
    }), rows.length > 0);

    const rVal = pearsonR(rows.map(r => r.Discount), rows.map(r => r.Quantity));
    renderStoryPanel('s7-story', {
      keyLabel: 'Discount Elasticity (r)',
      keyValue: rVal.toFixed(4),
      keySub: 'Correlation between Discount % and Units Sold',
      bullets: [
        `Basket size stays flat (~<strong>2.1 units</strong>) regardless of discount depth.`,
        `High discounts (16–30%) cut margin from <strong>${fmtPct(rateData[0].marginPct)}</strong> down to <strong>${fmtPct(rateData[6].marginPct)}</strong> at 30%.`,
        `100% of transactions comply with the <strong>30% policy cap</strong>.`
      ],
      why: 'Answers Q3 & Objective 3: Unconditioned markdowns subsidize existing demand instead of driving incremental volume.',
      actionLabel: 'Action: 15% Unbundled Cap',
      actionText: 'Cap unbundled markdowns at 15% and require 3+ items or ₹3,500 cart value to unlock 20–30% discounts.'
    });
  }

  // --- SLIDE 8: STORE PERFORMANCE (Q4) ---
  function renderSlide8(rows, sum) {
    const storeMap = groupBy(rows, r => r.StoreID);
    const stores = [...storeMap.values()].sort((a, b) => b.netRev - a.netRev);
    const avgRev = safeDiv(sum.netRev, stores.length);
    const shown = state.s8AllStores ? stores : [...stores.slice(0, 10), ...stores.slice(-10)];

    renderChart('s8-chart-rank', tc => ({
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: p => { const s = shown[p[0].dataIndex]; return ttCard(s.key, [{ color: p[0].color, label: 'Net Revenue', value: fmtINR(s.netRev) }, { label: 'vs Store Avg', value: `${s.netRev >= avgRev ? '+' : ''}${fmtINR(s.netRev - avgRev)}` }, { label: 'Margin %', value: fmtPct(s.marginPct) }, { label: 'Shoe Orders', value: fmtNum(s.shoeOrders) }]); } },
      grid: { left: 64, right: 18, top: 18, bottom: 26 },
      xAxis: { type: 'value', axisLabel: { color: tc.text, fontSize: 10, formatter: v => fmtINR(v, true) }, splitLine: { lineStyle: { color: tc.grid } } },
      yAxis: { type: 'category', data: shown.map(s => s.key).reverse(), axisLabel: { color: tc.text, fontSize: 10 } },
      series: [{ type: 'bar', markLine: { silent: true, data: [{ xAxis: avgRev }] }, itemStyle: { borderRadius: [0, 4, 4, 0], color: p => (shown[shown.length - 1 - p.dataIndex].netRev >= avgRev ? '#7C3AED' : '#D97706') }, data: shown.map(s => Math.round(s.netRev)).reverse() }]
    }), shown.length > 0, p => { state.filters.store = (state.filters.store === p.name) ? '' : p.name; document.getElementById('filter-store-select').value = state.filters.store; renderAll(); });

    renderChart('s8-chart-scatter', tc => ({
      tooltip: { formatter: p => { const s = p.data.raw; return ttCard(s.key, [{ color: p.color, label: 'Net Revenue', value: fmtINR(s.netRev) }, { label: 'Margin %', value: fmtPct(s.marginPct) }, { label: 'Orders / Shoes', value: `${s.orders} (${s.shoeOrders} shoes)` }]); } },
      grid: { left: 48, right: 16, top: 18, bottom: 28 },
      xAxis: { type: 'value', axisLabel: { color: tc.text, fontSize: 10, formatter: v => fmtINR(v, true) }, splitLine: { lineStyle: { color: tc.grid } } },
      yAxis: { type: 'value', min: 28, max: 40, axisLabel: { color: tc.text, fontSize: 10, formatter: '{value}%' }, splitLine: { lineStyle: { color: tc.grid } } },
      series: [{
        type: 'scatter', symbolSize: (v, p) => Math.max(8, Math.min(20, p.data.raw.orders * 0.45)),
        markLine: { silent: true, lineStyle: { type: 'dashed', color: tc.text }, data: [{ xAxis: avgRev }, { yAxis: sum.marginPct }] },
        data: stores.map(s => ({ value: [Math.round(s.netRev), Number(s.marginPct.toFixed(2))], raw: s, itemStyle: { color: s.netRev >= avgRev && s.marginPct >= sum.marginPct ? '#059669' : (s.netRev < avgRev ? '#D97706' : '#DC2626') } }))
      }]
    }), stores.length > 0, p => { state.filters.store = (state.filters.store === p.data.raw.key) ? '' : p.data.raw.key; document.getElementById('filter-store-select').value = state.filters.store; renderAll(); });

    const topS = stores[0], botS = stores[stores.length - 1];
    renderStoryPanel('s8-story', {
      keyLabel: 'Top vs Bottom Store Gap',
      keyValue: topS && botS ? `${safeDiv(topS.netRev, botS.netRev).toFixed(1)}x` : '0x',
      keySub: topS && botS ? `${topS.key} (${fmtINR(topS.netRev, true)}) vs ${botS.key} (${fmtINR(botS.netRev, true)})` : '',
      bullets: [
        topS && botS ? `<strong>Hypothesis — Footwear Mix:</strong> ${botS.key} logged only ${botS.shoeOrders} shoe orders vs ${topS.shoeOrders} at ${topS.key}.` : 'No store data.',
        `<strong>Hypothesis — Order Velocity:</strong> Underperformers average ~23 orders vs ~37 in top performers despite healthy ~35% margins.`,
        `Store_20 and Store_33 show high sales but compressed margins (~32.5%).`
      ],
      why: 'Answers Q4: Underperformance stems from footwear assortment gaps and lower footfall rather than poor unit pricing.',
      actionLabel: 'Action: Pilot Shoe Stock',
      actionText: 'Pilot minimum Footwear SKU allocation in bottom-10 stores and audit discount overrides in Store_20/33.'
    });
  }

  // --- SLIDE 9: CUSTOMER SEGMENTATION (Q5) ---
  function renderSlide9(rows, sum) {
    // Behaviour-based segments built from available fields
    const segFn = r => {
      if (r.CustomerType === 'Unknown') return 'Untracked POS (Unknown)';
      if (r.NetRevenue >= 3000 && r.Discount <= 5) return `${r.CustomerType} · High-Value Full-Price`;
      if (r.Discount >= 16) return `${r.CustomerType} · Discount-Driven`;
      return `${r.CustomerType} · Core Everyday`;
    };
    const segMap = groupBy(rows, segFn);
    const segs = [...segMap.values()].sort((a, b) => b.netRev - a.netRev);

    renderChart('s9-chart-seg', tc => ({
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: p => { const s = segs[p[0].dataIndex]; return ttCard(s.key, [{ color: '#7C3AED', label: 'Net Revenue', value: fmtINR(s.netRev) }, { label: 'Share', value: fmtPct(safeDiv(s.netRev, sum.netRev) * 100, 1) }, { label: 'Margin %', value: fmtPct(s.marginPct) }, { label: 'Weekend Share', value: fmtPct(s.wkndShare, 1) }]); } },
      grid: { left: 175, right: 20, top: 16, bottom: 26 },
      xAxis: { type: 'value', axisLabel: { color: tc.text, fontSize: 10, formatter: v => fmtINR(v, true) }, splitLine: { lineStyle: { color: tc.grid } } },
      yAxis: { type: 'category', data: segs.map(s => s.key).reverse(), axisLabel: { color: tc.text, fontSize: 10.5 } },
      series: [{ type: 'bar', barMaxWidth: 22, itemStyle: { borderRadius: [0, 5, 5, 0], color: p => (segs[segs.length - 1 - p.dataIndex].key.includes('High-Value') ? '#059669' : (segs[segs.length - 1 - p.dataIndex].key.includes('Discount') ? '#DC2626' : '#7C3AED')) }, data: segs.map(s => Math.round(s.netRev)).reverse() }]
    }), segs.length > 0);

    const strategyFor = k => {
      if (k.includes('High-Value')) return 'VIP early festive access & Footwear styling';
      if (k.includes('Discount-Driven')) return 'Migrate to 3-item bundle thresholds';
      if (k.includes('Unknown')) return 'Mandatory POS phone capture + UPI reward';
      return 'Weekend accessory cross-sell prompts';
    };

    document.getElementById('s9-seg-table').innerHTML = `<table class="bi-table"><thead><tr><th>Behavioural Segment</th><th>Orders</th><th>Rev Share</th><th>Margin %</th><th>Targeted Strategy</th></tr></thead><tbody>${segs.map(s => `<tr><td title="${s.key}">${s.key}</td><td>${s.orders}</td><td>${fmtPct(safeDiv(s.netRev, sum.netRev) * 100, 1)}</td><td>${fmtPct(s.marginPct)}</td><td title="${strategyFor(s.key)}">${strategyFor(s.key)}</td></tr>`).join('')}</tbody></table>`;

    const hiSeg = segs.find(s => s.key.includes('High-Value')) || segs[0];
    renderStoryPanel('s9-story', {
      keyLabel: 'Top Margin Segment',
      keyValue: hiSeg ? fmtPct(hiSeg.marginPct) : '0%',
      keySub: hiSeg ? `${hiSeg.key} (${fmtNum(hiSeg.orders)} orders)` : '',
      bullets: [
        `Dataset has no CustomerID, so segments combine <strong>CustomerType, Basket Tier & Discount Reliance</strong>.`,
        `High-Value Full-Price buyers deliver ~40% margins without markdowns.`,
        `<strong>Untracked POS (Unknown)</strong> represents ${fmtPct(safeDiv((segMap.get('Untracked POS (Unknown)') || { netRev: 0 }).netRev, sum.netRev) * 100, 1)} of revenue.`
      ],
      why: 'Answers Q5: Tailoring bundles to Discount-Driven buyers and capturing Unknown shoppers builds repeat weekend loyalty.',
      actionLabel: 'Action: Segment Offers',
      actionText: 'Require POS phone capture for Unknown checkouts and target High-Value buyers with weekend VIP previews.'
    });
  }

  // --- SLIDE 10: WEEKEND GROWTH SIMULATOR ---
  function renderSlide10(rows, sum) {
    const { wkndDisc, wkndCat, wkndTraffic, wkndAov } = state.sim;
    const wkndRows = rows.filter(r => r.DayType === 'Weekend');
    const targetRows = wkndCat === 'All' ? wkndRows : wkndRows.filter(r => r.Category === wkndCat);

    const baseWkndRev = sum.wkndRev;
    const baseWkndProf = wkndRows.reduce((a, b) => a + b.Profit, 0);
    const catBaseRev = targetRows.reduce((a, b) => a + b.NetRevenue, 0);
    const catAvgDisc = safeDiv(targetRows.reduce((a, b) => a + b.Discount, 0), targetRows.length);

    const mult = (1 + wkndTraffic / 100) * (1 + wkndAov / 100) * (1 - Math.max(0, wkndDisc - catAvgDisc) / 100);
    const addRev = catBaseRev * (mult - 1);
    const projWkndRev = baseWkndRev + addRev;
    const projLiftPct = safeDiv(addRev, baseWkndRev) * 100;
    const projWkndProf = baseWkndProf + addRev * 0.32;
    const projWkndMargin = safeDiv(projWkndProf, projWkndRev) * 100;

    document.getElementById('s10-sim-kpis').innerHTML = [
      { cls: '', l: 'Baseline Weekend Sales', v: fmtINR(baseWkndRev, true), b: `${sum.wkndOrders} Orders`, s: 'Current weekend run-rate' },
      { cls: 'kpi-green', l: 'Projected Weekend Sales', v: fmtINR(projWkndRev, true), b: `+${projLiftPct.toFixed(1)}% Lift`, s: `Target (+15%): ${fmtINR(baseWkndRev * 1.15, true)}` },
      { cls: 'kpi-teal', l: 'Projected Weekend Margin', v: fmtPct(projWkndMargin), b: fmtINR(projWkndProf, true), s: `Promo Cap: ${wkndDisc}% (<=30%)` },
      { cls: 'kpi-gold', l: 'Target Attainment', v: `${Math.min(150, safeDiv(projLiftPct, 15) * 100).toFixed(0)}%`, b: projLiftPct >= 15 ? 'Goal Met ✓' : 'Below +15%', s: `Focus: ${wkndCat}` }
    ].map(k => `<div class="kpi-card ${k.cls}"><div class="kpi-header-row"><span class="kpi-label">${k.l}</span><span class="kpi-delta-badge ${projLiftPct >= 15 ? 'positive' : 'neutral'}">${k.b}</span></div><div class="kpi-val-row"><span class="kpi-value">${k.v}</span></div><span class="kpi-sub">${k.s}</span></div>`).join('');

    document.getElementById('sim-progress-label').textContent = `${projLiftPct.toFixed(1)}% / +15.0% Target`;
    document.getElementById('sim-progress-fill').style.width = `${Math.max(0, Math.min(100, safeDiv(projLiftPct, 15) * 100))}%`;

    renderChart('s10-chart-gauge', tc => ({
      tooltip: { formatter: () => ttCard('Weekend Growth Simulation', [{ color: '#059669', label: 'Projected Lift', value: `+${projLiftPct.toFixed(1)}%` }, { label: 'Target', value: '+15.0%' }, { label: 'Projected Sales', value: fmtINR(projWkndRev) }]) },
      series: [{
        type: 'gauge', startAngle: 195, endAngle: -15, min: 0, max: 30,
        progress: { show: true, width: 16, roundCap: true, itemStyle: { color: projLiftPct >= 15 ? '#059669' : '#7C3AED' } },
        axisLine: { lineStyle: { width: 16, color: [[1, tc.grid]] } },
        pointer: { show: false }, axisTick: { show: false }, splitLine: { show: false }, axisLabel: { show: false },
        detail: { formatter: v => `+${v.toFixed(1)}%`, color: tc.title, fontSize: 26, fontWeight: 800, offsetCenter: [0, '6%'] },
        data: [{ value: Number(projLiftPct.toFixed(1)) }]
      }]
    }), baseWkndRev > 0);

    document.getElementById('s10-insight-sim').innerHTML = `Indicative scenario projects <strong>+${projLiftPct.toFixed(1)}%</strong> weekend sales (${fmtINR(projWkndRev)}) at <strong>${fmtPct(projWkndMargin)}</strong> margin.`;
  }

  // =========================================================================
  // NAVIGATION, DIAGNOSTICS, MODALS & BOOTSTRAP
  // =========================================================================
  window.fwGoSlide = goToSlide;
  function goToSlide(idx) {
    const slides = document.querySelectorAll('.slide');
    const c = Math.max(0, Math.min(slides.length - 1, idx));
    state.currentSlide = c;
    slides.forEach((s, i) => s.classList.toggle('active', i === c));
    document.getElementById('footer-slide-indicator').textContent = `Slide ${c + 1} / ${slides.length}`;
    document.getElementById('btn-prev-slide').disabled = c === 0;
    document.getElementById('btn-next-slide').disabled = c === slides.length - 1;
    document.querySelectorAll('.slide-dot').forEach((d, i) => d.classList.toggle('active', i === c));
    document.getElementById('stage-container').scrollTop = 0;

    const meta = SLIDE_META[c];
    document.getElementById('speaker-notes-body').innerHTML = `<h4 style="color:var(--text-main);">${c + 1}. ${meta.title}</h4>` +
      meta.notes.map(n => `<div style="background:var(--bg-card-subtle); padding:10px; border-left:3px solid var(--color-accent); border-radius:6px;">${n}</div>`).join('');

    setTimeout(resizeActiveSlideCharts, 290);
    updateDiagnostics();
  }

  function updateDiagnostics() {
    const body = document.getElementById('diagnostics-body');
    const active = document.querySelector('.slide.active');
    if (!active) return;
    const charts = [...active.querySelectorAll('.chart-container')].map(el => {
      const r = el.getBoundingClientRect(), warn = r.height < 100 || r.width < 100;
      return `<div style="padding:8px; border-radius:6px; background:var(--bg-card-subtle); display:flex; justify-content:space-between;"><span>${el.id}</span><strong style="color:${warn ? '#DC2626' : '#059669'}">${Math.round(r.width)}×${Math.round(r.height)}px ${warn ? '⚠️' : '✓'}</strong></div>`;
    });
    body.innerHTML = `<div style="font-weight:700;">Active Slide Charts (${charts.length})</div>` + (charts.length ? charts.join('') : '<span>No charts on this slide.</span>');
  }

  function initUI() {
    const dots = document.getElementById('slide-dots'), grid = document.getElementById('overview-grid');
    SLIDE_META.forEach((m, i) => {
      const d = document.createElement('span'); d.className = 'slide-dot' + (i === 0 ? ' active' : ''); d.title = `${i + 1}. ${m.title}`; d.onclick = () => goToSlide(i); dots.appendChild(d);
      const t = document.createElement('div'); t.className = 'overview-thumb' + (i === 0 ? ' active' : '');
      t.innerHTML = `<span style="font-size:11px; font-weight:800; color:var(--color-accent);">SLIDE ${i + 1}</span><strong style="font-size:12px;">${m.title}</strong>`;
      t.onclick = () => { goToSlide(i); document.getElementById('overview-modal').classList.remove('open'); };
      grid.appendChild(t);
    });

    document.getElementById('btn-prev-slide').onclick = () => goToSlide(state.currentSlide - 1);
    document.getElementById('btn-next-slide').onclick = () => goToSlide(state.currentSlide + 1);
    document.getElementById('btn-toggle-slicers').onclick = () => { document.getElementById('slicer-panel').classList.toggle('collapsed'); setTimeout(resizeActiveSlideCharts, 300); };

    document.getElementById('btn-reset-filters').onclick = () => {
      const dates = state.cleanRows.map(r => r.Date).sort();
      state.filters = { dateStart: dates[0] || '', dateEnd: dates[dates.length - 1] || '', categories: new Set(), store: '', dayTypes: new Set(), daysOfWeek: new Set(), seasons: new Set(), discountBands: new Set(), customerTypes: new Set(), excludeMissing: false };
      document.getElementById('filter-store-select').value = '';
      document.getElementById('filter-store-search').value = '';
      document.getElementById('toggle-exclude-missing').checked = false;
      document.getElementById('missing-toggle-label').textContent = 'Impute (0% / Unknown)';
      renderAll();
    };

    document.getElementById('filter-date-start').onchange = e => { state.filters.dateStart = e.target.value; renderAll(); };
    document.getElementById('filter-date-end').onchange = e => { state.filters.dateEnd = e.target.value; renderAll(); };
    document.getElementById('filter-store-select').onchange = e => { state.filters.store = e.target.value; renderAll(); };
    document.getElementById('filter-store-search').oninput = e => {
      const q = e.target.value.toLowerCase();
      const stores = [...new Set(state.cleanRows.map(r => r.StoreID))].sort().filter(s => s.toLowerCase().includes(q));
      document.getElementById('filter-store-select').innerHTML = `<option value="">Matching (${stores.length})</option>` + stores.map(s => `<option value="${s}">${s}</option>`).join('');
    };

    const syncMissing = chk => {
      state.filters.excludeMissing = chk;
      document.getElementById('toggle-exclude-missing').checked = chk;
      document.getElementById('missing-toggle-label').textContent = chk ? 'Exclude Raw Blanks' : 'Impute (0% / Unknown)';
      renderAll();
    };
    document.getElementById('toggle-exclude-missing').onchange = e => syncMissing(e.target.checked);
    document.getElementById('btn-s3-toggle-missing').onclick = () => syncMissing(!state.filters.excludeMissing);

    document.getElementById('btn-s5-toggle').onclick = () => {
      state.s5TableView = !state.s5TableView;
      document.getElementById('s5-charts-col').style.display = state.s5TableView ? 'none' : 'flex';
      document.getElementById('s5-table-col').style.display = state.s5TableView ? 'flex' : 'none';
      if (!state.s5TableView) setTimeout(resizeActiveSlideCharts, 80);
    };

    document.getElementById('btn-s8-rank-mode').onclick = e => {
      state.s8AllStores = !state.s8AllStores;
      e.target.textContent = state.s8AllStores ? 'Mode: All 50 Stores' : 'Mode: Top 10 & Bottom 10';
      renderSlide8(getFilteredRows(), computeSummary(getFilteredRows()));
    };

    const exportCSV = (name, rows) => {
      const blob = new Blob([window.Papa ? window.Papa.unparse(rows) : ''], { type: 'text/csv;charset=utf-8;' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click();
    };
    document.getElementById('btn-s5-export').onclick = () => exportCSV('fashionwave_filtered.csv', getFilteredRows());
    document.getElementById('btn-s12-export').onclick = () => exportCSV('fashionwave_store_summary.csv', [...groupBy(getFilteredRows(), r => r.StoreID).values()]);

    // Simulator
    const bindSim = (id, key, fmt) => {
      document.getElementById(id).oninput = e => {
        state.sim[key] = Number(e.target.value);
        document.getElementById(`${id}-val`).textContent = fmt(state.sim[key]);
        renderSlide10(getFilteredRows(), computeSummary(getFilteredRows()));
      };
    };
    bindSim('sim-wknd-disc', 'wkndDisc', v => `${v}%`);
    bindSim('sim-wknd-traffic', 'wkndTraffic', v => `+${v}%`);
    bindSim('sim-wknd-aov', 'wkndAov', v => `+${v}%`);
    document.getElementById('sim-wknd-cat').onchange = e => { state.sim.wkndCat = e.target.value; renderSlide10(getFilteredRows(), computeSummary(getFilteredRows())); };
    document.getElementById('btn-sim-reset').onclick = () => {
      state.sim = { wkndDisc: 10, wkndCat: 'All', wkndTraffic: 8, wkndAov: 7 };
      document.getElementById('sim-wknd-disc').value = 10; document.getElementById('sim-wknd-disc-val').textContent = '10%';
      document.getElementById('sim-wknd-traffic').value = 8; document.getElementById('sim-wknd-traffic-val').textContent = '+8%';
      document.getElementById('sim-wknd-aov').value = 7; document.getElementById('sim-wknd-aov-val').textContent = '+7%';
      document.getElementById('sim-wknd-cat').value = 'All';
      renderSlide10(getFilteredRows(), computeSummary(getFilteredRows()));
    };

    // Zoom, Theme, Meet, Focus, Tour, Shortcuts
    const setZoom = z => { state.zoomLevel = Math.max(80, Math.min(130, z)); document.body.className = document.body.className.replace(/zoom-level-\d+/g, '') + ` zoom-level-${state.zoomLevel}`; document.getElementById('zoom-val-label').textContent = `${state.zoomLevel}%`; setTimeout(resizeActiveSlideCharts, 150); };
    document.getElementById('btn-zoom-in').onclick = () => setZoom(state.zoomLevel + 10);
    document.getElementById('btn-zoom-out').onclick = () => setZoom(state.zoomLevel - 10);
    document.getElementById('btn-theme-toggle').onclick = () => { state.theme = state.theme === 'light' ? 'dark' : 'light'; document.documentElement.setAttribute('data-theme', state.theme); renderAll(); };
    const toggleMeet = () => { document.body.classList.toggle('meeting-mode'); setTimeout(resizeActiveSlideCharts, 250); };
    document.getElementById('btn-meeting-mode').onclick = toggleMeet;
    document.addEventListener('mousemove', e => { if (document.body.classList.contains('meeting-mode')) { const sp = document.getElementById('meeting-spotlight'); sp.style.left = `${e.clientX}px`; sp.style.top = `${e.clientY}px`; } });

    document.getElementById('btn-notes').onclick = () => document.getElementById('speaker-notes-drawer').classList.toggle('open');
    document.getElementById('btn-close-notes').onclick = () => document.getElementById('speaker-notes-drawer').classList.remove('open');
    document.getElementById('btn-close-diag').onclick = () => document.getElementById('diagnostics-drawer').classList.remove('open');
    document.getElementById('btn-overview').onclick = () => document.getElementById('overview-modal').classList.add('open');
    document.getElementById('btn-close-overview').onclick = () => document.getElementById('overview-modal').classList.remove('open');
    document.getElementById('btn-close-focus').onclick = () => document.getElementById('focus-modal').classList.remove('open');
    document.querySelectorAll('.btn-focus').forEach(b => b.onclick = () => {
      const srcEl = document.getElementById(b.dataset.chart), src = srcEl && window.echarts ? window.echarts.getInstanceByDom(srcEl) : null;
      if (!src) return;
      document.getElementById('focus-modal-title').textContent = srcEl.closest('.card').querySelector('.card-title span').textContent;
      document.getElementById('focus-modal').classList.add('open');
      const fcEl = document.getElementById('focus-chart-container');
      const fc = window.echarts.getInstanceByDom(fcEl) || window.echarts.init(fcEl);
      fc.setOption(src.getOption(), true); setTimeout(() => fc.resize(), 80);
    });
    document.getElementById('btn-print').onclick = () => window.print();
    document.getElementById('btn-fullscreen').onclick = () => { if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {}); else document.exitFullscreen().catch(() => {}); };

    const TOUR = [
      { t: '1. Story-Driven 12-Slide Layout', d: 'Slides 4–9 pair interactive charts (65%) with a live Story Panel (35%) that updates its numbers, takeaway, and action whenever slicers change.' },
      { t: '2. Raw Data Cleaning Toggle', d: 'Blank Discount (135 rows) defaults to 0% and blank CustomerType (156 rows) to Unknown. Use the sidebar toggle to exclude raw blanks.' },
      { t: '3. Click Charts to Cross-Filter', d: 'Click any bar, category slice, or store dot to filter the entire deck. Click "Focus" on any card to expand full-screen.' },
      { t: '4. Presenter Shortcuts', d: 'Use ←/→ to navigate, M for Meeting Mode (+10% text + spotlight), N for Speaker Notes, G for Grid, D for Diagnostics, and ? for Help.' }
    ];
    let tIdx = 0;
    const showTour = i => { tIdx = i; document.getElementById('tour-step-title').textContent = TOUR[i].t; document.getElementById('tour-step-desc').textContent = TOUR[i].d; document.getElementById('tour-step-counter').textContent = `Step ${i + 1} of 4`; document.getElementById('btn-tour-next').textContent = i === 3 ? 'Finish ✓' : 'Next →'; };
    document.getElementById('btn-tour').onclick = () => { showTour(0); document.getElementById('tour-modal').classList.add('open'); };
    document.getElementById('btn-close-tour').onclick = () => document.getElementById('tour-modal').classList.remove('open');
    document.getElementById('btn-tour-skip').onclick = () => document.getElementById('tour-modal').classList.remove('open');
    document.getElementById('btn-tour-next').onclick = () => { if (tIdx < 3) showTour(tIdx + 1); else document.getElementById('tour-modal').classList.remove('open'); };

    document.getElementById('manual-csv-input').onchange = e => {
      const f = e.target.files[0];
      if (!f || !window.Papa) return;
      window.Papa.parse(f, { header: true, skipEmptyLines: true, complete: r => { if (parseAndClean(r.data, f.name, 'manual picker')) document.getElementById('fallback-loader').classList.remove('open'); } });
    };

    document.addEventListener('keydown', e => {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
      if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); goToSlide(state.currentSlide + 1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); goToSlide(state.currentSlide - 1); }
      else if (e.key >= '1' && e.key <= '9') goToSlide(Number(e.key) - 1);
      else if (e.key.toLowerCase() === 'm') toggleMeet();
      else if (e.key.toLowerCase() === 'n') document.getElementById('speaker-notes-drawer').classList.toggle('open');
      else if (e.key.toLowerCase() === 'd') { updateDiagnostics(); document.getElementById('diagnostics-drawer').classList.toggle('open'); }
      else if (e.key.toLowerCase() === 'g') document.getElementById('overview-modal').classList.toggle('open');
      else if (e.key.toLowerCase() === 'f') document.getElementById('btn-fullscreen').click();
      else if (e.key === '?') document.getElementById('btn-tour').click();
      else if (e.key === 'Escape') { document.querySelectorAll('.modal-overlay,.side-drawer').forEach(x => x.classList.remove('open')); }
    });

    const checkHash = () => { const m = window.location.hash.match(/^#slide-(\d+)$/); if (m) goToSlide(Number(m[1]) - 1); };
    window.addEventListener('hashchange', checkHash);
    window.addEventListener('resize', () => setTimeout(resizeActiveSlideCharts, 120));
    checkHash(); goToSlide(state.currentSlide);
  }

  document.addEventListener('DOMContentLoaded', () => { initUI(); loadInitialData(); });
})();
