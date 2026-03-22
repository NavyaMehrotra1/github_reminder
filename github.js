// github.js — GitHub API helper (GraphQL + REST)

const GRAPHQL_ENDPOINT = 'https://api.github.com/graphql';

export async function fetchContributions(token, username) {
  const today = new Date();
  const oneYearAgo = new Date(today);
  oneYearAgo.setFullYear(today.getFullYear() - 1);

  const from = oneYearAgo.toISOString();
  const to = today.toISOString();

  const query = `
    query($username: String!, $from: DateTime!, $to: DateTime!) {
      user(login: $username) {
        contributionsCollection(from: $from, to: $to) {
          contributionCalendar {
            totalContributions
            weeks {
              contributionDays {
                date
                contributionCount
                color
              }
            }
          }
        }
      }
    }
  `;

  const resp = await fetch(GRAPHQL_ENDPOINT, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables: { username, from, to } }),
  });

  if (!resp.ok) {
    if (resp.status === 401) throw new Error('INVALID_TOKEN');
    if (resp.status === 403) throw new Error('RATE_LIMITED');
    throw new Error(`HTTP_${resp.status}`);
  }

  const json = await resp.json();
  if (json.errors) {
    const msg = json.errors[0]?.message || 'GraphQL error';
    if (msg.includes('Could not resolve to a User')) throw new Error('USER_NOT_FOUND');
    throw new Error(msg);
  }

  const calendar = json.data?.user?.contributionsCollection?.contributionCalendar;
  if (!calendar) throw new Error('NO_DATA');

  // Flatten weeks into sorted day array
  const days = [];
  for (const week of calendar.weeks) {
    for (const day of week.contributionDays) {
      days.push({ date: day.date, count: day.contributionCount });
    }
  }
  days.sort((a, b) => a.date.localeCompare(b.date));

  return { days, total: calendar.totalContributions };
}

export function computeStats(days) {
  const todayStr = new Date().toISOString().slice(0, 10);

  // Today's contributions
  const todayData = days.find(d => d.date === todayStr);
  const todayCount = todayData ? todayData.count : 0;
  const contributedToday = todayCount > 0;

  // Current streak (going backwards from today)
  let currentStreak = 0;
  const sortedDesc = [...days].sort((a, b) => b.date.localeCompare(a.date));
  let expectDate = new Date(todayStr);

  for (const day of sortedDesc) {
    const dayDate = new Date(day.date);
    const diff = Math.round((expectDate - dayDate) / 86400000);
    if (diff > 1) break; // gap in days
    if (diff === 1 || (diff === 0 && day.date === todayStr)) {
      if (day.count > 0) {
        currentStreak++;
        expectDate = dayDate;
      } else if (diff === 0) {
        // today has no contributions — streak not broken yet, just not counted
        continue;
      } else {
        break;
      }
    }
  }

  // Longest streak
  let longestStreak = 0;
  let runStreak = 0;
  let prevDate = null;
  for (const day of days) {
    if (day.count > 0) {
      if (prevDate) {
        const prev = new Date(prevDate);
        const curr = new Date(day.date);
        const diff = Math.round((curr - prev) / 86400000);
        if (diff === 1) {
          runStreak++;
        } else {
          runStreak = 1;
        }
      } else {
        runStreak = 1;
      }
      prevDate = day.date;
      longestStreak = Math.max(longestStreak, runStreak);
    } else {
      prevDate = null;
      runStreak = 0;
    }
  }

  // This month
  const monthStr = todayStr.slice(0, 7);
  const thisMonthDays = days.filter(d => d.date.startsWith(monthStr));
  const thisMonthTotal = thisMonthDays.reduce((s, d) => s + d.count, 0);
  const thisMonthContribDays = thisMonthDays.filter(d => d.count > 0).length;
  const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();

  // Day of week analysis
  const dayOfWeekCounts = Array(7).fill(0); // 0=Sun
  for (const d of days) {
    if (d.count > 0) {
      const dow = new Date(d.date + 'T12:00:00').getDay();
      dayOfWeekCounts[dow] += d.count;
    }
  }
  const bestDowIndex = dayOfWeekCounts.indexOf(Math.max(...dayOfWeekCounts));
  const dowNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const bestDayOfWeek = dowNames[bestDowIndex];

  // Weekend vs weekday ratio
  const weekendContribs = dayOfWeekCounts[0] + dayOfWeekCounts[6];
  const totalContribs = dayOfWeekCounts.reduce((s, c) => s + c, 0);
  const weekendRatio = totalContribs > 0 ? weekendContribs / totalContribs : 0;

  // Streak started date
  let streakStartDate = null;
  if (currentStreak > 0) {
    const streakStart = new Date(todayStr);
    streakStart.setDate(streakStart.getDate() - (currentStreak - 1));
    streakStartDate = streakStart.toISOString().slice(0, 10);
  }

  // Bursty detection: ratio of zero-days to total days with high variance
  const contribDaysTotal = days.filter(d => d.count > 0).length;
  const avgOnActiveDay = contribDaysTotal > 0
    ? totalContribs / contribDaysTotal
    : 0;
  const isBursty = avgOnActiveDay > 5 && contribDaysTotal < days.length * 0.4;

  // Personality tags
  const tags = [];
  if (currentStreak > 14) tags.push({ emoji: '🔥', label: 'Consistent' });
  if (thisMonthTotal > 60) tags.push({ emoji: '🏆', label: 'Overachiever' });
  if (weekendRatio < 0.1 && totalContribs > 0) tags.push({ emoji: '📆', label: 'Weekday Warrior' });
  if (weekendRatio > 0.4) tags.push({ emoji: '🎮', label: 'Weekend Hacker' });
  if (isBursty) tags.push({ emoji: '🌊', label: 'Bursty Coder' });
  if (contribDaysTotal > 0) {
    const sameWeekdayRatio = Math.max(...dayOfWeekCounts) / totalContribs;
    if (sameWeekdayRatio > 0.35) tags.push({ emoji: '📅', label: 'Creature of Habit' });
  }
  // Limit to 4 tags
  const finalTags = tags.slice(0, 4);

  return {
    contributedToday,
    todayCount,
    currentStreak,
    longestStreak,
    thisMonthTotal,
    thisMonthContribDays,
    daysInMonth,
    bestDayOfWeek,
    weekendRatio,
    streakStartDate,
    tags: finalTags,
  };
}

export async function getCachedOrFetch(forceRefresh = false) {
  const stored = await chrome.storage.local.get(['contributionCache', 'cacheTimestamp']);
  const now = Date.now();
  const ONE_HOUR = 60 * 60 * 1000;

  if (!forceRefresh && stored.contributionCache && stored.cacheTimestamp) {
    if (now - stored.cacheTimestamp < ONE_HOUR) {
      return stored.contributionCache;
    }
  }

  const settings = await chrome.storage.sync.get(['githubToken', 'githubUsername']);
  if (!settings.githubToken || !settings.githubUsername) {
    throw new Error('NOT_CONFIGURED');
  }

  const data = await fetchContributions(settings.githubToken, settings.githubUsername);
  const stats = computeStats(data.days);
  const cache = { days: data.days, stats, username: settings.githubUsername };

  await chrome.storage.local.set({ contributionCache: cache, cacheTimestamp: now });
  return cache;
}
