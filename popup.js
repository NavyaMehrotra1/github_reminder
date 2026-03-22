// popup.js
import { getCachedOrFetch } from './github.js';
import { renderWrapped } from './wrapped.js';

// --- NAV ---
document.querySelectorAll('.nav-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    const view = tab.dataset.view;
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
    document.getElementById(`view-${view}`).classList.remove('hidden');
    if (view === 'wrapped') initWrapped();
  });
});

document.getElementById('goWrapped').addEventListener('click', () => {
  document.querySelectorAll('.nav-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.view === 'wrapped');
  });
  document.getElementById('view-main').classList.add('hidden');
  document.getElementById('view-wrapped').classList.remove('hidden');
  initWrapped();
});

document.getElementById('openSettings').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

document.getElementById('errorOpenSettings').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

// --- MAIN INIT ---
async function init() {
  try {
    const cache = await getCachedOrFetch(false);
    renderMain(cache);
  } catch (err) {
    showError(err.message);
  }
}

function showError(code) {
  document.getElementById('loading-state').classList.add('hidden');
  document.getElementById('main-content').classList.add('hidden');
  const errState = document.getElementById('error-state');
  errState.classList.remove('hidden');

  const titleEl = document.getElementById('error-title');
  const msgEl = document.getElementById('error-message');

  if (code === 'NOT_CONFIGURED') {
    titleEl.textContent = 'Setup Required';
    msgEl.textContent = 'Add your GitHub token and username in Settings to get started.';
  } else if (code === 'INVALID_TOKEN') {
    titleEl.textContent = 'Invalid Token';
    msgEl.textContent = 'Your GitHub token is invalid or expired. Please update it in Settings.';
  } else if (code === 'RATE_LIMITED') {
    titleEl.textContent = 'Rate Limited';
    msgEl.textContent = 'GitHub API rate limit hit. Try again in a few minutes.';
  } else if (code === 'USER_NOT_FOUND') {
    titleEl.textContent = 'User Not Found';
    msgEl.textContent = 'GitHub username not found. Please check your Settings.';
  } else if (code && code.startsWith('HTTP_')) {
    titleEl.textContent = 'Network Error';
    msgEl.textContent = `Could not reach GitHub (${code}). Check your connection.`;
  } else {
    titleEl.textContent = 'Something went wrong';
    msgEl.textContent = 'Please check your settings or try again later.';
  }
}

function renderMain(cache) {
  document.getElementById('loading-state').classList.add('hidden');
  const content = document.getElementById('main-content');
  content.classList.remove('hidden');

  const { stats, days } = cache;
  const app = document.getElementById('app');

  // Date
  const now = new Date();
  document.getElementById('todayDate').textContent = now.toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric'
  });

  // Streak count-up
  countUp(document.getElementById('streakCount'), stats.currentStreak, 800);

  // Status
  const banner = document.getElementById('statusBanner');
  const iconEl = document.getElementById('statusIcon');
  const titleEl = document.getElementById('statusTitle');
  const subEl = document.getElementById('statusSub');
  const ctaBtn = document.getElementById('statusCta');

  if (stats.contributedToday) {
    app.classList.add('status-success');
    banner.classList.add('success');
    iconEl.textContent = '✅';
    titleEl.textContent = 'You\'re on fire! Keep it up.';
    subEl.textContent = `${stats.todayCount} contribution${stats.todayCount !== 1 ? 's' : ''} today`;
    ctaBtn.classList.add('hidden');
  } else if (stats.currentStreak > 0) {
    app.classList.add('status-warning');
    banner.classList.add('warning');
    iconEl.textContent = '⚠️';
    titleEl.textContent = 'Don\'t break your streak!';
    subEl.textContent = `${stats.currentStreak} day streak at risk`;
    ctaBtn.classList.remove('hidden');
    ctaBtn.textContent = 'Open GitHub →';
    ctaBtn.classList.add('warning-cta');
    ctaBtn.addEventListener('click', () => chrome.tabs.create({ url: 'https://github.com' }));
  } else {
    app.classList.add('status-danger');
    banner.classList.add('danger');
    iconEl.textContent = '😱';
    titleEl.textContent = 'Streak broken — that\'s okay!';
    subEl.textContent = 'Start a new streak today';
    ctaBtn.classList.remove('hidden');
    ctaBtn.textContent = 'Start fresh →';
    ctaBtn.classList.add('danger-cta');
    ctaBtn.addEventListener('click', () => chrome.tabs.create({ url: 'https://github.com' }));
  }

  // Mini heatmap — last 28 days
  const sorted = [...days].sort((a, b) => a.date.localeCompare(b.date));
  const last28 = sorted.slice(-28);
  const heatmapEl = document.getElementById('heatmapMini');
  heatmapEl.innerHTML = '';
  last28.forEach((day, i) => {
    const cell = document.createElement('div');
    cell.className = 'hm-cell';
    cell.style.background = heatColor(day.count);
    cell.style.animationDelay = `${i * 20}ms`;
    cell.title = `${day.date}: ${day.count} contributions`;
    heatmapEl.appendChild(cell);
  });

  // Quick stats
  document.getElementById('statCurrent').textContent = stats.currentStreak;
  document.getElementById('statLongest').textContent = stats.longestStreak;
  document.getElementById('statMonth').textContent = stats.thisMonthTotal;
}

function heatColor(count) {
  if (count === 0) return '#e2e8f0';
  if (count <= 2) return '#bbf7d0';
  if (count <= 4) return '#86efac';
  if (count <= 7) return '#4ade80';
  return '#16a34a';
}

function countUp(el, target, duration) {
  if (target === 0) { el.textContent = '0'; return; }
  const start = performance.now();
  function frame(now) {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(eased * target);
    if (progress < 1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

// --- WRAPPED ---
let wrappedInitialized = false;

async function initWrapped() {
  if (wrappedInitialized) return;
  wrappedInitialized = true;

  const container = document.getElementById('wrappedContent');
  const loadingEl = document.getElementById('wrappedLoading');
  loadingEl.classList.remove('hidden');

  try {
    const cache = await getCachedOrFetch(false);
    loadingEl.classList.add('hidden');
    renderWrapped(container, cache);
  } catch (err) {
    loadingEl.classList.add('hidden');
    container.innerHTML = `
      <div class="state-error">
        <div class="error-icon">😕</div>
        <h3>Couldn't load stats</h3>
        <p>${err.message}</p>
      </div>`;
  }
}

init();
