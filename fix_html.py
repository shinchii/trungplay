import sys

with open('index.html', 'r') as f:
    content = f.read()

# Fix main voice button
old_btn = """<button type="button" id="btnVoiceSearch" class="btn-voice-big" tabindex="0">
            <span>🎤</span>
            <span>Giọng nói</span>
          </button>"""
new_btn = """<label id="btnVoiceSearch" for="searchInput" class="btn-voice-big" tabindex="0" style="cursor:pointer;">
            <span>🎤</span>
            <span>Giọng nói</span>
          </label>"""
content = content.replace(old_btn, new_btn)

# Fix cinema mic button
old_mic = """<button id="cinemaMicBtn" title="Tìm bằng giọng nói" tabindex="0">🎤 Giọng nói</button>"""
new_mic = """<label id="cinemaMicBtn" for="searchInput" title="Tìm bằng giọng nói" tabindex="0" style="cursor:pointer; display:inline-flex; align-items:center; justify-content:center;">🎤 Giọng nói</label>"""
content = content.replace(old_mic, new_mic)

with open('index.html', 'w') as f:
    f.write(content)
print("Updated index.html")
