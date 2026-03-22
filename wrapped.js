// wrapped.js — Wrapped stats rendering

const MONTH_NAMES = ['January','February','March','April','May','June',
  'July','August','September','October','November','December'];
const DOW_SHORT = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

export function renderWrapped(container, cache) {
  const { days, stats, username } = cache;
  const now = new Date();
  const monthName = MONTH_NAMES[now.getMonth()];
  const year = now.getFullYear();

  const loadingEl = document.getElementById('wrappedLoading');
  container.innerHTML = '';
  if (loadingEl) container.appendChild(loadingEl);

  container.appendChild(buildMonthlySummary(stats, monthName));
  container.appendChild(buildStreakCard(stats));
  container.appendChild(buildBestDayCard(days, stats));
  container.appendChild(buildFullHeatmap(days, year));
  container.appendChild(buildTagsCard(stats));
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
function buildMonthlySummary(stats, monthName) {
  const c = card(`Your ${monthName} in Code 🌱`);

  const totalEl = document.createElement('div');
  totalEl.className = 'wrapped-month-total';
  totalEl.textContent = '0';
  c.appendChild(totalEl);
  countUp(totalEl, stats.thisMonthTotal, 1000);

  const subEl = document.createElement('div');
  subEl.className = 'wrapped-month-sub';
  subEl.textContent = `contributions · ${stats.thisMonthContribDays} of ${stats.daysInMonth} days active`;
  c.appendChild(subEl);

  const ratio = stats.daysInMonth > 0 ? stats.thisMonthContribDays / stats.daysInMonth : 0;
  const pct = Math.round(ratio * 100);
  const colorClass = ratio > 0.7 ? 'green' : ratio > 0.4 ? 'yellow' : 'coral';

  const progRow = document.createElement('div');
  progRow.className = 'prog-row';
  const progLeft = document.createElement('span');
  progLeft.textContent = 'Active days';
  const progRight = document.createElement('span');
  progRight.textContent = `${pct}%`;
  progRow.appendChild(progLeft);
  progRow.appendChild(progRight);
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
    const lbl = document.createElement('span');
    lbl.className = 'streak-detail-label';
    lbl.textContent = label;
    const val = document.createElement('span');
    val.className = 'streak-detail-value';
    val.textContent = value;
    row.appendChild(lbl);
    row.appendChild(val);
    c.appendChild(row);
  }

  return c;
}

// --- 3. Best Day ---
function buildBestDayCard(days, stats) {
  const c = card('Best Day 💪');

  const sub = document.createElement('div');
  sub.className = 'wrapped-best-day-sub';
  sub.textContent = `Your power day is ${stats.bestDayOfWeek}`;
  c.appendChild(sub);

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
function buildFullHeatmap(days) {
  const c = card('Year in Code 🗓️');

  const dayMap = {};
  for (const d of days) dayMap[d.date] = d.count;

  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);

  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - 364);
  startDate.setDate(startDate.getDate() - startDate.getDay());

  const weeks = [];
  const cur = new Date(startDate);

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

  let lastMonth = -1;
  for (const week of weeks) {
    const firstDay = new Date(week[0].date + 'T12:00:00');
    const m = firstDay.getMonth();
    const lbl = document.createElement('div');
    lbl.className = 'heatmap-month-label';
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
    p.className = 'wrapped-tags-empty';
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

  const userDiv = document.createElement('div');
  userDiv.className = 'share-username';
  userDiv.textContent = `@${username || 'you'}`;

  const bigNum = document.createElement('div');
  bigNum.className = 'share-big-number';
  bigNum.textContent = `${stats.currentStreak}🔥`;

  const sub = document.createElement('div');
  sub.className = 'share-sub';
  sub.textContent = 'day streak';

  const divider = document.createElement('div');
  divider.className = 'share-divider';

  const statsRow = document.createElement('div');
  statsRow.className = 'share-stats-row';

  for (const [val, lbl] of [[stats.thisMonthTotal, `${monthName} contribs`], [stats.longestStreak, 'best streak']]) {
    const stat = document.createElement('div');
    stat.className = 'share-stat';
    const v = document.createElement('div');
    v.className = 'share-stat-val';
    v.textContent = val;
    const l = document.createElement('div');
    l.className = 'share-stat-lbl';
    l.textContent = lbl;
    stat.appendChild(v);
    stat.appendChild(l);
    statsRow.appendChild(stat);
  }

  preview.appendChild(userDiv);
  preview.appendChild(bigNum);
  preview.appendChild(sub);
  preview.appendChild(divider);
  preview.appendChild(statsRow);

  if (stats.tags.length > 0) {
    const tagLine = document.createElement('div');
    tagLine.className = 'share-tag-line';
    tagLine.textContent = `${stats.tags[0].emoji} ${stats.tags[0].label}`;
    preview.appendChild(tagLine);
  }

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
