import csv
import json
import math
from datetime import datetime
from collections import defaultdict, Counter

with open('cleaned_sales.json', 'r', encoding='utf-8') as f:
    sales = json.load(f)

N = len(sales)

# Helper function for percentiles
def percentile(data, p):
    sorted_data = sorted(data)
    k = (len(sorted_data) - 1) * p
    f = math.floor(k)
    c = math.ceil(k)
    if f == c:
        return sorted_data[int(k)]
    d0 = sorted_data[int(f)] * (c - k)
    d1 = sorted_data[int(c)] * (k - f)
    return d0 + d1

def stats(arr):
    n = len(arr)
    mean_val = sum(arr) / n
    med_val = percentile(arr, 0.5)
    variance = sum((x - mean_val) ** 2 for x in arr) / (n - 1) if n > 1 else 0
    std_val = math.sqrt(variance)
    return {
        'count': n,
        'min': round(min(arr), 2),
        'max': round(max(arr), 2),
        'mean': round(mean_val, 2),
        'median': round(med_val, 2),
        'std': round(std_val, 2),
        'q25': round(percentile(arr, 0.25), 2),
        'q75': round(percentile(arr, 0.75), 2)
    }

# 1. Overall KPIs
total_gross_sales = sum(s['GrossSales'] for s in sales)
total_discount_amount = sum(s['DiscountAmount'] for s in sales)
total_net_revenue = sum(s['NetRevenue'] for s in sales)
total_cost = sum(s['TotalCost'] for s in sales)
total_profit = sum(s['Profit'] for s in sales)
overall_margin = (total_profit / total_net_revenue * 100) if total_net_revenue > 0 else 0
total_orders = N
total_units = sum(s['Quantity'] for s in sales)
aov = total_net_revenue / total_orders
asp = total_net_revenue / total_units
gross_asp = total_gross_sales / total_units
avg_discount_pct = sum(s['Discount'] for s in sales) / N
unique_stores = len(set(s['StoreID'] for s in sales))
revenue_per_store = total_net_revenue / unique_stores

# Customer type counts
cust_type_orders = Counter(s['CustomerType'] for s in sales)
cust_type_rev = defaultdict(float)
cust_type_profit = defaultdict(float)
for s in sales:
    cust_type_rev[s['CustomerType']] += s['NetRevenue']
    cust_type_profit[s['CustomerType']] += s['Profit']

# Weekend vs Weekday
weekend_orders = sum(1 for s in sales if s['DayType'] == 'Weekend')
weekday_orders = sum(1 for s in sales if s['DayType'] == 'Weekday')
weekend_rev = sum(s['NetRevenue'] for s in sales if s['DayType'] == 'Weekend')
weekday_rev = sum(s['NetRevenue'] for s in sales if s['DayType'] == 'Weekday')
weekend_profit = sum(s['Profit'] for s in sales if s['DayType'] == 'Weekend')
weekday_profit = sum(s['Profit'] for s in sales if s['DayType'] == 'Weekday')
weekend_units = sum(s['Quantity'] for s in sales if s['DayType'] == 'Weekend')
weekday_units = sum(s['Quantity'] for s in sales if s['DayType'] == 'Weekday')

weekend_margin = (weekend_profit / weekend_rev * 100) if weekend_rev > 0 else 0
weekday_margin = (weekday_profit / weekday_rev * 100) if weekday_rev > 0 else 0
weekend_aov = weekend_rev / weekend_orders if weekend_orders > 0 else 0
weekday_aov = weekday_rev / weekday_orders if weekday_orders > 0 else 0

# Summary stats for numerical fields
qty_stats = stats([s['Quantity'] for s in sales])
unit_price_stats = stats([s['UnitPrice'] for s in sales])
cost_stats = stats([s['CostPerUnit'] for s in sales])
discount_stats = stats([s['Discount'] for s in sales])
rev_stats = stats([s['NetRevenue'] for s in sales])
profit_stats = stats([s['Profit'] for s in sales])
margin_stats = stats([s['ProfitMargin'] for s in sales])

# Category Breakdown
categories = sorted(list(set(s['Category'] for s in sales)))
cat_data = {}
for cat in categories:
    cat_sales = [s for s in sales if s['Category'] == cat]
    c_orders = len(cat_sales)
    c_units = sum(s['Quantity'] for s in cat_sales)
    c_gross = sum(s['GrossSales'] for s in cat_sales)
    c_disc = sum(s['DiscountAmount'] for s in cat_sales)
    c_rev = sum(s['NetRevenue'] for s in cat_sales)
    c_cost = sum(s['TotalCost'] for s in cat_sales)
    c_profit = sum(s['Profit'] for s in cat_sales)
    c_margin = (c_profit / c_rev * 100) if c_rev > 0 else 0
    c_aov = c_rev / c_orders
    c_asp = c_rev / c_units
    c_avg_disc = sum(s['Discount'] for s in cat_sales) / c_orders
    cat_data[cat] = {
        'orders': c_orders,
        'units': c_units,
        'gross_sales': round(c_gross, 2),
        'discount_amount': round(c_disc, 2),
        'net_revenue': round(c_rev, 2),
        'total_cost': round(c_cost, 2),
        'profit': round(c_profit, 2),
        'profit_margin': round(c_margin, 2),
        'aov': round(c_aov, 2),
        'asp': round(c_asp, 2),
        'avg_discount': round(c_avg_disc, 2),
        'rev_share': round((c_rev / total_net_revenue) * 100, 2),
        'profit_share': round((c_profit / total_profit) * 100, 2),
        'unit_share': round((c_units / total_units) * 100, 2)
    }

# Day of Week breakdown
days_order = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
dow_data = {}
for d in days_order:
    d_sales = [s for s in sales if s['DayOfWeek'] == d]
    d_orders = len(d_sales)
    d_units = sum(s['Quantity'] for s in d_sales)
    d_rev = sum(s['NetRevenue'] for s in d_sales)
    d_cost = sum(s['TotalCost'] for s in d_sales)
    d_profit = sum(s['Profit'] for s in d_sales)
    d_margin = (d_profit / d_rev * 100) if d_rev > 0 else 0
    d_aov = d_rev / d_orders if d_orders > 0 else 0
    dow_data[d] = {
        'orders': d_orders,
        'units': d_units,
        'net_revenue': round(d_rev, 2),
        'profit': round(d_profit, 2),
        'profit_margin': round(d_margin, 2),
        'aov': round(d_aov, 2),
        'rev_share': round((d_rev / total_net_revenue) * 100, 2)
    }

# Discount Bands Breakdown
discount_bands_order = ['No Discount', 'Low Discount (1-5%)', 'Medium Discount (6-15%)', 'High Discount (16-30%)']
disc_data = {}
for band in discount_bands_order:
    b_sales = [s for s in sales if s['DiscountBand'] == band]
    b_orders = len(b_sales)
    b_units = sum(s['Quantity'] for s in b_sales)
    b_gross = sum(s['GrossSales'] for s in b_sales)
    b_disc = sum(s['DiscountAmount'] for s in b_sales)
    b_rev = sum(s['NetRevenue'] for s in b_sales)
    b_cost = sum(s['TotalCost'] for s in b_sales)
    b_profit = sum(s['Profit'] for s in b_sales)
    b_margin = (b_profit / b_rev * 100) if b_rev > 0 else 0
    b_aov = b_rev / b_orders if b_orders > 0 else 0
    b_avg_disc = sum(s['Discount'] for s in b_sales) / b_orders if b_orders > 0 else 0
    disc_data[band] = {
        'orders': b_orders,
        'units': b_units,
        'gross_sales': round(b_gross, 2),
        'discount_amount': round(b_disc, 2),
        'net_revenue': round(b_rev, 2),
        'total_cost': round(b_cost, 2),
        'profit': round(b_profit, 2),
        'profit_margin': round(b_margin, 2),
        'aov': round(b_aov, 2),
        'avg_discount': round(b_avg_disc, 2),
        'rev_share': round((b_rev / total_net_revenue) * 100, 2),
        'profit_share': round((b_profit / total_profit) * 100, 2)
    }

# Discounted vs Non-Discounted
discounted_sales = [s for s in sales if s['Discount'] > 0]
non_disc_sales = [s for s in sales if s['Discount'] == 0]

disc_vs_nondisc = {
    'discounted': {
        'orders': len(discounted_sales),
        'net_revenue': round(sum(s['NetRevenue'] for s in discounted_sales), 2),
        'profit': round(sum(s['Profit'] for s in discounted_sales), 2),
        'margin': round(sum(s['Profit'] for s in discounted_sales) / sum(s['NetRevenue'] for s in discounted_sales) * 100, 2),
        'aov': round(sum(s['NetRevenue'] for s in discounted_sales) / len(discounted_sales), 2),
        'avg_units': round(sum(s['Quantity'] for s in discounted_sales) / len(discounted_sales), 2)
    },
    'non_discounted': {
        'orders': len(non_disc_sales),
        'net_revenue': round(sum(s['NetRevenue'] for s in non_disc_sales), 2),
        'profit': round(sum(s['Profit'] for s in non_disc_sales), 2),
        'margin': round(sum(s['Profit'] for s in non_disc_sales) / sum(s['NetRevenue'] for s in non_disc_sales) * 100, 2),
        'aov': round(sum(s['NetRevenue'] for s in non_disc_sales) / len(non_disc_sales), 2),
        'avg_units': round(sum(s['Quantity'] for s in non_disc_sales) / len(non_disc_sales), 2)
    }
}

# Category x Discount Band Matrix
cat_disc_matrix = {}
for cat in categories:
    cat_disc_matrix[cat] = {}
    for band in discount_bands_order:
        cb_sales = [s for s in sales if s['Category'] == cat and s['DiscountBand'] == band]
        cb_orders = len(cb_sales)
        cb_rev = sum(s['NetRevenue'] for s in cb_sales)
        cb_profit = sum(s['Profit'] for s in cb_sales)
        cb_margin = (cb_profit / cb_rev * 100) if cb_rev > 0 else 0
        cat_disc_matrix[cat][band] = {
            'orders': cb_orders,
            'net_revenue': round(cb_rev, 2),
            'profit': round(cb_profit, 2),
            'margin': round(cb_margin, 2)
        }

# Pearson Correlation: Discount vs Profit Margin
def correlation(x, y):
    n = len(x)
    mean_x = sum(x) / n
    mean_y = sum(y) / n
    cov = sum((x[i] - mean_x) * (y[i] - mean_y) for i in range(n))
    var_x = sum((xi - mean_x) ** 2 for xi in x)
    var_y = sum((yi - mean_y) ** 2 for yi in y)
    if var_x == 0 or var_y == 0:
        return 0
    return cov / math.sqrt(var_x * var_y)

corr_disc_margin = correlation([s['Discount'] for s in sales], [s['ProfitMargin'] for s in sales])
corr_disc_qty = correlation([s['Discount'] for s in sales], [s['Quantity'] for s in sales])
corr_disc_profit = correlation([s['Discount'] for s in sales], [s['Profit'] for s in sales])

# Store Performance Analysis
stores = sorted(list(set(s['StoreID'] for s in sales)))
store_data = []
for st in stores:
    st_sales = [s for s in sales if s['StoreID'] == st]
    st_orders = len(st_sales)
    st_units = sum(s['Quantity'] for s in st_sales)
    st_gross = sum(s['GrossSales'] for s in st_sales)
    st_disc = sum(s['DiscountAmount'] for s in st_sales)
    st_rev = sum(s['NetRevenue'] for s in st_sales)
    st_cost = sum(s['TotalCost'] for s in st_sales)
    st_profit = sum(s['Profit'] for s in st_sales)
    st_margin = (st_profit / st_rev * 100) if st_rev > 0 else 0
    st_aov = st_rev / st_orders if st_orders > 0 else 0
    st_avg_disc = sum(s['Discount'] for s in st_sales) / st_orders if st_orders > 0 else 0
    store_data.append({
        'store_id': st,
        'orders': st_orders,
        'units': st_units,
        'gross_sales': round(st_gross, 2),
        'discount_amount': round(st_disc, 2),
        'net_revenue': round(st_rev, 2),
        'total_cost': round(st_cost, 2),
        'profit': round(st_profit, 2),
        'profit_margin': round(st_margin, 2),
        'aov': round(st_aov, 2),
        'avg_discount': round(st_avg_disc, 2)
    })

# Store medians
median_store_rev = percentile([st['net_revenue'] for st in store_data], 0.5)
median_store_profit = percentile([st['profit'] for st in store_data], 0.5)
median_store_margin = percentile([st['profit_margin'] for st in store_data], 0.5)
median_store_orders = percentile([st['orders'] for st in store_data], 0.5)

# 4 Quadrants
# Q1: High Revenue, High Margin (Stars)
# Q2: High Revenue, Low Margin (Volume Drivers)
# Q3: Low Revenue, High Margin (Boutiques/Niche)
# Q4: Low Revenue, Low Margin (Laggards/Underperformers)
for st in store_data:
    if st['net_revenue'] >= median_store_rev and st['profit_margin'] >= median_store_margin:
        st['quadrant'] = 'Stars (High Rev, High Margin)'
    elif st['net_revenue'] >= median_store_rev and st['profit_margin'] < median_store_margin:
        st['quadrant'] = 'Volume Drivers (High Rev, Low Margin)'
    elif st['net_revenue'] < median_store_rev and st['profit_margin'] >= median_store_margin:
        st['quadrant'] = 'Boutiques (Low Rev, High Margin)'
    else:
        st['quadrant'] = 'Laggards (Low Rev, Low Margin)'

# Top 10 / Bottom 10
stores_by_rev = sorted(store_data, key=lambda x: x['net_revenue'], reverse=True)
stores_by_profit = sorted(store_data, key=lambda x: x['profit'], reverse=True)
stores_by_margin = sorted(store_data, key=lambda x: x['profit_margin'], reverse=True)

# Customer Type Analysis
cust_summary = {}
for ct in ['New', 'Returning', 'Unknown']:
    ct_sales = [s for s in sales if s['CustomerType'] == ct]
    ct_orders = len(ct_sales)
    ct_units = sum(s['Quantity'] for s in ct_sales)
    ct_rev = sum(s['NetRevenue'] for s in ct_sales)
    ct_profit = sum(s['Profit'] for s in ct_sales)
    ct_margin = (ct_profit / ct_rev * 100) if ct_rev > 0 else 0
    ct_aov = ct_rev / ct_orders if ct_orders > 0 else 0
    ct_avg_disc = sum(s['Discount'] for s in ct_sales) / ct_orders if ct_orders > 0 else 0
    cust_summary[ct] = {
        'orders': ct_orders,
        'units': ct_units,
        'net_revenue': round(ct_rev, 2),
        'profit': round(ct_profit, 2),
        'profit_margin': round(ct_margin, 2),
        'aov': round(ct_aov, 2),
        'avg_discount': round(ct_avg_disc, 2),
        'order_share': round(ct_orders / N * 100, 2),
        'rev_share': round(ct_rev / total_net_revenue * 100, 2)
    }

# Payment Mode Analysis
pay_summary = {}
for pm in ['Card', 'Cash', 'Digital', 'Unknown']:
    pm_sales = [s for s in sales if s['PaymentMode'] == pm]
    pm_orders = len(pm_sales)
    pm_units = sum(s['Quantity'] for s in pm_sales)
    pm_rev = sum(s['NetRevenue'] for s in pm_sales)
    pm_profit = sum(s['Profit'] for s in pm_sales)
    pm_margin = (pm_profit / pm_rev * 100) if pm_rev > 0 else 0
    pm_aov = pm_rev / pm_orders if pm_orders > 0 else 0
    pay_summary[pm] = {
        'orders': pm_orders,
        'units': pm_units,
        'net_revenue': round(pm_rev, 2),
        'profit': round(pm_profit, 2),
        'profit_margin': round(pm_margin, 2),
        'aov': round(pm_aov, 2),
        'order_share': round(pm_orders / N * 100, 2),
        'rev_share': round(pm_rev / total_net_revenue * 100, 2)
    }

# Basket Value Tiers based on NetRevenue quartiles
rev_q25 = percentile([s['NetRevenue'] for s in sales], 0.25)
rev_q75 = percentile([s['NetRevenue'] for s in sales], 0.75)

basket_tiers = {'Low (< ₹{:.0f})'.format(rev_q25): [], 'Medium (₹{:.0f} - ₹{:.0f})'.format(rev_q25, rev_q75): [], 'High (> ₹{:.0f})'.format(rev_q75): []}
for s in sales:
    if s['NetRevenue'] <= rev_q25:
        tier_name = 'Low (< ₹{:.0f})'.format(rev_q25)
    elif s['NetRevenue'] <= rev_q75:
        tier_name = 'Medium (₹{:.0f} - ₹{:.0f})'.format(rev_q25, rev_q75)
    else:
        tier_name = 'High (> ₹{:.0f})'.format(rev_q75)
    s['BasketTier'] = tier_name

basket_summary = {}
for tier in ['Low (< ₹{:.0f})'.format(rev_q25), 'Medium (₹{:.0f} - ₹{:.0f})'.format(rev_q25, rev_q75), 'High (> ₹{:.0f})'.format(rev_q75)]:
    t_sales = [s for s in sales if s['BasketTier'] == tier]
    t_orders = len(t_sales)
    t_rev = sum(s['NetRevenue'] for s in t_sales)
    t_profit = sum(s['Profit'] for s in t_sales)
    t_margin = (t_profit / t_rev * 100) if t_rev > 0 else 0
    t_aov = t_rev / t_orders if t_orders > 0 else 0
    t_avg_disc = sum(s['Discount'] for s in t_sales) / t_orders if t_orders > 0 else 0
    basket_summary[tier] = {
        'orders': t_orders,
        'net_revenue': round(t_rev, 2),
        'profit': round(t_profit, 2),
        'profit_margin': round(t_margin, 2),
        'aov': round(t_aov, 2),
        'avg_discount': round(t_avg_disc, 2),
        'rev_share': round(t_rev / total_net_revenue * 100, 2)
    }

# Monthly Trends (sorted chronologically)
months_map = defaultdict(lambda: {'orders': 0, 'units': 0, 'rev': 0.0, 'cost': 0.0, 'profit': 0.0})
for s in sales:
    key = s['Date'][:7] # YYYY-MM
    months_map[key]['orders'] += 1
    months_map[key]['units'] += s['Quantity']
    months_map[key]['rev'] += s['NetRevenue']
    months_map[key]['cost'] += s['TotalCost']
    months_map[key]['profit'] += s['Profit']

monthly_trend = []
for m_key in sorted(months_map.keys()):
    dt = datetime.strptime(m_key, '%Y-%m')
    data = months_map[m_key]
    m_margin = (data['profit'] / data['rev'] * 100) if data['rev'] > 0 else 0
    monthly_trend.append({
        'month_key': m_key,
        'label': dt.strftime('%b %Y'),
        'orders': data['orders'],
        'units': data['units'],
        'net_revenue': round(data['rev'], 2),
        'profit': round(data['profit'], 2),
        'profit_margin': round(m_margin, 2),
        'aov': round(data['rev'] / data['orders'], 2)
    })

# Compile comprehensive output
summary = {
    'overall_kpis': {
        'total_gross_sales': round(total_gross_sales, 2),
        'total_discount_amount': round(total_discount_amount, 2),
        'total_net_revenue': round(total_net_revenue, 2),
        'total_cost': round(total_cost, 2),
        'total_profit': round(total_profit, 2),
        'overall_profit_margin': round(overall_margin, 2),
        'total_orders': total_orders,
        'total_units_sold': total_units,
        'aov': round(aov, 2),
        'asp': round(asp, 2),
        'gross_asp': round(gross_asp, 2),
        'avg_discount_pct': round(avg_discount_pct, 2),
        'total_stores': unique_stores,
        'revenue_per_store': round(revenue_per_store, 2),
        'customer_types': {k: int(v) for k, v in cust_type_orders.items()},
        'weekend_revenue': round(weekend_rev, 2),
        'weekday_revenue': round(weekday_rev, 2),
        'weekend_rev_share': round((weekend_rev / total_net_revenue) * 100, 2),
        'weekday_rev_share': round((weekday_rev / total_net_revenue) * 100, 2),
        'weekend_orders': weekend_orders,
        'weekday_orders': weekday_orders,
        'weekend_profit': round(weekend_profit, 2),
        'weekday_profit': round(weekday_profit, 2),
        'weekend_profit_margin': round(weekend_margin, 2),
        'weekday_profit_margin': round(weekday_margin, 2),
        'weekend_aov': round(weekend_aov, 2),
        'weekday_aov': round(weekday_aov, 2)
    },
    'summary_stats': {
        'quantity': qty_stats,
        'unit_price': unit_price_stats,
        'cost_per_unit': cost_stats,
        'discount': discount_stats,
        'net_revenue': rev_stats,
        'profit': profit_stats,
        'profit_margin': margin_stats
    },
    'category_analysis': cat_data,
    'day_of_week_analysis': dow_data,
    'discount_band_analysis': disc_data,
    'disc_vs_nondisc': disc_vs_nondisc,
    'cat_disc_matrix': cat_disc_matrix,
    'correlations': {
        'discount_vs_profit_margin': round(corr_disc_margin, 4),
        'discount_vs_quantity': round(corr_disc_qty, 4),
        'discount_vs_profit': round(corr_disc_profit, 4)
    },
    'store_analysis': {
        'median_store_revenue': round(median_store_rev, 2),
        'median_store_profit': round(median_store_profit, 2),
        'median_store_margin': round(median_store_margin, 2),
        'median_store_orders': round(median_store_orders, 2),
        'top_10_by_revenue': stores_by_rev[:10],
        'bottom_10_by_revenue': stores_by_rev[-10:],
        'top_10_by_profit': stores_by_profit[:10],
        'bottom_10_by_profit': stores_by_profit[-10:],
        'all_stores': store_data
    },
    'customer_analysis': cust_summary,
    'payment_analysis': pay_summary,
    'basket_analysis': basket_summary,
    'monthly_trend': monthly_trend
}

with open('analytics_summary.json', 'w', encoding='utf-8') as f:
    json.dump(summary, f, indent=2)

print("Comprehensive analytics summary saved to analytics_summary.json.")
