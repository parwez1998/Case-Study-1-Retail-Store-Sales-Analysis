with open("app.js", "r", encoding="utf-8") as f:
    lines = f.readlines()

for i, l in enumerate(lines):
    if "goToSlide" in l or "renderSlideCharts" in l:
        print(f"{i+1}: {l.strip()}")
