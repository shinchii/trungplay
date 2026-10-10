import sys

with open('app.js', 'r') as f:
    content = f.read()

old_func = """function startVoiceSearch() {
  // Thoát chế độ toàn màn hình trước khi tìm kiếm để thấy ô input
  if (typeof exitCinemaMode === 'function') {
    exitCinemaMode();
  }

  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.value = '';
    setTimeout(() => {
      searchInput.focus();
      toast('🎤 Bấm phím Micro trên bàn phím để nói');
    }, 100);
  }
}"""

new_func = """function startVoiceSearch() {
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

if old_func in content:
    content = content.replace(old_func, new_func)
    with open('app.js', 'w') as f:
        f.write(content)
    print("Updated")
else:
    print("Not found")
