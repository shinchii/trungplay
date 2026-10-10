import sys

with open('app.js', 'r') as f:
    lines = f.readlines()

new_content = """// Thay thế chức năng tìm kiếm giọng nói bằng Web Speech API gây lỗi AudioSession
// Bằng cách focus vào ô input để gọi bàn phím iOS, yêu cầu người dùng bấm nút Micro trên bàn phím.
function startVoiceSearch() {
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.value = '';
    searchInput.focus();
    toast('🎤 Bấm phím Micro trên bàn phím để nói');
  }
}

function stopVoiceSearch() {
  // Hàm trống để không gây lỗi
}

function initVoiceSearch() {
  const btnVoice = document.getElementById('btnVoiceSearch');
  if (btnVoice) btnVoice.onclick = startVoiceSearch;
}
"""

# Replace lines 1448 to 1682 (0-indexed: 1447 to 1682)
lines[1447:1682] = [new_content]

with open('app.js', 'w') as f:
    f.writelines(lines)
