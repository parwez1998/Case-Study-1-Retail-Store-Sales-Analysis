# FashionWave Retail Analytics: Executive Presentation & Business Intelligence Dashboard

A comprehensive, portfolio-quality, fully interactive PowerPoint-style presentation and business intelligence dashboard built from the real-world dataset `fashionwave_sales_cleaned.csv`.

---

## 🚀 Quick Start: How to Open & View

To view the interactive PowerPoint presentation and BI dashboard:

1. Double-click or open `index.html` in any modern web browser (Google Chrome, Microsoft Edge, Mozilla Firefox, or Apple Safari).
2. The presentation opens directly in **Widescreen 16:9 Presentation Mode**.
3. **Zero installations, zero servers, and zero internet connection required**: All 1,500 records and custom interactive canvas charting engines are 100% self-contained locally!

---

## ⌨️ Presentation Navigation & Keyboard Shortcuts

| Key / Control | Action |
| :--- | :--- |
| `→` (Right Arrow) / `Space` / `PageDown` | Advance to the **Next Slide** |
| `←` (Left Arrow) / `PageUp` | Return to the **Previous Slide** |
| `F` key or `[ ⛶ Fullscreen ]` button | Toggle **Widescreen Fullscreen Mode** |
| `Home` / `End` | Jump to **Slide 1** or **Slide 16** |
| Slide Dropdown (Top Header) | Jump directly to any of the 16 specific slides |
| `[ 📊 Open BI Dashboard ]` button | Instantly navigate to Slide 15 (Interactive Dashboard) |

---

## 📂 Project Architecture & File Manifest

- **`index.html`**: Master application containing the 16-slide PowerPoint deck and the embedded 5-tab Retail BI Dashboard.
- **`styles.css`**: Professional corporate executive styling (16:9 aspect ratio, dark navy header/navigation, high-contrast cards, responsive layout, zero overlapping elements).
- **`charts.js`**: High-performance interactive HTML5 Canvas charting engine with retina display scaling, dynamic hover tooltips, donut charts, grouped bar charts, line trends, scatter plots with linear regression, and 2×2 Store Performance Matrix with dynamic median benchmarks.
- **`app.js`**: Master controller handling slide deck transitions, keyboard shortcuts, fullscreen API, global dashboard filter states, dynamic multi-dimensional aggregations, dynamic store matrix classification, and sortable/searchable/exportable store tables.
- **`data.js`**: Compressed, fast-loading array of all 1,500 validated transactions (`window.RAW_SALES_DATA`).
- **`fashionwave_sales_cleaned.csv`**: The verified source transaction dataset (1,500 rows, 11 columns).
- **`analytics_summary.json`**: Complete pre-calculated statistical dictionary and KPI summary compiled by python analytics scripts.
- **`EXECUTIVE_REPORT.md`**: Comprehensive written data analyst executive report with methodologies, KPI definitions, deep-dive findings, 7 hidden insights, financial recovery models, risk assessments, and 90-day roadmap.
- **`deep_analysis.py`**: Python script used to compute parametric/non-parametric statistics, Pearson correlations, regressions, and store matrices.

---

## 📊 Slide Deck Structure (16 Executive Slides)

1. **Slide 1: Title Slide** — Executive Readout, key metrics badges (₹35.42L Net Rev, ₹12.32L Profit, 34.78% Margin).
2. **Slide 2: Business Problem & Objectives** — The 5 core strategic business questions.
3. **Slide 3: Dataset Architecture & Characteristics** — 1,500 rows, 50 stores, 24 months, schema data dictionary.
4. **Slide 4: Data Cleaning & Preparation** — 0 nulls, 0 duplicates, mathematical formulas, discount bands.
5. **Slide 5: Executive KPI Scorecard** — High-level sales, profitability, temporal, and customer cards formatted in Indian Rupees (₹).
6. **Slide 6: Exploratory Data Analysis & Statistical Distributions** — Summary statistics grid (Min, Q25, Median, Mean, Q75, Max, Std Dev) and distributions.
7. **Slide 7: Product Category Performance & Profitability Dynamics** — Clothing, Shoes, Accessories revenue, profit, margin %, units, donut share.
8. **Slide 8: Weekend vs Weekday Retail Dynamics** — 7-day daily trend, debunking the weekend retail myth.
9. **Slide 9: Discount Impact & Price Elasticity Analysis** — Zero volume elasticity ($r = -0.0034$), margin collapse from 40.2% to 21.5%, scatter plot with regression line.
10. **Slide 10: Store Network Benchmark & Rankings** — Top 5 vs Bottom 5 stores by Net Revenue, 4-quadrant network split.
11. **Slide 11: Store Performance Matrix – Identifying Business Opportunities** — Dynamic 2×2 Revenue vs Profit scatter plot with median benchmark crosshairs (Median Rev ₹73.1K, Median Profit ₹24.4K), 4 classification cards (Strong Performer, Margin Problem, Growth Opportunity, Needs Investigation), empirical findings, and recommended management actions.
12. **Slide 12: Customer Segmentation & Payment Channel Analytics** — New vs Returning split (50/50), the 10.4% "Unknown" capture gap, Digital UPI AOV premium (₹2,486).
13. **Slide 13: Hidden Insights & Anomaly Detection** — 7 non-obvious findings in Observation → Interpretation → Business Impact → Recommended Action format.
14. **Slide 14: Strategic Business Recommendations** — Quick Wins (0–30 days) vs Long-Term Strategies (1–6 months) with quantified ROI and risks.
15. **Slide 15: Interactive Retail BI Dashboard** — Live multi-select filters, 5 dedicated tabbed views, cross-filtering, dynamic 2×2 matrix scatter, classification filter, and CSV table export.
16. **Slide 16: Executive Summary & Management Roadmap** — Executive readout synthesis, 90-day phased transformation roadmap, and 12-month governance KPI scorecard.

---

## 🎛️ Interactive BI Dashboard Features (Slide 15)

- **Global Dynamic Filters:**
  - Date Range pickers (2024-11-18 to 2026-11-18) + Quick Presets (`All 24M`, `2025`, `2026`, `Festive Q4`)
  - Store ID dropdown (All 50 stores)
  - Category dropdown (Clothing, Shoes, Accessories)
  - Customer Type dropdown (New, Returning, Unknown)
  - Payment Mode dropdown (Card, Cash, Digital, Unknown)
  - Day Type dropdown (Weekday, Weekend)
  - Discount Band dropdown (No Discount, Low, Medium, High)
  - **Reset Filters** button
- **5 Dedicated Tabbed Views:**
  1. *Executive Overview:* Monthly revenue & profit trajectory line chart + Category revenue donut.
  2. *Product & Margin:* Category comparisons + Margin % by discount band.
  3. *Weekend vs Weekday:* 7-day Monday–Sunday performance bar chart + Day type share donut.
  4. *Store Performance:* Dynamic 2×2 Store Performance Matrix scatter with median benchmarks + 4 dynamic category KPI cards + 9-column comparison table with sorting, search, classification filter, and **CSV export**!
  5. *Customer & Tender:* Customer classification donut + Payment channel revenue & profit bars.
- **Cross-Filtering:** Click on any Store ID in the store table to instantly isolate that store across all dashboard views!

---

## 📈 Key Empirical Metrics At A Glance

- **Gross Sales:** ₹38,55,724.00 | **Net Revenue:** ₹35,42,230.50 | **Net Profit:** ₹12,31,975.91
- **Overall Operating Profit Margin:** 34.78%
- **Average Order Value (AOV):** ₹2,361.49 | **Average Selling Price (ASP):** ₹1,115.31
- **Top Category by Revenue & Profit:** Clothing (₹17.21L Net Rev, ₹5.94L Profit)
- **Top Category by AOV & Leverage:** Shoes (₹4,841.47 AOV, 40.32% Revenue Share from only 20.18% Units)
- **Top Category by Profit Margin:** Accessories (35.25%)
- **Top Store:** Store_16 (₹1,22,913.20 Net Rev, ₹43,071.40 Profit, 39 Orders)
- **Bottom Store:** Store_25 (₹17,131.00 Net Rev, ₹6,206.23 Profit, 16 Orders)
- **Discount Elasticity:** $r = -0.0034$ (Zero volume expansion; markdowns simply destroy profit margin)
- **Daily Peak Day:** Friday (₹5.66L Net Rev, 244 Orders)

---
*Created for FashionWave Retail Analytics Case Study. Certified 100% empirical derivation from actual transaction records.*
