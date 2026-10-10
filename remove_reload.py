import sys

with open('app.js', 'r') as f:
    content = f.read()

old_result = """    toast('✅ Đã bắt được: ' + text + '. Đang xử lý...');
    sessionStorage.setItem('aptv_auto_search', text);
    
    // TẢI LẠI TRANG ĐỂ ÉP IOS NHẢ MICRO, TRẢ ÂM THANH VỀ LOA MEDIA CỦA XE
    setTimeout(() => {
      window.location.reload();
    }, 300);
  };"""

new_result = """    toast('✅ Đã bắt được: ' + text + '. Đang xử lý...');
    
    // TẮT MICRO BẰNG HACK WEBRTC ĐỂ TRẢ LẠI AUDIO CHO CARPLAY
    killRecognition();
    
    setTimeout(async () => {
      const searchInput = document.getElementById('searchInput');
      if (searchInput) searchInput.value = text;
      
      const results = await search(text);
      if (results && results.length > 0) {
        play(results[0], true);
        if (typeof enterCinemaMode === 'function') enterCinemaMode();
      } else {
        toast('Không tìm thấy bài hát: ' + text);
      }
    }, 800); // Đợi 800ms để iOS kịp chuyển kênh âm thanh
  };"""

content = content.replace(old_result, new_result)

with open('app.js', 'w') as f:
    f.write(content)
print("Removed reload and integrated WebRTC hack")
