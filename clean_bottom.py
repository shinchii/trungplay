import sys

with open('app.js', 'r') as f:
    content = f.read()

old_bottom = """  // Xử lý nốt quy trình tìm kiếm tự động sau khi trang load lại từ Voice Search
  try {
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
  } catch (e) { console.warn("Lỗi đọc sessionStorage:", e); }"""

content = content.replace(old_bottom, "")

with open('app.js', 'w') as f:
    f.write(content)
print("Cleaned bottom logic")
