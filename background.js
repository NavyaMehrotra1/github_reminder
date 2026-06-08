// background.js — Service Worker (Manifest V3)
import { getCachedOrFetch } from './github.js';

const ALARM_HOURLY  = 'hourly-check';
const ALARM_EVENING = 'evening-reminder';
const ALARM_NIGHT   = 'night-reminder';

chrome.runtime.onInstalled.addListener(() => setupAlarms());
chrome.runtime.onStartup.addListener(()   => setupAlarms());

async function setupAlarms() {
  await chrome.alarms.clearAll();
  // Hourly cache refresh
  await chrome.alarms.create(ALARM_HOURLY, { periodInMinutes: 60, delayInMinutes: 1 });
  // Nightly reminders — must await so the service worker doesn't die mid-schedule
  await scheduleNightlyAlarms();
}

async function scheduleNightlyAlarms() {
  const { notificationsEnabled, reminderTime1, reminderTime2 } =
    await chrome.storage.sync.get(['notificationsEnabled', 'reminderTime1', 'reminderTime2']);

  if (notificationsEnabled === false) return;

  const time1 = reminderTime1 || '20:30';
  const time2 = reminderTime2 || '22:00';
  const now   = new Date();

  function nextFiring(timeStr) {
    const [h, m] = timeStr.split(':').map(Number);
    const t = new Date(now);
    t.setHours(h, m, 0, 0);
    if (t <= now) t.setDate(t.getDate() + 1);
    return t.getTime();
  }

  await chrome.alarms.create(ALARM_EVENING, { when: nextFiring(time1) });
  await chrome.alarms.create(ALARM_NIGHT,   { when: nextFiring(time2) });
}

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === ALARM_HOURLY) {
    try { await getCachedOrFetch(true); }
    catch (e) { console.log('Background fetch error:', e.message); }
    return;
  }

  if (alarm.name === ALARM_EVENING || alarm.name === ALARM_NIGHT) {
    const { notificationsEnabled } = await chrome.storage.sync.get('notificationsEnabled');
    if (notificationsEnabled === false) return;

    try {
      const cache = await getCachedOrFetch(false);
      if (!cache.stats.contributedToday) {
        await fireReminder(alarm.name === ALARM_NIGHT);
      }
    } catch (e) {
      console.log('Reminder check error:', e.message);
    }

    // Reschedule both alarms for the next day (run after every reminder, not just the last)
    await scheduleNightlyAlarms();
  }
});

async function fireReminder(isLastChance) {
  const messages = isLastChance
    ? [
        "Last chance! 🚨 Your streak needs a commit tonight.",
        "10 PM warning! Don't let today slip away — push something!",
        "Final reminder! Your streak is counting on you. 🔥",
      ]
    : [
        "Hey! No commit today yet 👀 Your streak misses you.",
        "Don't break the chain! A small commit counts. 💚",
        "Your GitHub streak wants some love today 🌱",
        "Reminder: keep that streak alive! Even one commit counts.",
      ];

  const msg = messages[Math.floor(Math.random() * messages.length)];

  await chrome.notifications.create('streak-reminder', {
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title: isLastChance ? '🚨 Last Chance — GitHub Streak!' : '🔥 GitHub Streak Reminder',
    message: msg,
    buttons: [{ title: 'Open GitHub →' }],
    requireInteraction: isLastChance,
  });
}

chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
  if (buttonIndex === 0) chrome.tabs.create({ url: 'https://github.com' });
  chrome.notifications.clear(notificationId);
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'RESCHEDULE_ALARMS') {
    setupAlarms().then(() => sendResponse({ ok: true }));
    return true; // keep channel open for async response
  }
  if (msg.type === 'TEST_NOTIFICATION') {
    fireReminder(false).then(() => sendResponse({ ok: true }));
    return true;
  }
});
