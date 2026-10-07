/* =========================================================
   TRUNG PLAY - CAR MEDIA & INFOTAINMENT APPLICATION LOGIC
   ========================================================= */

// State Management
const appState = {
  ytPlayer: null,
  isYtReady: false,
  currentVideoId: '5qap5aO4i9A', // Default featured track: Nhạc Lofi Chill
  currentVideoTitle: 'Nhạc Lofi Chill Lái Xe Ô Tô - TRUNG PLAY',
  isPlaying: false,
  hlsPlayer: null,
  currentTab: 'youtubePane',
  favorites: JSON.parse(localStorage.getItem('tp_favorites')) || [],
  history: JSON.parse(localStorage.getItem('tp_history')) || [],
  settings: JSON.parse(localStorage.getItem('tp_settings')) || {
    largeThumbnails: true,
    autoplay: true
  }
};

// Curated YouTube Music Tracks / Suggestions
const defaultTracks = [
  { id: '5qap5aO4i9A', title: 'Lofi Chill Lái Xe Đêm - Tuyển Tập Nhạc Chill Nhẹ Nhàng', channel: 'TRUNG PLAY Chill', thumb: 'https://img.youtube.com/vi/5qap5aO4i9A/mqdefault.jpg' },
  { id: '3w6p83B3n1w', title: 'Tuyển Tập Nhạc Trẻ Remix Vinahouse Cực Phiêu Cho Xe Ô Tô', channel: 'Nhạc Xe Ô Tô', thumb: 'https://img.youtube.com/vi/3w6p83B3n1w/mqdefault.jpg' },
  { id: '7wtfhZwyrcc', title: 'Nhạc Bolero Trữ Tình Tiếng Hát Hay Nhất Cho Bác Tài', channel: 'Bolero Đặc Sắc', thumb: 'https://img.youtube.com/vi/7wtfhZwyrcc/mqdefault.jpg' },
  { id: 'kXYiU_JCYtU', title: 'Nhạc Acoustic Chill Nhẹ Nhàng Thư Giãn Tuyệt Đối', channel: 'Acoustic Vibe', thumb: 'https://img.youtube.com/vi/kXYiU_JCYtU/mqdefault.jpg' },
  { id: 'kJQP7kiw5Fk', title: 'Despacito & Reggaeton Car Music Hits', channel: 'World Car Music', thumb: 'https://img.youtube.com/vi/kJQP7kiw5Fk/mqdefault.jpg' }
];

// IPTV Live TV Channels List (HLS .m3u8 Streams)
const tvChannels = [
  { name: 'VTV1 HD - Thời Sự & Chính Trị', category: 'Thời Sự', streamUrl: 'https://vtv1.vtvgo.vn/vtv1.m3u8', thumb: 'https://vtvgo.vn/assets/images/logo-vtv1.png' },
  { name: 'VTV3 HD - Giải Trí & Thể Thao', category: 'Giải Trí', streamUrl: 'https://vtv3.vtvgo.vn/vtv3.m3u8', thumb: 'https://vtvgo.vn/assets/images/logo-vtv3.png' },
  { name: 'VTV6 / VTV Cần Thơ HD - Thể Thao', category: 'Thể Thao', streamUrl: 'https://vtv6.vtvgo.vn/vtv6.m3u8', thumb: 'https://vtvgo.vn/assets/images/logo-vtv6.png' },
  { name: 'HTV7 HD - Đài Truyền Hình TP.HCM', category: 'Tổng Hợp', streamUrl: 'https://live.vtcmod.com/htv7.m3u8', thumb: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/HTV7_logo_2016.svg/200px-HTV7_logo_2016.svg.png' },
  { name: 'HTV9 HD - Đài Truyền Hình TP.HCM', category: 'Thời Sự', streamUrl: 'https://live.vtcmod.com/htv9.m3u8', thumb: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/41/HTV9_logo_2016.svg/200px-HTV9_logo_2016.svg.png' },
  { name: 'VTC3 HD - Kênh Thể Thao VTC', category: 'Thể Thao', streamUrl: 'https://live.vtcmod.com/vtc3.m3u8', thumb: 'https://upload.wikimedia.org/wikipedia/commons/4/42/Logo_VTC3.png' }
];

// DOM Elements
const DOM = {
  welcomeOverlay: document.getElementById('welcomeOverlay'),
  btnStartApp: document.getElementById('btnStartApp'),
  navButtons: document.querySelectorAll('.header-nav .nav-btn[data-tab]'),
  tabPanes: document.querySelectorAll('.tab-pane'),
  // Controls
  btnPlayPause: document.getElementById('btnPlayPause'),
  btnPrevTrack: document.getElementById('btnPrevTrack'),
  btnNextTrack: document.getElementById('btnNextTrack'),
  btnStopTrack: document.getElementById('btnStopTrack'),
  btnToggleFav: document.getElementById('btnToggleFav'),
  currentTime: document.getElementById('currentTime'),
  totalTime: document.getElementById('totalTime'),
  progressWrap: document.getElementById('progressWrap'),
  progressFill: document.getElementById('progressFill'),
  nowPlayingTitle: document.getElementById('nowPlayingTitle'),
  nowPlayingSub: document.getElementById('nowPlayingSub'),
  ytMediaList: document.getElementById('ytMediaList'),
  suggestedCategories: document.getElementById('suggestedCategories'),
  favoriteMediaList: document.getElementById('favoriteMediaList'),
  // Modals
  searchModal: document.getElementById('searchModal'),
  settingsModal: document.getElementById('settingsModal'),
  btnOpenSearch: document.getElementById('btnOpenSearch'),
  btnOpenSettings: document.getElementById('btnOpenSettings'),
  btnVoiceModal: document.getElementById('btnVoiceModal'),
  btnVoiceSearch: document.getElementById('btnVoiceSearch'),
  txtSearchQuery: document.getElementById('txtSearchQuery'),
  btnExecuteSearch: document.getElementById('btnExecuteSearch'),
  searchResultsList: document.getElementById('searchResultsList'),
  voiceStatusText: document.getElementById('voiceStatusText'),
  // Settings
  chkLargeThumbnails: document.getElementById('chkLargeThumbnails'),
  chkAutoplay: document.getElementById('chkAutoplay'),
  btnClearData: document.getElementById('btnClearData'),
  // IPTV
  iptvPlayer: document.getElementById('iptvPlayer'),
  tvChannelList: document.getElementById('tvChannelList'),
  iptvChannelTitle: document.getElementById('iptvChannelTitle'),
  iptvChannelSub: document.getElementById('iptvChannelSub'),
  txtSearchTv: document.getElementById('txtSearchTv'),
  // Data Backup
  btnExportData: document.getElementById('btnExportData'),
  btnImportDataTrigger: document.getElementById('btnImportDataTrigger'),
  btnImportData: document.getElementById('btnImportData')
};

/* =========================================================
   INITIALIZATION & EVENT LISTENERS
   ========================================================= */
document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

function initApp() {
  // Check settings
  applySettings();

  // Bind Welcome Overlay Start Button
  DOM.btnStartApp.addEventListener('click', () => {
    DOM.welcomeOverlay.classList.add('hide');
    if (appState.ytPlayer && typeof appState.ytPlayer.playVideo === 'function') {
      appState.ytPlayer.playVideo();
    }
  });

  // Bind Navigation Tabs
  DOM.navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.getAttribute('data-tab');
      switchTab(targetTab);
    });
  });

  // Player Control Buttons
  DOM.btnPlayPause.addEventListener('click', togglePlayPause);
  DOM.btnStopTrack.addEventListener('click', stopVideo);
  DOM.btnPrevTrack.addEventListener('click', playPrevVideo);
  DOM.btnNextTrack.addEventListener('click', playNextVideo);
  DOM.btnToggleFav.addEventListener('click', toggleCurrentFavorite);
  DOM.progressWrap.addEventListener('click', seekVideo);

  // Search Modal Triggers
  DOM.btnOpenSearch.addEventListener('click', () => openModal(DOM.searchModal));
  DOM.btnVoiceModal.addEventListener('click', () => {
    openModal(DOM.searchModal);
    startVoiceRecognition();
  });
  DOM.btnVoiceSearch.addEventListener('click', startVoiceRecognition);
  DOM.btnExecuteSearch.addEventListener('click', handleSearchSubmit);
  DOM.txtSearchQuery.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSearchSubmit();
  });

  // Settings Modal Triggers
  DOM.btnOpenSettings.addEventListener('click', () => openModal(DOM.settingsModal));
  DOM.chkLargeThumbnails.addEventListener('change', (e) => {
    appState.settings.largeThumbnails = e.target.checked;
    saveSettings();
  });
  DOM.chkAutoplay.addEventListener('change', (e) => {
    appState.settings.autoplay = e.target.checked;
    saveSettings();
  });
  DOM.btnClearData.addEventListener('click', resetAllData);

  // Close Modals
  document.querySelectorAll('.modal-close, .modal-overlay').forEach(el => {
    el.addEventListener('click', (e) => {
      if (e.target === el || e.target.classList.contains('modal-close')) {
        closeAllModals();
      }
    });
  });

  // Quick Action Category Buttons
  document.querySelectorAll('#btnQuickPlayCategory, #btnQuickPlayChill').forEach(btn => {
    btn.addEventListener('click', () => {
      const query = btn.getAttribute('data-query');
      DOM.txtSearchQuery.value = query;
      openModal(DOM.searchModal);
      handleSearchSubmit();
    });
  });

  // Backup / Restore Data
  DOM.btnExportData.addEventListener('click', exportUserData);
  DOM.btnImportDataTrigger.addEventListener('click', () => DOM.btnImportData.click());
  DOM.btnImportData.addEventListener('change', importUserData);

  // IPTV TV Search Filter
  DOM.txtSearchTv.addEventListener('input', (e) => renderTvChannels(e.target.value));

  // Render Initial Media Lists
  renderSuggestedCategories();
  renderMediaList(defaultTracks);
  renderFavoriteList();
  renderTvChannels();

  // Progress Bar Updater Timer
  setInterval(updateProgressUI, 500);
}

/* =========================================================
   YOUTUBE IFRAME API HANDLER
   ========================================================= */
window.onYouTubeIframeAPIReady = function() {
  appState.ytPlayer = new YT.Player('youtubePlayerContainer', {
    height: '100%',
    width: '100%',
    videoId: appState.currentVideoId,
    playerVars: {
      'autoplay': 0,
      'controls': 1,
      'rel': 0,
      'modestbranding': 1,
      'origin': window.location.origin
    },
    events: {
      'onReady': onPlayerReady,
      'onStateChange': onPlayerStateChange
    }
  });
};

function onPlayerReady(event) {
  appState.isYtReady = true;
  updateNowPlayingUI(appState.currentVideoTitle, 'TRUNG PLAY • Đang Chờ Phát');
}

function onPlayerStateChange(event) {
  if (event.data === YT.PlayerState.PLAYING) {
    appState.isPlaying = true;
    DOM.btnPlayPause.innerHTML = '<i class="fa-solid fa-pause"></i>';
  } else {
    appState.isPlaying = false;
    DOM.btnPlayPause.innerHTML = '<i class="fa-solid fa-play"></i>';
  }

  // Handle Video Ended -> Autoplay Next Track
  if (event.data === YT.PlayerState.ENDED && appState.settings.autoplay) {
    playNextVideo();
  }
}

function loadVideo(videoId, title, channel = 'TRUNG PLAY') {
  appState.currentVideoId = videoId;
  appState.currentVideoTitle = title;
  updateNowPlayingUI(title, channel);
  updateFavoriteButtonState();

  if (appState.ytPlayer && typeof appState.ytPlayer.loadVideoById === 'function') {
    appState.ytPlayer.loadVideoById(videoId);
    appState.isPlaying = true;
  }
}

function togglePlayPause() {
  if (!appState.ytPlayer || !appState.isYtReady) return;
  if (appState.isPlaying) {
    appState.ytPlayer.pauseVideo();
  } else {
    appState.ytPlayer.playVideo();
  }
}

function stopVideo() {
  if (appState.ytPlayer && typeof appState.ytPlayer.stopVideo === 'function') {
    appState.ytPlayer.stopVideo();
    DOM.progressFill.style.width = '0%';
    DOM.currentTime.innerText = '00:00';
  }
}

function playPrevVideo() {
  const currentIndex = defaultTracks.findIndex(t => t.id === appState.currentVideoId);
  const prevIndex = (currentIndex - 1 + defaultTracks.length) % defaultTracks.length;
  const track = defaultTracks[prevIndex];
  loadVideo(track.id, track.title, track.channel);
}

function playNextVideo() {
  const currentIndex = defaultTracks.findIndex(t => t.id === appState.currentVideoId);
  const nextIndex = (currentIndex + 1) % defaultTracks.length;
  const track = defaultTracks[nextIndex];
  loadVideo(track.id, track.title, track.channel);
}

function seekVideo(e) {
  if (!appState.ytPlayer || typeof appState.ytPlayer.getDuration !== 'function') return;
  const duration = appState.ytPlayer.getDuration();
  if (!duration) return;

  const rect = DOM.progressWrap.getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  const targetPercent = clickX / rect.width;
  const targetTime = targetPercent * duration;

  appState.ytPlayer.seekTo(targetTime, true);
}

function updateProgressUI() {
  if (!appState.ytPlayer || !appState.isYtReady || typeof appState.ytPlayer.getCurrentTime !== 'function') return;
  const currentTime = appState.ytPlayer.getCurrentTime() || 0;
  const duration = appState.ytPlayer.getDuration() || 0;

  if (duration > 0) {
    const percent = (currentTime / duration) * 100;
    DOM.progressFill.style.width = `${percent}%`;
    DOM.currentTime.innerText = formatTime(currentTime);
    DOM.totalTime.innerText = formatTime(duration);
  }
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

function updateNowPlayingUI(title, channel) {
  DOM.nowPlayingTitle.innerText = title;
  DOM.nowPlayingSub.innerText = `${channel} • TRUNG PLAY`;
}

/* =========================================================
   VOICE SEARCH (WEB SPEECH API)
   ========================================================= */
function startVoiceRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    alert('Trình duyệt của bạn chưa hỗ trợ tìm kiếm bằng giọng nói. Hãy gõ từ khóa vào ô tìm kiếm!');
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = 'vi-VN';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  DOM.btnVoiceSearch.classList.add('listening');
  DOM.voiceStatusText.style.display = 'block';

  recognition.start();

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    DOM.txtSearchQuery.value = transcript;
    DOM.btnVoiceSearch.classList.remove('listening');
    DOM.voiceStatusText.style.display = 'none';
    handleSearchSubmit();
  };

  recognition.onerror = () => {
    DOM.btnVoiceSearch.classList.remove('listening');
    DOM.voiceStatusText.style.display = 'none';
  };

  recognition.onend = () => {
    DOM.btnVoiceSearch.classList.remove('listening');
    DOM.voiceStatusText.style.display = 'none';
  };
}

/* =========================================================
   SEARCH & RENDER FUNCTIONS
   ========================================================= */
function handleSearchSubmit() {
  const query = DOM.txtSearchQuery.value.trim();
  if (!query) return;

  DOM.searchResultsList.innerHTML = `<div style="text-align:center; padding:20px; color:var(--tp-cyan);"><i class="fa-solid fa-spinner fa-spin"></i> Đang tìm kiếm bài hát...</div>`;

  // Simulated dynamic search output for YouTube tracks
  setTimeout(() => {
    const searchResults = [
      { id: '3w6p83B3n1w', title: `${query} - Bản Remix Vinahouse Cực Sung`, channel: 'TRUNG PLAY Search', thumb: 'https://img.youtube.com/vi/3w6p83B3n1w/mqdefault.jpg' },
      { id: '5qap5aO4i9A', title: `${query} - Tuyển Tập Lofi Chill Thư Giãn`, channel: 'TRUNG PLAY Search', thumb: 'https://img.youtube.com/vi/5qap5aO4i9A/mqdefault.jpg' },
      { id: '7wtfhZwyrcc', title: `${query} - Bản Phối Khí Bolero Hay Nhất`, channel: 'TRUNG PLAY Search', thumb: 'https://img.youtube.com/vi/7wtfhZwyrcc/mqdefault.jpg' }
    ];

    renderListItems(DOM.searchResultsList, searchResults, true);
  }, 400);
}

function renderMediaList(tracks) {
  renderListItems(DOM.ytMediaList, tracks);
}

function renderSuggestedCategories() {
  const categories = [
    { title: 'Nhạc Trẻ Remix Vinahouse 2026', query: 'nhac tre remix 2026', icon: 'fa-fire', color: 'var(--tp-red)' },
    { title: 'Nhạc Lofi Chill Lái Xe Đêm', query: 'nhac lofi chill lai xe', icon: 'fa-cloud-moon', color: 'var(--tp-cyan)' },
    { title: 'Tuyển Tập Bolero Trữ Tình Hay Nhất', query: 'nhac bolero tru tinh hay nhat', icon: 'fa-guitar', color: 'var(--tp-gold)' },
    { title: 'Nhạc Acoustic Nhẹ Nhàng Cà Phê', query: 'nhac acoustic chill cafe', icon: 'fa-mug-hot', color: '#10b981' }
  ];

  DOM.suggestedCategories.innerHTML = categories.map(cat => `
    <div class="media-item" onclick="quickSearchCategory('${cat.query}')">
      <div class="brand-icon" style="background: ${cat.color}; width:40px; height:40px; font-size:16px;">
        <i class="fa-solid ${cat.icon}"></i>
      </div>
      <div class="media-info">
        <div class="media-name">${cat.title}</div>
        <div class="media-channel">Bấm để phát nhanh theo chủ đề</div>
      </div>
    </div>
  `).join('');
}

window.quickSearchCategory = function(query) {
  DOM.txtSearchQuery.value = query;
  openModal(DOM.searchModal);
  handleSearchSubmit();
};

function renderListItems(container, tracks, isModal = false) {
  container.innerHTML = tracks.map(t => {
    const isActive = t.id === appState.currentVideoId;
    return `
      <div class="media-item ${isActive ? 'active' : ''}" onclick="selectTrack('${t.id}', '${t.title.replace(/'/g, "\\'")}', '${t.channel}')">
        <div class="media-thumb">
          <img src="${t.thumb}" alt="${t.title}" loading="lazy">
        </div>
        <div class="media-info">
          <div class="media-name">${t.title}</div>
          <div class="media-channel">${t.channel}</div>
        </div>
        <button class="ctrl-btn" style="min-width:36px; height:36px; font-size:14px;" onclick="event.stopPropagation(); toggleFavoriteTrack('${t.id}', '${t.title.replace(/'/g, "\\'")}', '${t.channel}', '${t.thumb}')">
          <i class="fa-solid fa-heart" style="color: ${isFavorite(t.id) ? 'var(--tp-red)' : 'var(--tp-text-muted)'};"></i>
        </button>
      </div>
    `;
  }).join('');
}

window.selectTrack = function(id, title, channel) {
  loadVideo(id, title, channel);
  closeAllModals();
};

/* =========================================================
   IPTV STREAM PLAYER HANDLER (HLS.js)
   ========================================================= */
function renderTvChannels(filter = '') {
  const filtered = tvChannels.filter(c => c.name.toLowerCase().includes(filter.toLowerCase()));
  
  DOM.tvChannelList.innerHTML = filtered.map(channel => `
    <div class="media-item" onclick="playTvChannel('${channel.streamUrl}', '${channel.name.replace(/'/g, "\\'")}')">
      <div class="media-thumb" style="background:#1e293b; display:flex; align-items:center; justify-content:center;">
        <i class="fa-solid fa-tv" style="font-size:24px; color:var(--tp-cyan);"></i>
      </div>
      <div class="media-info">
        <div class="media-name">${channel.name}</div>
        <div class="media-channel">Kênh Truyền Hình Direct HLS Stream</div>
      </div>
    </div>
  `).join('');
}

window.playTvChannel = function(streamUrl, channelName) {
  DOM.iptvChannelTitle.innerText = channelName;
  DOM.iptvChannelSub.innerText = 'Đang phát trực tiếp HLS Stream';

  if (Hls.isSupported()) {
    if (appState.hlsPlayer) {
      appState.hlsPlayer.destroy();
    }
    appState.hlsPlayer = new Hls();
    appState.hlsPlayer.loadSource(streamUrl);
    appState.hlsPlayer.attachMedia(DOM.iptvPlayer);
    appState.hlsPlayer.on(Hls.Events.MANIFEST_PARSED, function() {
      DOM.iptvPlayer.play();
    });
  } else if (DOM.iptvPlayer.canPlayType('application/vnd.apple.mpegurl')) {
    DOM.iptvPlayer.src = streamUrl;
    DOM.iptvPlayer.play();
  } else {
    alert('Trình duyệt của bạn không hỗ trợ luồng HLS phát trực tuyến!');
  }
};

/* =========================================================
   FAVORITES & DATA PERSISTENCE
   ========================================================= */
function isFavorite(id) {
  return appState.favorites.some(f => f.id === id);
}

function toggleCurrentFavorite() {
  toggleFavoriteTrack(appState.currentVideoId, appState.currentVideoTitle, 'TRUNG PLAY', `https://img.youtube.com/vi/${appState.currentVideoId}/mqdefault.jpg`);
}

window.toggleFavoriteTrack = function(id, title, channel, thumb) {
  const index = appState.favorites.findIndex(f => f.id === id);
  if (index > -1) {
    appState.favorites.splice(index, 1);
  } else {
    appState.favorites.push({ id, title, channel, thumb });
  }

  localStorage.setItem('tp_favorites', JSON.stringify(appState.favorites));
  updateFavoriteButtonState();
  renderFavoriteList();
  renderMediaList(defaultTracks);
};

function updateFavoriteButtonState() {
  const isFav = isFavorite(appState.currentVideoId);
  if (isFav) {
    DOM.btnToggleFav.classList.add('active');
  } else {
    DOM.btnToggleFav.classList.remove('active');
  }
}

function renderFavoriteList() {
  if (appState.favorites.length === 0) {
    DOM.favoriteMediaList.innerHTML = `<div style="text-align:center; padding:30px; color:var(--tp-text-muted);">Chưa có bài hát hoặc kênh TV nào trong danh sách yêu thích.</div>`;
    return;
  }
  renderListItems(DOM.favoriteMediaList, appState.favorites);
}

/* =========================================================
   SETTINGS & DATA BACKUP / RESTORE
   ========================================================= */
function saveSettings() {
  localStorage.setItem('tp_settings', JSON.stringify(appState.settings));
  applySettings();
}

function applySettings() {
  DOM.chkLargeThumbnails.checked = appState.settings.largeThumbnails;
  DOM.chkAutoplay.checked = appState.settings.autoplay;

  if (appState.settings.largeThumbnails) {
    document.body.classList.add('large-thumbnails');
  } else {
    document.body.classList.remove('large-thumbnails');
  }
}

function resetAllData() {
  if (confirm('Bạn có chắc chắn muốn xóa toàn bộ dữ liệu yêu thích và khôi phục cài đặt mặc định không?')) {
    localStorage.clear();
    appState.favorites = [];
    appState.settings = { largeThumbnails: true, autoplay: true };
    applySettings();
    renderFavoriteList();
    closeAllModals();
    alert('Đã xóa dữ liệu thành công!');
  }
}

function exportUserData() {
  const data = {
    favorites: appState.favorites,
    settings: appState.settings,
    version: '1.0'
  };
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = 'trung-play-backup.json';
  a.click();
  URL.revokeObjectURL(url);
}

function importUserData(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const data = JSON.parse(event.target.result);
      if (data.favorites) appState.favorites = data.favorites;
      if (data.settings) appState.settings = data.settings;
      
      saveSettings();
      renderFavoriteList();
      alert('Đã nhập dữ liệu từ tệp sao lưu thành công!');
    } catch (err) {
      alert('Tệp sao lưu không hợp lệ!');
    }
  };
  reader.readAsText(file);
}

/* =========================================================
   UI MODAL HELPER FUNCTIONS
   ========================================================= */
function switchTab(tabId) {
  appState.currentTab = tabId;
  DOM.navButtons.forEach(btn => {
    if (btn.getAttribute('data-tab') === tabId) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  DOM.tabPanes.forEach(pane => {
    if (pane.id === tabId) {
      pane.classList.add('active');
    } else {
      pane.classList.remove('active');
    }
  });
}

function openModal(modal) {
  modal.classList.add('show');
}

function closeAllModals() {
  document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('show'));
}
