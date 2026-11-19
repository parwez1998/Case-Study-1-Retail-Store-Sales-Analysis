import json

with open('cleaned_sales.json', 'r', encoding='utf-8') as f:
    sales = json.load(f)

# Compact format for maximum speed and clean embedding
with open('data.js', 'w', encoding='utf-8') as f:
    f.write('window.RAW_SALES_DATA = ')
    json.dump(sales, f)
    f.write(';\n')

print(f"data.js written with {len(sales)} records.")
