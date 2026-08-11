# GitHub Reminder — Privacy Policy

**Last updated:** August 11, 2026

## At a glance

| | |
|---|---|
| **Data collected** | GitHub token, GitHub username, contribution stats, reminder preferences |
| **Where it's stored** | Only on your device, or your own Chrome sync account — never on a server we run |
| **Third parties involved** | None — the extension talks directly to GitHub's API from your browser |
| **Sold or shared for advertising** | Never |
| **Analytics or tracking** | None |

## 1. Overview

GitHub Reminder is a Chrome extension that checks your GitHub contribution activity and reminds you before your streak breaks. This policy explains what data the extension touches, where it lives, and who can see it.

The short version: everything the extension touches goes directly between your browser and GitHub's API. There is no backend server operated by the developer, no analytics SDK, and nothing is sold or shared.

## 2. Data We Access

- **GitHub Personal Access Token (PAT)** — the token you generate and paste into Settings, scoped to `read:user`. It authenticates requests to GitHub's GraphQL API.
- **GitHub username** — the handle you enter, used to query your contribution calendar.
- **Contribution data** — daily contribution counts for the past year, fetched from GitHub's `contributionCalendar` API. This is the same data shown on your public profile graph.
- **Reminder preferences** — whether notifications are enabled, and your two reminder times.

The extension does not access your repositories, code, private messages, or any GitHub data beyond the public contribution calendar.

## 3. Where Data Lives

| Data | Storage | Leaves your device? |
|---|---|---|
| GitHub token | `chrome.storage.local` | No — stays on this device only |
| GitHub username | `chrome.storage.sync` | Only to your own Google/Chrome account, to sync across your own devices |
| Reminder preferences | `chrome.storage.sync` | Same as above |
| Cached contribution stats | `chrome.storage.local` | No |

`chrome.storage.sync` data is encrypted in transit and held against your own Chrome profile by Google — it is not accessible to the developer of this extension.

## 4. How Data Is Used

- To calculate your current streak, longest streak, monthly totals, and the other stats shown in the popup.
- To decide whether to fire a local Chrome notification if you haven't contributed by your chosen reminder time.
- Nothing else. There is no analytics, no crash reporting, no telemetry, and no advertising.

## 5. Third-Party Sharing

The only network requests the extension makes are directly from your browser to `https://api.github.com`. No data passes through, or is stored on, any server operated by the developer. No data is sold, rented, or shared with advertisers or any other third party.

## 6. Data Retention & Deletion

- Cached stats refresh hourly and can be cleared any time from **Settings → Clear Cached Data**.
- Removing the extension deletes all locally stored data (token, cache) immediately.
- Synced data (username, preferences) is removed from `chrome.storage.sync` when the extension is removed, per Chrome's standard behavior.
- Revoking the Personal Access Token at any time on GitHub instantly cuts off the extension's access, independent of the above.

## 7. Permissions Justification

| Permission | Why it's needed |
|---|---|
| `storage` | Save your token, username, preferences, and cached stats |
| `alarms` | Schedule the hourly refresh and the two nightly reminder checks |
| `notifications` | Show the streak reminder notification |
| `host_permissions: api.github.com` | The only endpoint the extension ever contacts, to fetch your contribution calendar |

## 8. Children's Privacy

This extension is a developer tool intended for GitHub account holders and is not directed at children under 13. It does not knowingly collect data from children.

## 9. Changes to This Policy

If this policy changes, the "Last updated" date above will change, and material changes will be noted in the extension's release notes.

## 10. Contact

Questions or concerns? [Open an issue](https://github.com/NavyaMehrotra1/github_reminder/issues) on the repository.
