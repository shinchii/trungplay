import sys

with open('app.js', 'r') as f:
    content = f.read()

# 1. Update startVoiceSearch
old_start = """function startVoiceSearch() {
  // Đồng bộ focus để iOS mở bàn phím
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.value = '';
    searchInput.focus();
    toast('🎤 Bấm phím Micro trên bàn phím để nói');
  }
  
  if (typeof exitCinemaMode === 'function') {
    exitCinemaMode();
  }
}"""

new_start = """window.isVoiceDictationMode = false;
window.dictationTimeout = null;

function startVoiceSearch() {
  window.isVoiceDictationMode = true;
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.value = '';
    searchInput.focus();
    toast('🎤 Bấm phím Micro trên bàn phím để nói');
  }
  
  if (typeof exitCinemaMode === 'function') {
    exitCinemaMode();
  }
}"""

if old_start in content:
    content = content.replace(old_start, new_start)

# 2. Update searchForm onsubmit to clear timeout
old_submit = """  const searchForm = document.getElementById('searchForm');
  if (searchForm) {
    searchForm.onsubmit = e => {
      e.preventDefault();
      const val = document.getElementById('searchInput').value.trim();
      if (val) search(val);
      else toast('Vui lòng nhập tên bài hát cần tìm');
    };
  }"""

new_submit = """  const searchForm = document.getElementById('searchForm');
  if (searchForm) {
    searchForm.onsubmit = e => {
      e.preventDefault();
      clearTimeout(window.dictationTimeout);
      window.isVoiceDictationMode = false;
      const val = document.getElementById('searchInput').value.trim();
      if (val) search(val);
      else toast('Vui lòng nhập tên bài hát cần tìm');
    };
  }

  // Lắng nghe thay đổi văn bản để tự động tìm và phát (giống hành vi cũ) khi dùng giọng nói
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      if (!window.isVoiceDictationMode) return;
      clearTimeout(window.dictationTimeout);
      window.dictationTimeout = setTimeout(async () => {
        const val = searchInput.value.trim();
        if (val) {
          window.isVoiceDictationMode = false;
          toast('🔍 Đang tìm & tự phát: ' + val);
          const results = await search(val);
          if (results && results.length > 0) {
            play(results[0], true);
            if (typeof enterCinemaMode === 'function') enterCinemaMode();
          } else {
            toast('Không tìm thấy bài hát: ' + val);
          }
        }
      }, 2500); // Đợi 2.5 giây sau khi ngừng nói
    });
  }"""

if old_submit in content:
    content = content.replace(old_submit, new_submit)

with open('app.js', 'w') as f:
    f.write(content)
print("Implemented auto voice search logic.")
