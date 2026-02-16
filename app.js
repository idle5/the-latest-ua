// ============================================
// UKRAINE: THE LATEST — 2026 PORTFOLIO REDESIGN
// ============================================
'use strict';

const RSS_URL = 'https://feeds.acast.com/public/shows/67a60b513ef0b176eae6a5d0';
const EPISODES_JSON = './episodes.json';
const FIRST_UA_DATE = new Date('2025-12-17T00:00:00Z');
const TRANSLATE_API = 'https://translate.googleapis.com/translate_a/single';
const LS_KEYS = {
    resume: 'utl_resume',
    queue: 'utl_queue',
    history: 'utl_history',
    volume: 'utl_volume',
    theme: 'utl_theme', // light, dark, or system
};

// ============================================
// DOM REFS — 2026 STRUCTURE
// ============================================
const $ = (id) => document.getElementById(id);

const dom = {
    // Mini-player
    miniPlayer: $('mini-player'),
    miniArtwork: $('mini-artwork'),
    miniTitle: $('mini-title'),
    miniTime: $('mini-time'),
    miniBtnPlay: $('mini-btn-play'),
    miniIconPlay: $('mini-icon-play'),
    miniIconPause: $('mini-icon-pause'),
    miniBtnBack: $('mini-btn-back'),
    miniBtnFwd: $('mini-btn-fwd'),
    miniBtnPrev: $('mini-btn-prev'),
    miniBtnNext: $('mini-btn-next'),
    miniBtnExpand: $('mini-btn-expand'),

    // Hero Modal
    heroModal: $('hero-modal'),
    heroImage: $('hero-image'),
    btnCloseModal: $('btn-close-modal'),
    playStateTag: $('play-state-tag'),
    playStateText: $('play-state-text'),
    epCounter: $('ep-counter'),
    epTitle: $('ep-title'),
    epDate: $('ep-date'),
    audio: $('audio'),
    toastContainer: $('toast-container'),
    seek: $('seek-slider'),
    timeCurrent: $('time-current'),
    timeDuration: $('time-duration'),
    volBtn: $('vol-btn'),
    volIconHigh: $('vol-icon-high'),
    volIconLow: $('vol-icon-low'),
    volIconMuted: $('vol-icon-muted'),
    volSlider: $('vol-slider'),
    btnPrevEp: $('btn-prev-ep'),
    btnBack: $('btn-back'),
    btnPlay: $('btn-play'),
    iconPlay: $('icon-play'),
    iconPause: $('icon-pause'),
    btnFwd: $('btn-fwd'),
    btnNextEp: $('btn-next-ep'),
    speedSelect: $('speed-select'),

    // Episode/List
    episodeList: $('episode-list'),
    episodeCount: $('episode-count'),
    continueBanner: $('continue-banner'),
    continueTitle: $('continue-title'),
    continueProgress: $('continue-progress'),

    // Collapsible sections
    queueOverlay: $('queue-overlay'),
    queueOverlayClose: $('queue-overlay-close'),
    queueToggleBtn: $('queue-toggle-btn'),
    queueBadge: $('queue-badge'),
    queueBadgeMini: $('mini-queue-badge'),
    queueList: $('queue-list'),
    historyToggle: $('history-toggle'),
    historyCollapsible: $('history-collapsible'),
    historyList: $('history-list'),

    // Hotkey FAB
    hotkeyFabBtn: $('hotkey-fab-btn'),
    hotkeyPanel: $('hotkey-panel'),

    // Mobile Extras

    scrollFab: $('scroll-fab'),
    miniQueueBtn: $('mini-queue-btn'),
    miniQueueBadge: $('mini-queue-badge'),

    // Error
    errorState: $('error-state'),
    btnRetry: $('btn-retry'),
};

// ============================================
// STATE
// ============================================
let allEpisodes = [];
let currentEpIndex = -1;
let queue = [];
let history = [];
let isSeeking = false;
let currentSearchTerm = '';
let activeTopic = null;

// ============================================
// UTILITY: localStorage
// ============================================
function saveJSON(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
        console.warn('localStorage save failed:', key, e);
    }
}

function loadJSON(key, fallback = null) {
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
        return fallback;
    }
}

// ============================================
// FETCH: Episodes from episodes.json (Primary)
// ============================================
async function fetchEpisodes() {
    try {
        const res = await fetch(EPISODES_JSON);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        if (!Array.isArray(data) || data.length === 0) {
            throw new Error('No episodes in episodes.json');
        }

        return data
            .map(ep => ({
                guid: ep.guid || ep.title,
                title: ep.title || 'Без назви',
                description: ep.description || '',
                pubDate: ep.pubDate || ep.isoDate || '',
                enclosure: { link: ep.enclosure?.link || ep.enclosure?.url || ep.audioUrl || '' },
                thumbnail: ep.thumbnail || ep.image || ep.itunes?.image || ''
            }))
            .filter(ep => {
                const pubDate = new Date(ep.pubDate);
                return !isNaN(pubDate) && pubDate >= FIRST_UA_DATE;
            })
            .sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
    } catch (err) {
        console.error('episodes.json failed:', err);
        throw err;
    }
}

// ============================================
// RENDER: Episode Grid with Show More
// ============================================
const EPISODES_PER_PAGE = 12;
let visibleCount = EPISODES_PER_PAGE;

function renderEpisodeList() {
    dom.episodeList.innerHTML = '';

    // Filter episodes
    const filtered = allEpisodes.filter((ep, i) => {
        const epNum = allEpisodes.length - i;

        // 1. Search Filter
        let matchesSearch = false;

        if (!currentSearchTerm) {
            matchesSearch = true;
        } else if (currentSearchTerm.startsWith('#')) {
            // Strict search for #Number: Only match Episode Number or Title
            const numberMatch = `#${epNum}` === currentSearchTerm;
            const titleMatch = ep.title.toLowerCase().includes(currentSearchTerm);
            matchesSearch = numberMatch || titleMatch;
        } else {
            // Normal search: Title, Description, or simple Number
            const titleMatch = ep.title.toLowerCase().includes(currentSearchTerm);
            const descMatch = ep.description && ep.description.toLowerCase().includes(currentSearchTerm);
            // Allow finding #36 by typing "36"
            const numberMatch = epNum.toString() === currentSearchTerm || `#${epNum}` === currentSearchTerm;

            matchesSearch = numberMatch || titleMatch || descMatch;
        }

        // 2. Topic Filter
        const matchesTopic = !activeTopic || checkTopicMatch(ep, activeTopic);

        return matchesSearch && matchesTopic;
    });

    const total = filtered.length;

    // Update count text
    if (currentSearchTerm || activeTopic) {
        dom.episodeCount.textContent = `Знайдено: ${total}`;
    } else {
        dom.episodeCount.textContent = `${allEpisodes.length} випусків`;
    }

    if (total === 0) {
        dom.episodeList.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-tertiary);">
                Нічого не знайдено за запитом "${currentSearchTerm || activeTopic}"
                <br>
                <button onclick="clearSearch()" class="btn-2026" style="margin-top: 16px;">Очистити фільтри</button>
            </div>
        `;
        return;
    }

    const toShow = Math.min(visibleCount, total);

    filtered.slice(0, toShow).forEach((ep) => {
        // Find original index for playback
        const idx = allEpisodes.findIndex(e => e.guid === ep.guid);
        // Fix: Use allEpisodes.length for absolute episode number
        const num = allEpisodes.length - idx;

        const card = document.createElement('div');
        card.className = 'episode-card glass-card-2026';
        card.id = `ep-${ep.guid}`;

        const histEntry = history.find(h => h.guid === ep.guid);
        const isSelected = idx === currentEpIndex;
        const isPlaying = isSelected && !dom.audio.paused;
        const isPlayed = histEntry && histEntry.time > 30;

        if (isSelected) card.classList.add('ep-selected');
        if (isPlaying) card.classList.add('ep-playing');
        if (!isSelected && isPlayed) card.classList.add('ep-played');
        if (!isSelected && !isPlayed) card.classList.add('ep-unplayed');

        const dateObj = new Date(ep.pubDate);
        const formattedDate = dateObj.toLocaleDateString('uk-UA', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });

        const isInQueue = queue.some(q => q.guid === ep.guid);
        const artwork = ep.thumbnail || '';

        card.innerHTML = `
            ${artwork ? `<img src="${artwork}" alt="${ep.title}" class="episode-artwork" loading="lazy" width="60" height="60">` : ''}
            <span class="episode-number">#${num}</span>
            <h3 class="episode-title">${ep.title}</h3>
            
            
            <div class="card-actions-top-right">
                <button class="card-share-btn" onclick="shareEpisode(event, ${idx})" aria-label="Поділитися" title="Копіювати посилання">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="18" cy="5" r="3"></circle>
                        <circle cx="6" cy="12" r="3"></circle>
                        <circle cx="18" cy="19" r="3"></circle>
                        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                    </svg>
                </button>
                
                <button class="large-queue-btn ${isInQueue ? 'in-queue' : ''}" onclick="addToQueue(${idx});" aria-label="${isInQueue ? 'У черзі' : 'Додати до черги'}" title="${isInQueue ? 'У черзі' : 'Додати до черги'}">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                        ${isInQueue ? '<path d="M20 6L9 17l-5-5"/>' : '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>'}
                    </svg>
                </button>
            </div>
            
            <div class="card-bottom-row">
                <div class="episode-date">${formattedDate}</div>
                <button class="circular-play-btn" data-ep-idx="${idx}" onclick="handleCardPlay(${idx})" aria-label="Відтворити епізод ${num}" title="${isPlaying ? 'Пауза' : 'Відтворити'}">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        ${isPlaying ? '<rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>' : '<path d="M8 5v14l11-7z"/>'}
                    </svg>
                </button>
            </div>
            

        `;

        dom.episodeList.appendChild(card);
    });

    // Show More button
    if (toShow < total) {
        const showMoreBtn = document.createElement('button');
        showMoreBtn.className = 'btn-show-more';
        showMoreBtn.textContent = `Показати ще (${total - toShow} залишилось)`;
        showMoreBtn.onclick = () => {
            visibleCount += EPISODES_PER_PAGE;
            renderEpisodeList();
        };
        dom.episodeList.appendChild(showMoreBtn);
    }
}

// ============================================
// LOAD EPISODE
// ============================================
async function loadEpisode(index, autoPlay = false) {
    if (index < 0 || index >= allEpisodes.length) return;

    currentEpIndex = index;
    const ep = allEpisodes[index];
    const num = allEpisodes.length - index;

    // Update Hero Modal
    dom.epTitle.textContent = ep.title;
    dom.epCounter.textContent = `Випуск ${num} з ${allEpisodes.length}`;

    const dateObj = new Date(ep.pubDate);
    dom.epDate.textContent = dateObj.toLocaleDateString('uk-UA', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });

    const artwork = ep.thumbnail || '';
    dom.heroImage.src = artwork;
    dom.heroImage.alt = `Обкладинка: ${ep.title}`;

    // Update Mini-player
    dom.miniArtwork.src = artwork;
    dom.miniTitle.textContent = ep.title;

    // Load Audio (fix: use enclosure.link, not enclosure directly)
    const audioUrl = ep.enclosure?.link || ep.enclosure || '';
    dom.audio.src = audioUrl;
    dom.audio.load();
    console.log('Loading audio:', audioUrl);

    // Resume from saved position if available
    const resumeData = loadJSON(LS_KEYS.resume);
    if (resumeData && resumeData.guid === ep.guid && resumeData.time > 5) {
        dom.audio.currentTime = resumeData.time;
    }

    // Auto-play if requested (from play button click)
    if (autoPlay) {
        dom.audio.addEventListener('canplay', function onCanPlay() {
            dom.audio.play().catch(err => console.log('Auto-play prevented:', err));
            updatePlayState(true);
            dom.audio.removeEventListener('canplay', onCanPlay);
        }, { once: true });
    }

    // MediaSession API (Lock-screen controls)
    updateMediaSession(ep, num);

    // Update active state in episode list
    renderEpisodeList();

    // Add to history
    addToHistory(ep);
}

// ============================================
// MEDIA SESSION API (iOS/Android Lock-Screen)
// ============================================
function updateMediaSession(ep, num) {
    if (!('mediaSession' in navigator)) return;

    navigator.mediaSession.metadata = new MediaMetadata({
        title: ep.title,
        artist: 'Ukraine: The Latest',
        album: `Випуск ${num}`,
        artwork: [
            { src: ep.image || '', sizes: '512x512', type: 'image/jpeg' }
        ]
    });

    navigator.mediaSession.setActionHandler('play', () => {
        dom.audio.play();
        updatePlayState(true);
    });

    navigator.mediaSession.setActionHandler('pause', () => {
        dom.audio.pause();
        updatePlayState(false);
    });

    navigator.mediaSession.setActionHandler('seekbackward', () => {
        dom.audio.currentTime = Math.max(0, dom.audio.currentTime - 15);
    });

    navigator.mediaSession.setActionHandler('seekforward', () => {
        dom.audio.currentTime = Math.min(dom.audio.duration || 0, dom.audio.currentTime + 30);
    });

    navigator.mediaSession.setActionHandler('previoustrack', () => {
        if (currentEpIndex < allEpisodes.length - 1) {
            loadEpisode(currentEpIndex + 1);
            dom.audio.play();
        }
    });

    navigator.mediaSession.setActionHandler('nexttrack', () => {
        if (currentEpIndex > 0) {
            loadEpisode(currentEpIndex - 1);
            dom.audio.play();
        }
    });
}

// ============================================
// SHOW/HIDE HERO MODAL
// ============================================
function showHeroModal() {
    dom.heroModal.classList.add('visible');
    document.body.style.overflow = 'hidden';
}

function hideHeroModal() {
    dom.heroModal.classList.remove('visible');
    document.body.style.overflow = '';
}

dom.btnCloseModal.addEventListener('click', hideHeroModal);
dom.heroModal.addEventListener('click', (e) => {
    if (e.target === dom.heroModal) hideHeroModal();
});

// Escape key to close
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && dom.heroModal.classList.contains('visible')) {
        hideHeroModal();
    }
});

// Expand mini-player
dom.miniBtnExpand.addEventListener('click', showHeroModal);

// ============================================
// PLAY STATE MANAGEMENT
// ============================================
function updatePlayState(isPlaying) {
    // Update Play/Pause buttons (Hero)
    if (isPlaying) {
        dom.iconPlay.classList.add('hidden');
        dom.iconPause.classList.remove('hidden');
        dom.playStateTag.classList.remove('hidden', 'paused');
        dom.playStateText.textContent = 'ЗАРАЗ ГРАЄ';
    } else {
        dom.iconPlay.classList.remove('hidden');
        dom.iconPause.classList.add('hidden');
        dom.playStateTag.classList.remove('hidden');
        dom.playStateTag.classList.add('paused');
        dom.playStateText.textContent = 'ПАУЗА';
    }

    // Update Mini-player
    if (isPlaying) {
        dom.miniIconPlay.classList.add('hidden');
        dom.miniIconPause.classList.remove('hidden');
        dom.miniPlayer.classList.add('visible');
    } else {
        dom.miniIconPlay.classList.remove('hidden');
        dom.miniIconPause.classList.add('hidden');
        // Keep mini-player visible even when paused
    }

    // Update ♫ playing badge on episode cards
    document.querySelectorAll('.episode-card').forEach((card, idx) => {
        if (idx === currentEpIndex && isPlaying) {
            card.classList.add('ep-playing');
        } else {
            card.classList.remove('ep-playing');
        }
    });

    // Update play/pause icon on card buttons
    document.querySelectorAll('.circular-play-btn').forEach(btn => {
        const epIdx = parseInt(btn.getAttribute('data-ep-idx'), 10);
        const svg = btn.querySelector('svg');
        if (epIdx === currentEpIndex && isPlaying) {
            svg.innerHTML = '<rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>';
            btn.title = 'Пауза';
        } else {
            svg.innerHTML = '<path d="M8 5v14l11-7z"/>';
            btn.title = 'Відтворити';
        }
    });
}

// ============================================
// PLAYBACK CONTROLS
// ============================================
function handleCardPlay(idx) {
    if (idx === currentEpIndex) {
        // Same episode — toggle play/pause
        // If audio hasn't started yet (first click on pre-loaded ep), also open hero
        const isFirstPlay = dom.audio.paused && dom.audio.currentTime < 1;
        togglePlay();
        if (isFirstPlay) showHeroModal();
    } else {
        // Different episode — load and play
        loadEpisode(idx, true);
        showHeroModal();
    }
}

function togglePlay() {
    if (dom.audio.paused) {
        dom.audio.play().catch(() => { });
        updatePlayState(true);
    } else {
        dom.audio.pause();
        updatePlayState(false);
    }
}

// Play/Pause Buttons
dom.btnPlay.addEventListener('click', togglePlay);
dom.miniBtnPlay.addEventListener('click', togglePlay);

// Skip Buttons
dom.btnBack.addEventListener('click', () => {
    dom.audio.currentTime = Math.max(0, dom.audio.currentTime - 15);
});

dom.btnFwd.addEventListener('click', () => {
    dom.audio.currentTime = Math.min(dom.audio.duration || 0, dom.audio.currentTime + 30);
});

dom.miniBtnBack.addEventListener('click', () => {
    dom.audio.currentTime = Math.max(0, dom.audio.currentTime - 15);
});

dom.miniBtnFwd.addEventListener('click', () => {
    dom.audio.currentTime = Math.min(dom.audio.duration || 0, dom.audio.currentTime + 30);
});

// Previous/Next Episode
dom.btnPrevEp.addEventListener('click', () => {
    if (currentEpIndex < allEpisodes.length - 1) {
        loadEpisode(currentEpIndex + 1);
        dom.audio.play();
    }
});

dom.btnNextEp.addEventListener('click', () => {
    if (currentEpIndex > 0) {
        loadEpisode(currentEpIndex - 1);
        dom.audio.play();
    }
});

dom.miniBtnPrev.addEventListener('click', () => {
    if (currentEpIndex < allEpisodes.length - 1) {
        loadEpisode(currentEpIndex + 1);
        dom.audio.play();
    }
});

dom.miniBtnNext.addEventListener('click', () => {
    if (currentEpIndex > 0) {
        loadEpisode(currentEpIndex - 1);
        dom.audio.play();
    }
});

// Seek Slider
dom.seek.addEventListener('input', () => {
    isSeeking = true;
});

dom.seek.addEventListener('change', () => {
    const time = (dom.seek.value / 100) * (dom.audio.duration || 0);
    dom.audio.currentTime = time;
    isSeeking = false;
});

// Volume Control (uses audio.muted for iOS Safari compatibility)
dom.volBtn.addEventListener('click', () => {
    dom.audio.muted = !dom.audio.muted;
    updateVolumeIcon();
    saveJSON(LS_KEYS.volume, dom.audio.muted ? 0 : dom.audio.volume);
});

dom.volSlider.addEventListener('input', () => {
    dom.audio.volume = parseFloat(dom.volSlider.value);
    dom.audio.muted = false;
    updateVolumeIcon();
    saveJSON(LS_KEYS.volume, dom.audio.volume);
});

function updateVolumeIcon() {
    const vol = dom.audio.muted ? 0 : dom.audio.volume;
    dom.volIconHigh.classList.toggle('hidden', vol < 0.5);
    dom.volIconLow.classList.toggle('hidden', vol === 0 || vol >= 0.5);
    dom.volIconMuted.classList.toggle('hidden', vol > 0);
}

// ============================================
// SEARCH & TOPIC FILTERING
// ============================================

// Topic Keywords Mapping
const TOPIC_KEYWORDS = {
    'Україна': ['україна', 'київ', 'львів', 'харків', 'одеса'],
    'Фронт': ['фронт', 'бахмут', 'авдіївка', 'куп\'янськ', 'запоріжжя', 'херсон', 'донбас', 'наступ', 'контрнаступ', 'оборона'],
    'Переговори': ['переговори', 'мир', 'женева', 'стамбул', 'угода', 'припинення вогню'],
    'Геополітика': ['британія', 'лондон', 'макрон', 'шольц', 'китай', 'сі цзіньпін', 'індія', 'глобальний південь'],
    'ЄС': ['єс', 'євросоюз', 'нато', 'альянс', 'брюссель', 'членство'],
    'США': ['сша', 'америка', 'трамп', 'байден', 'вашингтон', 'конгрес', 'сенат', 'республіканці', 'демократи'],
    'Росія': ['росія', 'рф', 'москва', 'путін', 'кремль', 'шойгу', 'герасимов'],
    'Санкції': ['санкції', 'економіка', 'нафта', 'газ', 'рубль', 'Swift', 'активи'],
    'Зброя': ['f-16', 'himars', 'patriot', 'leopard', 'abrams', 'atacms', 'снаряди', 'танки', 'ракети', 'дрони', 'бпла'],
    'Аналітика': ['аналіз', 'експерт', 'погляд', 'думка', 'стратегія', 'тактика'],
    'Політика': ['політика', 'парламент', 'рада', 'уряд', 'міністр', 'депутат', 'корупція'],
    'Зеленський': ['зеленський', 'президент', 'офіс президента']
};

function checkTopicMatch(ep, topic) {
    const text = (ep.title + ' ' + (ep.description || '')).toLowerCase();
    const keywords = TOPIC_KEYWORDS[topic] || [topic.toLowerCase()];
    return keywords.some(k => text.includes(k));
}

// Global Filter Functions
window.filterByTopic = function (topic) {
    const isSame = activeTopic === topic;
    activeTopic = isSame ? null : topic;
    currentSearchTerm = ''; // Clear text search when clicking topic

    // Update UI
    if ($('search-input')) $('search-input').value = '';
    updateFilterUI();

    // Reset visible count
    visibleCount = EPISODES_PER_PAGE;
    renderEpisodeList();

    // Scroll to list
    const listTop = dom.episodeList.getBoundingClientRect().top + window.scrollY - 180;
    window.scrollTo({ top: listTop, behavior: 'smooth' });
};

window.clearSearch = function () {
    currentSearchTerm = '';
    activeTopic = null;
    if ($('search-input')) $('search-input').value = '';
    updateFilterUI();
    renderEpisodeList();
};

function updateFilterUI() {
    // Toggle active state on topic buttons
    document.querySelectorAll('.topic-tag').forEach(btn => {
        const btnTopic = btn.textContent.split(' ').slice(1).join(' '); // Remove emoji
        // Simple check: if button text contains the active topic
        if (activeTopic && btn.textContent.includes(activeTopic)) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    // Show/Hide Clear Button in search
    const clearBtn = $('search-clear');
    if (clearBtn) {
        if (currentSearchTerm || activeTopic) {
            clearBtn.classList.remove('hidden');
        } else {
            clearBtn.classList.add('hidden');
        }
    }
}

// Setup Search Handlers
function setupSearch() {
    const input = $('search-input');
    const clearBtn = $('search-clear');

    if (input) {
        input.addEventListener('input', (e) => {
            const val = e.target.value.trim();
            currentSearchTerm = val ? val.toLowerCase() : '';
            activeTopic = null; // Clear topic when typing
            updateFilterUI();
            visibleCount = EPISODES_PER_PAGE;
            renderEpisodeList();
        });
    }

    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            if (input) {
                input.value = '';
                currentSearchTerm = '';
                activeTopic = null;
                updateFilterUI();
                visibleCount = EPISODES_PER_PAGE;
                renderEpisodeList();
            }
        });
    }
}

// Initialize Search
setupSearch();

// Speed Control
dom.speedSelect.addEventListener('change', () => {
    dom.audio.playbackRate = parseFloat(dom.speedSelect.value);
});

// ============================================
// AUDIO EVENT LISTENERS
// ============================================
dom.audio.addEventListener('loadedmetadata', () => {
    dom.seek.max = 100;
});

dom.audio.addEventListener('timeupdate', () => {
    if (!isSeeking && dom.audio.duration) {
        const percent = (dom.audio.currentTime / dom.audio.duration) * 100;
        dom.seek.value = percent;
    }

    // Update time displays
    dom.timeCurrent.textContent = formatTime(dom.audio.currentTime || 0);
    dom.timeDuration.textContent = formatTime(dom.audio.duration || 0);
    dom.miniTime.textContent = `${formatTime(dom.audio.currentTime || 0)} / ${formatTime(dom.audio.duration || 0)}`;

    // Save resume data every 5 seconds
    if (currentEpIndex >= 0 && Math.floor(dom.audio.currentTime) % 5 === 0) {
        saveJSON(LS_KEYS.resume, {
            guid: allEpisodes[currentEpIndex].guid,
            time: dom.audio.currentTime,
            index: currentEpIndex
        });

        // Update history entry with current playback time
        const ep = allEpisodes[currentEpIndex];
        const histIdx = history.findIndex(h => h.guid === ep.guid);
        if (histIdx >= 0) {
            const prevTime = history[histIdx].time || 0;
            history[histIdx].time = dom.audio.currentTime;
            saveJSON(LS_KEYS.history, history);
            // Re-render episode list when crossing 30s threshold
            if (prevTime <= 30 && dom.audio.currentTime > 30) {
                renderEpisodeList();
            }
        }
    }
});

dom.audio.addEventListener('play', () => updatePlayState(true));
dom.audio.addEventListener('pause', () => updatePlayState(false));

// Autoplay next episode when current ends
dom.audio.addEventListener('ended', () => {
    updatePlayState(false);
    // Show 'stopped' state
    dom.playStateTag.classList.remove('paused');
    dom.playStateTag.classList.add('stopped');
    dom.playStateText.textContent = 'ЗУПИНЕНО';

    // Priority 1: Queue
    if (queue.length > 0) {
        const next = queue.shift();
        saveJSON(LS_KEYS.queue, queue);
        renderQueue();
        const idx = allEpisodes.findIndex(ep => ep.guid === next.guid);
        if (idx >= 0) {
            loadEpisode(idx);
            dom.audio.addEventListener('canplay', function onCan() {
                dom.audio.play().catch(() => { });
                updatePlayState(true);
                dom.audio.removeEventListener('canplay', onCan);
            });
        }
        renderEpisodeList();
        return;
    }

    // Priority 2: Autoplay next older episode (older = index + 1)
    if (currentEpIndex < allEpisodes.length - 1) {
        const nextIdx = currentEpIndex + 1;
        loadEpisode(nextIdx);
        dom.audio.addEventListener('canplay', function onCan() {
            dom.audio.play().catch(() => { });
            updatePlayState(true);
            dom.audio.removeEventListener('canplay', onCan);
        });
    }
});

// ============================================
// KEYBOARD SHORTCUTS
// ============================================
document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') return;

    switch (e.code) {
        case 'Space':
            e.preventDefault();
            togglePlay();
            break;
        case 'ArrowLeft':
            e.preventDefault();
            dom.audio.currentTime = Math.max(0, dom.audio.currentTime - 15);
            break;
        case 'ArrowRight':
            e.preventDefault();
            dom.audio.currentTime = Math.min(dom.audio.duration || 0, dom.audio.currentTime + 30);
            break;
        case 'KeyM':
            dom.volBtn.click();
            break;
    }
});

// ============================================
// QUEUE MANAGEMENT
// ============================================
function addToQueue(index) {
    const ep = allEpisodes[index];
    if (!queue.find(q => q.guid === ep.guid)) {
        queue.push(ep);
        saveJSON(LS_KEYS.queue, queue);
        renderQueue();
        renderEpisodeList();
        showToast(`✓ Додано до черги`);
    }
}

function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    dom.toastContainer.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('fade-out');
        toast.addEventListener('animationend', () => toast.remove());
    }, 2000);
}

function removeFromQueue(guid) {
    queue = queue.filter(q => q.guid !== guid);
    saveJSON(LS_KEYS.queue, queue);
    renderQueue();
}

function renderQueue() {
    // Update queue badge
    // Update queue badge (Main FAB)
    if (dom.queueBadge) {
        if (queue.length > 0) {
            dom.queueBadge.textContent = queue.length;
            dom.queueBadge.classList.remove('hidden');
        } else {
            dom.queueBadge.classList.add('hidden');
        }
    }

    // Update mini-player queue badge
    if (dom.miniQueueBadge) {
        if (queue.length > 0) {
            dom.miniQueueBadge.textContent = queue.length;
            dom.miniQueueBadge.classList.remove('hidden');
        } else {
            dom.miniQueueBadge.classList.add('hidden');
        }
    }

    if (queue.length === 0) {
        dom.queueList.innerHTML = `
            <p style="color: var(--text-tertiary); text-align: center; padding: 32px 16px;">
                Черга порожня. Натисніть + біля епізоду, щоб додати.
            </p>
        `;
        return;
    }

    dom.queueList.innerHTML = queue.map((ep, idx) => `
        <div class="glass-card-2026" style="padding: var(--space-md); margin-bottom: var(--space-sm); display: flex; align-items: center; gap: var(--space-md);">
            <span style="font-size: 1.5rem;">✓</span>
            <div style="flex: 1;">
                <div style="font-weight: 600; margin-bottom: var(--space-xs);">${ep.title}</div>
                <div style="font-size: var(--text-sm); color: var(--text-tertiary);">
                    ${ep.pubDate ? new Date(ep.pubDate).toLocaleDateString('uk-UA', { day: 'numeric', month: 'long' }) : ''}
                </div>
            </div>
            <button class="btn-icon-2026" onclick="removeFromQueue('${ep.guid}');" aria-label="Видалити з черги">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
        </div>
    `).join('');
}

// ============================================
// HISTORY MANAGEMENT
// ============================================
function addToHistory(ep) {
    // Remove if already exists
    history = history.filter(h => h.guid !== ep.guid);

    // Add to front
    history.unshift({
        ...ep,
        playedAt: new Date().toISOString(),
        progress: 0
    });

    // Keep only last 20
    history = history.slice(0, 20);
    saveJSON(LS_KEYS.history, history);
    renderHistory();
}

function renderHistory() {
    if (history.length === 0) {
        dom.historyList.innerHTML = `
            <p style="color: var(--text-tertiary); text-align: center;">Історія порожня</p>
        `;
        return;
    }

    dom.historyList.innerHTML = history.map((ep, idx) => `
        <div class="glass-card-2026" style="padding: var(--space-md); margin-bottom: var(--space-sm); cursor: pointer;" 
             onclick="loadEpisode(${allEpisodes.findIndex(e => e.guid === ep.guid)}); showHeroModal();">
            <div style="font-weight: 600; margin-bottom: var(--space-xs);">${ep.title}</div>
            <div style="font-size: var(--text-sm); color: var(--text-tertiary);">
                ${new Date(ep.playedAt).toLocaleDateString('uk-UA', { day: 'numeric', month: 'long' })}
            </div>
        </div>
    `).join('');
}

// ============================================
// COLLAPSIBLE SECTIONS
// ============================================
function setupCollapsibles() {
    // History toggle (still collapsible)
    if (dom.historyToggle && dom.historyCollapsible) {
        dom.historyToggle.addEventListener('click', () => {
            const isOpen = dom.historyCollapsible.classList.contains('open');
            dom.historyCollapsible.classList.toggle('open');
            dom.historyToggle.setAttribute('aria-expanded', !isOpen);
        });
    }

    // Queue overlay panel toggle
    if (dom.queueToggleBtn && dom.queueOverlay) {
        dom.queueToggleBtn.addEventListener('click', () => {
            dom.queueOverlay.classList.toggle('visible');
        });
    }
    // Mini-player queue button (mobile)
    if (dom.miniQueueBtn && dom.queueOverlay) {
        dom.miniQueueBtn.addEventListener('click', () => {
            dom.queueOverlay.classList.toggle('visible');
        });
    }
    if (dom.queueOverlayClose && dom.queueOverlay) {
        dom.queueOverlayClose.addEventListener('click', () => {
            dom.queueOverlay.classList.remove('visible');
        });
    }

    // Hotkey FAB toggle
    if (dom.hotkeyFabBtn && dom.hotkeyPanel) {
        dom.hotkeyFabBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            dom.hotkeyPanel.classList.toggle('hidden');
        });
        document.addEventListener('click', (e) => {
            if (!dom.hotkeyPanel.contains(e.target) && !dom.hotkeyFabBtn.contains(e.target)) {
                dom.hotkeyPanel.classList.add('hidden');
            }
        });
    }
}

// ============================================
// CONTINUE LISTENING BANNER
// ============================================
function showContinueBanner() {
    const resumeData = loadJSON(LS_KEYS.resume);
    if (!resumeData || resumeData.time < 30) {
        dom.continueBanner.classList.add('hidden');
        return;
    }

    const ep = allEpisodes.find(e => e.guid === resumeData.guid);
    if (!ep) {
        dom.continueBanner.classList.add('hidden');
        return;
    }

    dom.continueTitle.textContent = ep.title;
    dom.continueProgress.textContent = formatTime(resumeData.time);
    dom.continueBanner.classList.remove('hidden');

    dom.continueBanner.onclick = () => {
        loadEpisode(resumeData.index);
        showHeroModal();
        setTimeout(() => dom.audio.play(), 100);
    };

    // Allow keyboard activation
    dom.continueBanner.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            dom.continueBanner.click();
        }
    });
}

// ============================================
// UTILITY: Format Time
// ============================================
function formatTime(seconds) {
    if (!isFinite(seconds) || seconds < 0) return '0:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) {
        return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}`;
}

// ============================================
// INITIALIZATION
// ============================================
async function init() {
    try {
        // Fetch episodes
        allEpisodes = await fetchEpisodes();

        if (allEpisodes.length === 0) {
            throw new Error('No episodes found after date filter');
        }

        // Render episode list (includes inline newsletter)
        renderEpisodeList();

        // Load shared episode if present, otherwise first
        const urlParams = new URLSearchParams(window.location.search);
        const sharedGuid = urlParams.get('ep');
        const sharedTime = parseFloat(urlParams.get('t'));
        let initialIdx = 0;

        if (sharedGuid) {
            const foundIdx = allEpisodes.findIndex(e => e.guid === sharedGuid);
            if (foundIdx !== -1) {
                initialIdx = foundIdx;

                // DEEP LINKING: Scroll to episode and highlight
                setTimeout(() => {
                    const card = document.getElementById(`ep-${sharedGuid}`);
                    if (card) {
                        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        card.classList.add('highlight-episode');
                        // Remove highlight after animation
                        setTimeout(() => card.classList.remove('highlight-episode'), 4000);
                    }
                }, 500); // Allow render to complete
            }
        }

        await loadEpisode(initialIdx);

        // If timestamp provided, seek to it
        if (sharedGuid && !isNaN(sharedTime) && sharedTime > 0) {
            dom.audio.currentTime = sharedTime;
            // Optionally auto-play if deep linked with time? 
            // Better to let user press play, but seek is done.
        }

        // Load saved data
        queue = loadJSON(LS_KEYS.queue, []);
        history = loadJSON(LS_KEYS.history, []);
        const savedVolume = loadJSON(LS_KEYS.volume, 0.7);
        dom.audio.volume = savedVolume;
        dom.volSlider.value = savedVolume;
        updateVolumeIcon();

        // Render sections
        renderQueue();
        renderHistory();
        showContinueBanner();
        setupCollapsibles();

        // Hide error, show mini-player
        dom.errorState.classList.add('hidden');
        dom.miniPlayer.classList.add('visible');

    } catch (e) {
        console.error('Init failed:', e);
        dom.errorState.classList.remove('hidden');
        dom.miniPlayer.classList.remove('visible');
    }
}

// Retry button
dom.btnRetry.addEventListener('click', () => {
    dom.errorState.classList.add('hidden');
    init();
});

// Start
init();

// ============================================
// NEW FEATURES (Mobile Polish)
// ============================================

// 1. Share Episode
// 1. Share Episode (Enhanced with Deep Linking & Timestamp)
window.shareEpisode = async function (e, idx) {
    e.stopPropagation(); // prevent card click
    const ep = allEpisodes[idx];
    const url = new URL(window.location.href);
    url.searchParams.set('ep', ep.guid);

    // If sharing the currently playing episode, offer to include timestamp
    if (idx === currentEpIndex && dom.audio.currentTime > 5) {
        const time = Math.floor(dom.audio.currentTime);
        const timeStr = formatTime(time);
        if (confirm(`Поділитися з моменту ${timeStr}?`)) {
            url.searchParams.set('t', time);
        }
    }

    try {
        await navigator.clipboard.writeText(url.toString());
        showToast('🔗 Посилання скопійовано');
    } catch (err) {
        console.error('Copy failed', err);
        showToast('❌ Помилка копіювання');
    }
};



// 3. Scroll-to-top FAB (appears top-right when scrolled)
function toggleScroll() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function updateScrollFab() {
    if (!dom.scrollFab) return;

    if (window.scrollY > 300) {
        // Show scroll-to-top
        dom.scrollFab.classList.add('visible');
        dom.scrollFab.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="18 15 12 9 6 15"></polyline></svg>';
    } else {
        // At top — hide
        dom.scrollFab.classList.remove('visible');
    }
}

if (dom.scrollFab) {
    dom.scrollFab.addEventListener('click', toggleScroll);
    window.addEventListener('scroll', () => {
        requestAnimationFrame(updateScrollFab);
    });
    // Initial check
    updateScrollFab();
}
