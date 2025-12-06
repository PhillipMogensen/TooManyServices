# Personal Dashboard Design

## Overview

A portable local web app that aggregates GitHub activity (PRs and issues) with quick-access links, designed to be carried from job to job.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Platform | Local web app | Portable, no hosting, tokens stay local |
| Framework | SvelteKit | Modern, fast, good DX |
| Styling | Tailwind CSS | Utility-first, fast iteration |
| GitHub Auth | PAT in .env | Simple, secure for local use |
| Links format | YAML | Human-readable, easy to edit |
| Refresh | Auto (5min) + manual | Current data without hammering API |

## Architecture

### Project Structure

```
personal-dashboard/
├── src/
│   ├── routes/
│   │   ├── +page.svelte          # Main dashboard
│   │   └── api/
│   │       └── github/+server.js # GitHub API endpoint
│   ├── lib/
│   │   ├── github.js             # GitHub API client
│   │   └── components/
│   │       ├── PRList.svelte
│   │       ├── IssueList.svelte
│   │       └── QuickLinks.svelte
├── links.yaml                     # Quick links (user-editable)
├── .env                           # GITHUB_TOKEN (gitignored)
├── .env.example                   # Template for setup
└── package.json
```

### Data Flow

1. Page loads → client requests `/api/github`
2. Server endpoint uses PAT to query GitHub Search API
3. Returns combined PR and issue data
4. Client renders in grid layout
5. Timer triggers auto-refresh every 5 minutes
6. Manual refresh button for immediate updates

### GitHub Queries

Using GitHub Search API (`/search/issues`):

**PRs awaiting review:**
- `is:pr is:open review-requested:@me`

**PRs mentioning me:**
- `is:pr is:open mentions:@me`

**PRs assigned to me:**
- `is:pr is:open assignee:@me`

**Issues mentioning me:**
- `is:issue is:open mentions:@me`

**Issues assigned to me:**
- `is:issue is:open assignee:@me`

### Quick Links

`links.yaml` format:
```yaml
- name: Jira
  url: https://company.atlassian.net
- name: Confluence
  url: https://company.atlassian.net/wiki
- name: Slack
  url: https://company.slack.com
```

## UI Layout

Simple responsive grid:
- **Header**: Dashboard title, last updated time, refresh button
- **Main**: 3-column grid on desktop, stacks on mobile
  - Column 1: PRs for review
  - Column 2: Issues
  - Column 3: Quick links

## Setup Requirements

1. Node.js 18+
2. GitHub PAT with `repo` scope
3. Copy `.env.example` to `.env`, add token
4. `npm install && npm run dev`
