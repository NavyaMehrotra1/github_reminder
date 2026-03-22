# GitHub Reminder

A Chrome extension that helps you keep your GitHub contribution streak alive — with beautiful stats, celebration animations, and gentle notifications.

---

## Features

- **Streak tracking** — current and longest streak, with animated count-up
- **Today's status** — instant colour-coded banner: committed ✅ / at risk ⚠️ / broken 😱
- **Mini heatmap** — last 28 days as a cute rounded grid
- **Wrapped view** — full year heatmap, monthly summary, best day chart, and personality tags
- **Smart reminders** — Chrome notifications at 8 PM and 10 PM if you haven't committed yet
- **Hourly background refresh** — cache kept fresh automatically

---

## Setup

### 1. Load the extension in Chrome

1. Open Chrome and go to `chrome://extensions`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked**
4. Select this folder (`github_reminder/`)

### 2. Generate a GitHub Personal Access Token

1. Go to [github.com/settings/tokens/new](https://github.com/settings/tokens/new)
2. Give it a name like "GitHub Reminder"
3. Select the **`read:user`** scope (under "user")
4. Click **Generate token** and copy it

> Keep this token safe — it grants read access to your GitHub profile.

### 3. Configure the extension

1. Click the extension icon → **⚙️** (settings), or right-click the icon → **Options**
2. Paste your GitHub token
3. Enter your GitHub username
4. Set your preferred reminder times (default: 8 PM and 10 PM)
5. Click **Save Settings**

---

## How Stats Are Calculated

| Stat | Method |
|------|--------|
| **Current streak** | Walks backwards from today; breaks on any day with 0 contributions |
| **Longest streak** | Scans all 365 days for the longest consecutive run |
| **This month** | Sums all contributions in the current calendar month |
| **Best day of week** | Aggregates contributions by day of week over 365 days |
| **Personality tags** | Rule-based logic on streak length, weekend ratio, contribution density |

### Data source

Contributions are fetched from the GitHub GraphQL API (`contributionsByDay` on `contributionCalendar`). This matches what GitHub shows on your profile page.

---

## Known Limitations

- **No commit-time breakdown** — GitHub's GraphQL API returns daily totals only, not individual commit timestamps. The time-of-day feature (Morning / Evening breakdown) is not included because it would require additional REST API calls per repository, which is slow and may hit rate limits.
- **Rate limiting** — GitHub allows ~5,000 GraphQL requests/hour per token. The extension checks once per hour, so you're well within limits.
- **Contributions vs commits** — GitHub counts pull requests, issues, and code review activity as contributions, not just commits. This extension mirrors that definition.
- **Private repos** — The PAT with `read:user` scope will include private repository contributions in the calendar total.

---

## File Structure

```
github_reminder/
├── manifest.json       Manifest V3 config
├── background.js       Service worker: hourly checks + nightly alarms
├── github.js           GitHub GraphQL API + stats calculation
├── popup.html/js/css   Main popup: streak, status, heatmap
├── wrapped.js          Wrapped stats rendering
├── options.html/js/css Settings page
├── icons/              Extension icons (16, 48, 128px)
└── README.md
```

---

## Permissions Used

| Permission | Why |
|------------|-----|
| `storage` | Store your token, username, preferences, and cached data |
| `alarms` | Schedule hourly refresh + nightly reminders |
| `notifications` | Show streak reminder notifications |
| `host_permissions: api.github.com` | Fetch your contribution data |
