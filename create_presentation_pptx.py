import os
from pptx import Presentation
from pptx.util import Inches, Pt

prs = Presentation()
prs.slide_width = Inches(13.333)
prs.slide_height = Inches(7.5)
blank_layout = prs.slide_layouts[6]

slide_notes_map = {
    1: """Title Slide: FashionWave Executive Readout
• Scope: 50 Stores across India, 1,500 transactions, Nov 2024 - Nov 2026.
• Headline Metrics: Net Revenue ₹35.42L, Profit ₹12.32L, Margin 34.78%, Orders 1,500, Units 3,176, AOV ₹2,361.
• Role: Senior Retail Data Analyst presenting to Executive Leadership.""",

    2: """Slide 2: Business Problem & Analytical Objectives
• Commercial Context: Top-line growth vs margin erosion.
• 7.1x Revenue Divide between Store_16 (₹1.23L) and Store_25 (₹17.1K).
• Core Objectives: Data hygiene audit, promotional price elasticity, day-of-week sales velocity, 50-store dynamic matrix, and 90-day turnaround agenda.""",

    3: """Slide 3: Dataset Architecture & Schema Profile
• 1,500 rows, 11 raw columns. Zero missing values, zero duplicates.
• Date range: 18-Nov-2024 to 18-Nov-2026 (731 days).
• Categories: Clothing (739 orders, 49.3%), Accessories (466 orders, 31.1%), Shoes (295 orders, 19.7%).
• Store Count: Exactly 50 unique stores, range 13 to 48 transactions per store.""",

    4: """Slide 4: Data Hygiene & Calculated Dimensions
• Null & Duplicate Audit: 100% clean data integrity.
• Price/Cost Validation: UnitPrice >= CostPerUnit in 100% of rows (zero loss leaders).
• 13 Calculated Columns: Year, Month, Month Name, Quarter, Day of Week, Weekend/Weekday, Gross Sales, Discount Amount, Net Revenue, Total Cost, Profit, Profit Margin, Discount Band.
• POS Capture Gaps: 156 transactions (10.4%) flagged Unknown Customer Type; 66 transactions (4.4%) flagged Unknown Payment.""",

    5: """Slide 5: Executive Retail KPI Scorecard
• Sales KPIs: Gross Sales ₹38.56L, Net Revenue ₹35.42L, Discounts ₹3.13L (8.13%), Orders 1,500, Units Sold 3,176.
• Profitability KPIs: Total Procurement Cost ₹23.10L, Operating Profit ₹12.32L, Margin 34.78%, Average Discount 8.25%, Revenue per Store ₹70,845.
• Customer & Velocity KPIs: New 672 (44.8%), Returning 672 (44.8%), Unknown 156 (10.4%). Weekday ₹25.24L (71.26%), Weekend ₹10.18L (28.74%).""",

    6: """Slide 6: Exploratory Data Analysis & Statistical Distributions
• Summary Statistics: Mean Qty 2.12 (median 2.0, max 5.0). Mean UnitPrice ₹1,193 (median ₹799, max ₹3,499).
• Cost Per Unit: Mean ₹715.7 (median ₹542.6). Discount Mean 8.25% (median 5.0%, max 30.0%).
• Skewness Discovery: Net Revenue Mean (₹2,361) is significantly higher than Median (₹1,598), showing positive right-skew from footwear baskets.""",

    7: """Slide 7: Product Category Economics & Profitability Dynamics
• Clothing: ₹17.21L Revenue (48.6%), ₹5.94L Profit (48.2%), Margin 34.50%, AOV ₹2,329, 1,587 units (50.0%). Acts as the Volume Anchor.
• Shoes: ₹14.28L Revenue (40.3%), ₹5.00L Profit (40.6%), Margin 34.99%, AOV ₹4,841 (2.1x Clothing), 641 units. Acts as the AOV & Margin Multiplier.
• Accessories: ₹3.93L Revenue (11.1%), ₹1.38L Profit (11.2%), Margin 35.25% (highest margin), AOV ₹843, 948 units. Cash counter impulse attachment opportunity.""",

    8: """Slide 8: Weekend vs Weekday Retail Dynamics
• Myth Debunked: Weekend sales surge does NOT exist.
• Empirical Breakdown: Weekends represent 28.57% of days and drive 28.74% of revenue (₹10.18L) and 28.0% of orders (420).
• Daily Velocity: Completely uniform at 14.3% per day across all 7 days.
• Peak Days: Friday is #1 (₹5.66L, 244 orders), followed by Monday (₹5.57L, 226 orders). Staffing must reallocate to Mon/Fri.""",

    9: """Slide 9: Discount Impact & Price Elasticity Analysis
• Econometric Finding: Correlation between Discount % and Quantity is r = -0.0034 (virtually zero).
• Volume Parity: Units per order at No Discount (2.13) equals High Discount (2.11). High discounts produce ZERO volume expansion.
• Margin Destruction: Margin collapses from 40.21% (No Discount) to 21.54% (High Discount 16-30%).
• Correlation with Profit Margin: r = -0.7447 (Trendline: y = -0.80x + 40.7%). Capping markdowns recovers ₹85,000–₹1,00,000 in pure gross margin.""",

    10: """Slide 10: Store Network Benchmark & Rankings
• Performance Divide: 7.1x spread between top store (Store_16: ₹1.23L) and bottom store (Store_25: ₹17.1K).
• Top 5 Stores: Store_16 (₹1.23L), Store_15 (₹1.10L), Store_21 (₹1.09L), Store_47 (₹1.06L), Store_26 (₹94.5K).
• Bottom 5 Stores: Store_25 (₹17.1K), Store_09 (₹42.3K), Store_08 (₹45.7K), Store_50 (₹47.9K), Store_40 (₹49.4K).
• Root Cause: Laggard stores lack shoe volume and have low order frequency, not discounting issues.""",

    11: """Slide 11: Store Performance Matrix – Identifying Business Opportunities
• Benchmark Medians: Revenue Median ₹73,126.62 | Profit Median ₹24,385.97.
• 4 Strategic Quadrants:
  1. Strong Performers (High Rev + High Profit): 23 Stores (46%), ₹19.93L Rev (56.3%). Action: Benchmark SOPs.
  2. Margin Problems (High Rev + Low Profit): 2 Stores (4%) - Store_20 (₹73.6K Rev, 32.2% Margin) & Store_33 (₹73.6K Rev, 32.9% Margin). Action: Audit discount overrides, cap promos at 10%.
  3. Growth Opportunities (Low Rev + High Profit): 2 Stores (4%) - Store_24 (₹71.9K Rev, 35.5% Margin) & Store_29 (₹68.7K Rev, 36.0% Margin). Action: Footfall expansion, localized digital ads, click-and-collect.
  4. Needs Investigation (Low Rev + Low Profit): 23 Stores (46%), ₹12.62L Rev. Action: 90-day review, address 36% traffic deficit, evaluate lease restructuring.""",

    12: """Slide 12: Customer Segmentation & Channel Monetization
• Customer Split: New Customers (672 orders, ₹16.36L, AOV ₹2,434) vs Returning (672 orders, ₹15.29L, AOV ₹2,276) shows exact 50/50 balance.
• Capture Gap: 156 transactions (10.4%) have Unknown Customer Type, driving ₹3.77L at 36.76% margin. High-value shoppers slipping through untracked.
• Payment Channels: Digital UPI commands highest AOV (₹2,486), followed by Cash (₹2,362), Card (₹2,309), Unknown (₹2,284).""",

    13: """Slide 13: Hidden Insights & Anomaly Detection
• Insight #1: The Discount Margin Destruction Trap (r = -0.0034 volume elasticity, margin collapse to 21.54%).
• Insight #2: Debunking the Weekend Rush (uniform 14.3% daily velocity; Friday & Monday lead).
• Insight #3: Footwear AOV Multiplier (Shoes drive 40.3% rev from 19.7% orders; under-merchandised in laggards).
• Insight #4: The Unknown Data Capture Blind Spot (₹3.77L high-margin spend un-enrolled).
• Insight #5: Digital Payment Basket Expansion (UPI basket size leads network).""",

    14: """Slide 14: Strategic Business Recommendations & Phased Roadmap
• Phase 1: Quick Wins (Days 0-30): Cease unconditioned discounts (>15%); mandate POS phone capture; reallocate staffing rotas to Friday/Monday; place high-margin impulse accessories at billing counter.
• Phase 2: Medium-Term (Months 1-3): Assortment rebalancing for bottom 15 stores (seed footwear SKUs); category-specific margin guardrails in ERP (34% Clothing, 35% Shoes, 37% Accessories).
• Phase 3: Strategic Long-Term (Months 3-6): Digital tender acceleration with UPI rewards; 90-day turnaround or footprint consolidation for persistent laggards.""",

    15: """Slide 15: Interactive Business Intelligence Dashboard
• Complete dynamic analytical filtering engine across Date, Store, Category, Customer Type, Payment Mode, Day of Week, and Discount Band.
• Real-time KPI recalculation, multi-series revenue/profit trendline, and 50-store searchable matrix table with CSV export.""",

    16: """Slide 16: Executive Summary & Governance Roadmap
• Synthesis: Solid foundation with ₹35.42L net revenue and 34.78% margin.
• Governance Targets for Next 12 Months:
  - Net Margin: 34.8% -> 37.5% (+270 bps)
  - Average Order Value: ₹2,361 -> ₹2,650 (+12.2%)
  - High Discount Share: 19.4% -> <8.0%
  - Unknown Customer Tag: 10.4% -> <2.0%"""
}

# Add all 16 slides
for slide_num in range(1, 17):
    img_path = os.path.abspath(f'slide_screenshots/slide_{slide_num:02d}.png')
    slide = prs.slides.add_slide(blank_layout)
    if os.path.exists(img_path):
        slide.shapes.add_picture(img_path, 0, 0, Inches(13.333), Inches(7.5))
    
    # Add executive speaker notes
    if slide_num in slide_notes_map:
        notes_slide = slide.notes_slide
        tf_notes = notes_slide.notes_text_frame
        tf_notes.text = slide_notes_map[slide_num]

out_pptx = os.path.abspath('FashionWave_Retail_Analytics_Presentation.pptx')
prs.save(out_pptx)
print(f"PowerPoint Presentation successfully created: {out_pptx}")
print(f"Total Slides: {len(prs.slides)}")
print(f"File Size: {os.path.getsize(out_pptx) / 1024:.1f} KB")
