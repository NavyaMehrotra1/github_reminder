// background.js — Service Worker (Manifest V3)
import { getCachedOrFetch } from './github.js';

const ALARM_HOURLY = 'hourly-check';
const ALARM_EVENING = 'evening-reminder';
const ALARM_NIGHT = 'night-reminder';

chrome.runtime.onInstalled.addListener(() => {
  setupAlarms();
});

chrome.runtime.onStartup.addListener(() => {
  setupAlarms();
});

async function setupAlarms() {
  await chrome.alarms.clearAll();

  // Hourly contribution check
  chrome.alarms.create(ALARM_HOURLY, {
    periodInMinutes: 60,
    delayInMinutes: 1,
  });

  // Schedule evening/night reminders for today
  scheduleNightlyAlarms();
}

async function scheduleNightlyAlarms() {
  const settings = await chrome.storage.sync.get([
    'notificationsEnabled',
    'reminderTime1',
    'reminderTime2',
  ]);

  if (settings.notificationsEnabled === false) return;

  const time1 = settings.reminderTime1 || '20:00';
  const time2 = settings.reminderTime2 || '22:00';

  const now = new Date();
  const [h1, m1] = time1.split(':').map(Number);
  const [h2, m2] = time2.split(':').map(Number);

  const alarm1 = new Date(now);
  alarm1.setHours(h1, m1, 0, 0);
  if (alarm1 <= now) alarm1.setDate(alarm1.getDate() + 1);

  const alarm2 = new Date(now);
  alarm2.setHours(h2, m2, 0, 0);
  if (alarm2 <= now) alarm2.setDate(alarm2.getDate() + 1);

  chrome.alarms.create(ALARM_EVENING, { when: alarm1.getTime() });
  chrome.alarms.create(ALARM_NIGHT, { when: alarm2.getTime() });
}

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === ALARM_HOURLY) {
    try {
      await getCachedOrFetch(true);
    } catch (e) {
      console.log('Background fetch error:', e.message);
    }
    return;
  }

  if (alarm.name === ALARM_EVENING || alarm.name === ALARM_NIGHT) {
    const settings = await chrome.storage.sync.get('notificationsEnabled');
    if (settings.notificationsEnabled === false) return;

    try {
      const cache = await getCachedOrFetch(false);
      if (!cache.stats.contributedToday) {
        const isLast = alarm.name === ALARM_NIGHT;
        await fireReminder(isLast);
      }
    } catch (e) {
      console.log('Reminder check error:', e.message);
    }

    // Reschedule for next day
    if (alarm.name === ALARM_NIGHT) {
      scheduleNightlyAlarms();
    }
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

  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title: isLastChance ? '🚨 Last Chance — GitHub Streak!' : '🔥 GitHub Streak Reminder',
    message: msg,
    buttons: [{ title: 'Open GitHub →' }],
    requireInteraction: isLastChance,
  });
}

chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
  if (buttonIndex === 0) {
    chrome.tabs.create({ url: 'https://github.com' });
  }
  chrome.notifications.clear(notificationId);
});

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'RESCHEDULE_ALARMS') {
    setupAlarms();
  }
});
