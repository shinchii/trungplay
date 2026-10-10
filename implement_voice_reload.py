import sys

with open('app.js', 'r') as f:
    content = f.read()

# 1. Update startVoiceSearch
old_start = """window.isVoiceDictationMode = false;
window.dictationTimeout = null;

function startVoiceSearch() {
  window.isVoiceDictationMode = true;
  
  if (typeof exitCinemaMode === 'function') {
    exitCinemaMode(true); // true = skip focus
  }

  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.value = '';
    // <label> native action will handle focus automatically
    setTimeout(() => {
      toast('🎤 Bấm phím Micro trên bàn phím để nói');
    }, 200);
  }
}

function stopVoiceSearch() {
  // Hàm trống để không gây lỗi
}

function killRecognition() {
  // Hàm trống để không gây lỗi play()
}"""

new_start = """function getSpeechRecognition() {
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

let voiceRecognition = null;

function startVoiceSearch(e) {
  if (e && e.preventDefault) e.preventDefault();
  
  if (typeof exitCinemaMode === 'function') {
    exitCinemaMode(true);
  }

  const SR = getSpeechRecognition();
  if (!SR) {
    toast('Trình duyệt của xe chưa hỗ trợ Web Speech. Vui lòng gõ chữ.');
    return;
  }

  // Tạm dừng nhạc nếu đang phát để Micro bắt giọng tốt hơn
  if (typeof destroyPlayers === 'function') destroyPlayers(false);
  
  // Đóng bất kỳ phiên nhận diện nào trước đó
  killRecognition();

  toast('🎤 Đang nghe... Hãy đọc tên bài hát!');

  const r = new SR();
  r.lang = 'vi-VN';
  r.continuous = false;
  r.interimResults = false;
  r.maxAlternatives = 1;

  r.onresult = (e) => {
    let text = '';
    for (let i = 0; i < e.results.length; i++) {
      text += e.results[i][0].transcript;
    }
    text = text.trim();
    if (!text) return;
    
    toast('✅ Đã bắt được: ' + text + '. Đang xử lý...');
    sessionStorage.setItem('aptv_auto_search', text);
    
    // TẢI LẠI TRANG ĐỂ ÉP IOS NHẢ MICRO, TRẢ ÂM THANH VỀ LOA MEDIA CỦA XE
    setTimeout(() => {
      window.location.reload();
    }, 300);
  };

  r.onerror = (evt) => {
    console.warn('Voice error:', evt.error);
    toast('⚠️ Lỗi nghe giọng nói (hoặc bị từ chối quyền). Hãy thử lại!');
  };
  
  r.onend = () => {
    // Không làm gì thêm, onresult đã lo
  };

  voiceRecognition = r;
  try {
    r.start();
  } catch (err) {
    toast('⚠️ Micro đang bận. Vui lòng bấm thử lại!');
  }
}

function killRecognition() {
  if (voiceRecognition) {
    try { voiceRecognition.abort(); } catch(e){}
    try { voiceRecognition.stop(); } catch(e){}
    voiceRecognition = null;
  }
}

function stopVoiceSearch() {
  killRecognition();
}"""

content = content.replace(old_start, new_start)

# 2. Add the onload auto-search logic at the bottom of the DOMContentLoaded block
bottom_marker = """  renderAll();
  initVoiceSearch();
  initCinemaControls();
});"""

new_bottom = """  renderAll();
  initVoiceSearch();
  initCinemaControls();

  // Xử lý nốt quy trình tìm kiếm tự động sau khi trang load lại từ Voice Search
  const autoSearchQuery = sessionStorage.getItem('aptv_auto_search');
  if (autoSearchQuery) {
    sessionStorage.removeItem('aptv_auto_search');
    setTimeout(async () => {
      toast('🔍 Đang tự động phát: ' + autoSearchQuery);
      const searchInput = document.getElementById('searchInput');
      if (searchInput) searchInput.value = autoSearchQuery;
      
      const results = await search(autoSearchQuery);
      if (results && results.length > 0) {
        play(results[0], true);
        if (typeof enterCinemaMode === 'function') enterCinemaMode();
      } else {
        toast('Không tìm thấy bài hát: ' + autoSearchQuery);
      }
    }, 500);
  }
});"""

content = content.replace(bottom_marker, new_bottom)

with open('app.js', 'w') as f:
    f.write(content)
print("Implemented direct voice search with reload hack")
