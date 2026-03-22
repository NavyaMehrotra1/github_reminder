// options.js

const $ = id => document.getElementById(id);

// Load saved settings on open
async function loadSettings() {
  const data = await chrome.storage.sync.get([
    'githubToken',
    'githubUsername',
    'notificationsEnabled',
    'reminderTime1',
    'reminderTime2',
  ]);

  if (data.githubToken) $('githubToken').value = data.githubToken;
  if (data.githubUsername) $('githubUsername').value = data.githubUsername;
  $('notificationsEnabled').checked = data.notificationsEnabled !== false;
  $('reminderTime1').value = data.reminderTime1 || '20:00';
  $('reminderTime2').value = data.reminderTime2 || '22:00';

  updateReminderVisibility();
}

function updateReminderVisibility() {
  const enabled = $('notificationsEnabled').checked;
  $('reminderTimes').style.opacity = enabled ? '1' : '0.4';
  $('reminderTimes').style.pointerEvents = enabled ? '' : 'none';
}

$('notificationsEnabled').addEventListener('change', updateReminderVisibility);

// Token visibility toggle
$('toggleToken').addEventListener('click', () => {
  const input = $('githubToken');
  input.type = input.type === 'password' ? 'text' : 'password';
});

// Save
$('saveBtn').addEventListener('click', async () => {
  const token = $('githubToken').value.trim();
  const username = $('githubUsername').value.trim();
  const notificationsEnabled = $('notificationsEnabled').checked;
  const reminderTime1 = $('reminderTime1').value;
  const reminderTime2 = $('reminderTime2').value;

  if (!token) { showStatus('Please enter your GitHub Personal Access Token.', 'error'); return; }
  if (!username) { showStatus('Please enter your GitHub username.', 'error'); return; }

  await chrome.storage.sync.set({ githubToken: token, githubUsername: username, notificationsEnabled, reminderTime1, reminderTime2 });

  // Clear cache so next popup load re-fetches
  await chrome.storage.local.remove(['contributionCache', 'cacheTimestamp']);

  // Trigger background to reschedule alarms
  chrome.runtime.sendMessage({ type: 'RESCHEDULE_ALARMS' }).catch(() => {});

  const btn = $('saveBtn');
  btn.textContent = '✅ Saved!';
  btn.classList.add('saved');
  showStatus('Settings saved! Your data will refresh on the next popup open.', 'success');

  setTimeout(() => {
    btn.textContent = 'Save Settings';
    btn.classList.remove('saved');
  }, 2500);
});

// Clear cache
$('clearCache').addEventListener('click', async () => {
  await chrome.storage.local.remove(['contributionCache', 'cacheTimestamp']);
  showStatus('Cache cleared. Data will refresh on the next popup open.', 'success');
});

function showStatus(msg, type) {
  const el = $('statusMsg');
  el.textContent = msg;
  el.className = `status-msg ${type}`;
  el.classList.remove('hidden');
  clearTimeout(el._timeout);
  el._timeout = setTimeout(() => el.classList.add('hidden'), 5000);
}

loadSettings();
