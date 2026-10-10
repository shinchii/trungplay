import sys

with open('app.js', 'r') as f:
    content = f.read()

old_start = """function startVoiceSearch() {
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

new_start = """function startVoiceSearch() {
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
}"""

content = content.replace(old_start, new_start)

old_exit = """function exitCinemaMode() {
  document.body.classList.remove('cinema');
  exitPageFullscreen();
  destroyPlayers(false); // Tắt nhạc khi thoát toàn màn hình theo đúng yêu cầu
  const input = document.getElementById('searchInput');
  if (input) {
    setTimeout(() => {
      try { input.focus(); } catch(e){}
    }, 120);
  }
}"""

new_exit = """function exitCinemaMode(skipFocus = false) {
  document.body.classList.remove('cinema');
  exitPageFullscreen();
  destroyPlayers(false); // Tắt nhạc khi thoát toàn màn hình theo đúng yêu cầu
  const input = document.getElementById('searchInput');
  if (input && !skipFocus) {
    setTimeout(() => {
      try { input.focus(); } catch(e){}
    }, 120);
  }
}"""

content = content.replace(old_exit, new_exit)

with open('app.js', 'w') as f:
    f.write(content)
print("Updated app.js")
