import base64
import os
import subprocess
import shutil
import qrcode
import qrcode.image.svg

WORKSPACE = r"D:\Web Projects\Lalmai Rent Car Mobile Application"
URL = "https://github.com/Shopnil2001/lalmai-apk/raw/main/lalmai-rent-car.apk"

def get_base64_image(file_path):
    if os.path.exists(file_path):
        with open(file_path, "rb") as f:
            return "data:image/png;base64," + base64.b64encode(f.read()).decode("utf-8")
    return None

def generate_svg_qr(data_url, box_size=10):
    import re
    factory = qrcode.image.svg.SvgPathImage
    img = qrcode.make(data_url, image_factory=factory, box_size=box_size, border=1)
    svg_str = img.to_string(encoding="unicode")
    if "<?xml" in svg_str:
        svg_str = svg_str[svg_str.find("<svg"):]
    svg_str = re.sub(r'width="[^"]+"', 'width="100%"', svg_str, count=1)
    svg_str = re.sub(r'height="[^"]+"', 'height="100%"', svg_str, count=1)
    return svg_str

def build_horizontal_banner(icon_b64, qr_svg):
    return f"""<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="UTF-8">
  <title>Lalmai Rent Car - Horizontal Signboard Banner</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@500;600;700;800;900&display=swap');

    @page {{
      size: 1200mm 600mm;
      margin: 0;
    }}

    * {{
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }}

    body {{
      width: 1200mm;
      height: 600mm;
      overflow: hidden;
      font-family: 'Plus Jakarta Sans', 'Hind Siliguri', 'Nirmala UI', sans-serif;
      background: linear-gradient(135deg, #0A1E5C 0%, #153E90 35%, #1D4ED8 70%, #1E40AF 100%);
      color: #FFFFFF;
      position: relative;
      display: flex;
      flex-direction: row;
      align-items: stretch;
      padding: 30mm 40mm;
      gap: 30mm;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }}

    /* Decorative background shapes */
    .bg-circle-1 {{
      position: absolute;
      top: -120mm;
      left: -100mm;
      width: 450mm;
      height: 450mm;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(59, 130, 246, 0.3) 0%, rgba(29, 78, 216, 0) 70%);
      pointer-events: none;
    }}

    .bg-circle-2 {{
      position: absolute;
      bottom: -150mm;
      right: 100mm;
      width: 500mm;
      height: 500mm;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(234, 179, 8, 0.15) 0%, rgba(29, 78, 216, 0) 70%);
      pointer-events: none;
    }}

    /* Left Branding Column */
    .left-col {{
      flex: 1.35;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      z-index: 10;
    }}

    .brand-header {{
      display: flex;
      align-items: center;
      gap: 16mm;
    }}

    .app-logo {{
      width: 48mm;
      height: 48mm;
      border-radius: 12mm;
      border: 3mm solid rgba(255, 255, 255, 0.9);
      box-shadow: 0 10mm 25mm rgba(0, 0, 0, 0.4);
      background: #FFFFFF;
      object-fit: cover;
    }}

    .tagline-pill {{
      display: inline-block;
      background: rgba(255, 255, 255, 0.15);
      border: 1mm solid rgba(255, 255, 255, 0.3);
      padding: 2.5mm 10mm;
      border-radius: 999mm;
      font-size: 8.5mm;
      font-weight: 700;
      color: #FDE047;
      text-transform: uppercase;
      letter-spacing: 1.5mm;
      margin-bottom: 3mm;
    }}

    .main-title-bn {{
      font-size: 34mm;
      font-weight: 800;
      line-height: 1.1;
      color: #FFFFFF;
      text-shadow: 0 4mm 10mm rgba(0, 0, 0, 0.4);
      margin-top: 2mm;
    }}

    .main-title-en {{
      font-size: 20mm;
      font-weight: 900;
      letter-spacing: 2mm;
      color: #93C5FD;
      text-transform: uppercase;
      margin-top: 1mm;
      text-shadow: 0 2mm 6mm rgba(0, 0, 0, 0.3);
    }}

    .subtitle-row {{
      font-size: 11mm;
      font-weight: 600;
      color: #E2E8F0;
      margin-top: 4mm;
    }}

    /* Features Grid */
    .features-row {{
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8mm;
      margin: 10mm 0;
    }}

    .feat-card {{
      background: rgba(255, 255, 255, 0.1);
      border: 1mm solid rgba(255, 255, 255, 0.2);
      backdrop-filter: blur(10px);
      border-radius: 8mm;
      padding: 6mm 7mm;
      display: flex;
      flex-direction: column;
      gap: 2mm;
    }}

    .feat-icon {{
      font-size: 11mm;
    }}

    .feat-title-bn {{
      font-size: 7.5mm;
      font-weight: 700;
      color: #FFFFFF;
      line-height: 1.25;
    }}

    .feat-title-en {{
      font-size: 5mm;
      font-weight: 600;
      color: #93C5FD;
      text-transform: uppercase;
      letter-spacing: 0.5mm;
    }}

    /* Contact & Helpline Bar */
    .contact-bar {{
      background: rgba(15, 23, 42, 0.55);
      border: 1mm solid rgba(255, 255, 255, 0.25);
      border-radius: 9mm;
      padding: 5mm 12mm;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }}

    .contact-item {{
      display: flex;
      align-items: center;
      gap: 4mm;
    }}

    .contact-label {{
      font-size: 6.5mm;
      font-weight: 600;
      color: #CBD5E1;
    }}

    .contact-val {{
      font-size: 9mm;
      font-weight: 800;
      color: #FDE047;
      font-family: 'Plus Jakarta Sans', monospace;
    }}

    /* Right QR Column */
    .right-col {{
      flex: 0.85;
      background: #FFFFFF;
      color: #0F172A;
      border-radius: 20mm;
      box-shadow: 0 20mm 50mm rgba(0, 0, 0, 0.4);
      padding: 16mm 16mm;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: space-between;
      text-align: center;
      z-index: 10;
      border: 3mm solid #BFDBFE;
    }}

    .qr-badge-top {{
      background: #EFF6FF;
      border: 0.8mm solid #BFDBFE;
      color: #1D4ED8;
      font-size: 7mm;
      font-weight: 800;
      padding: 3mm 10mm;
      border-radius: 999mm;
      text-transform: uppercase;
      letter-spacing: 0.8mm;
    }}

    .qr-container {{
      background: #FFFFFF;
      padding: 6mm;
      border: 2mm solid #E2E8F0;
      border-radius: 12mm;
      box-shadow: 0 6mm 20mm rgba(0, 0, 0, 0.06);
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 4mm 0;
    }}

    .qr-container svg {{
      width: 170mm;
      height: 170mm;
      display: block;
    }}

    .qr-heading-bn {{
      font-size: 10.5mm;
      font-weight: 800;
      color: #0F172A;
      line-height: 1.25;
    }}

    .qr-heading-en {{
      font-size: 6.5mm;
      font-weight: 700;
      color: #1D4ED8;
      text-transform: uppercase;
      letter-spacing: 0.5mm;
      margin-top: 1mm;
    }}

    .qr-subtext {{
      font-size: 6mm;
      font-weight: 600;
      color: #64748B;
      margin-top: 1mm;
    }}

    .download-url-pill {{
      width: 100%;
      background: #F1F5F9;
      border: 0.8mm solid #CBD5E1;
      border-radius: 6mm;
      padding: 3mm 4mm;
      font-size: 4.5mm;
      font-weight: 700;
      color: #1E40AF;
      word-break: break-all;
      font-family: 'Plus Jakarta Sans', monospace;
      margin-top: 2mm;
    }}

    .trust-badges {{
      font-size: 5.5mm;
      font-weight: 700;
      color: #059669;
      margin-top: 1mm;
    }}
  </style>
</head>
<body>
  <div class="bg-circle-1"></div>
  <div class="bg-circle-2"></div>

  <!-- Left Branding & Information -->
  <div class="left-col">
    <div>
      <div class="brand-header">
        {"<img src='" + icon_b64 + "' class='app-logo' alt='App Logo' />" if icon_b64 else ""}
        <div>
          <div class="tagline-pill">লালমাই উপজেলা রেন্ট এ কার সমিতি</div>
          <div class="main-title-bn">লালমাই রেন্ট কার</div>
          <div class="main-title-en">LALMAI RENT CAR</div>
          <div class="subtitle-row">অফিসিয়াল অ্যান্ড্রয়েড মোবাইল অ্যাপ্লিকেশন • Official Android Application</div>
        </div>
      </div>

      <!-- Key Service Features -->
      <div class="features-row">
        <div class="feat-card">
          <div class="feat-icon">⚡</div>
          <div class="feat-title-bn">সহজ ও দ্রুত গাড়ি বুকিং</div>
          <div class="feat-title-en">Fast Car Booking</div>
        </div>
        <div class="feat-card">
          <div class="feat-icon">👥</div>
          <div class="feat-title-bn">মালিক ও চালক ডিরেক্টরি</div>
          <div class="feat-title-en">Member Directory</div>
        </div>
        <div class="feat-card">
          <div class="feat-icon">💳</div>
          <div class="feat-title-bn">ডিজিটাল ফি ও রিপোর্ট</div>
          <div class="feat-title-en">Dues & Reports</div>
        </div>
      </div>
    </div>

    <!-- Contact & Helpline Bar -->
    <div class="contact-bar">
      <div class="contact-item">
        <span class="contact-label">হটলাইন / কল:</span>
        <span class="contact-val">+880 1711-223344</span>
      </div>
      <div class="contact-item">
        <span class="contact-label">হোয়াটসঅ্যাপ:</span>
        <span class="contact-val">+880 1711-223344</span>
      </div>
      <div class="contact-item">
        <span class="contact-label">লোকেশন:</span>
        <span class="contact-val" style="color: #FFFFFF; font-family: inherit; font-size: 7.5mm;">বাগমারা, লালমাই, কুমিল্লা</span>
      </div>
    </div>
  </div>

  <!-- Right QR Code Scan Box -->
  <div class="right-col">
    <div class="qr-badge-top">অ্যাপ ডাউনলোড করুন • DOWNLOAD APP</div>
    
    <div class="qr-container">
      {qr_svg}
    </div>

    <div>
      <div class="qr-heading-bn">মোবাইল দিয়ে স্ক্যান করুন</div>
      <div class="qr-heading-en">SCAN TO DOWNLOAD APK</div>
      <div class="qr-subtext">ক্যামেরা বা কিউআর স্ক্যানার দিয়ে সরাসরি অ্যাপটি ইনস্টল করুন</div>
      <div class="download-url-pill">{URL}</div>
      <div class="trust-badges">✓ স্থায়ী লিংক • ✓ অটো আপডেট • ✓ ১০০% নিরাপদ</div>
    </div>
  </div>

</body>
</html>
"""

def build_rollup_banner(icon_b64, qr_svg):
    return f"""<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="UTF-8">
  <title>Lalmai Rent Car - Roll-up Standee Festoon Banner</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@500;600;700;800;900&display=swap');

    @page {{
      size: 800mm 1800mm;
      margin: 0;
    }}

    * {{
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }}

    body {{
      width: 800mm;
      height: 1800mm;
      overflow: hidden;
      font-family: 'Plus Jakarta Sans', 'Hind Siliguri', 'Nirmala UI', sans-serif;
      background: linear-gradient(180deg, #0A1E5C 0%, #153E90 25%, #1D4ED8 65%, #0F2D80 100%);
      color: #FFFFFF;
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: space-between;
      padding: 50mm 40mm;
      text-align: center;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }}

    /* Top Logo & Title */
    .top-section {{
      display: flex;
      flex-direction: column;
      align-items: center;
    }}

    .app-logo {{
      width: 70mm;
      height: 70mm;
      border-radius: 18mm;
      border: 4mm solid rgba(255, 255, 255, 0.9);
      box-shadow: 0 12mm 30mm rgba(0, 0, 0, 0.4);
      background: #FFFFFF;
      margin-bottom: 12mm;
    }}

    .tag-pill {{
      background: rgba(255, 255, 255, 0.15);
      border: 1.5mm solid rgba(255, 255, 255, 0.3);
      padding: 4mm 16mm;
      border-radius: 999mm;
      font-size: 11mm;
      font-weight: 700;
      color: #FDE047;
      text-transform: uppercase;
      letter-spacing: 2mm;
      margin-bottom: 6mm;
    }}

    .title-bn {{
      font-size: 46mm;
      font-weight: 800;
      line-height: 1.1;
      color: #FFFFFF;
      text-shadow: 0 6mm 15mm rgba(0, 0, 0, 0.5);
    }}

    .title-en {{
      font-size: 26mm;
      font-weight: 900;
      letter-spacing: 3mm;
      color: #93C5FD;
      text-transform: uppercase;
      margin-top: 3mm;
    }}

    .subtitle-text {{
      font-size: 14mm;
      font-weight: 600;
      color: #E2E8F0;
      margin-top: 6mm;
    }}

    /* Center QR Card */
    .qr-card {{
      width: 100%;
      background: #FFFFFF;
      color: #0F172A;
      border-radius: 28mm;
      padding: 24mm 20mm;
      box-shadow: 0 25mm 60mm rgba(0, 0, 0, 0.45);
      border: 4mm solid #BFDBFE;
      display: flex;
      flex-direction: column;
      align-items: center;
    }}

    .qr-badge {{
      background: #EFF6FF;
      border: 1.2mm solid #BFDBFE;
      color: #1D4ED8;
      font-size: 11mm;
      font-weight: 800;
      padding: 4mm 14mm;
      border-radius: 999mm;
      text-transform: uppercase;
      margin-bottom: 12mm;
    }}

    .qr-box {{
      background: #FFFFFF;
      padding: 8mm;
      border: 3mm solid #E2E8F0;
      border-radius: 16mm;
      box-shadow: 0 8mm 25mm rgba(0, 0, 0, 0.08);
      margin-bottom: 12mm;
    }}

    .qr-box svg {{
      width: 250mm;
      height: 250mm;
      display: block;
    }}

    .scan-title-bn {{
      font-size: 18mm;
      font-weight: 800;
      color: #0F172A;
      line-height: 1.25;
    }}

    .scan-title-en {{
      font-size: 11mm;
      font-weight: 700;
      color: #1D4ED8;
      text-transform: uppercase;
      letter-spacing: 1mm;
      margin-top: 2mm;
    }}

    .scan-desc {{
      font-size: 10mm;
      font-weight: 600;
      color: #64748B;
      margin-top: 4mm;
    }}

    .url-box {{
      width: 100%;
      background: #F1F5F9;
      border: 1.2mm solid #CBD5E1;
      border-radius: 8mm;
      padding: 5mm 6mm;
      font-size: 6.5mm;
      font-weight: 700;
      color: #1E40AF;
      word-break: break-all;
      font-family: 'Plus Jakarta Sans', monospace;
      margin-top: 8mm;
    }}

    .trust-tag {{
      font-size: 8.5mm;
      font-weight: 700;
      color: #059669;
      margin-top: 6mm;
    }}

    /* Bottom Contact Bar */
    .bottom-section {{
      width: 100%;
      background: rgba(15, 23, 42, 0.6);
      border: 1.5mm solid rgba(255, 255, 255, 0.25);
      border-radius: 14mm;
      padding: 10mm 16mm;
      display: flex;
      flex-direction: column;
      gap: 4mm;
    }}

    .hotline-row {{
      display: flex;
      justify-content: space-between;
      align-items: center;
    }}

    .hl-label {{
      font-size: 10mm;
      font-weight: 600;
      color: #CBD5E1;
    }}

    .hl-val {{
      font-size: 13mm;
      font-weight: 800;
      color: #FDE047;
      font-family: 'Plus Jakarta Sans', monospace;
    }}

    .loc-text {{
      font-size: 9.5mm;
      font-weight: 600;
      color: #FFFFFF;
      border-top: 1mm solid rgba(255, 255, 255, 0.15);
      padding-top: 4mm;
    }}
  </style>
</head>
<body>

  <!-- Top Branding -->
  <div class="top-section">
    {"<img src='" + icon_b64 + "' class='app-logo' alt='App Logo' />" if icon_b64 else ""}
    <div class="tag-pill">লালমাই উপজেলা রেন্ট এ কার সমিতি</div>
    <div class="title-bn">লালমাই রেন্ট কার</div>
    <div class="title-en">LALMAI RENT CAR</div>
    <div class="subtitle-text">অফিসিয়াল অ্যান্ড্রয়েড মোবাইল অ্যাপ • Official Mobile Application</div>
  </div>

  <!-- Center QR Card -->
  <div class="qr-card">
    <div class="qr-badge">সরাসরি অ্যাপ ডাউনলোড • DOWNLOAD APP</div>

    <div class="qr-box">
      {qr_svg}
    </div>

    <div class="scan-title-bn">মোবাইল দিয়ে স্ক্যান করুন</div>
    <div class="scan-title-en">Scan To Download APK Directly</div>
    <div class="scan-desc">আপনার ফোনের ক্যামেরা দিয়ে কিউআর কোড স্ক্যান করে ইনস্টল করুন</div>
    <div class="url-box">{URL}</div>
    <div class="trust-tag">✓ স্থায়ী লিঙ্ক • ✓ অটো আপডেট • ✓ ১০০% নিরাপদ ও ভেরিফাইড</div>
  </div>

  <!-- Bottom Helpline -->
  <div class="bottom-section">
    <div class="hotline-row">
      <span class="hl-label">হটলাইন / কল:</span>
      <span class="hl-val">+880 1711-223344</span>
    </div>
    <div class="hotline-row">
      <span class="hl-label">হোয়াটসঅ্যাপ:</span>
      <span class="hl-val">+880 1711-223344</span>
    </div>
    <div class="loc-text">অফিস: বাগমারা বাজার, লালমাই, কুমিল্লা</div>
  </div>

</body>
</html>
"""

def main():
    icon_b64 = get_base64_image(os.path.join(WORKSPACE, "assets", "images", "icon.png"))
    qr_svg_hz = generate_svg_qr(URL, box_size=10)
    qr_svg_ru = generate_svg_qr(URL, box_size=12)

    edge_exe = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
    if not os.path.exists(edge_exe):
        edge_exe = r"C:\Program Files\Microsoft\Edge\Application\msedge.exe"

    temp_profile = os.path.abspath(os.path.join(WORKSPACE, ".edge_banner_profile"))

    # 1. HORIZONTAL BANNER (1200mm x 600mm / 4ft x 2ft)
    hz_html = build_horizontal_banner(icon_b64, qr_svg_hz)
    hz_html_file = os.path.join(WORKSPACE, "temp_banner_hz.html")
    hz_pdf_file = os.path.join(WORKSPACE, "Lalmai_Rent_Car_Banner_Horizontal.pdf")
    hz_png_file = os.path.join(WORKSPACE, "Lalmai_Rent_Car_Banner_Horizontal.png")

    with open(hz_html_file, "w", encoding="utf-8") as f:
        f.write(hz_html)

    print("Generating Horizontal Banner PDF (1200mm x 600mm)...", flush=True)
    subprocess.run([
        edge_exe,
        "--headless",
        "--disable-gpu",
        f"--user-data-dir={temp_profile}",
        "--print-to-pdf-no-header",
        f"--print-to-pdf={hz_pdf_file}",
        f"file:///{hz_html_file.replace(os.sep, '/')}"
    ])

    print("Generating Horizontal Banner PNG preview...", flush=True)
    subprocess.run([
        edge_exe,
        "--headless",
        "--disable-gpu",
        f"--user-data-dir={temp_profile}",
        "--window-size=2400,1200",
        f"--screenshot={hz_png_file}",
        f"file:///{hz_html_file.replace(os.sep, '/')}"
    ])

    # 2. ROLLUP BANNER (800mm x 1800mm / 2.5ft x 6ft)
    ru_html = build_rollup_banner(icon_b64, qr_svg_ru)
    ru_html_file = os.path.join(WORKSPACE, "temp_banner_ru.html")
    ru_pdf_file = os.path.join(WORKSPACE, "Lalmai_Rent_Car_Banner_Rollup.pdf")
    ru_png_file = os.path.join(WORKSPACE, "Lalmai_Rent_Car_Banner_Rollup.png")

    with open(ru_html_file, "w", encoding="utf-8") as f:
        f.write(ru_html)

    print("Generating Roll-up Standee Banner PDF (800mm x 1800mm)...", flush=True)
    subprocess.run([
        edge_exe,
        "--headless",
        "--disable-gpu",
        f"--user-data-dir={temp_profile}",
        "--print-to-pdf-no-header",
        f"--print-to-pdf={ru_pdf_file}",
        f"file:///{ru_html_file.replace(os.sep, '/')}"
    ])

    print("Generating Roll-up Standee Banner PNG preview...", flush=True)
    subprocess.run([
        edge_exe,
        "--headless",
        "--disable-gpu",
        f"--user-data-dir={temp_profile}",
        "--window-size=1200,2700",
        f"--screenshot={ru_png_file}",
        f"file:///{ru_html_file.replace(os.sep, '/')}"
    ])

    # Cleanup temp files
    if os.path.exists(hz_html_file):
        os.remove(hz_html_file)
    if os.path.exists(ru_html_file):
        os.remove(ru_html_file)
    if os.path.exists(temp_profile):
        shutil.rmtree(temp_profile, ignore_errors=True)

    print("Finished generating banners successfully!", flush=True)
    if os.path.exists(hz_pdf_file):
        print(f"Horizontal Banner PDF: {hz_pdf_file} ({os.path.getsize(hz_pdf_file)} bytes)")
    if os.path.exists(ru_pdf_file):
        print(f"Roll-up Banner PDF: {ru_pdf_file} ({os.path.getsize(ru_pdf_file)} bytes)")

if __name__ == "__main__":
    main()
