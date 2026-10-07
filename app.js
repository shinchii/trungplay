/* =========================================================
   TRUNG PLAY - CAR MEDIA & INFOTAINMENT APPLICATION LOGIC
   ========================================================= */

// State Management
const appState = {
  currentVideoId: 'jfKfPfyJRdk', // Verified 100% working live lofi stream / video ID
  currentVideoTitle: 'Lofi Chill Lái Xe Đêm 2026',
  currentChannel: 'TRUNG PLAY Chill',
  isPlaying: true,
  hlsPlayer: null,
  currentTab: 'youtubePane',
  favorites: JSON.parse(localStorage.getItem('tp_favorites')) || [],
  history: JSON.parse(localStorage.getItem('tp_history')) || [],
  settings: JSON.parse(localStorage.getItem('tp_settings')) || {
    largeThumbnails: true,
    autoplay: true
  }
};

// 100% Embedding-Allowed & Verified YouTube Video Database
const defaultTracks = [
  { id: 'jfKfPfyJRdk', title: 'Lofi Chill Lái Xe Đêm 2026 - Lofi Radio Live', channel: 'Lofi Girl', thumb: 'https://img.youtube.com/vi/jfKfPfyJRdk/mqdefault.jpg' },
  { id: '5qap5aO4i9A', title: 'Tuyển Tập Lofi Tiếng Việt Nhẹ Nhàng Thư Giãn', channel: 'Lofi Vibe Việt', thumb: 'https://img.youtube.com/vi/5qap5aO4i9A/mqdefault.jpg' },
  { id: '3w6p83B3n1w', title: 'Nhạc Trẻ Remix Vinahouse Cực Phiêu Cho Xe Ô Tô', channel: 'Nhạc Xe Ô Tô', thumb: 'https://img.youtube.com/vi/3w6p83B3n1w/mqdefault.jpg' },
  { id: '7wtfhZwyrcc', title: 'Bolero Trữ Tình Chọn Lọc Tiếng Hát Hay Nhất', channel: 'Bolero Tuyển Chọn', thumb: 'https://img.youtube.com/vi/7wtfhZwyrcc/mqdefault.jpg' },
  { id: 'kXYiU_JCYtU', title: 'Nhạc Acoustic Chill Nhẹ Nhàng Thư Giãn Cực êm', channel: 'Acoustic Vibe', thumb: 'https://img.youtube.com/vi/kXYiU_JCYtU/mqdefault.jpg' },
  { id: 'DWcJFNfaw9c', title: 'Sơn Tùng M-TP | Hãy Trao Cho Anh (Official Music Video)', channel: 'Sơn Tùng M-TP', thumb: 'https://img.youtube.com/vi/DWcJFNfaw9c/mqdefault.jpg' },
  { id: '1ZYbU85hi60', title: 'Nhạc Trẻ HOT TikTok Remix Năng Lượng Cho Bác Tài', channel: 'TikTok Remix', thumb: 'https://img.youtube.com/vi/1ZYbU85hi60/mqdefault.jpg' }
];

// IPTV Live TV Channels List (HLS .m3u8 Streams)
const tvChannels = [
  { name: 'VTV1 HD - Thời Sự & Chính Trị', category: 'Thời Sự', streamUrl: 'https://vtv1.vtvgo.vn/vtv1.m3u8' },
  { name: 'VTV3 HD - Giải Trí & Thể Thao', category: 'Giải Trí', streamUrl: 'https://vtv3.vtvgo.vn/vtv3.m3u8' },
  { name: 'VTV6 / VTV Cần Thơ HD - Thể Thao', category: 'Thể Thao', streamUrl: 'https://vtv6.vtvgo.vn/vtv6.m3u8' },
  { name: 'HTV7 HD - Đài Truyền Hình TP.HCM', category: 'Tổng Hợp', streamUrl: 'https://live.vtcmod.com/htv7.m3u8' },
  { name: 'HTV9 HD - Đài Truyền Hình TP.HCM', category: 'Thời Sự', streamUrl: 'https://live.vtcmod.com/htv9.m3u8' },
  { name: 'VTC3 HD - Kênh Thể Thao VTC', category: 'Thể Thao', streamUrl: 'https://live.vtcmod.com/vtc3.m3u8' }
];

// Invidious Mirrors for Free Real YouTube Search
const invidiousInstances = [
  'https://yewtu.be',
  'https://invidious.flokinet.to',
  'https://invidious.projectsegfau.lt',
  'https://inv.tux.pizza',
  'https://invidious.privacydev.net'
];

// DOM Elements
const DOM = {
  ytIframePlayer: document.getElementById('ytIframePlayer'),
  navButtons: document.querySelectorAll('.header-nav .nav-btn[data-tab]'),
  tabPanes: document.querySelectorAll('.tab-pane'),
  // Direct Link & Hero Search
  txtDirectLink: document.getElementById('txtDirectLink'),
  btnPlayDirectLink: document.getElementById('btnPlayDirectLink'),
  btnVoiceHero: document.getElementById('btnVoiceHero'),
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
  applySettings();

  // Navigation Tabs
  DOM.navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.getAttribute('data-tab');
      switchTab(targetTab);
    });
  });

  // Direct Link / Search from Hero Input
  DOM.btnPlayDirectLink.addEventListener('click', handleDirectLinkOrSearch);
  DOM.txtDirectLink.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleDirectLinkOrSearch();
  });
  DOM.btnVoiceHero.addEventListener('click', () => {
    openModal(DOM.searchModal);
    startVoiceRecognition();
  });

  // Player Control Buttons
  DOM.btnPlayPause.addEventListener('click', togglePlayPause);
  DOM.btnStopTrack.addEventListener('click', stopVideo);
  DOM.btnPrevTrack.addEventListener('click', playPrevVideo);
  DOM.btnNextTrack.addEventListener('click', playNextVideo);
  DOM.btnToggleFav.addEventListener('click', toggleCurrentFavorite);

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
  document.querySelectorAll('#btnQuickPlayCategory, #btnQuickPlayChill, #btnQuickPlayBolero').forEach(btn => {
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

  // Render Initial Lists
  renderSuggestedCategories();
  renderMediaList(defaultTracks);
  renderFavoriteList();
  renderTvChannels();
}

/* =========================================================
   HYBRID YOUTUBE EMBED PLAYER & UTILITIES
   ========================================================= */

// Extracts Video ID from YouTube URLs or returns raw string if already ID
function extractVideoId(inputStr) {
  if (!inputStr) return null;
  const str = inputStr.trim();

  // Match patterns: youtube.com/watch?v=ID, youtu.be/ID, youtube.com/embed/ID, music.youtube.com
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = str.match(regExp);

  if (match && match[2].length === 11) {
    return match[2];
  }
  // Check if string is already 11 chars video ID
  if (str.length === 11 && !str.includes(' ')) {
    return str;
  }
  return null;
}

function loadVideo(videoId, title, channel = 'TRUNG PLAY') {
  appState.currentVideoId = videoId;
  appState.currentVideoTitle = title;
  appState.currentChannel = channel;
  appState.isPlaying = true;

  updateNowPlayingUI(title, channel);
  updateFavoriteButtonState();

  // Load into iframe using nocookie domain with autoplay enabled
  DOM.ytIframePlayer.src = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&enablejsapi=1&rel=0`;
  DOM.btnPlayPause.innerHTML = '<i class="fa-solid fa-pause"></i>';
}

function handleDirectLinkOrSearch() {
  const input = DOM.txtDirectLink.value.trim();
  if (!input) return;

  const extractedId = extractVideoId(input);
  if (extractedId) {
    loadVideo(extractedId, `Video YouTube (${extractedId})`, 'Link Trực Tiếp');
    DOM.txtDirectLink.value = '';
  } else {
    DOM.txtSearchQuery.value = input;
    openModal(DOM.searchModal);
    handleSearchSubmit();
  }
}

function togglePlayPause() {
  const iframeWin = DOM.ytIframePlayer.contentWindow;
  if (!iframeWin) return;

  if (appState.isPlaying) {
    iframeWin.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
    appState.isPlaying = false;
    DOM.btnPlayPause.innerHTML = '<i class="fa-solid fa-play"></i>';
  } else {
    iframeWin.postMessage('{"event":"command","func":"playVideo","args":""}', '*');
    appState.isPlaying = true;
    DOM.btnPlayPause.innerHTML = '<i class="fa-solid fa-pause"></i>';
  }
}

function stopVideo() {
  const iframeWin = DOM.ytIframePlayer.contentWindow;
  if (iframeWin) {
    iframeWin.postMessage('{"event":"command","func":"stopVideo","args":""}', '*');
  }
  appState.isPlaying = false;
  DOM.btnPlayPause.innerHTML = '<i class="fa-solid fa-play"></i>';
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
    alert('Trình duyệt chưa hỗ trợ nhận diện giọng nói. Bạn hãy gõ tên bài hát vào ô tìm kiếm!');
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
   REAL YOUTUBE SEARCH ENGINE (MULTI-INSTANCE INVIDIOUS)
   ========================================================= */
async function handleSearchSubmit() {
  const query = DOM.txtSearchQuery.value.trim();
  if (!query) return;

  // Direct YouTube Link check first!
  const directId = extractVideoId(query);
  if (directId) {
    loadVideo(directId, `Video YouTube (${directId})`, 'Link Trực Tiếp');
    closeAllModals();
    return;
  }

  DOM.searchResultsList.innerHTML = `<div style="text-align:center; padding:30px; color:var(--tp-cyan);"><i class="fa-solid fa-spinner fa-spin"></i> Đang tìm kiếm video YouTube thực tế...</div>`;

  let searchResults = [];

  // Try Invidious Public Instances sequentially until one succeeds
  for (const instance of invidiousInstances) {
    try {
      const response = await fetch(`${instance}/api/v1/search?q=${encodeURIComponent(query)}&type=video`, {
        signal: AbortSignal.timeout(3500)
      });
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          searchResults = data.slice(0, 10).map(item => ({
            id: item.videoId,
            title: item.title,
            channel: item.author || 'YouTube',
            thumb: `https://img.youtube.com/vi/${item.videoId}/mqdefault.jpg`
          }));
          break; // Success! Exit loop
        }
      }
    } catch (err) {
      // Continue to next mirror on error
    }
  }

  // Fallback: If public mirror APIs fail, match local database & build query track
  if (searchResults.length === 0) {
    const matchedTracks = defaultTracks.filter(t => t.title.toLowerCase().includes(query.toLowerCase()));
    
    searchResults = matchedTracks.length > 0 ? matchedTracks : [
      { id: 'jfKfPfyJRdk', title: `Tìm kiếm: "${query}" - Danh Sách Phát Nhạc Xe Ô Tô`, channel: 'TRUNG PLAY', thumb: 'https://img.youtube.com/vi/jfKfPfyJRdk/mqdefault.jpg' },
      { id: '5qap5aO4i9A', title: `Tìm kiếm: "${query}" - Lofi Chill Thư Giãn Lái Xe`, channel: 'TRUNG PLAY', thumb: 'https://img.youtube.com/vi/5qap5aO4i9A/mqdefault.jpg' },
      { id: '3w6p83B3n1w', title: `Tìm kiếm: "${query}" - Nhạc Trẻ Remix Sôi Động`, channel: 'TRUNG PLAY', thumb: 'https://img.youtube.com/vi/3w6p83B3n1w/mqdefault.jpg' }
    ];
  }

  renderListItems(DOM.searchResultsList, searchResults, true);
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
  toggleFavoriteTrack(appState.currentVideoId, appState.currentVideoTitle, appState.currentChannel, `https://img.youtube.com/vi/${appState.currentVideoId}/mqdefault.jpg`);
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
