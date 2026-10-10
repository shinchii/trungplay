import sys

with open('app.js', 'r') as f:
    content = f.read()

old_kill = """function killRecognition() {
  if (voiceRecognition) {
    try { voiceRecognition.abort(); } catch(e){}
    try { voiceRecognition.stop(); } catch(e){}
    voiceRecognition = null;
  }
}"""

new_kill = """function killRecognition() {
  if (voiceRecognition) {
    try { voiceRecognition.abort(); } catch(e){}
    try { voiceRecognition.stop(); } catch(e){}
    voiceRecognition = null;
  }
  // HACK: Ép WebKit giải phóng hoàn toàn phần cứng Micro bằng cách mở WebRTC rỗng rồi tắt ngay lập tức
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        stream.getTracks().forEach(track => track.stop());
      })
      .catch(err => console.warn('WebRTC Mic Release Hack failed:', err));
  }
}"""

content = content.replace(old_kill, new_kill)

with open('app.js', 'w') as f:
    f.write(content)
print("Applied WebRTC Mic Release Hack")
