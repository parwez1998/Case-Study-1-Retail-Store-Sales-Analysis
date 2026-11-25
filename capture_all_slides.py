import subprocess, os, tempfile

temp_dir = tempfile.mkdtemp()
chrome_exe = r'C:\Program Files\Google\Chrome\Application\chrome.exe'

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

os.makedirs('slide_screenshots', exist_ok=True)

for slide_num in range(1, 17):
    script_inject = f"""
    <script>
    window.addEventListener('load', function() {{
        setTimeout(function() {{
            if (typeof goToSlide === 'function') {{
                goToSlide({slide_num});
            }}
        }}, 350);
    }});
    </script>
    """
    html_mod = html.replace('</body>', script_inject + '</body>')
    tmp_html = os.path.abspath(f'temp_s{slide_num}.html')
    with open(tmp_html, 'w', encoding='utf-8') as f:
        f.write(html_mod)

    out_png = os.path.abspath(f'slide_screenshots/slide_{slide_num:02d}.png')
    u_dir = os.path.join(temp_dir, f'Chrome_{slide_num}')
    cmd = [
        chrome_exe,
        '--headless',
        '--disable-gpu',
        '--no-sandbox',
        '--window-size=1600,900',
        '--virtual-time-budget=3000',
        f'--user-data-dir={u_dir}',
        f'--screenshot={out_png}',
        tmp_html
    ]
    subprocess.run(cmd, capture_output=True, text=True, timeout=15)
    if os.path.exists(tmp_html):
        os.remove(tmp_html)
    print(f"Slide {slide_num:02d} captured: {os.path.exists(out_png)}")

print("All slides captured successfully.")
