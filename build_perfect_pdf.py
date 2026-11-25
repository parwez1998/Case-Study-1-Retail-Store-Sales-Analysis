import subprocess, os, tempfile

temp_dir = tempfile.mkdtemp()
chrome_exe = r'C:\Program Files\Google\Chrome\Application\chrome.exe'

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

print_style = """
<style>
@page {
  size: 16in 9in;
  margin: 0;
}
* {
  -webkit-print-color-adjust: exact !important;
  print-color-adjust: exact !important;
}
html, body {
  width: 16in !important;
  height: auto !important;
  overflow: visible !important;
  background: #FFFFFF !important;
  margin: 0 !important;
  padding: 0 !important;
}
#app-header, #app-footer, .header-right-controls, .slide-counter-badge, #slide-progress-bar-container {
  display: none !important;
}
#presentation-viewport {
  display: block !important;
  padding: 0 !important;
  margin: 0 !important;
  overflow: visible !important;
  background: #FFFFFF !important;
}
.deck-container {
  width: 16in !important;
  height: auto !important;
  max-width: none !important;
  aspect-ratio: auto !important;
  box-shadow: none !important;
  border-radius: 0 !important;
  overflow: visible !important;
  display: block !important;
  margin: 0 !important;
  background: #FFFFFF !important;
}
.slide {
  position: relative !important;
  width: 16in !important;
  height: 9in !important;
  max-height: 9in !important;
  min-height: 9in !important;
  opacity: 1 !important;
  visibility: visible !important;
  display: flex !important;
  flex-direction: column !important;
  page-break-after: always !important;
  break-after: page !important;
  overflow: hidden !important;
  box-sizing: border-box !important;
  padding: 0.5in 0.75in 0.45in 0.75in !important;
  background: #FFFFFF !important;
  transform: none !important;
}
#slide-1 {
  padding: 0.4in !important;
}
.slide-title-layout {
  height: 100% !important;
  box-sizing: border-box !important;
}
</style>
"""

print_script = """
<script>
window.addEventListener('load', function() {
  setTimeout(function() {
    console.log('Rendering all slide charts for PDF export...');
    if (typeof window.renderSlideCharts === 'function') {
      for (var i = 1; i <= 16; i++) {
        window.renderSlideCharts(i);
      }
    }
    if (typeof window.updateDashboard === 'function') {
      window.updateDashboard();
    }
    console.log('All slide charts rendered successfully for PDF export.');
  }, 400);
});
</script>
"""

html_print = html.replace('</head>', print_style + '</head>').replace('</body>', print_script + '</body>')

test_print_html = os.path.abspath('temp_perfect_print.html')
out_pdf = os.path.abspath('FashionWave_Retail_Analytics_Presentation.pdf')

with open(test_print_html, 'w', encoding='utf-8') as f:
    f.write(html_print)

u_dir = os.path.join(temp_dir, 'Chrome')
os.makedirs(u_dir, exist_ok=True)

cmd = [
    chrome_exe,
    '--headless',
    '--disable-gpu',
    '--no-sandbox',
    '--run-all-compositor-stages-before-draw',
    '--virtual-time-budget=6000',
    f'--user-data-dir={u_dir}',
    f'--print-to-pdf={out_pdf}',
    test_print_html
]

print("Executing Chrome headless print-to-pdf...")
res = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
print('Chrome returncode:', res.returncode)
print('PDF exists:', os.path.exists(out_pdf))
if os.path.exists(out_pdf):
    size_bytes = os.path.getsize(out_pdf)
    print(f'PDF Size: {size_bytes / 1024:.1f} KB ({size_bytes} bytes)')
    with open(out_pdf, 'rb') as f:
        pdf_bytes = f.read()
    page_count = pdf_bytes.count(b'/Page\n') + pdf_bytes.count(b'/Page ') + pdf_bytes.count(b'/Page/')
    print(f'Approximate PDF Pages: {page_count}')

if os.path.exists(test_print_html):
    os.remove(test_print_html)
