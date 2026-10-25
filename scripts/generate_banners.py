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
    factory = qrcode.image.svg.SvgPathImage
    img = qrcode.make(data_url, image_factory=factory, box_size=box_size, border=1)
    svg_str = img.to_string(encoding="unicode")
    if "<?xml" in svg_str:
        svg_str = svg_str[svg_str.find("<svg"):]
    import re
    svg_str = re.sub(r'width="[^"]+"', 'width="100%"', svg_str, count=1)
    svg_str = re.sub(r'height="[^"]+"', 'height="100%"', svg_str, count=1)
    return svg_str

def build_horizontal_banner(icon_b64, qr_svg):
    return f"""<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="UTF-8">
  <title>Lalmai Upozila Rent A Car - Official Banner</title>
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
      background: #EFF6FF;
      color: #0F172A;
      display: flex;
      flex-direction: row;
      align-items: stretch;
      padding: 0;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }}

    /* Left: Deep vivid royal blue brand side */
    .brand-side {{
      flex: 1.15;
      background: linear-gradient(145deg, #1D4ED8 0%, #2563EB 55%, #3B82F6 100%);
      color: #FFFFFF;
      padding: 45mm 42mm;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      position: relative;
      box-shadow: 10mm 0 30mm rgba(15, 23, 42, 0.15);
      z-index: 5;
    }}

    .logo-container {{
      display: flex;
      align-items: center;
      gap: 12mm;
      margin-bottom: 10mm;
    }}

    .app-icon {{
      width: 44mm;
      height: 44mm;
      border-radius: 12mm;
      border: 2.5mm solid rgba(255, 255, 255, 0.95);
      box-shadow: 0 6mm 18mm rgba(0, 0, 0, 0.25);
      background: #FFFFFF;
      object-fit: cover;
    }}

    .pill-badge {{
      display: inline-block;
      background: rgba(255, 255, 255, 0.18);
      border: 0.8mm solid rgba(255, 255, 255, 0.4);
      padding: 2.5mm 9mm;
      border-radius: 999mm;
      font-size: 7.5mm;
      font-weight: 700;
      color: #FFFFFF;
      text-transform: uppercase;
      letter-spacing: 0.8mm;
    }}

    .title-bn {{
      font-size: 26mm;
      font-weight: 800;
      line-height: 1.15;
      color: #FFFFFF;
      margin-top: 6mm;
      text-shadow: 0 3mm 8mm rgba(0, 0, 0, 0.2);
    }}

    .title-en {{
      font-size: 16mm;
      font-weight: 800;
      letter-spacing: 1.2mm;
      color: #DBEAFE;
      text-transform: uppercase;
      margin-top: 2mm;
    }}

    .app-subtitle-bn {{
      font-size: 11mm;
      font-weight: 600;
      color: #EFF6FF;
      margin-top: 7mm;
      line-height: 1.3;
    }}

    .app-subtitle-en {{
      font-size: 8mm;
      font-weight: 500;
      color: #BFDBFE;
      margin-top: 1.5mm;
      text-transform: uppercase;
      letter-spacing: 0.6mm;
    }}

    .brand-bottom {{
      border-top: 1mm solid rgba(255, 255, 255, 0.25);
      padding-top: 8mm;
      display: flex;
      flex-direction: column;
      gap: 3mm;
    }}

    .trust-tag-bn {{
      font-size: 8mm;
      font-weight: 700;
      color: #FFFFFF;
      display: flex;
      align-items: center;
      gap: 3mm;
    }}

    .trust-tag-en {{
      font-size: 6.5mm;
      font-weight: 600;
      color: #BFDBFE;
      letter-spacing: 0.4mm;
    }}

    /* Right: Crisp white QR download card */
    .qr-side {{
      flex: 1.05;
      background: #F1F5F9;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 30mm 40mm;
      z-index: 1;
    }}

    .qr-card-container {{
      width: 100%;
      background: #FFFFFF;
      border: 2mm solid #E2E8F0;
      border-radius: 20mm;
      box-shadow: 0 16mm 40mm rgba(15, 23, 42, 0.08);
      padding: 16mm 20mm 16mm;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
    }}

    .qr-frame {{
      background: #FFFFFF;
      padding: 6mm;
      border: 2mm solid #CBD5E1;
      border-radius: 12mm;
      box-shadow: 0 4mm 16mm rgba(0, 0, 0, 0.05);
      margin-bottom: 7mm;
      display: inline-block;
    }}

    .qr-frame svg {{
      width: 175mm;
      height: 175mm;
      display: block;
    }}

    .scan-title-en {{
      font-size: 9mm;
      font-weight: 800;
      color: #0F172A;
      letter-spacing: -0.2mm;
    }}

    .scan-title-bn {{
      font-size: 9.5mm;
      font-weight: 700;
      color: #1D4ED8;
      margin-top: 1mm;
      line-height: 1.3;
    }}

    .scan-desc-en {{
      font-size: 5.5mm;
      font-weight: 500;
      color: #64748B;
      margin-top: 3mm;
    }}

    .scan-desc-bn {{
      font-size: 6.5mm;
      font-weight: 600;
      color: #475569;
      margin-top: 1mm;
    }}

    .link-pill {{
      width: 100%;
      background: #EFF6FF;
      border: 1mm solid #BFDBFE;
      border-radius: 6mm;
      padding: 3.5mm 5mm;
      margin-top: 6mm;
      display: flex;
      align-items: center;
      justify-content: center;
    }}

    .link-text {{
      font-size: 4.8mm;
      font-weight: 700;
      color: #1D4ED8;
      font-family: 'Plus Jakarta Sans', monospace;
      word-break: break-all;
    }}

    .footer-note {{
      font-size: 5mm;
      font-weight: 600;
      color: #64748B;
      margin-top: 4mm;
    }}
  </style>
</head>
<body>

  <!-- Left: Brand Identity -->
  <div class="brand-side">
    <div class="brand-top">
      <div class="logo-container">
        {"<img src='" + icon_b64 + "' class='app-icon' alt='App Icon' />" if icon_b64 else ""}
        <div class="pill-badge">OFFICIAL ANDROID APPLICATION</div>
      </div>
      <div class="title-bn">লালমাই উপজেলা রেন্ট এ কার</div>
      <div class="title-en">Lalmai Upozila Rent A Car</div>
      <div class="app-subtitle-bn">অফিসিয়াল অ্যান্ড্রয়েড মোবাইল অ্যাপ্লিকেশন</div>
      <div class="app-subtitle-en">Official Mobile Application for Drivers & Members</div>
    </div>

    <div class="brand-bottom">
      <div class="trust-tag-bn">✓ স্থায়ী লিংক • স্বয়ংক্রিয় আপডেট • ১০০% নিরাপদ ও ভেরিফাইড</div>
      <div class="trust-tag-en">Permanent Link • Auto Updates • 100% Safe & Verified</div>
    </div>
  </div>

  <!-- Right: QR Code Scanner Card -->
  <div class="qr-side">
    <div class="qr-card-container">
      <div class="qr-frame">
        {qr_svg}
      </div>

      <div class="scan-title-en">Scan to Download APK Directly</div>
      <div class="scan-title-bn">সরাসরি অ্যাপ ডাউনলোড করতে স্ক্যান করুন</div>
      
      <div class="scan-desc-en">Point your phone camera or QR scanner at the code</div>
      <div class="scan-desc-bn">আপনার ফোনের ক্যামেরা অথবা কিউআর স্ক্যানার দিয়ে স্ক্যান করুন</div>

      <div class="link-pill">
        <span class="link-text">{URL}</span>
      </div>

      <div class="footer-note">Scan with any Android phone camera or Google Lens to install</div>
    </div>
  </div>

</body>
</html>
"""

def build_vertical_banner(icon_b64, qr_svg):
    return f"""<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="UTF-8">
  <title>Lalmai Upozila Rent A Car - Vertical Standee Banner</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@500;600;700;800;900&display=swap');

    @page {{
      size: 800mm 1600mm;
      margin: 0;
    }}

    * {{
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }}

    body {{
      width: 800mm;
      height: 1600mm;
      overflow: hidden;
      font-family: 'Plus Jakarta Sans', 'Hind Siliguri', 'Nirmala UI', sans-serif;
      background: #F1F5F9;
      color: #0F172A;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: space-between;
      padding: 0;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }}

    /* Top Blue Banner */
    .top-banner {{
      width: 100%;
      background: linear-gradient(155deg, #1D4ED8 0%, #2563EB 55%, #3B82F6 100%);
      color: #FFFFFF;
      padding: 38mm 40mm 30mm;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      box-shadow: 0 15mm 40mm rgba(15, 23, 42, 0.15);
      border-radius: 0 0 32mm 32mm;
    }}

    .app-icon {{
      width: 50mm;
      height: 50mm;
      border-radius: 14mm;
      border: 3mm solid rgba(255, 255, 255, 0.95);
      box-shadow: 0 8mm 25mm rgba(0, 0, 0, 0.3);
      background: #FFFFFF;
      margin-bottom: 8mm;
      object-fit: cover;
    }}

    .pill-badge {{
      display: inline-block;
      background: rgba(255, 255, 255, 0.18);
      border: 1mm solid rgba(255, 255, 255, 0.4);
      padding: 3mm 12mm;
      border-radius: 999mm;
      font-size: 9.5mm;
      font-weight: 700;
      color: #FFFFFF;
      text-transform: uppercase;
      letter-spacing: 1mm;
      margin-bottom: 6mm;
    }}

    .title-bn {{
      font-size: 32mm;
      font-weight: 800;
      line-height: 1.15;
      color: #FFFFFF;
      text-shadow: 0 4mm 10mm rgba(0, 0, 0, 0.25);
    }}

    .title-en {{
      font-size: 20mm;
      font-weight: 800;
      letter-spacing: 1.5mm;
      color: #DBEAFE;
      text-transform: uppercase;
      margin-top: 3mm;
    }}

    .sub-title-bn {{
      font-size: 13.5mm;
      font-weight: 600;
      color: #EFF6FF;
      margin-top: 6mm;
    }}

    .sub-title-en {{
      font-size: 10mm;
      font-weight: 500;
      color: #BFDBFE;
      margin-top: 2mm;
      text-transform: uppercase;
      letter-spacing: 0.8mm;
    }}

    /* Center White Card */
    .center-card {{
      width: 86%;
      background: #FFFFFF;
      border: 3mm solid #E2E8F0;
      border-radius: 28mm;
      box-shadow: 0 20mm 50mm rgba(15, 23, 42, 0.08);
      padding: 22mm 24mm 20mm;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      margin: 10mm 0;
    }}

    .qr-frame {{
      background: #FFFFFF;
      padding: 8mm;
      border: 3mm solid #CBD5E1;
      border-radius: 16mm;
      box-shadow: 0 6mm 20mm rgba(0, 0, 0, 0.06);
      margin-bottom: 10mm;
      display: inline-block;
    }}

    .qr-frame svg {{
      width: 230mm;
      height: 230mm;
      display: block;
    }}

    .scan-title-en {{
      font-size: 13.5mm;
      font-weight: 800;
      color: #0F172A;
      letter-spacing: -0.3mm;
    }}

    .scan-title-bn {{
      font-size: 14.5mm;
      font-weight: 700;
      color: #1D4ED8;
      margin-top: 2mm;
      line-height: 1.3;
    }}

    .scan-desc-en {{
      font-size: 8mm;
      font-weight: 500;
      color: #64748B;
      margin-top: 4mm;
    }}

    .scan-desc-bn {{
      font-size: 9mm;
      font-weight: 600;
      color: #475569;
      margin-top: 1.5mm;
    }}

    .link-pill {{
      width: 100%;
      background: #EFF6FF;
      border: 1.2mm solid #BFDBFE;
      border-radius: 8mm;
      padding: 4.5mm 6mm;
      margin-top: 8mm;
      display: flex;
      align-items: center;
      justify-content: center;
    }}

    .link-text {{
      font-size: 6.8mm;
      font-weight: 700;
      color: #1D4ED8;
      font-family: 'Plus Jakarta Sans', monospace;
      word-break: break-all;
    }}

    /* Bottom Trust Bar */
    .bottom-bar {{
      width: 100%;
      padding: 12mm 30mm 16mm;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 3mm;
    }}

    .trust-bn {{
      font-size: 9.5mm;
      font-weight: 700;
      color: #1E293B;
    }}

    .trust-en {{
      font-size: 8mm;
      font-weight: 600;
      color: #64748B;
      letter-spacing: 0.5mm;
    }}
  </style>
</head>
<body>

  <!-- Top Banner -->
  <div class="top-banner">
    {"<img src='" + icon_b64 + "' class='app-icon' alt='App Icon' />" if icon_b64 else ""}
    <div class="pill-badge">OFFICIAL ANDROID APPLICATION</div>
    <div class="title-bn">লালমাই উপজেলা রেন্ট এ কার</div>
    <div class="title-en">Lalmai Upozila Rent A Car</div>
    <div class="sub-title-bn">অফিসিয়াল অ্যান্ড্রয়েড মোবাইল অ্যাপ্লিকেশন</div>
    <div class="sub-title-en">Official Mobile Application</div>
  </div>

  <!-- Center Card -->
  <div class="center-card">
    <div class="qr-frame">
      {qr_svg}
    </div>

    <div class="scan-title-en">Scan to Download APK Directly</div>
    <div class="scan-title-bn">সরাসরি অ্যাপ ডাউনলোড করতে স্ক্যান করুন</div>
    
    <div class="scan-desc-en">Point your phone camera or QR scanner at the code</div>
    <div class="scan-desc-bn">আপনার ফোনের ক্যামেরা অথবা কিউআর স্ক্যানার দিয়ে স্ক্যান করুন</div>

    <div class="link-pill">
      <span class="link-text">{URL}</span>
    </div>
  </div>

  <!-- Bottom Trust Bar -->
  <div class="bottom-bar">
    <div class="trust-bn">✓ স্থায়ী লিঙ্ক • স্বয়ংক্রিয় আপডেট • ১০০% নিরাপদ ও ভেরিফাইড</div>
    <div class="trust-en">Permanent Link • Auto Updates • Safe & Verified</div>
  </div>

</body>
</html>
"""

def main():
    icon_b64 = get_base64_image(os.path.join(WORKSPACE, "assets", "images", "icon.png"))
    qr_svg_hz = generate_svg_qr(URL, box_size=10)
    qr_svg_vt = generate_svg_qr(URL, box_size=12)

    edge_exe = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
    if not os.path.exists(edge_exe):
        edge_exe = r"C:\Program Files\Microsoft\Edge\Application\msedge.exe"

    temp_profile = os.path.abspath(os.path.join(WORKSPACE, ".edge_banner_profile"))

    # 1. HORIZONTAL BANNER (1200mm x 600mm / 4ft x 2ft)
    hz_html = build_horizontal_banner(icon_b64, qr_svg_hz)
    hz_html_file = os.path.join(WORKSPACE, "temp_banner_hz.html")
    hz_pdf_file = os.path.join(WORKSPACE, "Lalmai_Rent_Car_Banner_Horizontal.pdf")

    with open(hz_html_file, "w", encoding="utf-8") as f:
        f.write(hz_html)

    print("Generating Clean Horizontal Banner PDF (1200mm x 600mm)...", flush=True)
    subprocess.run([
        edge_exe,
        "--headless",
        "--disable-gpu",
        f"--user-data-dir={temp_profile}",
        "--print-to-pdf-no-header",
        f"--print-to-pdf={hz_pdf_file}",
        f"file:///{hz_html_file.replace(os.sep, '/')}"
    ])

    # 2. VERTICAL BANNER (800mm x 1600mm / 2.5ft x 5ft)
    vt_html = build_vertical_banner(icon_b64, qr_svg_vt)
    vt_html_file = os.path.join(WORKSPACE, "temp_banner_vt.html")
    vt_pdf_file = os.path.join(WORKSPACE, "Lalmai_Rent_Car_Banner_Rollup.pdf")

    with open(vt_html_file, "w", encoding="utf-8") as f:
        f.write(vt_html)

    print("Generating Clean Vertical Standee Banner PDF (800mm x 1600mm)...", flush=True)
    subprocess.run([
        edge_exe,
        "--headless",
        "--disable-gpu",
        f"--user-data-dir={temp_profile}",
        "--print-to-pdf-no-header",
        f"--print-to-pdf={vt_pdf_file}",
        f"file:///{vt_html_file.replace(os.sep, '/')}"
    ])

    # Cleanup temp files
    if os.path.exists(hz_html_file):
        os.remove(hz_html_file)
    if os.path.exists(vt_html_file):
        os.remove(vt_html_file)
    if os.path.exists(temp_profile):
        shutil.rmtree(temp_profile, ignore_errors=True)

    print("Finished generating clean banners successfully!", flush=True)

if __name__ == "__main__":
    main()
