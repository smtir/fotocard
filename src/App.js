import React, { useRef, useState } from "react";
import html2canvas from "html2canvas";
import "./App.css";
import templateImg from './assets/template.png';

const defaultCaption = "এখানে লেখা দিন";
const TEMPLATE_SIZE = 1000;
const BOX_X = 16; // px
const BOX_Y = 32; // px
const BOX_WIDTH = 960; // px
const BOX_HEIGHT = 670; // px
const BOX_RADIUS = 24; // px
const TEXT_AREA_X = BOX_X;
const TEXT_AREA_Y = BOX_Y + BOX_HEIGHT + 5;
const TEXT_AREA_WIDTH = 900;

// Helper to wrap text for canvas
function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  let line = '';
  let lines = [];
  for (let n = 0; n < words.length; n++) {
    const testLine = line + (line ? ' ' : '') + words[n];
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && n > 0) {
      lines.push(line);
      line = words[n];
    } else {
      line = testLine;
    }
  }
  lines.push(line);
  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], x, y + i * lineHeight);
  }
  return lines.length;
}

// Helper to get today's date in yyyy-mm-dd in GMT+6
function getToday() {
  const now = new Date();
  // Convert to UTC milliseconds, add 6 hours for GMT+6, then get date string
  const gmt6 = new Date(now.getTime() + (6 * 60 - now.getTimezoneOffset()) * 60000);
  return gmt6.toISOString().slice(0, 10);
}

// Helper to convert English digits to Bangla
function toBanglaNumber(str) {
  const en = '0123456789';
  const bn = '০১২৩৪৫৬৭৮৯';
  return str.replace(/[0-9]/g, d => bn[en.indexOf(d)]);
}
// Helper to format yyyy-mm-dd to '১৫ জুলাই ২০২৫'
function formatBanglaDate(dateStr) {
  if (!dateStr) return '';
  const months = [
    'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
    'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
  ];
  const [year, month, day] = dateStr.split('-');
  return `${toBanglaNumber(String(Number(day)))} ${months[Number(month) - 1]} ${toBanglaNumber(year)}`;
}

  // Helper to get dynamic font size for caption
  function getCaptionFontSize(text) {
    return text.length <= 120 ? '2.8rem' : '2.1rem';
  }
  function getCaptionCanvasFontSize(text) {
    return text.length <= 120 ? 52 : 38;
  }

function App() {
  const [image, setImage] = useState(null);
  const [caption, setCaption] = useState(defaultCaption);
  const [date, setDate] = useState(getToday());
  const [credit, setCredit] = useState('');
  const [error, setError] = useState("");
  const fileInput = useRef();
  const cardRef = useRef();

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const validTypes = ["image/jpeg", "image/png", "image/gif", "image/bmp", "image/webp"];
    if (!validTypes.includes(file.type)) {
      setError("শুধুমাত্র JPG, PNG, GIF, BMP, WebP ফরম্যাট সাপোর্ট করবে");
      return;
    }
    setError("");
    const reader = new FileReader();
    reader.onload = (ev) => setImage(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      fileInput.current.files = e.dataTransfer.files;
      handleImageChange({ target: { files: e.dataTransfer.files } });
    }
  };

  const handleDownload = async () => {
    if (!image) return;
    // Create a canvas and draw the uploaded image, then overlay the template
    const canvas = document.createElement('canvas');
    canvas.width = TEMPLATE_SIZE;
    canvas.height = TEMPLATE_SIZE;
    const ctx = canvas.getContext('2d');

    // Draw the uploaded image inside the box, maintaining aspect ratio (object-fit: contain)
    const userImg = new window.Image();
    userImg.src = image;
    await new Promise(resolve => { userImg.onload = resolve; });
    // Calculate object-fit: contain placement
    const boxAR = BOX_WIDTH / BOX_HEIGHT;
    const imgAR = userImg.width / userImg.height;
    let drawW = BOX_WIDTH, drawH = BOX_HEIGHT, drawX = BOX_X, drawY = BOX_Y;
    if (imgAR > boxAR) {
      // Image is wider
      drawW = BOX_WIDTH;
      drawH = BOX_WIDTH / imgAR;
      drawY = BOX_Y + (BOX_HEIGHT - drawH) / 2;
    } else {
      // Image is taller
      drawH = BOX_HEIGHT;
      drawW = BOX_HEIGHT * imgAR;
      drawX = BOX_X + (BOX_WIDTH - drawW) / 2;
    }
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(BOX_X + BOX_RADIUS, BOX_Y);
    ctx.lineTo(BOX_X + BOX_WIDTH - BOX_RADIUS, BOX_Y);
    ctx.quadraticCurveTo(BOX_X + BOX_WIDTH, BOX_Y, BOX_X + BOX_WIDTH, BOX_Y + BOX_RADIUS);
    ctx.lineTo(BOX_X + BOX_WIDTH, BOX_Y + BOX_HEIGHT - BOX_RADIUS);
    ctx.quadraticCurveTo(BOX_X + BOX_WIDTH, BOX_Y + BOX_HEIGHT, BOX_X + BOX_WIDTH - BOX_RADIUS, BOX_Y + BOX_HEIGHT);
    ctx.lineTo(BOX_X + BOX_RADIUS, BOX_Y + BOX_HEIGHT);
    ctx.quadraticCurveTo(BOX_X, BOX_Y + BOX_HEIGHT, BOX_X, BOX_Y + BOX_HEIGHT - BOX_RADIUS);
    ctx.lineTo(BOX_X, BOX_Y + BOX_RADIUS);
    ctx.quadraticCurveTo(BOX_X, BOX_Y, BOX_X + BOX_RADIUS, BOX_Y);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(userImg, drawX, drawY, drawW, drawH);
    ctx.restore();

    // Overlay the template PNG (with transparent box)
    const bg = new window.Image();
    bg.src = templateImg;
    await new Promise(resolve => { bg.onload = resolve; });
    ctx.drawImage(bg, 0, 0, TEMPLATE_SIZE, TEMPLATE_SIZE);

    // Draw the text below the box, centered and wrapped
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    let textY = TEXT_AREA_Y;
    // Caption
    ctx.font = `bold ${getCaptionCanvasFontSize(caption)}px Tiro Bangla, serif`;
    ctx.fillStyle = '#222';
    const capLines = wrapText(ctx, caption, TEMPLATE_SIZE / 2, textY, TEXT_AREA_WIDTH - 40, getCaptionCanvasFontSize(caption) + 6);
    textY += capLines * (getCaptionCanvasFontSize(caption) + 6) + 8;
    // Date at template bottom left
    ctx.font = 'bold 28px Tiro Bangla, serif';
    ctx.fillStyle = '#222';
    ctx.textAlign = 'left';
    ctx.fillText(formatBanglaDate(date), 32, TEMPLATE_SIZE - 48);
    // Credit at box bottom left with background and color
    if (credit) {
      ctx.font = 'bold 24px Tiro Bangla, serif';
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'left';
      // Draw background rectangle for credit
      const creditBgX = BOX_X + 34;
      const creditBgY = BOX_Y + BOX_HEIGHT - 40;
      const creditBgPaddingX = 16;
      const creditBgPaddingY = 4;
      const creditText = credit;
      const creditTextWidth = ctx.measureText(creditText).width;
      ctx.save();
      ctx.globalAlpha = 0.7;
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.moveTo(creditBgX, creditBgY + 8);
      ctx.arcTo(creditBgX, creditBgY, creditBgX + creditTextWidth + creditBgPaddingX * 2, creditBgY, 8);
      ctx.arcTo(creditBgX + creditTextWidth + creditBgPaddingX * 2, creditBgY, creditBgX + creditTextWidth + creditBgPaddingX * 2, creditBgY + 32, 8);
      ctx.arcTo(creditBgX + creditTextWidth + creditBgPaddingX * 2, creditBgY + 32, creditBgX, creditBgY + 32, 8);
      ctx.arcTo(creditBgX, creditBgY + 32, creditBgX, creditBgY, 8);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#fff';
      ctx.fillText(creditText, creditBgX + creditBgPaddingX, creditBgY + creditBgPaddingY + 4);
      ctx.restore();
    }

    const dataUrl = canvas.toDataURL();
    // iOS detection
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (isIOS) {
      // Open in new tab and show user message
      window.open(dataUrl, '_blank');
      alert('iPhone/iPad-এ ডাউনলোড করতে, নতুন ট্যাবে খুলে ছবির উপর ট্যাপ করে ধরে রাখুন এবং "Save Image" বেছে নিন।');
      return;
    }
    // Normal download for other browsers
    const link = document.createElement('a');
    link.download = 'fotocard.png';
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    setTimeout(() => document.body.removeChild(link), 100);
  };

  const handleClear = () => {
    setImage(null);
    setError("");
    fileInput.current.value = null;
  };

  return (
    <div className="container">
      <h1 className="title">আহম্মদপুর বার্তা <span className="redlish">ফটোকার্ড সিস্টেম</span></h1>
      <div className="upload-section">
        <label htmlFor="file-upload" className="upload-label" onDrop={handleDrop} onDragOver={e => e.preventDefault()}>
          {image ? (
            <img src={image} alt="Uploaded" className="preview-img" />
          ) : (
            <div className="upload-placeholder">
              <span role="img" aria-label="camera" className="camera-icon">📷</span>
              <div>নিচের নীল বাটনে ক্লিক করে অথবা এখানে ছবি এনে ছেড়ে দিন</div>
              <div className="formats">JPG, PNG, GIF, BMP, WebP ফরম্যাটের ছবিগুলা সাপোর্ট করবে</div>
            </div>
          )}
          <input
            id="file-upload"
            type="file"
            accept="image/jpeg,image/png,image/gif,image/bmp,image/webp"
            onChange={handleImageChange}
            ref={fileInput}
            style={{ display: "none" }}
          />
        </label>
        <div className="button-row">
          <button className="blue-btn" onClick={() => fileInput.current.click()}>ছবি বেছে নিন</button>
          {image && <button className="clear-btn" onClick={handleClear}>ছবি ক্লিয়ার করুন</button>}
        </div>
        {error && <div className="error">{error}</div>}
      </div>
      <div className="editor-section" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <textarea
          className="caption-input"
          value={caption}
          onChange={e => setCaption(e.target.value)}
          placeholder="ক্যাপশন"
          rows={3}
          style={{ width: '100%', fontSize: 22, padding: 8, border: '1px solid #ffd600', borderRadius: 6, resize: 'vertical', fontFamily: "'Tiro Bangla', serif" }}
        />
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input
            className="date-input"
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            placeholder="তারিখ"
            style={{ flex: 1, minWidth: 120, fontSize: 18, padding: 8, border: '1px solid #ffd600', borderRadius: 6, fontFamily: "'Tiro Bangla', serif" }}
          />
          <input
            className="credit-input"
            type="text"
            value={credit}
            onChange={e => setCredit(e.target.value)}
            placeholder="ফটো ক্রেডিট অথবা বিভাগ দিন"
            style={{ flex: 1, minWidth: 120, fontSize: 18, padding: 8, border: '1px solid #ffd600', borderRadius: 6, fontFamily: "'Tiro Bangla', serif" }}
          />
        </div>
        <button className="download-btn" onClick={handleDownload} disabled={!image}>ডাউনলোড করুন</button>
      </div>
      <div className="card-preview-wrapper" style={{ position: 'relative', width: TEMPLATE_SIZE, height: TEMPLATE_SIZE }}>
        {/* Uploaded image inside the white box, clipped */}
        {image && (
          <img
            src={image}
            alt="card"
            style={{
              position: 'absolute',
              left: BOX_X,
              top: BOX_Y,
              width: BOX_WIDTH,
              height: BOX_HEIGHT,
              objectFit: 'contain',
              borderRadius: `${BOX_RADIUS}px`,
              background: 'none',
              zIndex: 1,
              clipPath: `path('M${BOX_X + BOX_RADIUS},${BOX_Y} L${BOX_X + BOX_WIDTH - BOX_RADIUS},${BOX_Y} Q${BOX_X + BOX_WIDTH},${BOX_Y} ${BOX_X + BOX_WIDTH},${BOX_Y + BOX_RADIUS} L${BOX_X + BOX_WIDTH},${BOX_Y + BOX_HEIGHT - BOX_RADIUS} Q${BOX_X + BOX_WIDTH},${BOX_Y + BOX_HEIGHT} ${BOX_X + BOX_WIDTH - BOX_RADIUS},${BOX_Y + BOX_HEIGHT} L${BOX_X + BOX_RADIUS},${BOX_Y + BOX_HEIGHT} Q${BOX_X},${BOX_Y + BOX_HEIGHT} ${BOX_X},${BOX_Y + BOX_HEIGHT - BOX_RADIUS} L${BOX_X},${BOX_Y + BOX_RADIUS} Q${BOX_X},${BOX_Y} ${BOX_X + BOX_RADIUS},${BOX_Y} Z')`,
            }}
          />
        )}
        {/* Overlay the template PNG (with transparent box) */}
        <img
          src={templateImg}
          alt="template"
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: TEMPLATE_SIZE,
            height: TEMPLATE_SIZE,
            zIndex: 2,
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        />
        {/* Output text preview (caption) */}
        <div
          style={{
            position: 'absolute',
            top: TEXT_AREA_Y,
            left: TEXT_AREA_X,
            width: TEXT_AREA_WIDTH,
            textAlign: 'center',
            padding: '0 20px',
            fontFamily: "'Tiro Bangla', serif",
            color: '#222',
            zIndex: 3,
            pointerEvents: 'none',
          }}
        >
          <div className="caption" style={{ fontSize: getCaptionFontSize(caption), fontWeight: 700, marginBottom: 8, lineHeight: 1.2, wordBreak: 'break-word' }}>{caption}</div>
        </div>
        {/* Date at template bottom left */}
        <div
          style={{
            position: 'absolute',
            left: 32,
            top: TEMPLATE_SIZE - 48,
            fontFamily: "'Tiro Bangla', serif",
            fontSize: 18,
            color: '#222',
            fontWeight: 700,
            zIndex: 4,
            pointerEvents: 'none',
            background: 'none',
          }}
        >
          {formatBanglaDate(date)}
        </div>
        {/* Photo credit at box bottom left with background and color */}
        {credit && (
          <div
            style={{
              position: 'absolute',
              left: BOX_X + 34,
              top: BOX_Y + BOX_HEIGHT - 40,
              fontFamily: "'Tiro Bangla', serif",
              fontSize: 18,
              color: '#fff',
              background: 'rgba(0,0,0,0.7)',
              padding: '4px 16px',
              borderRadius: 8,
              zIndex: 4,
              pointerEvents: 'none',
              fontWeight: 700,
              maxWidth: BOX_WIDTH - 32,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {credit}
          </div>
        )}
      </div>
     
      <div className="footer">তৈরী করেছে: <a target="_blank" href="https://www.facebook.com/smtirX">তাওহিদুল ইসলাম রাজীব</a></div>
    </div>
  );
}

export default App; 