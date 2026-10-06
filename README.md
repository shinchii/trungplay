# APTV Apple CarPlay Web Application - Premium YouTube Drive Edition (Inspired by demohdc.blogspot.com)

Ứng dụng Web App Đa phương tiện nghe nhạc YouTube (HTML, CSS, JavaScript thuần) được thiết kế & tái cấu trúc theo tiêu chuẩn chuyên nghiệp của **demohdc.blogspot.com**, tối ưu hóa riêng cho màn hình xe hơi thông qua trình duyệt **APTV / WebBrowser trên Apple CarPlay**.

---

## 🌟 Các Đột Phá & Tính Năng Nổi Bật

1. **Trình Phát YouTube Dual-Fallback (100% Phát Được Video)**:
   - Sử dụng kết hợp **YouTube Iframe API SDK** và **Direct Iframe Embed Fallback** (`https://www.youtube.com/embed/{id}?enablejsapi=1&autoplay=1&playsinline=1`).
   - Đảm bảo bấm chọn bất kỳ bài hát nào cũng lập tức nạp và phát ngay trên mọi trình duyệt CarPlay mà không bị lỗi "Video không có sẵn".

2. **Thanh Tiến Trình Timeline & Điều Khiển Đa Dạng (demohdc Style)**:
   - Hiển thị thời gian thực (`00:00 / 03:45`) cùng thanh tiến trình Seekbar cho phép tua bài bằng cách click/bấm phím.
   - Đầy đủ bộ nút điều khiển: Bài trước (Prev), Phát/Tạm dừng (Play/Pause), Bài tiếp (Next), Chế độ lặp lại (Repeat All / Repeat One / Off), Phát ngẫu nhiên (Shuffle), Yêu thích (Favorite Heart).

3. **Công Cụ Tìm Kiếm Trực Tuyến Thực Tế 3 Lớp (Real-time YouTube Search Parser)**:
   - Parse trực tiếp dữ liệu YouTube Search HTML qua CORS Proxy API để lấy kết quả tìm kiếm thực tế trên YouTube (Video ID, tiêu đề, tên ca sĩ, thumbnail HD).
   - Dự phòng thông minh qua bộ dữ liệu đã kiểm duyệt các ca sĩ hot nhất Việt Nam (**Sơn Tùng M-TP**, **Đen Vâu**, **HIEUTHUHAI**, **Vũ.**, **Mỹ Tâm**, **Lofi Chill Lái Xe**, **Bolero**, **Remix Xe Hơi**).
   - Tích hợp Giọng nói Tiếng Việt (Web Speech API) trực tiếp tại thanh tìm kiếm.

4. **Tối Ưu Triệt Để Cho Xe Không Cảm Ứng (Núm Xoay / Phím Vô Lăng)**:
   - Thẻ `tabindex="0"` chuẩn mực trên 100% phần tử tương tác.
   - **Viền Focus Vàng Neon 4px Siêu Nổi Bật** (`outline: 4px solid #FFD34F`) cùng hiệu ứng phát sáng glow giúp người lái xoay núm tới đâu nhận biết ngay tới đó.
   - Bắt phím cứng: `ArrowUp`, `ArrowDown`, `ArrowLeft`, `ArrowRight` di chuyển Focus; `Enter`/`Space` kích hoạt chọn bài; `Backspace`/`Escape` quay lại thanh tìm kiếm.

5. **Giao Diện Dark OLED Glassmorphic Đỉnh Cao**:
   - Tông màu tối OLED (`#090d16`), các card mờ kính sang trọng, dải màu vàng Neon (`#FFD34F`) & đỏ Glow (`#EF4444`).

---

## 📁 Cấu Trúc Thư Mục

```
aptv-carplay-app/
├── index.html        # Giao diện 2 cột chuẩn demohdc.blogspot.com
├── styles.css        # Theme OLED Glassmorphic & Viền Vàng Focus 4px cho Núm xoay
├── app.js            # Engine YouTube SDK + Direct Fallback, Real-time Search Parser & Spatial Focus
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
