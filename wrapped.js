// wrapped.js — Wrapped stats rendering

const MONTH_NAMES = ['January','February','March','April','May','June',
  'July','August','September','October','November','December'];
const DOW_SHORT = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

export function renderWrapped(container, cache) {
  const { days, stats, username } = cache;
  const now = new Date();
  const monthName = MONTH_NAMES[now.getMonth()];
  const year = now.getFullYear();

  // Clear previous content except the loading indicator
  const loadingEl = document.getElementById('wrappedLoading');
  container.innerHTML = '';
  if (loadingEl) container.appendChild(loadingEl);

  // 1. Monthly Summary
  container.appendChild(buildMonthlySummary(stats, monthName, days));

  // 2. Streak Stats
  container.appendChild(buildStreakCard(stats));

  // 3. Best Day
  container.appendChild(buildBestDayCard(days, stats));

  // 4. Full Year Heatmap
  container.appendChild(buildFullHeatmap(days, year));

  // 5. Personality Tags
  container.appendChild(buildTagsCard(stats));

  // 6. Share Card
  container.appendChild(buildShareCard(stats, username, monthName));
}

function card(title) {
  const div = document.createElement('div');
  div.className = 'wrapped-card';
  const h = document.createElement('div');
  h.className = 'wrapped-card-title';
  h.textContent = title;
  div.appendChild(h);
  return div;
}

// --- 1. Monthly Summary ---
function buildMonthlySummary(stats, monthName, days) {
  const c = card(`Your ${monthName} in Code 🌱`);

  const totalEl = document.createElement('div');
  totalEl.style.cssText = 'font-size:40px;font-weight:900;color:#15803d;text-align:center;margin-bottom:4px;';
  totalEl.textContent = '0';
  c.appendChild(totalEl);
  countUp(totalEl, stats.thisMonthTotal, 1000);

  const subEl = document.createElement('div');
  subEl.style.cssText = 'text-align:center;font-size:13px;font-weight:700;color:#475569;margin-bottom:14px;';
  subEl.textContent = `contributions · ${stats.thisMonthContribDays} of ${stats.daysInMonth} days active`;
  c.appendChild(subEl);

  const ratio = stats.daysInMonth > 0 ? stats.thisMonthContribDays / stats.daysInMonth : 0;
  const pct = Math.round(ratio * 100);
  const colorClass = ratio > 0.7 ? 'green' : ratio > 0.4 ? 'yellow' : 'coral';

  const progRow = document.createElement('div');
  progRow.className = 'prog-row';
  progRow.innerHTML = `<span>Active days</span><span>${pct}%</span>`;
  c.appendChild(progRow);

  const bg = document.createElement('div');
  bg.className = 'prog-bar-bg';
  const fill = document.createElement('div');
  fill.className = `prog-bar-fill ${colorClass}`;
  fill.style.width = '0%';
  bg.appendChild(fill);
  c.appendChild(bg);

  setTimeout(() => { fill.style.width = `${pct}%`; }, 300);
  return c;
}

// --- 2. Streak Stats ---
function buildStreakCard(stats) {
  const c = card('Streak Stats 🔥');

  const rows = [
    ['Current Streak', `${stats.currentStreak} days`],
    ['Longest Streak', `${stats.longestStreak} days`],
  ];

  if (stats.streakStartDate) {
    const d = new Date(stats.streakStartDate + 'T12:00:00');
    rows.push(['Streak started', d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })]);
  }

  for (const [label, value] of rows) {
    const row = document.createElement('div');
    row.className = 'streak-detail-row';
    row.innerHTML = `<span class="streak-detail-label">${label}</span><span class="streak-detail-value">${value}</span>`;
    c.appendChild(row);
  }

  return c;
}

// --- 3. Best Day ---
function buildBestDayCard(days, stats) {
  const c = card('Best Day 💪');

  const sub = document.createElement('div');
  sub.style.cssText = 'font-size:14px;font-weight:700;color:#475569;margin-bottom:16px;';
  sub.textContent = `Your power day is ${stats.bestDayOfWeek}`;
  c.appendChild(sub);

  // Day of week bar chart
  const dowCounts = Array(7).fill(0);
  for (const d of days) {
    if (d.count > 0) {
      const dow = new Date(d.date + 'T12:00:00').getDay();
      dowCounts[dow] += d.count;
    }
  }

  const maxCount = Math.max(...dowCounts, 1);
  const bestDow = dowCounts.indexOf(Math.max(...dowCounts));

  const chart = document.createElement('div');
  chart.className = 'dow-chart';

  for (let i = 0; i < 7; i++) {
    const col = document.createElement('div');
    col.className = 'dow-col';

    const barWrap = document.createElement('div');
    barWrap.className = 'dow-bar-wrap';

    const bar = document.createElement('div');
    bar.className = `dow-bar${i === bestDow ? ' highlight' : ''}`;
    bar.style.height = '0%';
    barWrap.appendChild(bar);

    const lbl = document.createElement('div');
    lbl.className = 'dow-label';
    lbl.textContent = DOW_SHORT[i];

    col.appendChild(barWrap);
    col.appendChild(lbl);
    chart.appendChild(col);

    const targetH = Math.round((dowCounts[i] / maxCount) * 100);
    setTimeout(() => { bar.style.height = `${targetH}%`; }, 400 + i * 50);
  }

  c.appendChild(chart);
  return c;
}

// --- 4. Full Year Heatmap ---
function buildFullHeatmap(days, year) {
  const c = card('Year in Code 🗓️');

  // Build a map for fast lookup
  const dayMap = {};
  for (const d of days) dayMap[d.date] = d.count;

  // Figure out the start date (Sunday on/before Jan 1 of the earliest year in data,
  // but practically we show last 365 days aligned to weeks)
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);

  // Find the earliest Sunday that covers all 365 days of data
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - 364);
  // Roll back to previous Sunday
  startDate.setDate(startDate.getDate() - startDate.getDay());

  // Build weeks array
  const weeks = [];
  let cur = new Date(startDate);

  while (cur <= today) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      const dateStr = cur.toISOString().slice(0, 10);
      week.push({ date: dateStr, count: dayMap[dateStr] ?? 0, future: cur > today });
      cur.setDate(cur.getDate() + 1);
    }
    weeks.push(week);
  }

  // Month labels
  const labelsRow = document.createElement('div');
  labelsRow.className = 'heatmap-month-labels';
  labelsRow.style.cssText = 'display:flex;gap:2px;margin-bottom:4px;overflow:hidden;';

  let lastMonth = -1;
  for (const week of weeks) {
    const firstDay = new Date(week[0].date + 'T12:00:00');
    const m = firstDay.getMonth();
    const lbl = document.createElement('div');
    lbl.className = 'heatmap-month-label';
    lbl.style.width = '12px';
    lbl.style.flexShrink = '0';
    if (m !== lastMonth) {
      lbl.textContent = MONTH_NAMES[m].slice(0, 3);
      lastMonth = m;
    }
    labelsRow.appendChild(lbl);
  }

  c.appendChild(labelsRow);

  const weeksRow = document.createElement('div');
  weeksRow.className = 'heatmap-weeks';

  let cellIndex = 0;
  for (const week of weeks) {
    const col = document.createElement('div');
    col.className = 'heatmap-week';

    for (const day of week) {
      const sq = document.createElement('div');
      sq.className = `hm-sq ${heatClass(day.future ? -1 : day.count)}`;
      sq.title = day.future ? '' : `${day.date}: ${day.count}`;
      sq.style.animationDelay = `${cellIndex * 4}ms`;
      col.appendChild(sq);
      cellIndex++;
    }

    weeksRow.appendChild(col);
  }

  c.appendChild(weeksRow);
  return c;
}

function heatClass(count) {
  if (count < 0) return 'hm-0';
  if (count === 0) return 'hm-0';
  if (count <= 2) return 'hm-1';
  if (count <= 4) return 'hm-2';
  if (count <= 6) return 'hm-3';
  return 'hm-4';
}

// --- 5. Tags ---
function buildTagsCard(stats) {
  const c = card('Your Coding Personality ✨');

  if (stats.tags.length === 0) {
    const p = document.createElement('p');
    p.style.cssText = 'color:#94a3b8;font-size:14px;font-weight:600;';
    p.textContent = 'Keep contributing to unlock personality tags!';
    c.appendChild(p);
    return c;
  }

  const wrap = document.createElement('div');
  wrap.className = 'tags-wrap';

  for (const tag of stats.tags) {
    const pill = document.createElement('div');
    pill.className = 'tag-pill';
    pill.textContent = `${tag.emoji} ${tag.label}`;
    wrap.appendChild(pill);
  }

  c.appendChild(wrap);
  return c;
}

// --- 6. Share Card ---
function buildShareCard(stats, username, monthName) {
  const c = card('Share Your Stats 🎉');

  const preview = document.createElement('div');
  preview.className = 'share-card-preview';
  preview.id = 'shareCardInner';
  preview.innerHTML = `
    <div class="share-username">@${username || 'you'}</div>
    <div class="share-big-number">${stats.currentStreak}🔥</div>
    <div class="share-sub">day streak</div>
    <div class="share-divider"></div>
    <div class="share-stats-row">
      <div class="share-stat">
        <div class="share-stat-val">${stats.thisMonthTotal}</div>
        <div class="share-stat-lbl">${monthName} contribs</div>
      </div>
      <div class="share-stat">
        <div class="share-stat-val">${stats.longestStreak}</div>
        <div class="share-stat-lbl">best streak</div>
      </div>
    </div>
    ${stats.tags.length > 0 ? `<div style="margin-top:12px;font-size:13px;opacity:0.9;font-weight:700;">${stats.tags[0].emoji} ${stats.tags[0].label}</div>` : ''}
  `;
  c.appendChild(preview);

  const btn = document.createElement('button');
  btn.className = 'btn btn-share';
  btn.textContent = '📋 Copy Stats Text';
  btn.addEventListener('click', () => {
    const text = `🔥 ${stats.currentStreak}-day GitHub streak\n📊 ${stats.thisMonthTotal} contributions in ${monthName}\n🏆 Best streak: ${stats.longestStreak} days\n${stats.tags.map(t => `${t.emoji} ${t.label}`).join(' · ')}\n\nTracked with GitHub Reminder`;
    navigator.clipboard.writeText(text).then(() => {
      btn.textContent = '✅ Copied!';
      setTimeout(() => { btn.textContent = '📋 Copy Stats Text'; }, 2000);
    });
  });
  c.appendChild(btn);

  return c;
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
