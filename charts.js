/**
 * Interactive Canvas Charting Engine for FashionWave Retail Analytics
 * High performance, zero external dependencies, retina display support,
 * interactive tooltips, large legible typography, and responsive redraw.
 */

window.FashionCharts = (function () {
  const DPR = window.devicePixelRatio || 1;

  function initCanvas(canvas) {
    const rect = canvas.getBoundingClientRect();
    const w = rect.width > 0 ? rect.width : (canvas.parentElement ? canvas.parentElement.clientWidth : 350);
    const h = rect.height > 0 ? rect.height : (canvas.parentElement ? canvas.parentElement.clientHeight : 240);
    
    canvas.width = Math.floor(w * DPR);
    canvas.height = Math.floor(h * DPR);
    
    const ctx = canvas.getContext('2d');
    ctx.scale(DPR, DPR);
    return { ctx, width: w, height: h };
  }

  function formatCurrency(val) {
    if (Math.abs(val) >= 10000000) return '₹' + (val / 10000000).toFixed(2) + ' Cr';
    if (Math.abs(val) >= 100000) return '₹' + (val / 100000).toFixed(2) + 'L';
    if (Math.abs(val) >= 1000) return '₹' + (val / 1000).toFixed(1) + 'K';
    return '₹' + Math.round(val).toLocaleString('en-IN');
  }

  function formatNumber(val) {
    return Number(val).toLocaleString('en-IN');
  }

  // Active tooltips registry
  let activeTooltip = null;

  function getOrCreateTooltip() {
    if (!activeTooltip) {
      activeTooltip = document.createElement('div');
      activeTooltip.className = 'chart-tooltip';
      document.body.appendChild(activeTooltip);
    }
    return activeTooltip;
  }

  function showTooltip(x, y, html) {
    const tt = getOrCreateTooltip();
    tt.innerHTML = html;
    tt.style.left = x + 'px';
    tt.style.top = y + 'px';
    tt.style.display = 'block';
  }

  function hideTooltip() {
    if (activeTooltip) {
      activeTooltip.style.display = 'none';
    }
  }

  return {
    formatCurrency,
    formatNumber,
    hideTooltip,

    /**
     * Render Donut Chart
     */
    renderDonut: function (canvasId, data, options = {}) {
      const canvas = document.getElementById(canvasId);
      if (!canvas) return;
      const { ctx, width, height } = initCanvas(canvas);
      ctx.clearRect(0, 0, width, height);

      const total = data.reduce((sum, d) => sum + d.value, 0);
      if (total === 0) return;

      const centerX = width * 0.38;
      const centerY = height * 0.5;
      const radius = Math.min(centerX, centerY) * 0.78;
      const innerRadius = radius * 0.55;

      let startAngle = -Math.PI / 2;
      const slices = [];

      data.forEach(d => {
        const sliceAngle = (d.value / total) * 2 * Math.PI;
        slices.push({
          label: d.label,
          value: d.value,
          color: d.color,
          share: ((d.value / total) * 100).toFixed(1),
          startAngle: startAngle,
          endAngle: startAngle + sliceAngle
        });
        startAngle += sliceAngle;
      });

      // Draw slices
      slices.forEach(s => {
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, s.startAngle, s.endAngle);
        ctx.arc(centerX, centerY, innerRadius, s.endAngle, s.startAngle, true);
        ctx.closePath();
        ctx.fillStyle = s.color;
        ctx.fill();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2.5;
        ctx.stroke();
      });

      // Center text - Enlarged
      ctx.fillStyle = '#0F172A';
      ctx.font = '800 18px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(options.centerLabel || 'Total', centerX, centerY - 10);
      
      ctx.font = '700 14px sans-serif';
      ctx.fillStyle = '#475569';
      ctx.fillText(options.centerSubtext || (options.isCurrency ? formatCurrency(total) : formatNumber(total)), centerX, centerY + 12);

      // Draw Legend on the right side - Enlarged
      const legendX = width * 0.72;
      const legendStartY = Math.max(20, height * 0.22);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';

      slices.forEach((s, idx) => {
        const itemY = legendStartY + idx * 30;
        // Color dot
        ctx.fillStyle = s.color;
        ctx.beginPath();
        ctx.arc(legendX - 12, itemY, 7, 0, 2 * Math.PI);
        ctx.fill();

        // Label
        ctx.fillStyle = '#0F172A';
        ctx.font = '700 13px sans-serif';
        ctx.fillText(`${s.label}: ${s.share}%`, legendX, itemY - 3);

        // Subtext (value)
        ctx.fillStyle = '#475569';
        ctx.font = '600 12px sans-serif';
        const valStr = options.isCurrency ? formatCurrency(s.value) : formatNumber(s.value);
        ctx.fillText(valStr, legendX, itemY + 12);
      });

      // Hover interaction
      canvas.onmousemove = function (e) {
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const dx = mx - centerX;
        const dy = my - centerY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist >= innerRadius && dist <= radius) {
          let angle = Math.atan2(dy, dx);
          if (angle < -Math.PI / 2) angle += 2 * Math.PI;
          const hit = slices.find(s => angle >= s.startAngle && angle < s.endAngle);
          if (hit) {
            const valStr = options.isCurrency ? formatCurrency(hit.value) : formatNumber(hit.value);
            showTooltip(e.clientX, e.clientY, `<strong>${hit.label}</strong><br/>Value: ${valStr}<br/>Share: ${hit.share}%`);
            return;
          }
        }
        hideTooltip();
      };
      canvas.onmouseleave = hideTooltip;
    },

    /**
     * Render Grouped Vertical Bar Chart
     */
    renderBarChart: function (canvasId, categories, series, options = {}) {
      const canvas = document.getElementById(canvasId);
      if (!canvas) return;
      const { ctx, width, height } = initCanvas(canvas);
      ctx.clearRect(0, 0, width, height);

      const padLeft = options.padLeft || 75;
      const padRight = 20;
      const padTop = 32;
      const padBottom = options.padBottom || 50;

      const plotWidth = width - padLeft - padRight;
      const plotHeight = Math.max(50, height - padTop - padBottom);

      // Find max value
      let maxVal = 0;
      series.forEach(s => {
        s.data.forEach(v => {
          if (v > maxVal) maxVal = v;
        });
      });
      maxVal = maxVal * 1.15 || 10;

      // Grid lines & Y Axis Ticks
      const yTicks = 4;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.font = '600 12px sans-serif';
      ctx.strokeStyle = '#E2E8F0';
      ctx.lineWidth = 1;

      for (let i = 0; i <= yTicks; i++) {
        const tickVal = (maxVal / yTicks) * i;
        const y = padTop + plotHeight - (plotHeight / yTicks) * i;

        ctx.beginPath();
        ctx.moveTo(padLeft, y);
        ctx.lineTo(width - padRight, y);
        ctx.stroke();

        ctx.fillStyle = '#475569';
        const labelStr = options.isCurrency ? formatCurrency(tickVal) : (options.isPercent ? tickVal.toFixed(0) + '%' : formatNumber(Math.round(tickVal)));
        ctx.fillText(labelStr, padLeft - 10, y);
      }

      // Draw Bars
      const groupWidth = plotWidth / categories.length;
      const numSeries = series.length;
      const barWidth = Math.max(8, Math.min(36, (groupWidth * 0.72) / numSeries));
      const groupPad = (groupWidth - barWidth * numSeries) / 2;

      const hitBoxes = [];

      categories.forEach((cat, cIdx) => {
        const groupX = padLeft + cIdx * groupWidth;

        series.forEach((s, sIdx) => {
          const val = s.data[cIdx];
          const barH = (val / maxVal) * plotHeight;
          const barX = groupX + groupPad + sIdx * barWidth;
          const barY = padTop + plotHeight - barH;

          ctx.fillStyle = s.color || '#2563EB';
          ctx.beginPath();
          // Draw rounded top bar
          const r = Math.min(5, barWidth / 2);
          ctx.roundRect(barX, barY, barWidth, barH, [r, r, 0, 0]);
          ctx.fill();

          hitBoxes.push({
            x: barX,
            y: barY,
            w: barWidth,
            h: barH,
            category: cat,
            seriesName: s.name,
            value: val,
            color: s.color
          });
        });

        // Category X Label - Enlarged & clear
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillStyle = '#0F172A';
        ctx.font = '700 13px sans-serif';
        const labelText = cat.length > 15 ? cat.substring(0, 13) + '..' : cat;
        ctx.fillText(labelText, groupX + groupWidth / 2, padTop + plotHeight + 10);
      });

      // Legend if multiple series
      if (series.length > 1) {
        let legX = padLeft;
        ctx.textBaseline = 'middle';
        series.forEach(s => {
          ctx.fillStyle = s.color;
          ctx.beginPath();
          ctx.arc(legX + 7, padTop - 16, 6, 0, 2 * Math.PI);
          ctx.fill();

          ctx.fillStyle = '#1E293B';
          ctx.font = '700 13px sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText(s.name, legX + 18, padTop - 16);
          legX += ctx.measureText(s.name).width + 38;
        });
      }

      // Hover interactions
      canvas.onmousemove = function (e) {
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;

        const hit = hitBoxes.find(b => mx >= b.x && mx <= b.x + b.w && my >= b.y && my <= b.y + b.h);
        if (hit) {
          const valStr = options.isCurrency ? formatCurrency(hit.value) : (options.isPercent ? hit.value.toFixed(2) + '%' : formatNumber(hit.value));
          showTooltip(e.clientX, e.clientY, `<strong>${hit.category}</strong><br/>${hit.seriesName}: <strong>${valStr}</strong>`);
          return;
        }
        hideTooltip();
      };
      canvas.onmouseleave = hideTooltip;
    },

    /**
     * Render Line / Trend Chart
     */
    renderLineChart: function (canvasId, labels, series, options = {}) {
      const canvas = document.getElementById(canvasId);
      if (!canvas) return;
      const { ctx, width, height } = initCanvas(canvas);
      ctx.clearRect(0, 0, width, height);

      const padLeft = options.padLeft || 75;
      const padRight = 20;
      const padTop = 32;
      const padBottom = options.padBottom || 48;

      const plotWidth = width - padLeft - padRight;
      const plotHeight = Math.max(50, height - padTop - padBottom);

      let maxVal = 0;
      series.forEach(s => {
        s.data.forEach(v => {
          if (v > maxVal) maxVal = v;
        });
      });
      maxVal = maxVal * 1.15 || 10;

      // Grid & Y Ticks
      const yTicks = 4;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.font = '600 12px sans-serif';
      ctx.strokeStyle = '#E2E8F0';
      ctx.lineWidth = 1;

      for (let i = 0; i <= yTicks; i++) {
        const tickVal = (maxVal / yTicks) * i;
        const y = padTop + plotHeight - (plotHeight / yTicks) * i;

        ctx.beginPath();
        ctx.moveTo(padLeft, y);
        ctx.lineTo(width - padRight, y);
        ctx.stroke();

        ctx.fillStyle = '#475569';
        const labelStr = options.isCurrency ? formatCurrency(tickVal) : (options.isPercent ? tickVal.toFixed(0) + '%' : formatNumber(Math.round(tickVal)));
        ctx.fillText(labelStr, padLeft - 10, y);
      }

      const stepX = labels.length > 1 ? plotWidth / (labels.length - 1) : plotWidth;
      const hitPoints = [];

      series.forEach(s => {
        const points = s.data.map((v, idx) => ({
          x: padLeft + idx * stepX,
          y: padTop + plotHeight - (v / maxVal) * plotHeight,
          val: v,
          label: labels[idx]
        }));

        // Fill area under line
        ctx.beginPath();
        ctx.moveTo(points[0].x, padTop + plotHeight);
        points.forEach(p => ctx.lineTo(p.x, p.y));
        ctx.lineTo(points[points.length - 1].x, padTop + plotHeight);
        ctx.closePath();
        ctx.fillStyle = s.fillColor || 'rgba(37, 99, 235, 0.08)';
        ctx.fill();

        // Stroke line
        ctx.beginPath();
        points.forEach((p, idx) => {
          if (idx === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        });
        ctx.strokeStyle = s.color || '#2563EB';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Draw points
        points.forEach(p => {
          ctx.beginPath();
          ctx.arc(p.x, p.y, 5, 0, 2 * Math.PI);
          ctx.fillStyle = '#FFFFFF';
          ctx.fill();
          ctx.strokeStyle = s.color || '#2563EB';
          ctx.lineWidth = 2.5;
          ctx.stroke();

          hitPoints.push({
            x: p.x,
            y: p.y,
            val: p.val,
            label: p.label,
            seriesName: s.name,
            color: s.color
          });
        });
      });

      // Legend if multiple series
      if (series.length > 1) {
        let legX = padLeft;
        ctx.textBaseline = 'middle';
        series.forEach(s => {
          ctx.fillStyle = s.color;
          ctx.beginPath();
          ctx.arc(legX + 7, padTop - 16, 6, 0, 2 * Math.PI);
          ctx.fill();

          ctx.fillStyle = '#1E293B';
          ctx.font = '700 13px sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText(s.name, legX + 18, padTop - 16);
          legX += ctx.measureText(s.name).width + 38;
        });
      }

      // X Axis Labels (skip if too crowded)
      const labelInterval = labels.length > 12 ? Math.ceil(labels.length / 8) : 1;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillStyle = '#334155';
      ctx.font = '600 12px sans-serif';

      labels.forEach((lbl, idx) => {
        if (idx % labelInterval === 0 || idx === labels.length - 1) {
          const x = padLeft + idx * stepX;
          ctx.fillText(lbl, x, padTop + plotHeight + 10);
        }
      });

      // Hover
      canvas.onmousemove = function (e) {
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;

        const hit = hitPoints.find(p => Math.hypot(p.x - mx, p.y - my) <= 14);
        if (hit) {
          const valStr = options.isCurrency ? formatCurrency(hit.val) : (options.isPercent ? hit.val.toFixed(2) + '%' : formatNumber(hit.val));
          showTooltip(e.clientX, e.clientY, `<strong>${hit.label}</strong><br/>${hit.seriesName}: <strong>${valStr}</strong>`);
          return;
        }
        hideTooltip();
      };
      canvas.onmouseleave = hideTooltip;
    },

    /**
     * Render Scatter Plot (with Quadrant lines & regression trendline)
     */
    renderScatter: function (canvasId, points, options = {}) {
      const canvas = document.getElementById(canvasId);
      if (!canvas) return;
      const { ctx, width, height } = initCanvas(canvas);
      ctx.clearRect(0, 0, width, height);

      const padLeft = options.padLeft || 75;
      const padRight = 20;
      const padTop = 28;
      const padBottom = options.padBottom || 52;

      const plotWidth = width - padLeft - padRight;
      const plotHeight = Math.max(50, height - padTop - padBottom);

      const minX = options.minX || 0;
      const maxX = options.maxX || 30;
      const minY = options.minY || 0;
      const maxY = options.maxY || 60;

      // Grid
      ctx.strokeStyle = '#E2E8F0';
      ctx.lineWidth = 1;
      ctx.font = '600 12px sans-serif';
      ctx.fillStyle = '#475569';

      // Y Grid
      const yTicks = 5;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      for (let i = 0; i <= yTicks; i++) {
        const yVal = minY + ((maxY - minY) / yTicks) * i;
        const y = padTop + plotHeight - (plotHeight / yTicks) * i;
        ctx.beginPath();
        ctx.moveTo(padLeft, y);
        ctx.lineTo(width - padRight, y);
        ctx.stroke();
        ctx.fillText(yVal.toFixed(0) + (options.ySuffix || ''), padLeft - 10, y);
      }

      // X Grid
      const xTicks = 6;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      for (let i = 0; i <= xTicks; i++) {
        const xVal = minX + ((maxX - minX) / xTicks) * i;
        const x = padLeft + (plotWidth / xTicks) * i;
        ctx.beginPath();
        ctx.moveTo(x, padTop);
        ctx.lineTo(x, padTop + plotHeight);
        ctx.stroke();
        ctx.fillText(xVal.toFixed(0) + (options.xSuffix || ''), x, padTop + plotHeight + 10);
      }

      // Axis labels
      ctx.font = '700 13px sans-serif';
      ctx.fillStyle = '#1E293B';
      ctx.textAlign = 'center';
      ctx.fillText(options.xLabel || 'Discount Percentage (%)', padLeft + plotWidth / 2, height - 12);

      // Plot Points
      const hitPoints = [];
      points.forEach(p => {
        const px = padLeft + ((p.x - minX) / (maxX - minX)) * plotWidth;
        const py = padTop + plotHeight - ((p.y - minY) / (maxY - minY)) * plotHeight;

        ctx.beginPath();
        ctx.arc(px, py, p.size || 5, 0, 2 * Math.PI);
        ctx.fillStyle = p.color || 'rgba(37, 99, 235, 0.6)';
        ctx.fill();

        hitPoints.push({
          x: px,
          y: py,
          data: p
        });
      });

      // Draw Regression Trendline if provided
      if (options.regression) {
        const { slope, intercept } = options.regression;
        const y1 = slope * minX + intercept;
        const y2 = slope * maxX + intercept;

        const lx1 = padLeft;
        const ly1 = padTop + plotHeight - ((y1 - minY) / (maxY - minY)) * plotHeight;
        const lx2 = padLeft + plotWidth;
        const ly2 = padTop + plotHeight - ((y2 - minY) / (maxY - minY)) * plotHeight;

        ctx.beginPath();
        ctx.moveTo(lx1, ly1);
        ctx.lineTo(lx2, ly2);
        ctx.strokeStyle = '#EF4444';
        ctx.lineWidth = 3;
        ctx.setLineDash([6, 6]);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Hover
      canvas.onmousemove = function (e) {
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;

        const hit = hitPoints.find(hp => Math.hypot(hp.x - mx, hp.y - my) <= 10);
        if (hit) {
          const d = hit.data;
          const labelHtml = `<strong>${d.label || 'Transaction'}</strong><br/>` +
            `${options.xLabel || 'Discount'}: <strong>${d.x.toFixed(1)}%</strong><br/>` +
            `${options.yLabel || 'Margin'}: <strong>${d.y.toFixed(1)}%</strong>` +
            (d.revenue ? `<br/>Revenue: ${formatCurrency(d.revenue)}` : '') +
            (d.profit ? `<br/>Profit: ${formatCurrency(d.profit)}` : '');
          showTooltip(e.clientX, e.clientY, labelHtml);
          return;
        }
        hideTooltip();
      };
      canvas.onmouseleave = hideTooltip;
    },

    /**
     * Render 2x2 Store Performance Matrix Scatter Plot
     * X-Axis: Store Net Revenue
     * Y-Axis: Store Operating Profit
     * Crosshairs: Dynamic Median Revenue (medX) & Dynamic Median Profit (medY)
     * 4 Quadrants: Strong Performer (TR), Margin Problem (BR), Growth Opportunity (TL), Needs Investigation (BL)
     */
    renderMatrixScatter: function (canvasId, points, options = {}) {
      const canvas = document.getElementById(canvasId);
      if (!canvas) return;
      const { ctx, width, height } = initCanvas(canvas);
      ctx.clearRect(0, 0, width, height);

      const padLeft = options.padLeft || 82;
      const padRight = 30;
      const padTop = 32;
      const padBottom = options.padBottom || 55;

      const plotWidth = Math.max(50, width - padLeft - padRight);
      const plotHeight = Math.max(50, height - padTop - padBottom);

      const maxPointX = points.length > 0 ? Math.max(...points.map(p => p.x)) : 100000;
      const maxPointY = points.length > 0 ? Math.max(...points.map(p => p.y)) : 40000;

      const minX = options.minX !== undefined ? options.minX : 0;
      const maxX = options.maxX || (maxPointX * 1.12);
      const minY = options.minY !== undefined ? options.minY : 0;
      const maxY = options.maxY || (maxPointY * 1.15);

      const medX = options.medX !== undefined ? options.medX : 73126.62;
      const medY = options.medY !== undefined ? options.medY : 24385.97;

      const toScreenX = (val) => padLeft + ((val - minX) / (maxX - minX)) * plotWidth;
      const toScreenY = (val) => padTop + plotHeight - ((val - minY) / (maxY - minY)) * plotHeight;

      const screenMedX = Math.max(padLeft, Math.min(padLeft + plotWidth, toScreenX(medX)));
      const screenMedY = Math.max(padTop, Math.min(padTop + plotHeight, toScreenY(medY)));

      // 1. Quadrant Background Tints
      // Top-Left: Growth Opportunity (Low Rev, High Profit)
      ctx.fillStyle = 'rgba(37, 99, 235, 0.04)';
      ctx.fillRect(padLeft, padTop, Math.max(0, screenMedX - padLeft), Math.max(0, screenMedY - padTop));

      // Top-Right: Strong Performer (High Rev, High Profit)
      ctx.fillStyle = 'rgba(16, 185, 129, 0.05)';
      ctx.fillRect(screenMedX, padTop, Math.max(0, padLeft + plotWidth - screenMedX), Math.max(0, screenMedY - padTop));

      // Bottom-Left: Needs Investigation (Low Rev, Low Profit)
      ctx.fillStyle = 'rgba(239, 68, 68, 0.04)';
      ctx.fillRect(padLeft, screenMedY, Math.max(0, screenMedX - padLeft), Math.max(0, padTop + plotHeight - screenMedY));

      // Bottom-Right: Margin Problem (High Rev, Low Profit)
      ctx.fillStyle = 'rgba(245, 158, 11, 0.04)';
      ctx.fillRect(screenMedX, screenMedY, Math.max(0, padLeft + plotWidth - screenMedX), Math.max(0, padTop + plotHeight - screenMedY));

      // Quadrant Subtle Watermark Titles
      ctx.font = '800 11px sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillStyle = 'rgba(37, 99, 235, 0.4)';
      ctx.fillText('GROWTH OPPORTUNITY (High Profit, Low Rev)', padLeft + 12, padTop + 8);

      ctx.textAlign = 'right';
      ctx.fillStyle = 'rgba(16, 185, 129, 0.55)';
      ctx.fillText('STRONG PERFORMER (High Rev, High Profit)', padLeft + plotWidth - 12, padTop + 8);

      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';
      ctx.fillStyle = 'rgba(239, 68, 68, 0.4)';
      ctx.fillText('NEEDS INVESTIGATION (Low Rev, Low Profit)', padLeft + 12, padTop + plotHeight - 8);

      ctx.textAlign = 'right';
      ctx.fillStyle = 'rgba(245, 158, 11, 0.55)';
      ctx.fillText('MARGIN PROBLEM (High Rev, Low Profit)', padLeft + plotWidth - 12, padTop + plotHeight - 8);

      // 2. Regular Grid Lines
      ctx.strokeStyle = '#E2E8F0';
      ctx.lineWidth = 1;
      ctx.font = '600 12px sans-serif';

      // Y Ticks (Profit)
      const yTicks = 5;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      for (let i = 0; i <= yTicks; i++) {
        const yVal = minY + ((maxY - minY) / yTicks) * i;
        const y = toScreenY(yVal);
        ctx.beginPath();
        ctx.moveTo(padLeft, y);
        ctx.lineTo(padLeft + plotWidth, y);
        ctx.stroke();

        ctx.fillStyle = '#64748B';
        ctx.fillText(formatCurrency(yVal), padLeft - 10, y);
      }

      // X Ticks (Net Revenue)
      const xTicks = 5;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      for (let i = 0; i <= xTicks; i++) {
        const xVal = minX + ((maxX - minX) / xTicks) * i;
        const x = toScreenX(xVal);
        ctx.beginPath();
        ctx.moveTo(x, padTop);
        ctx.lineTo(x, padTop + plotHeight);
        ctx.stroke();

        ctx.fillStyle = '#64748B';
        ctx.fillText(formatCurrency(xVal), x, padTop + plotHeight + 10);
      }

      // 3. Dynamic Median Benchmark Crosshair Lines
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 4]);

      // Vertical Median Revenue Line
      ctx.strokeStyle = '#1E293B';
      ctx.beginPath();
      ctx.moveTo(screenMedX, padTop);
      ctx.lineTo(screenMedX, padTop + plotHeight);
      ctx.stroke();

      // Horizontal Median Profit Line
      ctx.beginPath();
      ctx.moveTo(padLeft, screenMedY);
      ctx.lineTo(padLeft + plotWidth, screenMedY);
      ctx.stroke();

      ctx.setLineDash([]); // Reset dash

      // Median Line Badges
      ctx.font = '700 11px sans-serif';
      ctx.fillStyle = '#0F172A';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(`Median Rev: ${formatCurrency(medX)}`, screenMedX, padTop + 24);

      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';
      ctx.fillText(`Median Profit: ${formatCurrency(medY)}`, padLeft + 10, screenMedY - 4);

      // Axis Titles
      ctx.font = '800 13px sans-serif';
      ctx.fillStyle = '#0F172A';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(options.xLabel || 'Store Net Revenue (₹)', padLeft + plotWidth / 2, height - 16);

      // Y Axis Title (Rotated)
      ctx.save();
      ctx.translate(18, padTop + plotHeight / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(options.yLabel || 'Store Operating Profit (₹)', 0, 0);
      ctx.restore();

      // 4. Draw Store Points
      const hitPoints = [];
      points.forEach(p => {
        const px = toScreenX(p.x);
        const py = toScreenY(p.y);

        ctx.beginPath();
        ctx.arc(px, py, 6.5, 0, 2 * Math.PI);
        ctx.fillStyle = p.color || '#2563EB';
        ctx.fill();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.stroke();

        hitPoints.push({
          x: px,
          y: py,
          data: p
        });
      });

      // 5. Interactive Tooltip
      canvas.onmousemove = function (e) {
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;

        const hit = hitPoints.find(hp => Math.hypot(hp.x - mx, hp.y - my) <= 12);
        if (hit) {
          const d = hit.data;
          const classBadge = `<span style="display:inline-block; padding:2px 8px; border-radius:4px; font-size:11px; font-weight:800; background:${d.color}; color:#FFF; margin-left:6px;">${d.classification}</span>`;
          const html = `
            <div style="font-weight:800; font-size:14px; margin-bottom:4px; display:flex; align-items:center;">
              ${d.id} ${classBadge}
            </div>
            <div style="font-size:12px; line-height:1.6; color:#E2E8F0;">
              <div>Net Revenue: <strong style="color:#FFF;">${formatCurrency(d.x)}</strong></div>
              <div>Operating Profit: <strong style="color:#FFF;">${formatCurrency(d.y)}</strong></div>
              <div>Profit Margin: <strong style="color:#FFF;">${d.margin.toFixed(2)}%</strong></div>
              <div>Total Orders: <strong style="color:#FFF;">${d.orders}</strong></div>
              <div>Average Order Value: <strong style="color:#FFF;">${formatCurrency(d.aov)}</strong></div>
              <div>Average Discount: <strong style="color:#FFF;">${d.avgDisc.toFixed(1)}%</strong></div>
            </div>
          `;
          showTooltip(e.clientX, e.clientY, html);
          return;
        }
        hideTooltip();
      };
      canvas.onmouseleave = hideTooltip;
    }
  };
})();
