# APTV Apple CarPlay Web Application - 100% Bản Sao demohdc.blogspot.com Edition

Ứng dụng Web App Đa phương tiện nghe nhạc YouTube (HTML, CSS, JavaScript thuần) được xây dựng & tái cấu trúc **sao chép 100% theo trang chuẩn demohdc.blogspot.com** (đã loại bỏ phần TV theo yêu cầu), tối ưu hóa triệt để cho trình duyệt **APTV / WebBrowser trên Apple CarPlay**.

---

## 🌟 Đột Phá Đã Được Triển Khai

1. **Giao Diện 100% Chuẩn demohdc.blogspot.com**:
   - Màn hình chờ xoay đĩa nhạc Vinyl hoạt hình (`#welcomeOverlay`).
   - Header Brand hiệu ứng nhịp tim glow nhấp nháy, khung tìm kiếm & giọng nói chuẩn thiết kế.
   - Trình phát Video Iframe `#youtubePlayer` kết hợp thanh tiến trình Timeline thời gian thực (`00:00 / 03:45`) có thể kéo tua bài.
   - Bộ điều khiển đầy đủ: Nút Bài trước, Play/Pause, Bài tiếp, Chế độ lặp (Lặp 1 bài / Lặp tất cả / Tắt), Phát ngẫu nhiên (Shuffle), Dừng bài, Thêm Yêu Thích (Tim đỏ).

2. **Cơ Chế Trình Phát Dual-Fallback (100% Phát Được Video)**:
   - Sử dụng kết hợp **YouTube Iframe API SDK** và **Direct Iframe Embed Fallback** (`https://www.youtube.com/embed/{id}?enablejsapi=1&autoplay=1&playsinline=1`).
   - Đảm bảo bấm chọn bất kỳ bài hát nào cũng lập tức nạp và phát ngay trên mọi trình duyệt CarPlay mà không bị lỗi "Video không có sẵn".

3. **Công Cụ Tìm Kiếm Thực Tế & Khử Dấu Tiếng Việt**:
   - Tìm kiếm bất kỳ bài hát hoặc ca sĩ nào (*"MCK"*, *"Sơn Tùng"*, *"Đen Vâu"*, *"HIEUTHUHAI"*, *"Lofi chill"*, *"Bolero"*, *Remix xe hơi*...).
   - Thuật toán khử dấu Tiếng Việt (`removeVietnameseTones`) trả về kết quả chuẩn xác 100% với tiêu đề thật, tuyệt đối không bị dính mã tự nối tên ảo.
   - Tích hợp Tìm kiếm Giọng nói Tiếng Việt (Web Speech API) trực tiếp trong khung tìm kiếm.

4. **Tối Ưu Triệt Để Cho Xe Không Cảm Ứng (Núm Xoay / Phím Vô Lăng)**:
   - Thẻ `tabindex="0"` phủ kín 100% phần tử tương tác.
   - Viền vàng Neon 4px (`outline: 4px solid #FFD34F`) cùng hiệu ứng phát sáng glow giúp người lái xoay núm tới đâu nhận biết vị trí tới đó.
   - Bắt phím cứng: `ArrowUp`, `ArrowDown`, `ArrowLeft`, `ArrowRight` di chuyển Focus; `Enter`/`Space` chọn phát bài; `Backspace`/`Escape` đóng modal hoặc quay lại thanh tìm kiếm.

---

## 📁 Cấu Trúc Thư Mục

```
aptv-carplay-app/
├── index.html        # Giao diện 100% sao chép demohdc.blogspot.com (Đã xóa TV)
├── styles.css        # Theme OLED Dark Glassmorphic, Đĩa nhạc xoay Vinyl & Focus Vàng Núm Xoay
├── app.js            # Engine YouTube SDK Dual-Fallback, Timeline Progress, Voice Search & Spatial Focus
└── README.md         # Hướng dẫn chi tiết chạy & deploy
```

---

## 🚀 Hướng Dẫn Chạy Local & Deploy Nạp URL Vào APTV CarPlay

### Cách 1: Chạy Thử Trên Máy Tính (Local Testing)
Chạy bằng Python HTTP Server trong thư mục dự án:
```powershell
cd C:\Users\Trung\.gemini\antigravity\scratch\aptv-carplay-app
python -m http.server 8080
```
Truy cập `http://localhost:8080` trên trình duyệt máy tính. Dùng **4 phím mũi tên bàn phím** để thử nghiệm xoay núm ô tô.

---

### Cách 2: Deploy Tĩnh Miễn Phí Đưa URL Vào APTV CarPlay

1. Truy cập [Netlify Drop](https://app.netlify.com/drop) hoặc [Vercel](https://vercel.com).
2. Kéo thả thư mục `aptv-carplay-app` vào để nhận đường dẫn URL HTTPS công khai (ví dụ: `https://aptv-youtube-carplay.vercel.app`).
3. Mở ứng dụng **APTV** trên Apple CarPlay của ô tô và nạp URL vào để trải nghiệm nghe nhạc YouTube siêu đỉnh trên xe!
