import base64
import os
import subprocess
import qrcode
import qrcode.image.svg

WORKSPACE = r"D:\Web Projects\Lalmai Rent Car Mobile Application"
URL = "https://github.com/Shopnil2001/lalmai-apk/raw/main/lalmai-rent-car.apk"

def get_base64_image(file_path):
    if os.path.exists(file_path):
        with open(file_path, "rb") as f:
            return "data:image/png;base64," + base64.b64encode(f.read()).decode("utf-8")
    return None

def generate_svg_qr(data_url):
    factory = qrcode.image.svg.SvgPathImage
    img = qrcode.make(data_url, image_factory=factory, box_size=10, border=1)
    svg_str = img.to_string(encoding="unicode")
    # Clean up XML declaration if present
    if "<?xml" in svg_str:
        svg_str = svg_str[svg_str.find("<svg"):]
    return svg_str

def main():
    icon_b64 = get_base64_image(os.path.join(WORKSPACE, "assets", "images", "icon.png"))
    logo_b64 = get_base64_image(os.path.join(WORKSPACE, "assets", "images", "logo.png"))
    qr_svg = generate_svg_qr(URL)

    html_content = f"""<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="UTF-8">
  <title>Lalmai Rent Car - App Download Flyer</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap');

    @page {{
      size: A4 portrait;
      margin: 0;
    }}

    * {{
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }}

    body {{
      font-family: 'Plus Jakarta Sans', 'Hind Siliguri', 'Nirmala UI', -apple-system, sans-serif;
      background: #F1F6FD;
      color: #0F172A;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 30px 20px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }}

    .flyer-wrapper {{
      width: 100%;
      max-width: 580px;
      box-shadow: 0 25px 60px -15px rgba(29, 78, 216, 0.25);
      border-radius: 32px;
      overflow: hidden;
      background: #FFFFFF;
      border: 1px solid #DBEAFE;
    }}

    /* Top Blue Banner */
    .header-banner {{
      background: linear-gradient(135deg, #1E40AF 0%, #2563EB 50%, #3B82F6 100%);
      color: #FFFFFF;
      text-align: center;
      padding: 36px 32px 28px;
      position: relative;
    }}

    .logo-container {{
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 14px;
      margin-bottom: 12px;
    }}

    .app-icon {{
      width: 60px;
      height: 60px;
      border-radius: 16px;
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.25);
      border: 2px solid rgba(255, 255, 255, 0.8);
      object-fit: cover;
    }}

    .title-en {{
      font-size: 28px;
      font-weight: 800;
      letter-spacing: -0.5px;
      line-height: 1.15;
      color: #FFFFFF;
      text-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    }}

    .title-bn {{
      font-size: 24px;
      font-weight: 700;
      color: #EFF6FF;
      margin-top: 4px;
      line-height: 1.2;
    }}

    .subtitle-badge {{
      display: inline-block;
      margin-top: 10px;
      background: rgba(255, 255, 255, 0.18);
      border: 1px solid rgba(255, 255, 255, 0.35);
      backdrop-filter: blur(8px);
      padding: 6px 18px;
      border-radius: 9999px;
      font-size: 13.5px;
      font-weight: 600;
      color: #FFFFFF;
      letter-spacing: 0.3px;
    }}

    .subtitle-bn {{
      font-size: 15px;
      font-weight: 600;
      color: #DBEAFE;
      margin-top: 6px;
    }}

    /* Card Content Area */
    .card-body {{
      padding: 36px 36px 32px;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
    }}

    /* QR Code Display Container */
    .qr-frame {{
      background: #FFFFFF;
      padding: 16px;
      border-radius: 26px;
      border: 2.5px solid #E2E8F0;
      box-shadow: 0 12px 30px rgba(15, 23, 42, 0.06);
      margin-bottom: 24px;
      display: inline-block;
    }}

    .qr-frame svg {{
      width: 250px;
      height: 250px;
      display: block;
    }}

    /* Instructions */
    .action-title-en {{
      font-size: 21px;
      font-weight: 800;
      color: #0F172A;
      margin-bottom: 4px;
      letter-spacing: -0.3px;
    }}

    .action-title-bn {{
      font-size: 22px;
      font-weight: 700;
      color: #1D4ED8;
      margin-bottom: 6px;
      line-height: 1.3;
    }}

    .action-desc-en {{
      font-size: 13px;
      font-weight: 500;
      color: #64748B;
      margin-bottom: 2px;
    }}

    .action-desc-bn {{
      font-size: 14.5px;
      font-weight: 500;
      color: #475569;
      margin-bottom: 22px;
    }}

    /* URL Pill Box */
    .url-pill {{
      width: 100%;
      background: #F0F7FF;
      border: 1.5px solid #BFDBFE;
      border-radius: 16px;
      padding: 12px 18px;
      margin-bottom: 24px;
      display: flex;
      flex-direction: column;
      gap: 3px;
    }}

    .url-label {{
      font-size: 11px;
      font-weight: 700;
      color: #3B82F6;
      text-transform: uppercase;
      letter-spacing: 0.8px;
    }}

    .url-link {{
      font-size: 13px;
      font-weight: 600;
      color: #1E40AF;
      word-break: break-all;
      font-family: 'Plus Jakarta Sans', monospace;
    }}

    /* Step-by-Step Mini Guide */
    .steps-container {{
      width: 100%;
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      margin-bottom: 24px;
      padding-top: 18px;
      border-top: 1.5px dashed #E2E8F0;
    }}

    .step-card {{
      background: #F8FAFC;
      border-radius: 14px;
      padding: 12px 8px;
      border: 1px solid #E2E8F0;
    }}

    .step-badge {{
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 26px;
      height: 26px;
      background: #2563EB;
      color: #FFFFFF;
      border-radius: 50%;
      font-size: 13px;
      font-weight: 800;
      margin-bottom: 6px;
    }}

    .step-title {{
      font-size: 12.5px;
      font-weight: 700;
      color: #0F172A;
      line-height: 1.25;
    }}

    .step-bn {{
      font-size: 12.5px;
      font-weight: 600;
      color: #334155;
      margin-top: 3px;
      line-height: 1.25;
    }}

    /* Footer Trust Signals */
    .trust-footer {{
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
    }}

    .trust-en {{
      font-size: 12px;
      font-weight: 600;
      color: #64748B;
      letter-spacing: 0.5px;
    }}

    .trust-bn {{
      font-size: 13px;
      font-weight: 600;
      color: #2563EB;
      display: flex;
      align-items: center;
      gap: 6px;
    }}

    .verified-icon {{
      display: inline-block;
      width: 15px;
      height: 15px;
      background: #10B981;
      color: #FFFFFF;
      border-radius: 50%;
      text-align: center;
      line-height: 15px;
      font-size: 10px;
      font-weight: bold;
    }}
  </style>
</head>
<body>

  <div class="flyer-wrapper">
    <!-- Header Banner -->
    <div class="header-banner">
      <div class="logo-container">
        {"<img src='" + icon_b64 + "' class='app-icon' alt='App Icon' />" if icon_b64 else ""}
        <div>
          <div class="title-en">Lalmai Upozila Rent A Car</div>
          <div class="title-bn">লালমাই উপজেলা রেন্ট এ কার</div>
        </div>
      </div>
      <div class="subtitle-badge">OFFICIAL ANDROID APPLICATION</div>
      <div class="subtitle-bn">অফিসিয়াল অ্যান্ড্রয়েড মোবাইল অ্যাপ্লিকেশন</div>
    </div>

    <!-- Card Body -->
    <div class="card-body">
      <!-- High Resolution Vector QR Code -->
      <div class="qr-frame">
        {qr_svg}
      </div>

      <!-- Action Titles -->
      <div class="action-title-en">Scan to Download APK Directly</div>
      <div class="action-title-bn">সরাসরি অ্যাপ ডাউনলোড করতে স্ক্যান করুন</div>
      <div class="action-desc-en">Point your phone camera or QR scanner at the code</div>
      <div class="action-desc-bn">আপনার ফোনের ক্যামেরা অথবা কিউআর স্ক্যানার দিয়ে স্ক্যান করুন</div>

      <!-- Direct URL Pill -->
      <div class="url-pill">
        <span class="url-label">Direct Download Link / সরাসরি ডাউনলোড লিঙ্ক</span>
        <span class="url-link">{URL}</span>
      </div>

      <!-- Easy 3-Step Guide -->
      <div class="steps-container">
        <div class="step-card">
          <div class="step-badge">১</div>
          <div class="step-title">Scan Code</div>
          <div class="step-bn">স্ক্যান করুন</div>
        </div>
        <div class="step-card">
          <div class="step-badge">২</div>
          <div class="step-title">Download APK</div>
          <div class="step-bn">ডাউনলোড করুন</div>
        </div>
        <div class="step-card">
          <div class="step-badge">৩</div>
          <div class="step-title">Install & Open</div>
          <div class="step-bn">ইন্সটল করুন</div>
        </div>
      </div>

      <!-- Trust Footer -->
      <div class="trust-footer">
        <div class="trust-en">Permanent Link • Auto Updates • Safe & Verified</div>
        <div class="trust-bn">
          <span class="verified-icon">✓</span> স্থায়ী লিঙ্ক • স্বয়ংক্রিয় আপডেট • ১০০% নিরাপদ ও ভেরিফাইড
        </div>
      </div>
    </div>
  </div>

</body>
</html>
"""

    html_path = os.path.join(WORKSPACE, "temp_qr_card.html")
    pdf_path = os.path.join(WORKSPACE, "Lalmai_Rent_Car_QR_Download_Bangla.pdf")
    png_path = os.path.join(WORKSPACE, "download-qr-card-bangla.png")

    with open(html_path, "w", encoding="utf-8") as f:
        f.write(html_content)
    print(f"HTML template written to {html_path}")

    edge_exe = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
    if not os.path.exists(edge_exe):
        edge_exe = r"C:\Program Files\Microsoft\Edge\Application\msedge.exe"

    temp_user_data = os.path.join(WORKSPACE, ".edge_temp_profile")
    if os.path.exists(edge_exe):
        # 1. Print to High-Res PDF
        cmd_pdf = [
            edge_exe,
            "--headless",
            "--disable-gpu",
            f"--user-data-dir={temp_user_data}",
            "--run-all-compositor-stages-before-draw",
            "--print-to-pdf-no-header",
            f"--print-to-pdf={pdf_path}",
            f"file:///{html_path.replace(os.sep, '/')}"
        ]
        print("Generating High-Resolution PDF via Microsoft Edge engine...", flush=True)
        res_pdf = subprocess.run(cmd_pdf, capture_output=True, text=True)
        print(f"PDF creation completed. Return code: {res_pdf.returncode}", flush=True)

        # 2. Capture High-Res PNG Screenshot (Retina scale 1080x1520)
        cmd_png = [
            edge_exe,
            "--headless",
            "--disable-gpu",
            f"--user-data-dir={temp_user_data}",
            "--window-size=1080,1520",
            f"--screenshot={png_path}",
            f"file:///{html_path.replace(os.sep, '/')}"
        ]
        print("Capturing High-Resolution PNG via Microsoft Edge engine...", flush=True)
        res_png = subprocess.run(cmd_png, capture_output=True, text=True)
        print(f"PNG creation completed. Return code: {res_png.returncode}", flush=True)

    if os.path.exists(html_path):
        os.remove(html_path)

    print("Success!")
    if os.path.exists(pdf_path):
        print(f"Generated PDF: {pdf_path} ({os.path.getsize(pdf_path)} bytes)")
    if os.path.exists(png_path):
        print(f"Generated PNG: {png_path} ({os.path.getsize(png_path)} bytes)")

if __name__ == "__main__":
    main()
