import csv
import json
import math
from datetime import datetime
from collections import defaultdict, Counter

filename = 'fashionwave_sales_cleaned.csv'

records = []
with open(filename, mode='r', encoding='utf-8-sig') as f:
    reader = csv.DictReader(f)
    for row in reader:
        records.append(row)

print(f"Total rows read: {len(records)}")

# Data preparation and calculated columns
cleaned_records = []
date_formats = ['%Y-%m-%d', '%d-%m-%Y', '%m/%d/%Y', '%d/%m/%Y']

null_counts = defaultdict(int)
customer_types = Counter()
payment_modes = Counter()

dates = []
quantities = []
unit_prices = []
discounts = []
cost_per_units = []

for r in records:
    # Check nulls
    for k, v in r.items():
        if v is None or v.strip() == '':
            null_counts[k] += 1
            
    # Parse Date
    date_str = r['Date'].strip()
    dt = None
    for fmt in date_formats:
        try:
            dt = datetime.strptime(date_str, fmt)
            break
        except ValueError:
            pass
    if not dt:
        raise ValueError(f"Could not parse date: {date_str}")
        
    dates.append(dt)
    
    qty = float(r['Quantity'])
    unit_price = float(r['UnitPrice'])
    discount = float(r['Discount'])
    cost_per_unit = float(r['CostPerUnit'])
    
    quantities.append(qty)
    unit_prices.append(unit_price)
    discounts.append(discount)
    cost_per_units.append(cost_per_unit)
    
    cust_type = r['CustomerType'].strip()
    pay_mode = r['PaymentMode'].strip()
    customer_types[cust_type] += 1
    payment_modes[pay_mode] += 1
    
    # Formulas:
    # Gross Sales = Quantity * UnitPrice
    gross_sales = qty * unit_price
    # Discount Amount = Gross Sales * Discount / 100
    discount_amount = gross_sales * (discount / 100.0)
    # Net Revenue = Gross Sales - Discount Amount
    net_revenue = gross_sales - discount_amount
    # Total Cost = Quantity * CostPerUnit
    total_cost = qty * cost_per_unit
    # Profit = Net Revenue - Total Cost
    profit = net_revenue - total_cost
    # Profit Margin = (Profit / Net Revenue) * 100
    profit_margin = (profit / net_revenue * 100.0) if net_revenue > 0 else 0.0
    
    # Date calculations
    year = dt.year
    month = dt.month
    month_name = dt.strftime('%B')
    month_year = dt.strftime('%b %Y')
    quarter = f"Q{(dt.month - 1) // 3 + 1}"
    quarter_year = f"{quarter} {year}"
    day_of_week = dt.strftime('%A')
    day_idx = dt.weekday() # Monday is 0, Sunday is 6
    day_type = 'Weekend' if day_idx in [5, 6] else 'Weekday'
    
    # Discount bands:
    # No Discount: 0%
    # Low Discount (1–5%)
    # Medium Discount (6–15%)
    # High Discount (16–30%)
    if discount == 0:
        discount_band = 'No Discount'
    elif 1.0 <= discount <= 5.0:
        discount_band = 'Low Discount (1-5%)'
    elif 5.0 < discount <= 15.0:
        discount_band = 'Medium Discount (6-15%)'
    elif 15.0 < discount <= 30.0:
        discount_band = 'High Discount (16-30%)'
    else:
        discount_band = 'Other (>30%)'
        
    cleaned_records.append({
        'InvoiceNo': r['InvoiceNo'].strip(),
        'Date': dt.strftime('%Y-%m-%d'),
        'StoreID': r['StoreID'].strip(),
        'ProductID': r['ProductID'].strip(),
        'Category': r['Category'].strip(),
        'Quantity': int(qty),
        'UnitPrice': unit_price,
        'Discount': discount,
        'CostPerUnit': cost_per_unit,
        'CustomerType': cust_type,
        'PaymentMode': pay_mode,
        'Year': year,
        'Month': month,
        'MonthName': month_name,
        'MonthYear': month_year,
        'Quarter': quarter,
        'QuarterYear': quarter_year,
        'DayOfWeek': day_of_week,
        'DayIndex': day_idx,
        'DayType': day_type,
        'GrossSales': round(gross_sales, 2),
        'DiscountAmount': round(discount_amount, 2),
        'NetRevenue': round(net_revenue, 2),
        'TotalCost': round(total_cost, 2),
        'Profit': round(profit, 2),
        'ProfitMargin': round(profit_margin, 2),
        'DiscountBand': discount_band
    })

print(f"Data validation: nulls: {dict(null_counts)}")
print(f"Customer Types: {dict(customer_types)}")
print(f"Payment Modes: {dict(payment_modes)}")
print(f"Date range: {min(dates).strftime('%Y-%m-%d')} to {max(dates).strftime('%Y-%m-%d')}")

# Save cleaned json for quick inspection and export
with open('cleaned_sales.json', 'w', encoding='utf-8') as f:
    json.dump(cleaned_records, f, indent=2)

print("Cleaned JSON written successfully.")
