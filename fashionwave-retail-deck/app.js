/* ==========================================================================
   FASHIONWAVE RETAIL ANALYTICS — INTERACTIVE POWER BI ENGINE
   Modules: Data Loader & Cleaner -> Filter Store -> Pure Aggregations ->
            Rich Tooltips -> ECharts Renderers -> UI & Presentation Controls
   ========================================================================== */
(() => {
  'use strict';

  const REQUIRED_COLS = [
    'InvoiceNo', 'Date', 'StoreID', 'ProductID', 'Category',
    'Quantity', 'UnitPrice', 'Discount', 'CostPerUnit', 'CustomerType', 'PaymentMode'
  ];

  const CAT_COLORS = {
    Clothing: '#7C3AED',
    Shoes: '#E11D48',
    Accessories: '#D97706'
  };

  const BAND_ORDER = ['No Discount', 'Low (1-5%)', 'Medium (6-15%)', 'High (16-30%)'];
  const DAY_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const SLIDE_META = [
    { title: 'Executive Summary', notes: ['Open with ₹35.42L Net Revenue, ₹12.32L Profit, and 34.78% Operating Margin across 1,500 orders and 50 stores.', 'Highlight the 3 core vulnerabilities: Zero discount elasticity, 7.1x store gap, and the Weekend staffing fallacy.'] },
    { title: 'Context, Objectives & Assumptions', notes: ['Walk through the 5 strategic management questions.', 'Clarify that the dataset tracks Transaction Orders (not unique customer IDs), and Unknown POS tags are retained to measure checkout compliance.'] },
    { title: 'Data Overview & Cleaning', notes: ['Zero nulls and zero duplicates across 1,500 records.', 'Show the POS Unknown toggle (156 CustomerType, 66 PaymentMode) to demonstrate ₹3.77L revenue impact.'] },
    { title: 'KPI Dashboard & Monthly Trends', notes: ['Hover over any month to inspect MoM revenue/profit delta.', 'Click any Discount Band bar to cross-filter the entire deck.'] },
    { title: 'Product & Category Performance', notes: ['Clothing drives 48.6% of revenue; Shoes delivers ₹4,841 AOV (40.3% revenue from 20.2% units); Accessories leads margin at 35.25%.'] },
    { title: 'Store Matrix & Channel Monetization', notes: ['2x2 Median Matrix segments 50 stores into Strong Performers, Margin Problems, Growth Opportunities, and Needs Investigation.', 'Digital UPI achieves highest AOV (₹2,486) and margin (35.30%).'] },
    { title: 'Deep-Dive: Main Business Problems', notes: ['Discount elasticity r = -0.0034: high discounts (16-30%) slash margin from 40.21% to 21.54% without increasing units/order.', 'Store_25 logged only 1 shoe order in 2 years vs 11 at Store_16.'] },
    { title: 'Trends & Seasonality', notes: ['Friday (#1, ₹5.66L) and Monday (#2, ₹5.57L) beat Saturday (₹4.94L).', 'October festive surges (₹2.31L in Oct 2025) require inventory lock by September 15.'] },
    { title: 'What-If Profit Simulator', notes: ['Model capping unbundled discounts at 15% (₹85K-₹1.0L recovery), footwear rebalancing, accessory attach towers, and UPI/CRM shift.'] },
    { title: 'Recommendations & Roadmap', notes: ['Contrast 0-30 day Quick Wins vs 1-6 month Structural Initiatives.', 'Click any store row in the Action Register to filter the deck to that store.'] }
  ];

  // =========================================================================
  // 1. STATE & SINGLE FILTER STORE
  // =========================================================================
  const state = {
    rawRows: [],
    cleanRows: [],
    dataSourceLabel: '',
    cleaningStats: { rawCount: 0, cleanCount: 0, nulls: 0, duplicates: 0, unknownCust: 0, unknownPay: 0 },
    currentSlide: 0,
    zoomLevel: 100,
    theme: 'light',
    s5TableView: false,
    sortCol: 'netRev',
    sortAsc: false,
    filters: {
      dateStart: '',
      dateEnd: '',
      categories: new Set(),
      store: '',
      discountBands: new Set(),
      customerTypes: new Set(),
      paymentModes: new Set(),
      dayTypes: new Set(),
      daysOfWeek: new Set(),
      excludeUnknown: false
    },
    sim: {
      discCap: 30,
      shoeLift: 0,
      accAttach: 0,
      upiShift: 0
    },
    chartInstances: new Map(),
    resizeObservers: new Map()
  };

  // =========================================================================
  // 2. SAFE MATH & FORMATTING HELPERS
  // =========================================================================
  const safeDiv = (num, den, fallback = 0) => (den && Number.isFinite(den) && den !== 0 ? num / den : fallback);

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

  function fmtNum(val) {
    return Number.isFinite(val) ? Math.round(val).toLocaleString('en-IN') : '0';
  }

  function fmtPct(val, decimals = 2) {
    return Number.isFinite(val) ? `${val.toFixed(decimals)}%` : '0.00%';
  }

  function getDiscountBand(d) {
    if (d <= 0) return 'No Discount';
    if (d <= 5) return 'Low (1-5%)';
    if (d <= 15) return 'Medium (6-15%)';
    return 'High (16-30%)';
  }

  function getPriceTier(p) {
    if (p < 800) return 'Budget (<₹800)';
    if (p < 2000) return 'Mid (₹800-₹1,999)';
    return 'Premium (₹2,000+)';
  }

  // =========================================================================
  // 3. DATA LOADING & CLEANING ENGINE
  // =========================================================================
  function parseAndClean(rows, sourceName, via) {
    if (!rows || !rows.length) return false;
    const cols = Object.keys(rows[0]);
    const missing = REQUIRED_COLS.filter(c => !cols.includes(c));
    if (missing.length) {
      alert(`Missing required columns: ${missing.join(', ')}`);
      return false;
    }

    const seen = new Set();
    let nulls = 0;
    let duplicates = 0;
    let unknownCust = 0;
    let unknownPay = 0;
    const cleaned = [];

    for (const r of rows) {
      const inv = String(r.InvoiceNo || '').trim();
      if (!inv) { nulls++; continue; }
      if (seen.has(inv)) { duplicates++; continue; }
      seen.add(inv);

      const qty = Number(r.Quantity) || 0;
      const unitPrice = Number(r.UnitPrice) || 0;
      const discount = Number(r.Discount) || 0;
      const costPerUnit = Number(r.CostPerUnit) || 0;
      const cat = String(r.Category || '').trim();
      const cust = String(r.CustomerType || 'Unknown').trim() || 'Unknown';
      const pay = String(r.PaymentMode || 'Unknown').trim() || 'Unknown';
      const dateStr = String(r.Date || '').slice(0, 10);

      if (cust === 'Unknown') unknownCust++;
      if (pay === 'Unknown') unknownPay++;

      const dt = new Date(dateStr + 'T00:00:00');
      const dayIdx = (dt.getDay() + 6) % 7; // 0=Mon..6=Sun
      const dayOfWeek = DAY_ORDER[dayIdx] || 'Monday';
      const dayType = (dayIdx >= 5) ? 'Weekend' : 'Weekday';
      const monthKey = dateStr.slice(0, 7);

      const grossSales = qty * unitPrice;
      const discountAmt = grossSales * (discount / 100);
      const netRev = grossSales - discountAmt;
      const totalCost = qty * costPerUnit;
      const profit = netRev - totalCost;
      const marginPct = safeDiv(profit, netRev) * 100;

      cleaned.push({
        InvoiceNo: inv,
        Date: dateStr,
        MonthKey: monthKey,
        DayOfWeek: dayOfWeek,
        DayType: dayType,
        StoreID: String(r.StoreID || '').trim(),
        ProductID: String(r.ProductID || '').trim(),
        Category: cat,
        PriceTier: getPriceTier(unitPrice),
        Quantity: qty,
        UnitPrice: unitPrice,
        Discount: discount,
        DiscountBand: getDiscountBand(discount),
        CostPerUnit: costPerUnit,
        CustomerType: cust,
        PaymentMode: pay,
        GrossSales: grossSales,
        DiscountAmount: discountAmt,
        NetRevenue: netRev,
        TotalCost: totalCost,
        Profit: profit,
        ProfitMargin: marginPct
      });
    }

    state.rawRows = rows;
    state.cleanRows = cleaned;
    state.cleaningStats = {
      rawCount: rows.length,
      cleanCount: cleaned.length,
      nulls,
      duplicates,
      unknownCust,
      unknownPay
    };

    const dates = cleaned.map(d => d.Date).sort();
    state.filters.dateStart = dates[0] || '2024-11-18';
    state.filters.dateEnd = dates[dates.length - 1] || '2026-11-18';

    state.dataSourceLabel = `Data source: ${sourceName} · ${cleaned.length.toLocaleString('en-IN')} rows · loaded via ${via}`;
    document.getElementById('data-status-text').textContent = state.dataSourceLabel;

    initSlicerOptions();
    renderAll();
    return true;
  }

  async function loadInitialData() {
    // 1. Try fetch('./fashionwave_sales_cleaned.csv')
    try {
      const resp = await fetch('./fashionwave_sales_cleaned.csv');
      if (resp.ok) {
        const csvText = await resp.text();
        if (window.Papa) {
          const parsed = window.Papa.parse(csvText, { header: true, skipEmptyLines: true });
          if (parseAndClean(parsed.data, 'fashionwave_sales_cleaned.csv', 'CSV fetch')) return;
        }
      }
    } catch (_) { /* file:// fallback expected */ }

    // 2. Fallback to window.RAW_SALES_DATA from ./data.js
    if (Array.isArray(window.RAW_SALES_DATA) && window.RAW_SALES_DATA.length) {
      if (parseAndClean(window.RAW_SALES_DATA, 'fashionwave_sales_cleaned.csv', 'backup (data.js)')) return;
    }

    // 3. Fallback manual drag & drop
    document.getElementById('fallback-loader').classList.add('open');
  }

  // =========================================================================
  // 4. FILTER STORE & PURE AGGREGATIONS
  // =========================================================================
  function getFilteredRows() {
    const f = state.filters;
    return state.cleanRows.filter(r => {
      if (f.dateStart && r.Date < f.dateStart) return false;
      if (f.dateEnd && r.Date > f.dateEnd) return false;
      if (f.categories.size && !f.categories.has(r.Category)) return false;
      if (f.store && r.StoreID !== f.store) return false;
      if (f.discountBands.size && !f.discountBands.has(r.DiscountBand)) return false;
      if (f.customerTypes.size && !f.customerTypes.has(r.CustomerType)) return false;
      if (f.paymentModes.size && !f.paymentModes.has(r.PaymentMode)) return false;
      if (f.dayTypes.size && !f.dayTypes.has(r.DayType)) return false;
      if (f.daysOfWeek.size && !f.daysOfWeek.has(r.DayOfWeek)) return false;
      if (f.excludeUnknown && (r.CustomerType === 'Unknown' || r.PaymentMode === 'Unknown')) return false;
      return true;
    });
  }

  function computeSummary(rows) {
    let gross = 0, discAmt = 0, netRev = 0, cost = 0, profit = 0, units = 0, discSum = 0;
    const stores = new Set();
    for (const r of rows) {
      gross += r.GrossSales;
      discAmt += r.DiscountAmount;
      netRev += r.NetRevenue;
      cost += r.TotalCost;
      profit += r.Profit;
      units += r.Quantity;
      discSum += r.Discount;
      stores.add(r.StoreID);
    }
    const orders = rows.length;
    return {
      orders, units, storesCount: stores.size,
      gross, discAmt, netRev, cost, profit,
      marginPct: safeDiv(profit, netRev) * 100,
      aov: safeDiv(netRev, orders),
      asp: safeDiv(netRev, units),
      avgDisc: safeDiv(discSum, orders),
      basketSize: safeDiv(units, orders)
    };
  }

  function groupBy(rows, keyFn) {
    const map = new Map();
    for (const r of rows) {
      const k = keyFn(r);
      let g = map.get(k);
      if (!g) {
        g = { key: k, orders: 0, units: 0, netRev: 0, profit: 0, gross: 0, cost: 0, discSum: 0, shoeOrders: 0 };
        map.set(k, g);
      }
      g.orders++;
      g.units += r.Quantity;
      g.netRev += r.NetRevenue;
      g.profit += r.Profit;
      g.gross += r.GrossSales;
      g.cost += r.TotalCost;
      g.discSum += r.Discount;
      if (r.Category === 'Shoes') g.shoeOrders++;
    }
    for (const g of map.values()) {
      g.marginPct = safeDiv(g.profit, g.netRev) * 100;
      g.aov = safeDiv(g.netRev, g.orders);
      g.asp = safeDiv(g.netRev, g.units);
      g.avgDisc = safeDiv(g.discSum, g.orders);
    }
    return map;
  }

  function pearsonR(xs, ys) {
    const n = xs.length;
    if (n < 2) return 0;
    let sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0;
    for (let i = 0; i < n; i++) {
      sx += xs[i]; sy += ys[i];
      sxx += xs[i] * xs[i]; syy += ys[i] * ys[i]; sxy += xs[i] * ys[i];
    }
    const den = Math.sqrt((n * sxx - sx * sx) * (n * syy - sy * sy));
    return safeDiv(n * sxy - sx * sy, den);
  }

  // =========================================================================
  // 5. RICH TOOLTIP ENGINE (CHARTS + FLOATING UI ELEMENTS)
  // =========================================================================
  function ttCard(title, rows) {
    const body = rows.map(r => `
      <div class="tt-row">
        <span class="tt-lbl">${r.color ? `<span class="tt-dot" style="background:${r.color}"></span>` : ''}${r.label}</span>
        <span class="tt-val">${r.value}</span>
      </div>`).join('');
    return `<div style="max-width:270px; font-family:Inter,sans-serif; font-size:12px; line-height:1.4;">
      <div class="tt-title">${title}</div>${body}
    </div>`;
  }

  const floatingTip = document.getElementById('fw-floating-tooltip');
  function showFloatingTip(targetEl, title, rows) {
    floatingTip.innerHTML = ttCard(title, rows);
    floatingTip.classList.add('visible');
    const rect = targetEl.getBoundingClientRect();
    const tw = floatingTip.offsetWidth || 260;
    const th = floatingTip.offsetHeight || 90;
    let left = rect.left + rect.width / 2 - tw / 2;
    let top = rect.bottom + 8;
    if (left + tw > window.innerWidth - 12) left = window.innerWidth - tw - 12;
    if (left < 12) left = 12;
    if (top + th > window.innerHeight - 12) top = rect.top - th - 8;
    floatingTip.style.left = `${left}px`;
    floatingTip.style.top = `${top}px`;
  }

  function hideFloatingTip() {
    floatingTip.classList.remove('visible');
  }

  function bindFloatingTooltips() {
    document.querySelectorAll('[data-info]').forEach(el => {
      el.onmouseenter = () => showFloatingTip(el, 'How to Read This Chart', [{ label: 'Explanation', value: '' }, { label: el.dataset.info, value: '' }]);
      el.onmouseleave = hideFloatingTip;
    });

    document.querySelectorAll('[data-kpi-tip]').forEach(el => {
      el.onmouseenter = () => {
        try {
          const info = JSON.parse(el.dataset.kpiTip);
          showFloatingTip(el, info.title, info.rows);
        } catch (_) {}
      };
      el.onmouseleave = hideFloatingTip;
    });
  }

  // =========================================================================
  // 6. ECHARTS INITIALIZATION, ERROR BOUNDARY & RESIZE OBSERVER
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

    // Dispose or clear old empty state
    const existingEmpty = el.querySelector('.chart-empty-state');
    if (existingEmpty) existingEmpty.remove();

    if (!hasData || !window.echarts) {
      const inst = window.echarts ? window.echarts.getInstanceByDom(el) : null;
      if (inst) inst.clear();
      const empty = document.createElement('div');
      empty.className = 'chart-empty-state';
      empty.innerHTML = `<strong style="font-size:14px;">No data for this selection</strong><span>Adjust or reset your active slicers to restore visuals.</span>`;
      el.appendChild(empty);
      return;
    }

    try {
      let chart = window.echarts.getInstanceByDom(el);
      if (!chart) {
        chart = window.echarts.init(el);
        state.chartInstances.set(containerId, chart);

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
      opt.animationDuration = 350;
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
      if (onClickHandler) {
        chart.on('click', onClickHandler);
      }
    } catch (err) {
      console.error(`Chart render error (${containerId}):`, err);
      el.innerHTML = `<div class="chart-empty-state"><strong>Visual Error</strong><span>${err.message}</span></div>`;
    }
  }

  function resizeActiveSlideCharts() {
    const activeSlide = document.querySelector('.slide.active');
    if (!activeSlide) return;
    activeSlide.querySelectorAll('.chart-container, .chart-container-tall').forEach(el => {
      const inst = window.echarts ? window.echarts.getInstanceByDom(el) : null;
      if (inst && el.offsetWidth > 0 && el.offsetHeight > 0) inst.resize();
    });
  }

  // =========================================================================
  // 7. SLICER UI & CROSS-FILTERING
  // =========================================================================
  function toggleSetFilter(setObj, val) {
    if (setObj.has(val)) setObj.delete(val);
    else setObj.add(val);
    renderAll();
  }

  function initSlicerOptions() {
    // Store dropdown
    const storeSel = document.getElementById('filter-store-select');
    const stores = [...new Set(state.cleanRows.map(r => r.StoreID))].sort();
    storeSel.innerHTML = `<option value="">All ${stores.length} Stores</option>` +
      stores.map(s => `<option value="${s}">${s}</option>`).join('');

    // Date inputs
    const dates = state.cleanRows.map(r => r.Date).sort();
    const dStart = document.getElementById('filter-date-start');
    const dEnd = document.getElementById('filter-date-end');
    dStart.min = dates[0]; dStart.max = dates[dates.length - 1]; dStart.value = state.filters.dateStart;
    dEnd.min = dates[0]; dEnd.max = dates[dates.length - 1]; dEnd.value = state.filters.dateEnd;

    renderSlicerChips();
  }

  function renderSlicerChips() {
    const rows = state.cleanRows;
    const renderGroup = (containerId, values, filterSet, countsMap) => {
      const wrap = document.getElementById(containerId);
      wrap.innerHTML = values.map(v => {
        const active = filterSet.has(v) ? 'active' : '';
        const cnt = countsMap.get(v) || 0;
        return `<button class="slicer-chip ${active}" data-val="${v}" title="${v}: ${cnt} orders — Click to filter">
          <span>${v}</span><span class="chip-count">${cnt}</span>
        </button>`;
      }).join('');
      wrap.querySelectorAll('.slicer-chip').forEach(btn => {
        btn.onclick = () => toggleSetFilter(filterSet, btn.dataset.val);
      });
    };

    const countField = (fn) => {
      const m = new Map();
      rows.forEach(r => { const k = fn(r); m.set(k, (m.get(k) || 0) + 1); });
      return m;
    };

    renderGroup('slicer-category-chips', ['Clothing', 'Shoes', 'Accessories'], state.filters.categories, countField(r => r.Category));
    renderGroup('slicer-discount-chips', BAND_ORDER, state.filters.discountBands, countField(r => r.DiscountBand));
    renderGroup('slicer-customer-chips', ['Returning', 'New', 'Unknown'], state.filters.customerTypes, countField(r => r.CustomerType));
    renderGroup('slicer-payment-chips', ['Card', 'Cash', 'Digital', 'Unknown'], state.filters.paymentModes, countField(r => r.PaymentMode));
    renderGroup('slicer-daytype-chips', ['Weekday', 'Weekend'], state.filters.dayTypes, countField(r => r.DayType));
  }

  function renderFilterPills(filteredCount) {
    document.getElementById('slicer-row-counter').textContent =
      `${filteredCount.toLocaleString('en-IN')} of ${state.cleanRows.length.toLocaleString('en-IN')} rows`;

    const pills = [];
    const f = state.filters;
    f.categories.forEach(v => pills.push({ label: `Cat: ${v}`, clear: () => f.categories.delete(v) }));
    if (f.store) pills.push({ label: `Store: ${f.store}`, clear: () => { f.store = ''; document.getElementById('filter-store-select').value = ''; } });
    f.discountBands.forEach(v => pills.push({ label: `Disc: ${v}`, clear: () => f.discountBands.delete(v) }));
    f.customerTypes.forEach(v => pills.push({ label: `Cust: ${v}`, clear: () => f.customerTypes.delete(v) }));
    f.paymentModes.forEach(v => pills.push({ label: `Pay: ${v}`, clear: () => f.paymentModes.delete(v) }));
    f.dayTypes.forEach(v => pills.push({ label: `Day: ${v}`, clear: () => f.dayTypes.delete(v) }));
    f.daysOfWeek.forEach(v => pills.push({ label: `DoW: ${v}`, clear: () => f.daysOfWeek.delete(v) }));
    if (f.excludeUnknown) pills.push({ label: `Exclude Unknowns`, clear: () => { f.excludeUnknown = false; document.getElementById('toggle-exclude-unknown').checked = false; } });

    const wrap = document.getElementById('active-filter-pills');
    wrap.innerHTML = pills.map((p, i) => `<span class="filter-pill" data-pidx="${i}">${p.label} ✕</span>`).join('');
    wrap.querySelectorAll('.filter-pill').forEach(el => {
      el.onclick = () => { pills[Number(el.dataset.pidx)].clear(); renderAll(); };
    });
  }

  // =========================================================================
  // 8. MASTER RENDER PIPELINE (ALL 10 SLIDES)
  // =========================================================================
  function renderAll() {
    renderSlicerChips();
    const rows = getFilteredRows();
    renderFilterPills(rows.length);

    const sum = computeSummary(rows);
    const baseSum = computeSummary(state.cleanRows);

    renderSlide1(rows, sum, baseSum);
    renderSlide3(rows, sum);
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

  // --- SLIDE 1: EXECUTIVE SUMMARY ---
  function renderSlide1(rows, sum, baseSum) {
    const sub = document.getElementById('s1-hero-subtitle');
    sub.textContent = `Active Scope: ${fmtNum(sum.orders)} Transactions across ${sum.storesCount} Stores generating ${fmtINR(sum.netRev, true)} Net Revenue (${fmtPct(sum.marginPct)} Margin) and ${fmtINR(sum.profit, true)} Operating Profit.`;

    const cards = [
      { label: 'Net Revenue', val: fmtINR(sum.netRev, true), sub: `${fmtINR(sum.gross, true)} Gross Sales`, tip: { title: 'Net Realized Revenue', rows: [{ label: 'Formula', value: 'Gross − Discounts' }, { label: 'Filtered Value', value: fmtINR(sum.netRev) }, { label: 'Baseline Total', value: fmtINR(baseSum.netRev) }] } },
      { label: 'Operating Profit', val: fmtINR(sum.profit, true), sub: `${fmtINR(sum.cost, true)} Total COGS`, tip: { title: 'Net Operating Profit', rows: [{ label: 'Formula', value: 'NetRev − (Qty × Cost)' }, { label: 'Filtered Value', value: fmtINR(sum.profit) }, { label: 'Baseline Total', value: fmtINR(baseSum.profit) }] } },
      { label: 'Operating Margin', val: fmtPct(sum.marginPct), sub: 'Target Benchmark: 35.0%', tip: { title: 'Operating Profit Margin %', rows: [{ label: 'Formula', value: '(Profit / NetRev) × 100' }, { label: 'Filtered', value: fmtPct(sum.marginPct) }, { label: 'Baseline', value: fmtPct(baseSum.marginPct) }] } },
      { label: 'Transactions', val: fmtNum(sum.orders), sub: `${fmtNum(sum.units)} Units Sold`, tip: { title: 'Transaction Volume', rows: [{ label: 'Definition', value: 'Validated Invoices' }, { label: 'Basket Size', value: `${sum.basketSize.toFixed(2)} units` }] } },
      { label: 'Average Order Value', val: fmtINR(sum.aov), sub: `${fmtINR(sum.asp)} Unit ASP`, tip: { title: 'Average Order Value (AOV)', rows: [{ label: 'Formula', value: 'NetRev / Orders' }, { label: 'Filtered AOV', value: fmtINR(sum.aov) }, { label: 'Baseline AOV', value: fmtINR(baseSum.aov) }] } }
    ];

    document.getElementById('s1-hero-kpis').innerHTML = cards.map(c => `
      <div class="frosted-kpi-card" data-kpi-tip='${JSON.stringify(c.tip).replace(/'/g, "&apos;")}'>
        <span class="kpi-label">${c.label}</span>
        <span class="kpi-value">${c.val}</span>
        <span class="kpi-sub">${c.sub}</span>
      </div>`).join('');

    // Gauge
    renderChart('s1-chart-gauge', tc => ({
      tooltip: {
        formatter: () => ttCard('Operating Margin Gauge', [
          { color: '#7C3AED', label: 'Current Margin', value: fmtPct(sum.marginPct) },
          { color: '#059669', label: 'Target Benchmark', value: '35.00%' },
          { label: 'Gap vs Target', value: `${(sum.marginPct - 35).toFixed(2)} pp` }
        ])
      },
      series: [{
        type: 'gauge',
        startAngle: 195, endAngle: -15,
        min: 0, max: 50,
        progress: { show: true, width: 16, roundCap: true, itemStyle: { color: sum.marginPct >= 35 ? '#059669' : '#7C3AED' } },
        axisLine: { lineStyle: { width: 16, color: [[1, tc.grid]] } },
        pointer: { show: false },
        axisTick: { show: false }, splitLine: { show: false },
        axisLabel: { show: false },
        detail: { valueAnimation: true, formatter: v => `${v.toFixed(2)}%`, color: tc.title, fontSize: 26, fontWeight: 800, offsetCenter: [0, '6%'] },
        data: [{ value: Number(sum.marginPct.toFixed(2)) }]
      }]
    }), rows.length > 0);

    document.getElementById('s1-insight-gauge').innerHTML =
      `Operating margin stands at <strong>${fmtPct(sum.marginPct)}</strong> (${sum.marginPct >= 35 ? 'above' : 'slightly below'} the 35.0% target by <strong>${Math.abs(sum.marginPct - 35).toFixed(2)} pp</strong>).`;

    // Category Donut
    const catMap = groupBy(rows, r => r.Category);
    const catData = [...catMap.values()].sort((a, b) => b.netRev - a.netRev);
    renderChart('s1-chart-donut', tc => ({
      tooltip: {
        trigger: 'item',
        formatter: p => {
          const d = p.data.raw;
          return ttCard(d.key, [
            { color: CAT_COLORS[d.key], label: 'Net Revenue', value: fmtINR(d.netRev) },
            { label: 'Share of Total', value: fmtPct(safeDiv(d.netRev, sum.netRev) * 100, 1) },
            { label: 'Operating Profit', value: fmtINR(d.profit) },
            { label: 'Margin %', value: fmtPct(d.marginPct) }
          ]);
        }
      },
      legend: { bottom: 0, textStyle: { color: tc.text, fontSize: 12 } },
      series: [{
        type: 'pie', radius: ['48%', '74%'], center: ['50%', '44%'],
        itemStyle: { borderRadius: 6, borderColor: tc.tooltipBg, borderWidth: 2 },
        label: { show: false },
        emphasis: { scale: true, scaleSize: 6 },
        data: catData.map(d => ({
          name: d.key, value: Math.round(d.netRev), raw: d,
          itemStyle: { color: CAT_COLORS[d.key] || '#6366F1', opacity: (!state.filters.categories.size || state.filters.categories.has(d.key)) ? 1 : 0.35 }
        }))
      }],
      graphic: [{
        type: 'text', left: 'center', top: '38%',
        style: { text: fmtINR(sum.netRev, true), font: '800 18px Inter,sans-serif', fill: tc.title },
      }, {
        type: 'text', left: 'center', top: '49%',
        style: { text: 'Net Revenue', font: '600 11px Inter,sans-serif', fill: tc.text },
      }]
    }), rows.length > 0, p => toggleSetFilter(state.filters.categories, p.name));

    const topCat = catData[0];
    document.getElementById('s1-insight-donut').innerHTML = topCat
      ? `<strong>${topCat.key}</strong> leads with <strong>${fmtINR(topCat.netRev, true)}</strong> (${fmtPct(safeDiv(topCat.netRev, sum.netRev) * 100, 1)} share) at <strong>${fmtPct(topCat.marginPct)}</strong> margin.`
      : 'No category data available.';
  }

  // --- SLIDE 3: DATA OVERVIEW & CLEANING ---
  function renderSlide3(rows, sum) {
    const cs = state.cleaningStats;
    const unknownRev = state.cleanRows.filter(r => r.CustomerType === 'Unknown' || r.PaymentMode === 'Unknown').reduce((a, b) => a + b.NetRevenue, 0);

    document.getElementById('s3-hygiene-kpis').innerHTML = [
      { cls: 'kpi-green', label: 'Validated Records', val: fmtNum(cs.cleanCount), badge: `${cs.nulls} Nulls · ${cs.duplicates} Dupes`, sub: `100% of ${cs.rawCount} raw rows retained` },
      { cls: 'kpi-rose', label: 'Unknown CustomerTag', val: fmtNum(cs.unknownCust), badge: fmtPct(safeDiv(cs.unknownCust, cs.cleanCount) * 100, 1), sub: 'CRM phone capture gap at POS' },
      { cls: 'kpi-gold', label: 'Unknown PaymentMode', val: fmtNum(cs.unknownPay), badge: fmtPct(safeDiv(cs.unknownPay, cs.cleanCount) * 100, 1), sub: 'Tender tagging gap at billing' },
      { cls: 'kpi-teal', label: 'Active Filtered Rows', val: fmtNum(rows.length), badge: state.filters.excludeUnknown ? 'Unknowns Excluded' : 'Unknowns Retained', sub: `${fmtINR(unknownRev, true)} tied to Unknown tags` }
    ].map(k => `
      <div class="kpi-card ${k.cls}" data-kpi-tip='${JSON.stringify({ title: k.label, rows: [{ label: 'Value', value: k.val }, { label: 'Context', value: k.sub }] })}'>
        <div class="kpi-header-row"><span class="kpi-label">${k.label}</span><span class="kpi-delta-badge neutral">${k.badge}</span></div>
        <div class="kpi-val-row"><span class="kpi-value">${k.val}</span></div>
        <span class="kpi-sub">${k.sub}</span>
      </div>`).join('');

    const bandMap = groupBy(rows, r => r.DiscountBand);
    const bandList = BAND_ORDER.map(b => bandMap.get(b) || { key: b, orders: 0, netRev: 0, profit: 0, marginPct: 0 });
    const avgOrders = safeDiv(rows.length, bandList.length);

    renderChart('s3-chart-audit', tc => ({
      tooltip: {
        trigger: 'axis', axisPointer: { type: 'shadow' },
        formatter: params => {
          const d = bandList[params[0].dataIndex];
          return ttCard(d.key, [
            { color: '#7C3AED', label: 'Orders', value: fmtNum(d.orders) },
            { label: 'Share of Orders', value: fmtPct(safeDiv(d.orders, rows.length) * 100, 1) },
            { label: 'vs Band Average', value: `${(d.orders - avgOrders) >= 0 ? '+' : ''}${Math.round(d.orders - avgOrders)} orders` },
            { label: 'Net Revenue', value: fmtINR(d.netRev) }
          ]);
        }
      },
      grid: { left: 48, right: 20, top: 24, bottom: 32 },
      xAxis: { type: 'category', data: BAND_ORDER, axisLabel: { color: tc.text, fontSize: 12 } },
      yAxis: { type: 'value', axisLabel: { color: tc.text, fontSize: 11 }, splitLine: { lineStyle: { color: tc.grid } } },
      series: [{
        type: 'bar', barMaxWidth: 48,
        itemStyle: { borderRadius: [6, 6, 0, 0], color: p => ['#059669', '#0D9488', '#D97706', '#DC2626'][p.dataIndex] },
        data: bandList.map(d => d.orders)
      }]
    }), rows.length > 0, p => toggleSetFilter(state.filters.discountBands, p.name));

    document.getElementById('s3-insight-audit').innerHTML =
      `Currently showing <strong>${fmtNum(rows.length)}</strong> rows (${state.filters.excludeUnknown ? 'excluding' : 'retaining'} Unknown POS segments). Toggle in top-right or sidebar to inspect impact.`;
  }

  // --- SLIDE 4: KPI DASHBOARD WITH TRENDS ---
  function renderSlide4(rows, sum) {
    document.getElementById('s4-kpi-strip').innerHTML = [
      { cls: '', label: 'Gross Sales', val: fmtINR(sum.gross, true), badge: 'Catalog Value', sub: `${fmtINR(sum.discAmt, true)} Markdown` },
      { cls: 'kpi-teal', label: 'Net Revenue', val: fmtINR(sum.netRev, true), badge: `${fmtNum(sum.orders)} Orders`, sub: `AOV ${fmtINR(sum.aov)}` },
      { cls: 'kpi-green', label: 'Operating Profit', val: fmtINR(sum.profit, true), badge: fmtPct(sum.marginPct), sub: 'Net Operating Return' },
      { cls: 'kpi-rose', label: 'Avg Discount %', val: fmtPct(sum.avgDisc), badge: `${fmtNum(sum.units)} Units`, sub: `${sum.basketSize.toFixed(2)} units/order` },
      { cls: 'kpi-gold', label: 'Rev / Active Store', val: fmtINR(safeDiv(sum.netRev, sum.storesCount), true), badge: `${sum.storesCount} Stores`, sub: 'Network average' }
    ].map(k => `
      <div class="kpi-card ${k.cls}" data-kpi-tip='${JSON.stringify({ title: k.label, rows: [{ label: 'Value', value: k.val }, { label: 'Detail', value: k.sub }] })}'>
        <div class="kpi-header-row"><span class="kpi-label">${k.label}</span><span class="kpi-delta-badge neutral">${k.badge}</span></div>
        <div class="kpi-val-row"><span class="kpi-value">${k.val}</span></div>
        <span class="kpi-sub">${k.sub}</span>
      </div>`).join('');

    const mMap = groupBy(rows, r => r.MonthKey);
    const months = [...mMap.keys()].sort();
    const mData = months.map(m => mMap.get(m));

    renderChart('s4-chart-monthly', tc => ({
      tooltip: {
        trigger: 'axis',
        formatter: params => {
          const i = params[0].dataIndex;
          const cur = mData[i];
          const prev = i > 0 ? mData[i - 1] : null;
          const mom = prev ? safeDiv(cur.netRev - prev.netRev, prev.netRev) * 100 : null;
          return ttCard(`Month: ${cur.key}`, [
            { color: '#7C3AED', label: 'Net Revenue', value: fmtINR(cur.netRev) },
            { color: '#059669', label: 'Operating Profit', value: fmtINR(cur.profit) },
            { label: 'Margin %', value: fmtPct(cur.marginPct) },
            { label: 'MoM Rev Change', value: mom !== null ? `${mom >= 0 ? '+' : ''}${mom.toFixed(1)}%` : 'First Month' }
          ]);
        }
      },
      legend: { top: 0, textStyle: { color: tc.text, fontSize: 12 } },
      grid: { left: 54, right: 18, top: 32, bottom: 28 },
      xAxis: { type: 'category', data: months, axisLabel: { color: tc.text, fontSize: 11 } },
      yAxis: { type: 'value', axisLabel: { color: tc.text, fontSize: 11, formatter: v => fmtINR(v, true) }, splitLine: { lineStyle: { color: tc.grid } } },
      series: [
        {
          name: 'Net Revenue', type: 'line', smooth: true, symbolSize: 6,
          lineStyle: { width: 3, color: '#7C3AED' }, itemStyle: { color: '#7C3AED' },
          areaStyle: { color: new window.echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: 'rgba(124,58,237,0.28)' }, { offset: 1, color: 'rgba(124,58,237,0.02)' }]) },
          markPoint: { data: [{ type: 'max', name: 'Peak' }], label: { formatter: p => fmtINR(p.value, true) } },
          markLine: { silent: true, data: [{ type: 'average', name: 'Avg' }], label: { formatter: p => `Avg ${fmtINR(p.value, true)}` } },
          data: mData.map(d => Math.round(d.netRev))
        },
        {
          name: 'Operating Profit', type: 'line', smooth: true, symbolSize: 5,
          lineStyle: { width: 2.5, color: '#059669' }, itemStyle: { color: '#059669' },
          data: mData.map(d => Math.round(d.profit))
        }
      ]
    }), months.length > 0);

    const peakMonth = [...mData].sort((a, b) => b.netRev - a.netRev)[0];
    document.getElementById('s4-insight-monthly').innerHTML = peakMonth
      ? `Peak revenue occurred in <strong>${peakMonth.key}</strong> at <strong>${fmtINR(peakMonth.netRev)}</strong> (${fmtNum(peakMonth.orders)} orders, ${fmtPct(peakMonth.marginPct)} margin).`
      : 'No monthly data available.';

    const bMap = groupBy(rows, r => r.DiscountBand);
    const bData = BAND_ORDER.map(b => bMap.get(b) || { key: b, netRev: 0, profit: 0, marginPct: 0, orders: 0 });
    renderChart('s4-chart-discband', tc => ({
      tooltip: {
        trigger: 'axis',
        formatter: params => {
          const d = bData[params[0].dataIndex];
          return ttCard(d.key, [
            { color: '#7C3AED', label: 'Net Revenue', value: fmtINR(d.netRev) },
            { color: '#E11D48', label: 'Margin %', value: fmtPct(d.marginPct) },
            { label: 'Operating Profit', value: fmtINR(d.profit) },
            { label: 'Orders', value: fmtNum(d.orders) }
          ]);
        }
      },
      legend: { top: 0, textStyle: { color: tc.text, fontSize: 12 } },
      grid: { left: 52, right: 44, top: 32, bottom: 28 },
      xAxis: { type: 'category', data: BAND_ORDER, axisLabel: { color: tc.text, fontSize: 11 } },
      yAxis: [
        { type: 'value', axisLabel: { color: tc.text, fontSize: 11, formatter: v => fmtINR(v, true) }, splitLine: { lineStyle: { color: tc.grid } } },
        { type: 'value', min: 0, max: 50, axisLabel: { color: tc.text, fontSize: 11, formatter: '{value}%' }, splitLine: { show: false } }
      ],
      series: [
        { name: 'Net Revenue', type: 'bar', barMaxWidth: 42, itemStyle: { color: '#7C3AED', borderRadius: [6, 6, 0, 0] }, data: bData.map(d => Math.round(d.netRev)) },
        { name: 'Margin %', type: 'line', yAxisIndex: 1, lineStyle: { width: 3, color: '#E11D48' }, itemStyle: { color: '#E11D48' }, data: bData.map(d => Number(d.marginPct.toFixed(2))) }
      ]
    }), rows.length > 0, p => toggleSetFilter(state.filters.discountBands, p.name));

    const noDisc = bData[0], highDisc = bData[3];
    document.getElementById('s4-insight-discband').innerHTML =
      `Operating margin collapses from <strong>${fmtPct(noDisc.marginPct)}</strong> (0% discount) to <strong>${fmtPct(highDisc.marginPct)}</strong> on High Discounts (16–30%).`;
  }

  // --- SLIDE 5: PRODUCT & CATEGORY PERFORMANCE ---
  function renderSlide5(rows, sum) {
    const catMap = groupBy(rows, r => r.Category);
    const cats = ['Clothing', 'Shoes', 'Accessories'].map(c => catMap.get(c) || { key: c, orders: 0, units: 0, netRev: 0, profit: 0, marginPct: 0, aov: 0 });

    document.getElementById('s5-category-kpis').innerHTML = cats.map(c => {
      const cls = c.key === 'Shoes' ? 'kpi-rose' : c.key === 'Accessories' ? 'kpi-gold' : '';
      return `<div class="kpi-card ${cls}" data-kpi-tip='${JSON.stringify({ title: `${c.key} Category`, rows: [{ label: 'Net Revenue', value: fmtINR(c.netRev) }, { label: 'Profit', value: fmtINR(c.profit) }, { label: 'AOV', value: fmtINR(c.aov) }] })}'>
        <div class="kpi-header-row"><span class="kpi-label">${c.key}</span><span class="kpi-delta-badge positive">${fmtPct(c.marginPct)} Margin</span></div>
        <div class="kpi-val-row"><span class="kpi-value">${fmtINR(c.netRev, true)}</span></div>
        <span class="kpi-sub">${fmtNum(c.orders)} Orders · ${fmtNum(c.units)} Units · AOV ${fmtINR(c.aov)}</span>
      </div>`;
    }).join('');

    // Treemap (Category -> PriceTier)
    const treeData = ['Clothing', 'Shoes', 'Accessories'].map(c => {
      const cRows = rows.filter(r => r.Category === c);
      const tierMap = groupBy(cRows, r => r.PriceTier);
      const cTotal = cRows.reduce((a, b) => a + b.NetRevenue, 0);
      return {
        name: c, value: Math.round(cTotal),
        itemStyle: { color: CAT_COLORS[c] },
        children: [...tierMap.values()].map(t => ({ name: `${c} · ${t.key}`, cat: c, value: Math.round(t.netRev), profit: t.profit, marginPct: t.marginPct }))
      };
    }).filter(x => x.value > 0);

    renderChart('s5-chart-treemap', tc => ({
      tooltip: {
        formatter: p => {
          const d = p.data;
          return ttCard(d.name, [
            { color: CAT_COLORS[d.cat || d.name], label: 'Net Revenue', value: fmtINR(d.value) },
            { label: '% of Total Rev', value: fmtPct(safeDiv(d.value, sum.netRev) * 100, 1) },
            ...(d.profit !== undefined ? [{ label: 'Profit', value: fmtINR(d.profit) }, { label: 'Margin %', value: fmtPct(d.marginPct) }] : [])
          ]);
        }
      },
      series: [{
        type: 'treemap', roam: false, breadcrumb: { show: false },
        label: { show: true, formatter: '{b}\n₹{c}', fontSize: 11 },
        itemStyle: { borderColor: tc.tooltipBg, borderWidth: 2, gapWidth: 2 },
        data: treeData
      }]
    }), rows.length > 0, p => { if (p.data && (p.data.cat || CAT_COLORS[p.data.name])) toggleSetFilter(state.filters.categories, p.data.cat || p.data.name); });

    document.getElementById('s5-insight-treemap').innerHTML =
      `Shoes generates <strong>${fmtPct(safeDiv(cats[1].netRev, sum.netRev) * 100, 1)}</strong> of network revenue despite representing just <strong>${fmtPct(safeDiv(cats[1].units, sum.units) * 100, 1)}</strong> of unit volume.`;

    // Grouped Bar
    renderChart('s5-chart-bar', tc => ({
      tooltip: {
        trigger: 'axis', axisPointer: { type: 'shadow' },
        formatter: params => {
          const d = cats[params[0].dataIndex];
          return ttCard(d.key, [
            { color: '#7C3AED', label: 'Net Revenue', value: fmtINR(d.netRev) },
            { color: '#059669', label: 'Operating Profit', value: fmtINR(d.profit) },
            { label: 'Margin %', value: fmtPct(d.marginPct) },
            { label: 'AOV', value: fmtINR(d.aov) }
          ]);
        }
      },
      legend: { top: 0, textStyle: { color: tc.text, fontSize: 12 } },
      grid: { left: 52, right: 18, top: 32, bottom: 28 },
      xAxis: { type: 'category', data: cats.map(c => c.key), axisLabel: { color: tc.text, fontSize: 12 } },
      yAxis: { type: 'value', axisLabel: { color: tc.text, fontSize: 11, formatter: v => fmtINR(v, true) }, splitLine: { lineStyle: { color: tc.grid } } },
      series: [
        { name: 'Net Revenue', type: 'bar', barMaxWidth: 36, itemStyle: { color: '#7C3AED', borderRadius: [6, 6, 0, 0] }, data: cats.map(c => Math.round(c.netRev)) },
        { name: 'Operating Profit', type: 'bar', barMaxWidth: 36, itemStyle: { color: '#059669', borderRadius: [6, 6, 0, 0] }, data: cats.map(c => Math.round(c.profit)) }
      ]
    }), rows.length > 0, p => toggleSetFilter(state.filters.categories, p.name));

    document.getElementById('s5-insight-bar').innerHTML =
      `<strong>Accessories</strong> delivers the highest profit margin (<strong>${fmtPct(cats[2].marginPct)}</strong>), making checkout attach bundling an instant profit lever.`;

    // Table Toggle Content
    const prodMap = groupBy(rows, r => `${r.ProductID} (${r.Category})`);
    const topProds = [...prodMap.values()].sort((a, b) => b.netRev - a.netRev).slice(0, 30);
    document.getElementById('s5-table-container').innerHTML = `
      <table class="bi-table">
        <thead><tr><th>Product (Category)</th><th>Orders</th><th>Units</th><th>Net Revenue</th><th>Profit</th><th>Margin %</th></tr></thead>
        <tbody>${topProds.map(p => `<tr><td title="${p.key}">${p.key}</td><td>${p.orders}</td><td>${p.units}</td><td>${fmtINR(p.netRev)}</td><td>${fmtINR(p.profit)}</td><td>${fmtPct(p.marginPct)}</td></tr>`).join('')}</tbody>
      </table>`;
  }

  // --- SLIDE 6: STORE MATRIX & CUSTOMER / PAYMENT ---
  function renderSlide6(rows, sum) {
    const storeMap = groupBy(rows, r => r.StoreID);
    const stores = [...storeMap.values()];
    const sortedRev = [...stores].map(s => s.netRev).sort((a, b) => a - b);
    const sortedProf = [...stores].map(s => s.profit).sort((a, b) => a - b);
    const medRev = sortedRev.length ? sortedRev[Math.floor(sortedRev.length / 2)] : 0;
    const medProf = sortedProf.length ? sortedProf[Math.floor(sortedProf.length / 2)] : 0;

    stores.forEach(s => {
      if (s.netRev >= medRev && s.profit >= medProf) s.quadrant = 'Strong Performer';
      else if (s.netRev >= medRev && s.profit < medProf) s.quadrant = 'Margin Problem';
      else if (s.netRev < medRev && s.profit >= medProf) s.quadrant = 'Growth Opportunity';
      else s.quadrant = 'Needs Investigation';
    });

    const qColor = {
      'Strong Performer': '#059669',
      'Margin Problem': '#DC2626',
      'Growth Opportunity': '#7C3AED',
      'Needs Investigation': '#D97706'
    };

    renderChart('s6-chart-matrix', tc => ({
      tooltip: {
        formatter: p => {
          const s = p.data.raw;
          return ttCard(`${s.key} · ${s.quadrant}`, [
            { color: qColor[s.quadrant], label: 'Net Revenue', value: fmtINR(s.netRev) },
            { label: 'Operating Profit', value: fmtINR(s.profit) },
            { label: 'Margin %', value: fmtPct(s.marginPct) },
            { label: 'Orders / Shoes', value: `${s.orders} orders (${s.shoeOrders} shoes)` }
          ]);
        }
      },
      grid: { left: 52, right: 16, top: 20, bottom: 32 },
      xAxis: { type: 'value', name: 'Rev', axisLabel: { color: tc.text, fontSize: 10, formatter: v => fmtINR(v, true) }, splitLine: { lineStyle: { color: tc.grid } } },
      yAxis: { type: 'value', name: 'Profit', axisLabel: { color: tc.text, fontSize: 10, formatter: v => fmtINR(v, true) }, splitLine: { lineStyle: { color: tc.grid } } },
      series: [{
        type: 'scatter',
        symbolSize: (val, p) => Math.max(8, Math.min(22, p.data.raw.orders * 0.48)),
        markLine: {
          silent: true, lineStyle: { type: 'dashed', color: tc.text },
          data: [{ xAxis: medRev }, { yAxis: medProf }]
        },
        data: stores.map(s => ({ value: [Math.round(s.netRev), Math.round(s.profit)], raw: s, itemStyle: { color: qColor[s.quadrant], opacity: (!state.filters.store || state.filters.store === s.key) ? 0.88 : 0.25 } }))
      }]
    }), stores.length > 0, p => {
      const sid = p.data.raw.key;
      state.filters.store = (state.filters.store === sid) ? '' : sid;
      document.getElementById('filter-store-select').value = state.filters.store;
      renderAll();
    });

    const strongCnt = stores.filter(s => s.quadrant === 'Strong Performer').length;
    document.getElementById('s6-insight-matrix').innerHTML =
      `Median thresholds (<strong>${fmtINR(medRev, true)}</strong> Rev, <strong>${fmtINR(medProf, true)}</strong> Profit) classify <strong>${strongCnt}</strong> Strong Performers.`;

    // Top 10 Stores Horizontal Bar
    const top10 = [...stores].sort((a, b) => b.netRev - a.netRev).slice(0, 10).reverse();
    const avgStoreRev = safeDiv(sum.netRev, stores.length);
    renderChart('s6-chart-topstores', tc => ({
      tooltip: {
        trigger: 'axis', axisPointer: { type: 'shadow' },
        formatter: params => {
          const s = top10[params[0].dataIndex];
          return ttCard(s.key, [
            { color: '#7C3AED', label: 'Net Revenue', value: fmtINR(s.netRev) },
            { label: 'vs Store Avg', value: `${s.netRev >= avgStoreRev ? '+' : ''}${fmtINR(s.netRev - avgStoreRev)}` },
            { label: 'Profit (Margin)', value: `${fmtINR(s.profit)} (${fmtPct(s.marginPct)})` }
          ]);
        }
      },
      grid: { left: 68, right: 18, top: 14, bottom: 26 },
      xAxis: { type: 'value', axisLabel: { color: tc.text, fontSize: 10, formatter: v => fmtINR(v, true) }, splitLine: { lineStyle: { color: tc.grid } } },
      yAxis: { type: 'category', data: top10.map(s => s.key), axisLabel: { color: tc.text, fontSize: 11 } },
      series: [{
        type: 'bar', barMaxWidth: 18,
        itemStyle: { borderRadius: [0, 5, 5, 0], color: '#7C3AED' },
        data: top10.map(s => Math.round(s.netRev))
      }]
    }), top10.length > 0, p => {
      state.filters.store = (state.filters.store === p.name) ? '' : p.name;
      document.getElementById('filter-store-select').value = state.filters.store;
      renderAll();
    });

    const topS = top10[top10.length - 1];
    document.getElementById('s6-insight-topstores').innerHTML = topS
      ? `Top store <strong>${topS.key}</strong> generated <strong>${fmtINR(topS.netRev)}</strong> across <strong>${topS.orders}</strong> orders.`
      : 'No store data.';

    // Payment Mode Bar
    const payMap = groupBy(rows, r => r.PaymentMode);
    const pays = ['Card', 'Cash', 'Digital', 'Unknown'].map(p => payMap.get(p) || { key: p, orders: 0, netRev: 0, profit: 0, marginPct: 0, aov: 0 });
    renderChart('s6-chart-payment', tc => ({
      tooltip: {
        trigger: 'axis', axisPointer: { type: 'shadow' },
        formatter: params => {
          const d = pays[params[0].dataIndex];
          return ttCard(`Payment: ${d.key}`, [
            { color: '#0D9488', label: 'Net Revenue', value: fmtINR(d.netRev) },
            { label: 'AOV', value: fmtINR(d.aov) },
            { label: 'Margin %', value: fmtPct(d.marginPct) },
            { label: 'Orders', value: fmtNum(d.orders) }
          ]);
        }
      },
      grid: { left: 50, right: 16, top: 20, bottom: 28 },
      xAxis: { type: 'category', data: pays.map(p => p.key), axisLabel: { color: tc.text, fontSize: 11 } },
      yAxis: { type: 'value', axisLabel: { color: tc.text, fontSize: 10, formatter: v => fmtINR(v, true) }, splitLine: { lineStyle: { color: tc.grid } } },
      series: [{
        type: 'bar', barMaxWidth: 38,
        itemStyle: { borderRadius: [6, 6, 0, 0], color: p => ['#4F46E5', '#D97706', '#059669', '#64748B'][p.dataIndex] },
        data: pays.map(p => Math.round(p.netRev))
      }]
    }), rows.length > 0, p => toggleSetFilter(state.filters.paymentModes, p.name));

    const upi = pays[2];
    document.getElementById('s6-insight-payment').innerHTML =
      `<strong>Digital UPI</strong> posts the highest AOV (<strong>${fmtINR(upi.aov)}</strong>) and margin (<strong>${fmtPct(upi.marginPct)}</strong>).`;
  }

  // --- SLIDE 7: DEEP-DIVE ON MAIN BUSINESS PROBLEMS ---
  function renderSlide7(rows, sum) {
    const rVal = pearsonR(rows.map(r => r.Discount), rows.map(r => r.Quantity));
    const storeList = [...groupBy(rows, r => r.StoreID).values()].sort((a, b) => b.netRev - a.netRev);
    const bestS = storeList[0], worstS = storeList[storeList.length - 1];
    const ratio = (bestS && worstS) ? safeDiv(bestS.netRev, worstS.netRev) : 0;
    const highDisc = rows.filter(r => r.Discount >= 16);
    const highDiscMargin = safeDiv(highDisc.reduce((a, b) => a + b.Profit, 0), highDisc.reduce((a, b) => a + b.NetRevenue, 0)) * 100;

    document.getElementById('s7-problem-kpis').innerHTML = [
      { cls: 'kpi-rose', label: 'Discount Elasticity (r)', val: rVal.toFixed(4), badge: 'Zero Expansion', sub: 'Discount % vs Quantity correlation' },
      { cls: 'kpi-rose', label: 'High-Disc Margin (16-30%)', val: fmtPct(highDiscMargin), badge: `${highDisc.length} Orders`, sub: 'vs ~40.2% on 0% discount' },
      { cls: 'kpi-gold', label: 'Top vs Bottom Store Gap', val: `${ratio.toFixed(1)}x`, badge: `${bestS ? bestS.key : '-'} vs ${worstS ? worstS.key : '-'}`, sub: 'Driven by footwear scarcity' },
      { cls: 'kpi-teal', label: 'Markdown Surrender', val: fmtINR(sum.discAmt, true), badge: fmtPct(safeDiv(sum.discAmt, sum.gross) * 100, 1), sub: 'Total gross revenue discounted' }
    ].map(k => `
      <div class="kpi-card ${k.cls}" data-kpi-tip='${JSON.stringify({ title: k.label, rows: [{ label: 'Value', value: k.val }, { label: 'Diagnosis', value: k.sub }] })}'>
        <div class="kpi-header-row"><span class="kpi-label">${k.label}</span><span class="kpi-delta-badge negative">${k.badge}</span></div>
        <div class="kpi-val-row"><span class="kpi-value">${k.val}</span></div>
        <span class="kpi-sub">${k.sub}</span>
      </div>`).join('');

    // Discount % vs Margin % by exact Discount rate
    const discRates = [0, 5, 10, 15, 20, 25, 30];
    const rateStats = discRates.map(rate => {
      const sub = rows.filter(r => r.Discount === rate);
      const rev = sub.reduce((a, b) => a + b.NetRevenue, 0);
      const prof = sub.reduce((a, b) => a + b.Profit, 0);
      const qty = sub.reduce((a, b) => a + b.Quantity, 0);
      return { rate: `${rate}%`, orders: sub.length, marginPct: safeDiv(prof, rev) * 100, basket: safeDiv(qty, sub.length) };
    });

    renderChart('s7-chart-elasticity', tc => ({
      tooltip: {
        trigger: 'axis',
        formatter: params => {
          const d = rateStats[params[0].dataIndex];
          return ttCard(`Discount Rate: ${d.rate}`, [
            { color: '#E11D48', label: 'Profit Margin %', value: fmtPct(d.marginPct) },
            { color: '#7C3AED', label: 'Avg Basket Size', value: `${d.basket.toFixed(2)} units` },
            { label: 'Orders', value: fmtNum(d.orders) }
          ]);
        }
      },
      legend: { top: 0, textStyle: { color: tc.text, fontSize: 12 } },
      grid: { left: 48, right: 48, top: 32, bottom: 28 },
      xAxis: { type: 'category', data: rateStats.map(d => d.rate), axisLabel: { color: tc.text, fontSize: 11 } },
      yAxis: [
        { type: 'value', min: 0, max: 50, axisLabel: { color: tc.text, formatter: '{value}%' }, splitLine: { lineStyle: { color: tc.grid } } },
        { type: 'value', min: 0, max: 4, axisLabel: { color: tc.text, formatter: '{value} u' }, splitLine: { show: false } }
      ],
      series: [
        { name: 'Profit Margin %', type: 'bar', barMaxWidth: 34, itemStyle: { color: '#E11D48', borderRadius: [6, 6, 0, 0] }, data: rateStats.map(d => Number(d.marginPct.toFixed(2))) },
        { name: 'Units / Order', type: 'line', yAxisIndex: 1, lineStyle: { width: 3, color: '#7C3AED' }, itemStyle: { color: '#7C3AED' }, data: rateStats.map(d => Number(d.basket.toFixed(2))) }
      ]
    }), rows.length > 0);

    document.getElementById('s7-insight-elasticity').innerHTML =
      `Basket size stays flat around <strong>2.1 units</strong> across all discount rates (r = <strong>${rVal.toFixed(4)}</strong>), proving deep markdowns only destroy margin.`;

    // Top 5 vs Bottom 5 Category Mix
    const top5Ids = new Set(storeList.slice(0, 5).map(s => s.key));
    const bot5Ids = new Set(storeList.slice(-5).map(s => s.key));
    const calcCohortCat = ids => ['Clothing', 'Shoes', 'Accessories'].map(c =>
      Math.round(rows.filter(r => ids.has(r.StoreID) && r.Category === c).reduce((a, b) => a + b.NetRevenue, 0))
    );
    const topMix = calcCohortCat(top5Ids);
    const botMix = calcCohortCat(bot5Ids);

    renderChart('s7-chart-chasm', tc => ({
      tooltip: {
        trigger: 'axis', axisPointer: { type: 'shadow' },
        formatter: params => ttCard(params[0].name, params.map(p => ({ color: p.color, label: p.seriesName, value: fmtINR(p.value) })))
      },
      legend: { top: 0, textStyle: { color: tc.text, fontSize: 12 } },
      grid: { left: 54, right: 18, top: 32, bottom: 28 },
      xAxis: { type: 'category', data: ['Top 5 Stores', 'Bottom 5 Stores'], axisLabel: { color: tc.text, fontSize: 12 } },
      yAxis: { type: 'value', axisLabel: { color: tc.text, formatter: v => fmtINR(v, true) }, splitLine: { lineStyle: { color: tc.grid } } },
      series: ['Clothing', 'Shoes', 'Accessories'].map((c, idx) => ({
        name: c, type: 'bar', stack: 'mix', barMaxWidth: 58,
        itemStyle: { color: CAT_COLORS[c] },
        data: [topMix[idx], botMix[idx]]
      }))
    }), storeList.length >= 2);

    document.getElementById('s7-insight-chasm').innerHTML =
      `Top 5 stores generate <strong>${fmtINR(topMix[1], true)}</strong> in Shoes vs just <strong>${fmtINR(botMix[1], true)}</strong> across Bottom 5 stores.`;
  }

  // --- SLIDE 8: TRENDS & SEASONALITY ---
  function renderSlide8(rows, sum) {
    const dowMap = groupBy(rows, r => r.DayOfWeek);
    const dowData = DAY_ORDER.map(d => dowMap.get(d) || { key: d, orders: 0, netRev: 0, profit: 0, marginPct: 0 });
    const avgDowRev = safeDiv(sum.netRev, 7);

    renderChart('s8-chart-dow', tc => ({
      tooltip: {
        trigger: 'axis',
        formatter: params => {
          const d = dowData[params[0].dataIndex];
          return ttCard(d.key, [
            { color: '#7C3AED', label: 'Net Revenue', value: fmtINR(d.netRev) },
            { color: '#0D9488', label: 'Orders', value: fmtNum(d.orders) },
            { label: 'vs 7-Day Avg', value: `${d.netRev >= avgDowRev ? '+' : ''}${fmtINR(d.netRev - avgDowRev)}` },
            { label: 'Margin %', value: fmtPct(d.marginPct) }
          ]);
        }
      },
      legend: { top: 0, textStyle: { color: tc.text, fontSize: 12 } },
      grid: { left: 52, right: 44, top: 32, bottom: 28 },
      xAxis: { type: 'category', data: DAY_ORDER.map(d => d.slice(0, 3)), axisLabel: { color: tc.text, fontSize: 12 } },
      yAxis: [
        { type: 'value', axisLabel: { color: tc.text, formatter: v => fmtINR(v, true) }, splitLine: { lineStyle: { color: tc.grid } } },
        { type: 'value', axisLabel: { color: tc.text }, splitLine: { show: false } }
      ],
      series: [
        {
          name: 'Net Revenue', type: 'bar', barMaxWidth: 38,
          markLine: { silent: true, data: [{ type: 'average', name: 'Avg' }], label: { formatter: p => `Avg ${fmtINR(p.value, true)}` } },
          itemStyle: { borderRadius: [6, 6, 0, 0], color: p => (p.dataIndex >= 5 ? '#E11D48' : '#7C3AED') },
          data: dowData.map(d => Math.round(d.netRev))
        },
        { name: 'Orders', type: 'line', yAxisIndex: 1, lineStyle: { width: 3, color: '#0D9488' }, itemStyle: { color: '#0D9488' }, data: dowData.map(d => d.orders) }
      ]
    }), rows.length > 0, p => {
      const fullDay = DAY_ORDER[p.dataIndex];
      if (fullDay) toggleSetFilter(state.filters.daysOfWeek, fullDay);
    });

    const peakDay = [...dowData].sort((a, b) => b.netRev - a.netRev)[0];
    document.getElementById('s8-insight-dow').innerHTML = peakDay
      ? `<strong>${peakDay.key}</strong> is #1 at <strong>${fmtINR(peakDay.netRev)}</strong> (${fmtNum(peakDay.orders)} orders). Weekdays drive <strong>${fmtPct(safeDiv(dowData.slice(0, 5).reduce((a, b) => a + b.netRev, 0), sum.netRev) * 100, 1)}</strong> of total revenue.`
      : 'No daily data.';

    // Month x Category Heatmap
    const months = [...new Set(rows.map(r => r.MonthKey))].sort();
    const cats = ['Clothing', 'Shoes', 'Accessories'];
    const heatData = [];
    let maxCell = 1;
    let cellSum = 0;
    months.forEach((m, mi) => {
      cats.forEach((c, ci) => {
        const val = Math.round(rows.filter(r => r.MonthKey === m && r.Category === c).reduce((a, b) => a + b.NetRevenue, 0));
        if (val > maxCell) maxCell = val;
        cellSum += val;
        heatData.push([mi, ci, val]);
      });
    });
    const avgCell = safeDiv(cellSum, heatData.length);

    renderChart('s8-chart-heatmap', tc => ({
      tooltip: {
        formatter: p => {
          const [mi, ci, val] = p.data;
          return ttCard(`${months[mi]} · ${cats[ci]}`, [
            { color: CAT_COLORS[cats[ci]], label: 'Net Revenue', value: fmtINR(val) },
            { label: 'vs Cell Average', value: `${val >= avgCell ? '+' : ''}${fmtINR(val - avgCell)}` }
          ]);
        }
      },
      grid: { left: 82, right: 16, top: 18, bottom: 48 },
      xAxis: { type: 'category', data: months, axisLabel: { color: tc.text, fontSize: 10, rotate: 40 } },
      yAxis: { type: 'category', data: cats, axisLabel: { color: tc.text, fontSize: 11 } },
      visualMap: { min: 0, max: maxCell, show: false, inRange: { color: ['#F3E8FF', '#A78BFA', '#7C3AED', '#4C1D95'] } },
      series: [{ type: 'heatmap', data: heatData, itemStyle: { borderColor: tc.tooltipBg, borderWidth: 1 } }]
    }), heatData.length > 0);

    document.getElementById('s8-insight-heatmap').innerHTML =
      `October festive peaks create sharp seasonal demand spikes across Clothing and Shoes—lock inventory builds by September 15.`;
  }

  // --- SLIDE 9: WHAT-IF SIMULATOR ---
  function renderSlide9(rows, sum) {
    const cap = state.sim.discCap;
    const shoeLift = state.sim.shoeLift / 100;
    const accAttach = state.sim.accAttach / 100;
    const upiShift = state.sim.upiShift / 100;

    let discRecovery = 0;
    let shoeRevAdd = 0, shoeProfAdd = 0;
    let accRevAdd = 0, accProfAdd = 0;

    for (const r of rows) {
      if (r.Discount > cap) {
        const saved = r.GrossSales * ((r.Discount - cap) / 100);
        discRecovery += saved;
      }
      if (r.Category === 'Shoes') {
        const add = r.NetRevenue * shoeLift * 0.45;
        shoeRevAdd += add;
        shoeProfAdd += add * 0.35;
      }
      if (r.Category === 'Accessories') {
        const add = r.NetRevenue * accAttach;
        accRevAdd += add;
        accProfAdd += add * 0.3525;
      }
    }

    const cashRev = rows.filter(r => r.PaymentMode === 'Cash').reduce((a, b) => a + b.NetRevenue, 0);
    const upiProfAdd = cashRev * upiShift * 0.012;

    const simRev = sum.netRev + discRecovery + shoeRevAdd + accRevAdd;
    const simProf = sum.profit + discRecovery + shoeProfAdd + accProfAdd + upiProfAdd;
    const simMargin = safeDiv(simProf, simRev) * 100;
    const profUplift = simProf - sum.profit;

    document.getElementById('s9-sim-kpis').innerHTML = [
      { cls: '', label: 'Baseline Profit', val: fmtINR(sum.profit, true), badge: fmtPct(sum.marginPct), sub: `Baseline Rev ${fmtINR(sum.netRev, true)}` },
      { cls: 'kpi-green', label: 'Simulated Profit', val: fmtINR(simProf, true), badge: fmtPct(simMargin), sub: `Sim Rev ${fmtINR(simRev, true)}` },
      { cls: 'kpi-teal', label: 'Net Profit Uplift', val: `+${fmtINR(profUplift, true)}`, badge: `+${(simMargin - sum.marginPct).toFixed(2)} pp`, sub: 'Direct EBITDA expansion' },
      { cls: 'kpi-gold', label: 'Discount Cap Savings', val: fmtINR(discRecovery, true), badge: `Max ${cap}%`, sub: 'Margin preserved from markdowns' }
    ].map(k => `
      <div class="kpi-card ${k.cls}" data-kpi-tip='${JSON.stringify({ title: k.label, rows: [{ label: 'Value', value: k.val }, { label: 'Impact', value: k.sub }] })}'>
        <div class="kpi-header-row"><span class="kpi-label">${k.label}</span><span class="kpi-delta-badge positive">${k.badge}</span></div>
        <div class="kpi-val-row"><span class="kpi-value">${k.val}</span></div>
        <span class="kpi-sub">${k.sub}</span>
      </div>`).join('');

    document.getElementById('s9-sim-summary').innerHTML =
      `Combined strategy yields <strong>+${fmtINR(profUplift)}</strong> in incremental operating profit, lifting margin from <strong>${fmtPct(sum.marginPct)}</strong> to <strong>${fmtPct(simMargin)}</strong>.`;

    renderChart('s9-chart-sim', tc => ({
      tooltip: {
        trigger: 'axis', axisPointer: { type: 'shadow' },
        formatter: params => ttCard(params[0].name, params.map(p => ({ color: p.color, label: p.seriesName, value: fmtINR(p.value) })))
      },
      legend: { top: 0, textStyle: { color: tc.text, fontSize: 12 } },
      grid: { left: 54, right: 18, top: 32, bottom: 28 },
      xAxis: { type: 'category', data: ['Net Revenue', 'Operating Profit'], axisLabel: { color: tc.text, fontSize: 12 } },
      yAxis: { type: 'value', axisLabel: { color: tc.text, formatter: v => fmtINR(v, true) }, splitLine: { lineStyle: { color: tc.grid } } },
      series: [
        { name: 'Baseline', type: 'bar', barMaxWidth: 46, itemStyle: { color: '#64748B', borderRadius: [6, 6, 0, 0] }, data: [Math.round(sum.netRev), Math.round(sum.profit)] },
        { name: 'Simulated', type: 'bar', barMaxWidth: 46, itemStyle: { color: '#059669', borderRadius: [6, 6, 0, 0] }, data: [Math.round(simRev), Math.round(simProf)] }
      ]
    }), rows.length > 0);

    document.getElementById('s9-insight-sim').innerHTML =
      `Capping discounts at <strong>${cap}%</strong> alone recovers <strong>${fmtINR(discRecovery)}</strong> in direct operating profit.`;
  }

  // --- SLIDE 10: STORE ACTION REGISTER ---
  function renderSlide10(rows) {
    const storeMap = groupBy(rows, r => r.StoreID);
    const stores = [...storeMap.values()];
    const sortedRev = [...stores].map(s => s.netRev).sort((a, b) => a - b);
    const sortedProf = [...stores].map(s => s.profit).sort((a, b) => a - b);
    const medRev = sortedRev.length ? sortedRev[Math.floor(sortedRev.length / 2)] : 0;
    const medProf = sortedProf.length ? sortedProf[Math.floor(sortedProf.length / 2)] : 0;

    stores.forEach(s => {
      if (s.netRev >= medRev && s.profit >= medProf) { s.quad = 'Strong Performer'; s.badge = 'badge-green'; s.action = 'Codify playbook & mentor peers'; }
      else if (s.netRev >= medRev && s.profit < medProf) { s.quad = 'Margin Problem'; s.badge = 'badge-red'; s.action = 'Cap cashier discounts at 10%'; }
      else if (s.netRev < medRev && s.profit >= medProf) { s.quad = 'Growth Opportunity'; s.badge = 'badge-violet'; s.action = 'Drive local footfall & omnichannel'; }
      else { s.quad = 'Needs Investigation'; s.badge = 'badge-amber'; s.action = 'Rebalance Footwear SKU depth'; }
    });

    stores.sort((a, b) => state.sortAsc ? (a[state.sortCol] > b[state.sortCol] ? 1 : -1) : (a[state.sortCol] < b[state.sortCol] ? 1 : -1));
    document.getElementById('s10-table-count').textContent = `${stores.length} Stores`;

    document.getElementById('s10-store-table-wrap').innerHTML = `
      <table class="bi-table" id="s10-table">
        <thead>
          <tr>
            <th data-col="key">Store</th>
            <th data-col="quad">Classification</th>
            <th data-col="orders">Orders</th>
            <th data-col="shoeOrders">Shoe Orders</th>
            <th data-col="netRev">Net Revenue</th>
            <th data-col="profit">Profit</th>
            <th data-col="marginPct">Margin %</th>
            <th data-col="action">Recommended Action</th>
          </tr>
        </thead>
        <tbody>
          ${stores.map(s => `
            <tr data-store="${s.key}" class="${state.filters.store === s.key ? 'selected-row' : ''}">
              <td title="${s.key}">${s.key}</td>
              <td><span class="badge-pill ${s.badge}">${s.quad}</span></td>
              <td>${s.orders}</td>
              <td>${s.shoeOrders}</td>
              <td>${fmtINR(s.netRev)}</td>
              <td>${fmtINR(s.profit)}</td>
              <td>${fmtPct(s.marginPct)}</td>
              <td title="${s.action}">${s.action}</td>
            </tr>`).join('')}
        </tbody>
      </table>`;

    document.querySelectorAll('#s10-table th').forEach(th => {
      th.onclick = () => {
        const col = th.dataset.col;
        state.sortAsc = (state.sortCol === col) ? !state.sortAsc : false;
        state.sortCol = col;
        renderSlide10(rows);
      };
    });

    document.querySelectorAll('#s10-table tbody tr').forEach(tr => {
      tr.onclick = () => {
        const sid = tr.dataset.store;
        state.filters.store = (state.filters.store === sid) ? '' : sid;
        document.getElementById('filter-store-select').value = state.filters.store;
        renderAll();
      };
    });
  }

  // =========================================================================
  // 9. SLIDE NAVIGATION, MODALS, TOUR & DIAGNOSTICS
  // =========================================================================
  function goToSlide(idx) {
    const slides = document.querySelectorAll('.slide');
    const clamped = Math.max(0, Math.min(slides.length - 1, idx));
    state.currentSlide = clamped;
    slides.forEach((s, i) => s.classList.toggle('active', i === clamped));
    document.getElementById('footer-slide-indicator').textContent = `Slide ${clamped + 1} / ${slides.length}`;
    document.getElementById('btn-prev-slide').disabled = clamped === 0;
    document.getElementById('btn-next-slide').disabled = clamped === slides.length - 1;
    document.querySelectorAll('.slide-dot').forEach((d, i) => d.classList.toggle('active', i === clamped));
    document.getElementById('stage-container').scrollTop = 0;

    // Update notes drawer
    const meta = SLIDE_META[clamped];
    document.getElementById('speaker-notes-body').innerHTML =
      `<h4 style="color:var(--text-main);">${clamped + 1}. ${meta.title}</h4>` +
      meta.notes.map(n => `<div style="background:var(--bg-card-subtle); padding:10px; border-left:3px solid var(--color-accent); border-radius:6px;">${n}</div>`).join('');

    setTimeout(resizeActiveSlideCharts, 290);
    updateDiagnostics();
  }

  function updateDiagnostics() {
    const body = document.getElementById('diagnostics-body');
    const active = document.querySelector('.slide.active');
    if (!active) return;
    const items = [];
    active.querySelectorAll('.chart-container, .chart-container-tall').forEach(el => {
      const r = el.getBoundingClientRect();
      const warn = r.height < 100 || r.width < 100;
      items.push(`<div style="padding:8px; border-radius:6px; background:var(--bg-card-subtle); display:flex; justify-content:space-between;">
        <span>${el.id}</span>
        <strong style="color:${warn ? '#DC2626' : '#059669'}">${Math.round(r.width)}×${Math.round(r.height)}px ${warn ? '⚠️' : '✓'}</strong>
      </div>`);
    });
    body.innerHTML = `<div style="font-weight:700;">Active Slide Charts (${items.length})</div>` + items.join('');
  }

  function openFocusModal(chartId) {
    const srcEl = document.getElementById(chartId);
    const srcChart = srcEl && window.echarts ? window.echarts.getInstanceByDom(srcEl) : null;
    if (!srcChart) return;
    const modal = document.getElementById('focus-modal');
    const titleEl = srcEl.closest('.card').querySelector('.card-title span');
    document.getElementById('focus-modal-title').textContent = titleEl ? titleEl.textContent : 'Expanded View';
    modal.classList.add('open');

    const fcEl = document.getElementById('focus-chart-container');
    let fc = window.echarts.getInstanceByDom(fcEl) || window.echarts.init(fcEl);
    fc.setOption(srcChart.getOption(), true);
    setTimeout(() => fc.resize(), 80);
  }

  function exportCSV(filename, rows) {
    const csv = window.Papa ? window.Papa.unparse(rows) : '';
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
  }

  // =========================================================================
  // 10. EVENT LISTENERS & BOOTSTRAP
  // =========================================================================
  function initUI() {
    // Slide dots & Overview Grid
    const dotsWrap = document.getElementById('slide-dots');
    const gridWrap = document.getElementById('overview-grid');
    SLIDE_META.forEach((m, i) => {
      const dot = document.createElement('span');
      dot.className = 'slide-dot' + (i === 0 ? ' active' : '');
      dot.title = `${i + 1}. ${m.title}`;
      dot.onclick = () => goToSlide(i);
      dotsWrap.appendChild(dot);

      const thumb = document.createElement('div');
      thumb.className = 'overview-thumb' + (i === 0 ? ' active' : '');
      thumb.innerHTML = `<span style="font-size:11px; font-weight:800; color:var(--color-accent);">SLIDE ${i + 1}</span><strong style="font-size:12.5px;">${m.title}</strong>`;
      thumb.onclick = () => { goToSlide(i); document.getElementById('overview-modal').classList.remove('open'); };
      gridWrap.appendChild(thumb);
    });

    document.getElementById('btn-prev-slide').onclick = () => goToSlide(state.currentSlide - 1);
    document.getElementById('btn-next-slide').onclick = () => goToSlide(state.currentSlide + 1);
    document.getElementById('btn-toggle-slicers').onclick = () => {
      document.getElementById('slicer-panel').classList.toggle('collapsed');
      setTimeout(resizeActiveSlideCharts, 300);
    };

    document.getElementById('btn-reset-filters').onclick = () => {
      const dates = state.cleanRows.map(r => r.Date).sort();
      state.filters = {
        dateStart: dates[0] || '', dateEnd: dates[dates.length - 1] || '',
        categories: new Set(), store: '', discountBands: new Set(),
        customerTypes: new Set(), paymentModes: new Set(), dayTypes: new Set(),
        daysOfWeek: new Set(), excludeUnknown: false
      };
      document.getElementById('filter-store-select').value = '';
      document.getElementById('filter-store-search').value = '';
      document.getElementById('toggle-exclude-unknown').checked = false;
      document.getElementById('filter-date-start').value = state.filters.dateStart;
      document.getElementById('filter-date-end').value = state.filters.dateEnd;
      renderAll();
    };

    document.getElementById('filter-date-start').onchange = e => { state.filters.dateStart = e.target.value; renderAll(); };
    document.getElementById('filter-date-end').onchange = e => { state.filters.dateEnd = e.target.value; renderAll(); };
    document.getElementById('filter-store-select').onchange = e => { state.filters.store = e.target.value; renderAll(); };
    document.getElementById('filter-store-search').oninput = e => {
      const q = e.target.value.toLowerCase();
      const sel = document.getElementById('filter-store-select');
      const stores = [...new Set(state.cleanRows.map(r => r.StoreID))].sort().filter(s => s.toLowerCase().includes(q));
      sel.innerHTML = `<option value="">All Matching (${stores.length})</option>` + stores.map(s => `<option value="${s}">${s}</option>`).join('');
    };

    const syncUnknownToggle = checked => {
      state.filters.excludeUnknown = checked;
      document.getElementById('toggle-exclude-unknown').checked = checked;
      document.getElementById('unknown-toggle-label').textContent = checked ? 'Exclude Unknowns' : 'Retain Unknowns (Default)';
      renderAll();
    };
    document.getElementById('toggle-exclude-unknown').onchange = e => syncUnknownToggle(e.target.checked);
    document.getElementById('btn-s3-toggle-unknown').onclick = () => syncUnknownToggle(!state.filters.excludeUnknown);

    // Zoom & Theme & Meeting Mode
    const setZoom = z => {
      state.zoomLevel = Math.max(80, Math.min(130, z));
      document.body.className = document.body.className.replace(/zoom-level-\d+/g, '') + ` zoom-level-${state.zoomLevel}`;
      document.getElementById('zoom-val-label').textContent = `${state.zoomLevel}%`;
      setTimeout(resizeActiveSlideCharts, 150);
    };
    document.getElementById('btn-zoom-in').onclick = () => setZoom(state.zoomLevel + 10);
    document.getElementById('btn-zoom-out').onclick = () => setZoom(state.zoomLevel - 10);

    document.getElementById('btn-theme-toggle').onclick = () => {
      state.theme = state.theme === 'light' ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', state.theme);
      renderAll();
    };

    const toggleMeeting = () => {
      document.body.classList.toggle('meeting-mode');
      setTimeout(resizeActiveSlideCharts, 250);
    };
    document.getElementById('btn-meeting-mode').onclick = toggleMeeting;
    document.addEventListener('mousemove', e => {
      if (document.body.classList.contains('meeting-mode')) {
        const sp = document.getElementById('meeting-spotlight');
        sp.style.left = `${e.clientX}px`;
        sp.style.top = `${e.clientY}px`;
      }
    });

    // Notes, Overview, Diag, Focus, Print, Fullscreen
    document.getElementById('btn-notes').onclick = () => document.getElementById('speaker-notes-drawer').classList.toggle('open');
    document.getElementById('btn-close-notes').onclick = () => document.getElementById('speaker-notes-drawer').classList.remove('open');
    document.getElementById('btn-close-diag').onclick = () => document.getElementById('diagnostics-drawer').classList.remove('open');
    document.getElementById('btn-overview').onclick = () => document.getElementById('overview-modal').classList.add('open');
    document.getElementById('btn-close-overview').onclick = () => document.getElementById('overview-modal').classList.remove('open');
    document.getElementById('btn-close-focus').onclick = () => document.getElementById('focus-modal').classList.remove('open');
    document.querySelectorAll('.btn-focus').forEach(b => b.onclick = () => openFocusModal(b.dataset.chart));
    document.getElementById('btn-print').onclick = () => window.print();
    document.getElementById('btn-fullscreen').onclick = () => {
      if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
      else document.exitFullscreen().catch(() => {});
    };

    // Slide 5 toggle & CSV export
    document.getElementById('btn-s5-view-toggle').onclick = () => {
      state.s5TableView = !state.s5TableView;
      document.getElementById('s5-charts-wrap').style.display = state.s5TableView ? 'none' : 'grid';
      document.getElementById('s5-table-wrap').style.display = state.s5TableView ? 'flex' : 'none';
      if (!state.s5TableView) setTimeout(resizeActiveSlideCharts, 80);
    };
    document.getElementById('btn-s5-export').onclick = () => exportCSV('fashionwave_filtered_orders.csv', getFilteredRows());
    document.getElementById('btn-s10-export').onclick = () => {
      const storeMap = groupBy(getFilteredRows(), r => r.StoreID);
      exportCSV('fashionwave_store_actions.csv', [...storeMap.values()]);
    };

    // Simulator Sliders
    const bindSim = (id, key, fmt) => {
      document.getElementById(id).oninput = e => {
        state.sim[key] = Number(e.target.value);
        document.getElementById(`${id}-val`).textContent = fmt(state.sim[key]);
        renderSlide9(getFilteredRows(), computeSummary(getFilteredRows()));
      };
    };
    bindSim('sim-disc-cap', 'discCap', v => v === 30 ? '30% (Current)' : `${v}% Max`);
    bindSim('sim-shoe-lift', 'shoeLift', v => `+${v}%`);
    bindSim('sim-acc-attach', 'accAttach', v => `+${v}%`);
    bindSim('sim-upi-shift', 'upiShift', v => `+${v}%`);
    document.getElementById('btn-sim-reset').onclick = () => {
      state.sim = { discCap: 30, shoeLift: 0, accAttach: 0, upiShift: 0 };
      document.getElementById('sim-disc-cap').value = 30; document.getElementById('sim-disc-cap-val').textContent = '30% (Current)';
      document.getElementById('sim-shoe-lift').value = 0; document.getElementById('sim-shoe-lift-val').textContent = '+0%';
      document.getElementById('sim-acc-attach').value = 0; document.getElementById('sim-acc-attach-val').textContent = '+0%';
      document.getElementById('sim-upi-shift').value = 0; document.getElementById('sim-upi-shift-val').textContent = '+0%';
      renderSlide9(getFilteredRows(), computeSummary(getFilteredRows()));
    };

    // Tour Modal
    const TOUR_STEPS = [
      { title: '1. Global Interactive Slicers', desc: 'Use the left Slicer Rail to filter by Category, Store, Discount Band, Customer Type, Payment Mode, or Date Range. Every KPI and chart recalculates live.' },
      { title: '2. Click Charts to Cross-Filter', desc: 'Click any bar, donut slice, treemap block, or store scatter dot to filter the entire 10-slide deck. Click again to clear.' },
      { title: '3. Rich Hover Cards & Focus Mode', desc: 'Hover any chart element, KPI card, or (i) info icon for definitions and variance vs average. Click "Focus" on any card to expand it full-screen.' },
      { title: '4. Live Presentation Shortcuts', desc: 'Press M for Meeting Mode (+10% text + spotlight), F for Fullscreen, G for Slide Grid, N for Speaker Notes, and D for Layout Diagnostics.' }
    ];
    let tourIdx = 0;
    const showTourStep = i => {
      tourIdx = i;
      document.getElementById('tour-step-title').textContent = TOUR_STEPS[i].title;
      document.getElementById('tour-step-desc').textContent = TOUR_STEPS[i].desc;
      document.getElementById('tour-step-counter').textContent = `Step ${i + 1} of 4`;
      document.getElementById('btn-tour-next').textContent = i === 3 ? 'Finish ✓' : 'Next →';
    };
    document.getElementById('btn-tour').onclick = () => { showTourStep(0); document.getElementById('tour-modal').classList.add('open'); };
    document.getElementById('btn-close-tour').onclick = () => document.getElementById('tour-modal').classList.remove('open');
    document.getElementById('btn-tour-skip').onclick = () => document.getElementById('tour-modal').classList.remove('open');
    document.getElementById('btn-tour-next').onclick = () => {
      if (tourIdx < 3) showTourStep(tourIdx + 1);
      else document.getElementById('tour-modal').classList.remove('open');
    };

    // Manual CSV input fallback
    document.getElementById('manual-csv-input').onchange = e => {
      const file = e.target.files[0];
      if (!file || !window.Papa) return;
      window.Papa.parse(file, {
        header: true, skipEmptyLines: true,
        complete: res => {
          if (parseAndClean(res.data, file.name, 'manual file picker')) {
            document.getElementById('fallback-loader').classList.remove('open');
          }
        }
      });
    };

    // Keyboard Shortcuts
    document.addEventListener('keydown', e => {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
      if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); goToSlide(state.currentSlide + 1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); goToSlide(state.currentSlide - 1); }
      else if (e.key >= '1' && e.key <= '9') goToSlide(Number(e.key) - 1);
      else if (e.key === '0') goToSlide(9);
      else if (e.key.toLowerCase() === 'm') toggleMeeting();
      else if (e.key.toLowerCase() === 'n') document.getElementById('speaker-notes-drawer').classList.toggle('open');
      else if (e.key.toLowerCase() === 'd') { updateDiagnostics(); document.getElementById('diagnostics-drawer').classList.toggle('open'); }
      else if (e.key.toLowerCase() === 'g') document.getElementById('overview-modal').classList.toggle('open');
      else if (e.key.toLowerCase() === 'f') document.getElementById('btn-fullscreen').click();
      else if (e.key === '?') document.getElementById('btn-tour').click();
      else if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('open'));
        document.querySelectorAll('.side-drawer').forEach(d => d.classList.remove('open'));
      }
    });

    // Hash Routing (#slide-1..10)
    const checkHash = () => {
      const m = window.location.hash.match(/^#slide-(\d+)$/);
      if (m) goToSlide(Number(m[1]) - 1);
    };
    window.addEventListener('hashchange', checkHash);
    window.addEventListener('resize', () => setTimeout(resizeActiveSlideCharts, 120));

    checkHash();
    goToSlide(state.currentSlide);
  }

  document.addEventListener('DOMContentLoaded', () => {
    initUI();
    loadInitialData();
  });
})();
