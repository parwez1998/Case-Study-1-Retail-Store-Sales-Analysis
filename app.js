/**
 * FashionWave Retail Analytics - Master Application Controller
 * Handles PowerPoint Presentation Deck Navigation and Dynamic Interactive BI Dashboard
 * Enhanced for High Readability, Flexible Layouts, and Zero Overlap
 */

document.addEventListener('DOMContentLoaded', function () {
  const RAW_DATA = window.RAW_SALES_DATA || [];
  console.log(`Loaded ${RAW_DATA.length} records into FashionWave Analytics Engine.`);

  /* ==========================================================================
     Presentation Deck State & Controls
     ========================================================================== */

  let currentSlide = 1;
  const totalSlides = 16;

  const slides = document.querySelectorAll('.slide');
  const slideJumpSelect = document.getElementById('slide-jump-select');
  const slideCounterBadge = document.getElementById('slide-counter-badge');
  const slideTitlePreview = document.getElementById('slide-title-preview');
  const slideProgressBar = document.getElementById('slide-progress-bar');
  const btnPrev = document.getElementById('btn-prev-slide');
  const btnNext = document.getElementById('btn-next-slide');
  const btnFullscreen = document.getElementById('btn-fullscreen');
  const presentationViewport = document.getElementById('presentation-viewport');

  const slideTitles = [
    "Title Slide: FashionWave Executive Readout",
    "Business Problem & Analytical Objectives",
    "Dataset Architecture & Schema Profile",
    "Data Quality Audit & Calculated Metrics",
    "Executive KPI Scorecard",
    "Exploratory Data Analysis & Statistical Distributions",
    "Product Category & Profitability Dynamics",
    "Weekend vs Weekday Retail Dynamics",
    "Discount Impact & Margin Elasticity",
    "Store Network Benchmark & Rankings",
    "Store Performance Matrix – Identifying Business Opportunities",
    "Customer Segmentation & Channel Monetization",
    "Hidden Insights & Anomaly Detection",
    "Strategic Business Recommendations & Roadmap",
    "Interactive Business Intelligence Dashboard",
    "Executive Synthesis & Governance Targets"
  ];

  function updateSlideView() {
    slides.forEach((s, idx) => {
      if (idx + 1 === currentSlide) {
        s.classList.add('active');
        s.scrollTop = 0; // Reset scroll position to top when switching
      } else {
        s.classList.remove('active');
      }
    });

    // Update Header & Footer
    if (slideJumpSelect) slideJumpSelect.value = currentSlide;
    if (slideCounterBadge) slideCounterBadge.textContent = `Slide ${currentSlide} of ${totalSlides}`;
    if (slideTitlePreview) slideTitlePreview.textContent = slideTitles[currentSlide - 1];
    if (slideProgressBar) slideProgressBar.style.width = `${(currentSlide / totalSlides) * 100}%`;

    if (btnPrev) btnPrev.disabled = currentSlide === 1;
    if (btnNext) btnNext.disabled = currentSlide === totalSlides;

    // Trigger chart renders for the active slide after layout stabilizes
    setTimeout(() => {
      renderSlideCharts(currentSlide);
    }, 60);
  }

  function goToSlide(n) {
    if (n < 1) n = 1;
    if (n > totalSlides) n = totalSlides;
    currentSlide = n;
    updateSlideView();
  }

  function nextSlide() {
    if (currentSlide < totalSlides) {
      goToSlide(currentSlide + 1);
    }
  }

  function prevSlide() {
    if (currentSlide > 1) {
      goToSlide(currentSlide - 1);
    }
  }

  // Navigation Event Listeners
  if (btnPrev) btnPrev.addEventListener('click', prevSlide);
  if (btnNext) btnNext.addEventListener('click', nextSlide);

  if (slideJumpSelect) {
    slideJumpSelect.addEventListener('change', function () {
      goToSlide(parseInt(this.value, 10));
    });
  }

  // Direct action buttons
  const btnStartPresentation = document.getElementById('btn-start-presentation');
  if (btnStartPresentation) {
    btnStartPresentation.addEventListener('click', () => goToSlide(2));
  }

  const btnJumpDashboard = document.getElementById('btn-jump-dashboard');
  if (btnJumpDashboard) {
    btnJumpDashboard.addEventListener('click', () => goToSlide(15));
  }

  const btnHeaderDashboard = document.getElementById('btn-header-dashboard');
  if (btnHeaderDashboard) {
    btnHeaderDashboard.addEventListener('click', () => goToSlide(15));
  }

  // Keyboard navigation
  document.addEventListener('keydown', function (e) {
    // Avoid capturing keyboard when typing in search or inputs
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;

    if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
      e.preventDefault();
      nextSlide();
    } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
      e.preventDefault();
      prevSlide();
    } else if (e.key === 'f' || e.key === 'F') {
      toggleFullscreen();
    } else if (e.key === 'Home') {
      goToSlide(1);
    } else if (e.key === 'End') {
      goToSlide(totalSlides);
    }
  });

  // Fullscreen Toggle
  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      if (presentationViewport.requestFullscreen) {
        presentationViewport.requestFullscreen();
      } else if (presentationViewport.webkitRequestFullscreen) {
        presentationViewport.webkitRequestFullscreen();
      }
      if (btnFullscreen) btnFullscreen.innerHTML = '<span>⤓ Exit Fullscreen</span>';
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
      if (btnFullscreen) btnFullscreen.innerHTML = '<span>⛶ Fullscreen</span>';
    }
  }

  if (btnFullscreen) btnFullscreen.addEventListener('click', toggleFullscreen);

  document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement && btnFullscreen) {
      btnFullscreen.innerHTML = '<span>⛶ Fullscreen</span>';
    }
    setTimeout(() => {
      renderSlideCharts(currentSlide);
      if (currentSlide === 15) updateDashboard();
    }, 100);
  });

  // Debounced Window Resize Handler for Flexible Responsiveness
  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      renderSlideCharts(currentSlide);
      if (currentSlide === 15) updateDashboard();
    }, 120);
  });

  /* ==========================================================================
     Static Slide Chart Renderers (Optimized Paddings & Readability)
     ========================================================================== */

  function renderSlideCharts(slideNum) {
    FashionCharts.hideTooltip();

    if (slideNum === 6) {
      // Slide 6: Summary Distributions
      FashionCharts.renderBarChart('chart-slide6-qty-dist', ['1 Unit', '2 Units', '3 Units', '4 Units', '5 Units'], [{
        name: 'Orders',
        color: '#1D4ED8',
        data: [569, 457, 284, 130, 60]
      }], { padLeft: 55, padBottom: 45 });

      FashionCharts.renderBarChart('chart-slide6-disc-dist', ['No Disc (0%)', 'Low (1-5%)', 'Med (6-15%)', 'High (16-30%)'], [{
        name: 'Orders',
        color: '#0D9488',
        data: [621, 211, 377, 291]
      }], { padLeft: 55, padBottom: 45 });
    }

    if (slideNum === 7) {
      // Slide 7: Category Performance
      FashionCharts.renderBarChart('chart-slide7-rev-profit', ['Clothing', 'Shoes', 'Accessories'], [
        { name: 'Net Revenue', color: '#1D4ED8', data: [1721165.95, 1428233.35, 392831.20] },
        { name: 'Profit', color: '#10B981', data: [593791.85, 499698.74, 138485.32] }
      ], { isCurrency: true, padLeft: 80, padBottom: 48 });

      FashionCharts.renderDonut('chart-slide7-category-donut', [
        { label: 'Clothing', value: 1721165.95, color: '#1D4ED8' },
        { label: 'Shoes', value: 1428233.35, color: '#F59E0B' },
        { label: 'Accessories', value: 392831.20, color: '#10B981' }
      ], { isCurrency: true, centerLabel: 'Net Revenue' });
    }

    if (slideNum === 8) {
      // Slide 8: Weekend vs Weekday Dynamics
      FashionCharts.renderBarChart('chart-slide8-daily-rev',
        ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
        [{ name: 'Net Revenue', color: '#2563EB', data: [557089.45, 439767.65, 437674.25, 523475.35, 566164.20, 493591.00, 524468.60] }],
        { isCurrency: true, padLeft: 80, padBottom: 50 }
      );

      FashionCharts.renderBarChart('chart-slide8-daily-orders',
        ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
        [{ name: 'Orders', color: '#0D9488', data: [226, 207, 185, 218, 244, 201, 219] }],
        { padLeft: 55, padBottom: 50 }
      );
    }

    if (slideNum === 9) {
      // Slide 9: Discount Impact & Elasticity
      FashionCharts.renderBarChart('chart-slide9-bands-margin',
        ['No Discount', 'Low (1-5%)', 'Med (6-15%)', 'High (16-30%)'],
        [
          { name: 'Revenue (₹)', color: '#1D4ED8', data: [1666275.0, 507829.15, 780891.35, 587235.0] },
          { name: 'Profit (₹)', color: '#10B981', data: [669964.73, 185193.89, 250336.55, 126480.74] }
        ],
        { isCurrency: true, padLeft: 80, padBottom: 50 }
      );

      // Scatter plot points (sample 250 points evenly distributed to render quickly)
      const samplePoints = [];
      const step = Math.max(1, Math.floor(RAW_DATA.length / 250));
      for (let i = 0; i < RAW_DATA.length; i += step) {
        const item = RAW_DATA[i];
        samplePoints.push({
          x: item.Discount,
          y: item.ProfitMargin,
          label: `${item.InvoiceNo} (${item.Category})`,
          revenue: item.NetRevenue,
          profit: item.Profit,
          size: 4.5,
          color: item.Discount === 0 ? 'rgba(16, 185, 129, 0.7)' : (item.Discount > 15 ? 'rgba(239, 68, 68, 0.7)' : 'rgba(29, 78, 216, 0.7)')
        });
      }

      FashionCharts.renderScatter('chart-slide9-scatter', samplePoints, {
        minX: 0,
        maxX: 30,
        minY: 0,
        maxY: 55,
        xSuffix: '%',
        ySuffix: '%',
        xLabel: 'Discount Percentage (%)',
        yLabel: 'Profit Margin (%)',
        regression: { slope: -0.7956, intercept: 40.656 },
        padLeft: 75,
        padBottom: 52
      });
    }

    if (slideNum === 10) {
      // Slide 10: Store Rankings
      FashionCharts.renderBarChart('chart-slide10-top-stores',
        ['Store_16', 'Store_15', 'Store_21', 'Store_47', 'Store_26'],
        [{ name: 'Net Revenue', color: '#10B981', data: [122913.20, 109626.30, 108849.80, 105648.00, 94513.15] }],
        { isCurrency: true, padLeft: 80, padBottom: 48 }
      );

      FashionCharts.renderBarChart('chart-slide10-bottom-stores',
        ['Store_40', 'Store_50', 'Store_08', 'Store_09', 'Store_25'],
        [{ name: 'Net Revenue', color: '#EF4444', data: [49443.35, 47909.00, 45706.50, 42337.90, 17131.00] }],
        { isCurrency: true, padLeft: 80, padBottom: 48 }
      );
    }

    if (slideNum === 11) {
      // Slide 11: Store Performance Matrix (Revenue vs Profit Scatter Matrix)
      const storeMap = {};
      RAW_DATA.forEach(d => {
        if (!storeMap[d.StoreID]) {
          storeMap[d.StoreID] = { id: d.StoreID, rev: 0, profit: 0, orders: 0, units: 0, disc: 0 };
        }
        storeMap[d.StoreID].rev += d.NetRevenue;
        storeMap[d.StoreID].profit += d.Profit;
        storeMap[d.StoreID].orders += 1;
        storeMap[d.StoreID].units += d.Quantity;
        storeMap[d.StoreID].disc += d.Discount;
      });

      const storesList = Object.values(storeMap).map(st => {
        const margin = st.rev > 0 ? (st.profit / st.rev) * 100 : 0;
        const aov = st.orders > 0 ? st.rev / st.orders : 0;
        const avgDisc = st.orders > 0 ? st.disc / st.orders : 0;
        return { ...st, margin, aov, avgDisc };
      });

      const medX = 73126.62;
      const medY = 24385.97;

      const matrixPoints = storesList.map(st => {
        let classification = 'Needs Investigation';
        let color = '#EF4444';
        if (st.rev >= medX && st.profit >= medY) {
          classification = 'Strong Performer';
          color = '#10B981';
        } else if (st.rev >= medX && st.profit < medY) {
          classification = 'Margin Problem';
          color = '#F59E0B';
        } else if (st.rev < medX && st.profit >= medY) {
          classification = 'Growth Opportunity';
          color = '#2563EB';
        }
        return {
          id: st.id,
          x: st.rev,
          y: st.profit,
          margin: st.margin,
          orders: st.orders,
          units: st.units,
          aov: st.aov,
          avgDisc: st.avgDisc,
          classification: classification,
          color: color
        };
      });

      FashionCharts.renderMatrixScatter('chart-slide11-matrix', matrixPoints, {
        medX: medX,
        medY: medY,
        xLabel: 'Store Net Revenue (₹)',
        yLabel: 'Store Operating Profit (₹)',
        padLeft: 82,
        padBottom: 55
      });
    }

    if (slideNum === 12) {
      // Slide 12: Customer & Payment Analytics
      FashionCharts.renderDonut('chart-slide12-customer-donut', [
        { label: 'New', value: 1635827.40, color: '#2563EB' },
        { label: 'Returning', value: 1529399.15, color: '#10B981' },
        { label: 'Unknown', value: 377003.95, color: '#94A3B8' }
      ], { isCurrency: true, centerLabel: 'Customers' });

      FashionCharts.renderBarChart('chart-slide12-payment-aov',
        ['Digital (UPI)', 'Cash', 'Card', 'Unknown'],
        [{ name: 'AOV (₹)', color: '#0D9488', data: [2485.67, 2361.89, 2308.57, 2164.69] }],
        { isCurrency: true, padLeft: 75, padBottom: 48 }
      );
    }

    if (slideNum === 15) {
      // Slide 15: Refresh active dashboard view
      updateDashboard();
    }
  }

  /* ==========================================================================
     Interactive Business Intelligence Dashboard Controller (Slide 14)
     ========================================================================== */

  // Filter State
  const filterState = {
    dateStart: '2024-11-18',
    dateEnd: '2026-11-18',
    storeId: 'ALL',
    category: 'ALL',
    customerType: 'ALL',
    paymentMode: 'ALL',
    dayType: 'ALL',
    discountBand: 'ALL'
  };

  // Populate Store Filter Dropdown
  const filterStoreSelect = document.getElementById('filter-store');
  if (filterStoreSelect) {
    const storeSet = new Set();
    RAW_DATA.forEach(d => storeSet.add(d.StoreID));
    const sortedStores = Array.from(storeSet).sort();
    sortedStores.forEach(st => {
      const opt = document.createElement('option');
      opt.value = st;
      opt.textContent = st;
      filterStoreSelect.appendChild(opt);
    });
  }

  // Filter Elements
  const filterStartInput = document.getElementById('filter-date-start');
  const filterEndInput = document.getElementById('filter-date-end');
  const filterCategorySelect = document.getElementById('filter-category');
  const filterCustTypeSelect = document.getElementById('filter-customer-type');
  const filterPaymentSelect = document.getElementById('filter-payment-mode');
  const filterDayTypeSelect = document.getElementById('filter-day-type');
  const filterDiscBandSelect = document.getElementById('filter-discount-band');
  const btnResetFilters = document.getElementById('btn-reset-filters');

  function bindFilterChange(elem, key) {
    if (!elem) return;
    elem.addEventListener('change', function () {
      filterState[key] = this.value;
      updateDashboard();
    });
  }

  bindFilterChange(filterStartInput, 'dateStart');
  bindFilterChange(filterEndInput, 'dateEnd');
  bindFilterChange(filterStoreSelect, 'storeId');
  bindFilterChange(filterCategorySelect, 'category');
  bindFilterChange(filterCustTypeSelect, 'customerType');
  bindFilterChange(filterPaymentSelect, 'paymentMode');
  bindFilterChange(filterDayTypeSelect, 'dayType');
  bindFilterChange(filterDiscBandSelect, 'discountBand');

  // Quick Preset Buttons
  const presetButtons = document.querySelectorAll('.btn-filter-preset');
  presetButtons.forEach(btn => {
    btn.addEventListener('click', function () {
      presetButtons.forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      const preset = this.dataset.preset;

      if (preset === 'ALL') {
        filterState.dateStart = '2024-11-18';
        filterState.dateEnd = '2026-11-18';
      } else if (preset === '2025') {
        filterState.dateStart = '2025-01-01';
        filterState.dateEnd = '2025-12-31';
      } else if (preset === '2026') {
        filterState.dateStart = '2026-01-01';
        filterState.dateEnd = '2026-11-18';
      } else if (preset === 'FESTIVE') {
        filterState.dateStart = '2025-10-01';
        filterState.dateEnd = '2025-10-31';
      }

      if (filterStartInput) filterStartInput.value = filterState.dateStart;
      if (filterEndInput) filterEndInput.value = filterState.dateEnd;
      updateDashboard();
    });
  });

  // Reset Button
  if (btnResetFilters) {
    btnResetFilters.addEventListener('click', function () {
      filterState.dateStart = '2024-11-18';
      filterState.dateEnd = '2026-11-18';
      filterState.storeId = 'ALL';
      filterState.category = 'ALL';
      filterState.customerType = 'ALL';
      filterState.paymentMode = 'ALL';
      filterState.dayType = 'ALL';
      filterState.discountBand = 'ALL';

      if (filterStartInput) filterStartInput.value = filterState.dateStart;
      if (filterEndInput) filterEndInput.value = filterState.dateEnd;
      if (filterStoreSelect) filterStoreSelect.value = 'ALL';
      if (filterCategorySelect) filterCategorySelect.value = 'ALL';
      if (filterCustTypeSelect) filterCustTypeSelect.value = 'ALL';
      if (filterPaymentSelect) filterPaymentSelect.value = 'ALL';
      if (filterDayTypeSelect) filterDayTypeSelect.value = 'ALL';
      if (filterDiscBandSelect) filterDiscBandSelect.value = 'ALL';

      presetButtons.forEach(b => b.classList.remove('active'));
      const defaultPreset = document.querySelector('.btn-filter-preset[data-preset="ALL"]');
      if (defaultPreset) defaultPreset.classList.add('active');

      updateDashboard();
    });
  }

  // Dashboard Tabs Controller
  let activeDashboardTab = 'overview';
  const tabButtons = document.querySelectorAll('.d-tab-btn');
  const dViews = document.querySelectorAll('.d-view');

  tabButtons.forEach(btn => {
    btn.addEventListener('click', function () {
      tabButtons.forEach(b => b.classList.remove('active'));
      dViews.forEach(v => v.classList.remove('active'));

      this.classList.add('active');
      activeDashboardTab = this.dataset.tab;
      const targetView = document.getElementById(`d-view-${activeDashboardTab}`);
      if (targetView) targetView.classList.add('active');

      // Redraw charts in new active tab
      setTimeout(() => {
        renderDashboardTabCharts(activeDashboardTab, getFilteredData());
      }, 60);
    });
  });

  // Dynamic Data Filter
  function getFilteredData() {
    return RAW_DATA.filter(item => {
      if (item.Date < filterState.dateStart || item.Date > filterState.dateEnd) return false;
      if (filterState.storeId !== 'ALL' && item.StoreID !== filterState.storeId) return false;
      if (filterState.category !== 'ALL' && item.Category !== filterState.category) return false;
      if (filterState.customerType !== 'ALL' && item.CustomerType !== filterState.customerType) return false;
      if (filterState.paymentMode !== 'ALL' && item.PaymentMode !== filterState.paymentMode) return false;
      if (filterState.dayType !== 'ALL' && item.DayType !== filterState.dayType) return false;
      if (filterState.discountBand !== 'ALL' && item.DiscountBand !== filterState.discountBand) return false;
      return true;
    });
  }

  // Calculate Median Helper
  function calculateMedian(arr) {
    if (!arr || arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  // Master Dashboard Updater
  function updateDashboard() {
    const data = getFilteredData();
    updateDashboardScorecard(data);
    renderDashboardTabCharts(activeDashboardTab, data);
    updateStoreTable(data);
  }

  function updateDashboardScorecard(data) {
    const gross = data.reduce((acc, d) => acc + d.GrossSales, 0);
    const disc = data.reduce((acc, d) => acc + d.DiscountAmount, 0);
    const rev = data.reduce((acc, d) => acc + d.NetRevenue, 0);
    const cost = data.reduce((acc, d) => acc + d.TotalCost, 0);
    const profit = data.reduce((acc, d) => acc + d.Profit, 0);
    const orders = data.length;
    const units = data.reduce((acc, d) => acc + d.Quantity, 0);
    const margin = rev > 0 ? (profit / rev) * 100 : 0;
    const aov = orders > 0 ? rev / orders : 0;
    const asp = units > 0 ? rev / units : 0;

    const elGross = document.getElementById('d-kpi-gross');
    const elRev = document.getElementById('d-kpi-rev');
    const elProfit = document.getElementById('d-kpi-profit');
    const elMargin = document.getElementById('d-kpi-margin');
    const elOrders = document.getElementById('d-kpi-orders');
    const elUnits = document.getElementById('d-kpi-units');
    const elAov = document.getElementById('d-kpi-aov');
    const elAsp = document.getElementById('d-kpi-asp');
    const elRecordCount = document.getElementById('d-filter-record-count');

    if (elGross) elGross.textContent = FashionCharts.formatCurrency(gross);
    if (elRev) elRev.textContent = FashionCharts.formatCurrency(rev);
    if (elProfit) elProfit.textContent = FashionCharts.formatCurrency(profit);
    if (elMargin) elMargin.textContent = margin.toFixed(2) + '%';
    if (elOrders) elOrders.textContent = FashionCharts.formatNumber(orders);
    if (elUnits) elUnits.textContent = FashionCharts.formatNumber(units);
    if (elAov) elAov.textContent = FashionCharts.formatCurrency(aov);
    if (elAsp) elAsp.textContent = FashionCharts.formatCurrency(asp);
    if (elRecordCount) elRecordCount.textContent = `Showing ${orders} of ${RAW_DATA.length} records`;
  }

  function renderDashboardTabCharts(tab, data) {
    FashionCharts.hideTooltip();
    if (!data || data.length === 0) return;

    if (tab === 'overview') {
      // 1. Monthly Trend
      const monthsMap = {};
      data.forEach(d => {
        const mKey = d.Date.substring(0, 7);
        if (!monthsMap[mKey]) monthsMap[mKey] = { rev: 0, profit: 0 };
        monthsMap[mKey].rev += d.NetRevenue;
        monthsMap[mKey].profit += d.Profit;
      });

      const sortedMonths = Object.keys(monthsMap).sort();
      const labels = sortedMonths.map(m => {
        const [y, mo] = m.split('-');
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        return `${monthNames[parseInt(mo, 10) - 1]} '${y.slice(2)}`;
      });
      const revData = sortedMonths.map(m => monthsMap[m].rev);
      const profitData = sortedMonths.map(m => monthsMap[m].profit);

      FashionCharts.renderLineChart('d-chart-overview-trend', labels, [
        { name: 'Net Revenue', color: '#1D4ED8', data: revData },
        { name: 'Profit', color: '#10B981', data: profitData }
      ], { isCurrency: true, padLeft: 80, padBottom: 50 });

      // 2. Category Share Donut
      const catMap = { Clothing: 0, Shoes: 0, Accessories: 0 };
      data.forEach(d => {
        if (catMap[d.Category] !== undefined) catMap[d.Category] += d.NetRevenue;
      });

      FashionCharts.renderDonut('d-chart-overview-cat-donut', [
        { label: 'Clothing', value: catMap.Clothing, color: '#1D4ED8' },
        { label: 'Shoes', value: catMap.Shoes, color: '#F59E0B' },
        { label: 'Accessories', value: catMap.Accessories, color: '#10B981' }
      ], { isCurrency: true, centerLabel: 'Filtered Rev' });
    }

    if (tab === 'product') {
      // Category Breakdown Bar
      const cats = ['Clothing', 'Shoes', 'Accessories'];
      const catRev = [0, 0, 0];
      const catProfit = [0, 0, 0];
      const catUnits = [0, 0, 0];

      data.forEach(d => {
        const idx = cats.indexOf(d.Category);
        if (idx !== -1) {
          catRev[idx] += d.NetRevenue;
          catProfit[idx] += d.Profit;
          catUnits[idx] += d.Quantity;
        }
      });

      FashionCharts.renderBarChart('d-chart-product-comparison', cats, [
        { name: 'Net Revenue', color: '#1D4ED8', data: catRev },
        { name: 'Profit', color: '#10B981', data: catProfit }
      ], { isCurrency: true, padLeft: 80, padBottom: 50 });

      // Discount Band vs Margin
      const bands = ['No Discount', 'Low Discount (1-5%)', 'Medium Discount (6-15%)', 'High Discount (16-30%)'];
      const bandRev = [0, 0, 0, 0];
      const bandProfit = [0, 0, 0, 0];

      data.forEach(d => {
        const bIdx = bands.indexOf(d.DiscountBand);
        if (bIdx !== -1) {
          bandRev[bIdx] += d.NetRevenue;
          bandProfit[bIdx] += d.Profit;
        }
      });

      const bandMargins = bands.map((b, idx) => (bandRev[idx] > 0 ? (bandProfit[idx] / bandRev[idx]) * 100 : 0));

      FashionCharts.renderBarChart('d-chart-product-disc-margin', ['No Disc', 'Low (1-5%)', 'Med (6-15%)', 'High (16-30%)'], [
        { name: 'Profit Margin %', color: '#0D9488', data: bandMargins }
      ], { isPercent: true, padLeft: 55, padBottom: 50 });
    }

    if (tab === 'weekend') {
      const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      const dayRev = [0, 0, 0, 0, 0, 0, 0];
      const dayProfit = [0, 0, 0, 0, 0, 0, 0];

      data.forEach(d => {
        const idx = days.indexOf(d.DayOfWeek);
        if (idx !== -1) {
          dayRev[idx] += d.NetRevenue;
          dayProfit[idx] += d.Profit;
        }
      });

      FashionCharts.renderBarChart('d-chart-weekend-dow', days, [
        { name: 'Net Revenue', color: '#2563EB', data: dayRev },
        { name: 'Profit', color: '#10B981', data: dayProfit }
      ], { isCurrency: true, padLeft: 80, padBottom: 50 });

      // Weekend vs Weekday Donut
      const weRev = data.filter(d => d.DayType === 'Weekend').reduce((acc, d) => acc + d.NetRevenue, 0);
      const wdRev = data.filter(d => d.DayType === 'Weekday').reduce((acc, d) => acc + d.NetRevenue, 0);

      FashionCharts.renderDonut('d-chart-weekend-donut', [
        { label: 'Weekday', value: wdRev, color: '#1D4ED8' },
        { label: 'Weekend', value: weRev, color: '#F59E0B' }
      ], { isCurrency: true, centerLabel: 'Day Type' });
    }

    if (tab === 'stores') {
      // Dynamic Store Matrix & Quadrant Classification
      const storeMap = {};
      data.forEach(d => {
        if (!storeMap[d.StoreID]) {
          storeMap[d.StoreID] = {
            id: d.StoreID,
            orders: 0,
            units: 0,
            gross: 0,
            rev: 0,
            cost: 0,
            profit: 0,
            discounts: 0
          };
        }
        storeMap[d.StoreID].orders += 1;
        storeMap[d.StoreID].units += d.Quantity;
        storeMap[d.StoreID].gross += d.GrossSales;
        storeMap[d.StoreID].rev += d.NetRevenue;
        storeMap[d.StoreID].cost += d.TotalCost;
        storeMap[d.StoreID].profit += d.Profit;
        storeMap[d.StoreID].discounts += d.Discount;
      });

      const storeList = Object.values(storeMap).map(st => {
        const margin = st.rev > 0 ? (st.profit / st.rev) * 100 : 0;
        const aov = st.orders > 0 ? st.rev / st.orders : 0;
        const avgDisc = st.orders > 0 ? st.discounts / st.orders : 0;
        return { ...st, margin, aov, avgDisc };
      });

      // Calculate Dynamic Medians across active filtered stores
      const medRev = calculateMedian(storeList.map(s => s.rev));
      const medProfit = calculateMedian(storeList.map(s => s.profit));

      // Classify stores
      let strongCount = 0;
      let marginCount = 0;
      let growthCount = 0;
      let investigateCount = 0;

      const storePoints = storeList.map(st => {
        let classification = 'Needs Investigation';
        let color = '#EF4444';
        let badgeClass = 'badge-matrix-investigate';

        if (st.rev >= medRev && st.profit >= medProfit) {
          classification = 'Strong Performer';
          color = '#10B981';
          badgeClass = 'badge-matrix-strong';
          strongCount++;
        } else if (st.rev >= medRev && st.profit < medProfit) {
          classification = 'Margin Problem';
          color = '#F59E0B';
          badgeClass = 'badge-matrix-margin';
          marginCount++;
        } else if (st.rev < medRev && st.profit >= medProfit) {
          classification = 'Growth Opportunity';
          color = '#2563EB';
          badgeClass = 'badge-matrix-growth';
          growthCount++;
        } else {
          investigateCount++;
        }

        return {
          id: st.id,
          x: st.rev,
          y: st.profit,
          margin: st.margin,
          orders: st.orders,
          units: st.units,
          aov: st.aov,
          avgDisc: st.avgDisc,
          classification: classification,
          color: color,
          badgeClass: badgeClass
        };
      });

      const totalActiveStores = storeList.length || 1;

      // Update 4 Dynamic Matrix KPI Cards
      const strongValEl = document.getElementById('d-matrix-kpi-strong-val');
      const strongPctEl = document.getElementById('d-matrix-kpi-strong-pct');
      if (strongValEl) strongValEl.textContent = `${strongCount} Store${strongCount === 1 ? '' : 's'}`;
      if (strongPctEl) strongPctEl.textContent = `${((strongCount / totalActiveStores) * 100).toFixed(1)}%`;

      const marginValEl = document.getElementById('d-matrix-kpi-margin-val');
      const marginPctEl = document.getElementById('d-matrix-kpi-margin-pct');
      if (marginValEl) marginValEl.textContent = `${marginCount} Store${marginCount === 1 ? '' : 's'}`;
      if (marginPctEl) marginPctEl.textContent = `${((marginCount / totalActiveStores) * 100).toFixed(1)}%`;

      const growthValEl = document.getElementById('d-matrix-kpi-growth-val');
      const growthPctEl = document.getElementById('d-matrix-kpi-growth-pct');
      if (growthValEl) growthValEl.textContent = `${growthCount} Store${growthCount === 1 ? '' : 's'}`;
      if (growthPctEl) growthPctEl.textContent = `${((growthCount / totalActiveStores) * 100).toFixed(1)}%`;

      const investigateValEl = document.getElementById('d-matrix-kpi-investigate-val');
      const investigatePctEl = document.getElementById('d-matrix-kpi-investigate-pct');
      if (investigateValEl) investigateValEl.textContent = `${investigateCount} Store${investigateCount === 1 ? '' : 's'}`;
      if (investigatePctEl) investigatePctEl.textContent = `${((investigateCount / totalActiveStores) * 100).toFixed(1)}%`;

      // Update Dynamic Benchmarks Badge
      const benchmarkBadge = document.getElementById('d-matrix-benchmarks-badge');
      if (benchmarkBadge) {
        benchmarkBadge.textContent = `Medians: ${FashionCharts.formatCurrency(medRev)} Rev | ${FashionCharts.formatCurrency(medProfit)} Profit`;
      }

      // Render 2x2 Matrix Scatter Plot
      FashionCharts.renderMatrixScatter('d-chart-stores-scatter', storePoints, {
        medX: medRev,
        medY: medProfit,
        xLabel: 'Store Net Revenue (₹)',
        yLabel: 'Store Operating Profit (₹)',
        padLeft: 82,
        padBottom: 55
      });
    }

    if (tab === 'customers') {
      // Customer Type Donut
      const ctMap = { New: 0, Returning: 0, Unknown: 0 };
      data.forEach(d => {
        if (ctMap[d.CustomerType] !== undefined) ctMap[d.CustomerType] += d.NetRevenue;
      });

      FashionCharts.renderDonut('d-chart-cust-donut', [
        { label: 'New', value: ctMap.New, color: '#2563EB' },
        { label: 'Returning', value: ctMap.Returning, color: '#10B981' },
        { label: 'Unknown', value: ctMap.Unknown, color: '#94A3B8' }
      ], { isCurrency: true, centerLabel: 'Customer Type' });

      // Payment Mode Bar
      const pmList = ['Card', 'Cash', 'Digital', 'Unknown'];
      const pmRev = [0, 0, 0, 0];
      const pmProfit = [0, 0, 0, 0];

      data.forEach(d => {
        const idx = pmList.indexOf(d.PaymentMode);
        if (idx !== -1) {
          pmRev[idx] += d.NetRevenue;
          pmProfit[idx] += d.Profit;
        }
      });

      FashionCharts.renderBarChart('d-chart-payment-bar', pmList, [
        { name: 'Revenue', color: '#1D4ED8', data: pmRev },
        { name: 'Profit', color: '#10B981', data: pmProfit }
      ], { isCurrency: true, padLeft: 80, padBottom: 50 });
    }
  }

  // Store Table Generator with Sorting, Search, Classification Filter & CSV Export
  let storeSortCol = 'rev';
  let storeSortAsc = false;
  let storeSearchQuery = '';
  let storeClassFilter = 'ALL';
  let lastFilteredStores = [];

  const storeSearchInput = document.getElementById('store-table-search');
  if (storeSearchInput) {
    storeSearchInput.addEventListener('input', function () {
      storeSearchQuery = this.value.toLowerCase().trim();
      updateStoreTable(getFilteredData());
    });
  }

  const storeClassFilterSelect = document.getElementById('store-table-class-filter');
  if (storeClassFilterSelect) {
    storeClassFilterSelect.addEventListener('change', function () {
      storeClassFilter = this.value;
      updateStoreTable(getFilteredData());
    });
  }

  const btnExportStoreCsv = document.getElementById('btn-export-store-csv');
  if (btnExportStoreCsv) {
    btnExportStoreCsv.addEventListener('click', function () {
      exportStoreTableToCSV();
    });
  }

  function exportStoreTableToCSV() {
    if (!lastFilteredStores || lastFilteredStores.length === 0) {
      alert('No store data available to export.');
      return;
    }
    const headers = ['StoreID', 'Orders', 'UnitsSold', 'NetRevenue', 'Profit', 'ProfitMarginPct', 'AOV', 'AvgDiscountPct', 'Classification'];
    const rows = lastFilteredStores.map(s => [
      s.id,
      s.orders,
      s.units,
      s.rev.toFixed(2),
      s.profit.toFixed(2),
      s.margin.toFixed(2),
      s.aov.toFixed(2),
      s.avgDisc.toFixed(2),
      `"${s.classification}"`
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'fashionwave_store_performance.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // Bind column sort headers
  document.querySelectorAll('.sortable-th').forEach(th => {
    th.addEventListener('click', function () {
      const col = this.dataset.col;
      if (storeSortCol === col) {
        storeSortAsc = !storeSortAsc;
      } else {
        storeSortCol = col;
        storeSortAsc = false;
      }
      updateStoreTable(getFilteredData());
    });
  });

  function updateStoreTable(data) {
    const tableBody = document.getElementById('store-table-body');
    if (!tableBody) return;

    // Aggregate by store
    const storeMap = {};
    data.forEach(d => {
      if (!storeMap[d.StoreID]) {
        storeMap[d.StoreID] = {
          id: d.StoreID,
          orders: 0,
          units: 0,
          gross: 0,
          rev: 0,
          cost: 0,
          profit: 0,
          discounts: 0
        };
      }
      storeMap[d.StoreID].orders += 1;
      storeMap[d.StoreID].units += d.Quantity;
      storeMap[d.StoreID].gross += d.GrossSales;
      storeMap[d.StoreID].rev += d.NetRevenue;
      storeMap[d.StoreID].cost += d.TotalCost;
      storeMap[d.StoreID].profit += d.Profit;
      storeMap[d.StoreID].discounts += d.Discount;
    });

    let stores = Object.values(storeMap).map(st => {
      const margin = st.rev > 0 ? (st.profit / st.rev) * 100 : 0;
      const aov = st.orders > 0 ? st.rev / st.orders : 0;
      const avgDisc = st.orders > 0 ? st.discounts / st.orders : 0;
      return {
        ...st,
        margin: margin,
        aov: aov,
        avgDisc: avgDisc
      };
    });

    // Compute dynamic medians for classification
    const medRev = calculateMedian(stores.map(s => s.rev));
    const medProfit = calculateMedian(stores.map(s => s.profit));

    stores.forEach(st => {
      if (st.rev >= medRev && st.profit >= medProfit) {
        st.classification = 'Strong Performer';
        st.badgeClass = 'badge-matrix-strong';
      } else if (st.rev >= medRev && st.profit < medProfit) {
        st.classification = 'Margin Problem';
        st.badgeClass = 'badge-matrix-margin';
      } else if (st.rev < medRev && st.profit >= medProfit) {
        st.classification = 'Growth Opportunity';
        st.badgeClass = 'badge-matrix-growth';
      } else {
        st.classification = 'Needs Investigation';
        st.badgeClass = 'badge-matrix-investigate';
      }
    });

    // Filter by Search Query
    if (storeSearchQuery) {
      stores = stores.filter(s => s.id.toLowerCase().includes(storeSearchQuery));
    }

    // Filter by Classification Dropdown
    if (storeClassFilter && storeClassFilter !== 'ALL') {
      stores = stores.filter(s => s.classification === storeClassFilter);
    }

    // Sort
    stores.sort((a, b) => {
      let va = a[storeSortCol];
      let vb = b[storeSortCol];
      if (typeof va === 'string') {
        return storeSortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
      }
      return storeSortAsc ? va - vb : vb - va;
    });

    // Save for CSV export
    lastFilteredStores = stores;

    // Render HTML
    tableBody.innerHTML = '';
    if (stores.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="9" style="text-align:center; padding: 22px; color:#94A3B8; font-size:14px; font-weight:600;">No stores match the active filter criteria.</td></tr>';
      return;
    }

    stores.forEach(st => {
      const tr = document.createElement('tr');
      const marginClass = st.margin >= 35 ? 'color:#059669; font-weight:800;' : (st.margin < 33 ? 'color:#DC2626; font-weight:800;' : 'color:#334155; font-weight:600;');

      tr.innerHTML = `
        <td><strong style="color:#1D4ED8; cursor:pointer;" title="Click to filter entire dashboard by ${st.id}">${st.id}</strong></td>
        <td>${FashionCharts.formatNumber(st.orders)}</td>
        <td>${FashionCharts.formatNumber(st.units)}</td>
        <td><strong>${FashionCharts.formatCurrency(st.rev)}</strong></td>
        <td>${FashionCharts.formatCurrency(st.profit)}</td>
        <td style="${marginClass}">${st.margin.toFixed(2)}%</td>
        <td>${FashionCharts.formatCurrency(st.aov)}</td>
        <td>${st.avgDisc.toFixed(1)}%</td>
        <td><span class="badge-matrix ${st.badgeClass}">${st.classification}</span></td>
      `;

      // Cross-filter: Click store ID to set store filter
      tr.querySelector('strong').addEventListener('click', function () {
        if (filterStoreSelect) {
          filterStoreSelect.value = st.id;
          filterState.storeId = st.id;
          updateDashboard();
        }
      });

      tableBody.appendChild(tr);
    });
  }

  // Initial Boot
  goToSlide(1);
  updateDashboard();
});
