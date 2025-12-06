# Personal Dashboard Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a local SvelteKit dashboard showing GitHub PRs/issues awaiting action plus quick-access links.

**Architecture:** SvelteKit app with server-side API endpoint that queries GitHub Search API using a PAT. Client renders data in a grid layout with auto-refresh (5min) and manual refresh button. Quick links loaded from YAML file.

**Tech Stack:** SvelteKit, Tailwind CSS, GitHub REST API, js-yaml

---

## Task 1: Initialize SvelteKit Project

**Files:**
- Create: `package.json`, `svelte.config.js`, `vite.config.js`, `src/app.html`, etc. (via CLI)

**Step 1: Create SvelteKit project**

Run:
```bash
npm create svelte@latest . -- --template skeleton --types none --no-add-ons
```

Select: No TypeScript, no additional options

Expected: Project scaffolded with SvelteKit files

**Step 2: Install dependencies**

Run:
```bash
npm install
```

Expected: `node_modules` created, no errors

**Step 3: Verify dev server works**

Run:
```bash
npm run dev -- --open
```

Expected: Browser opens to `http://localhost:5173` showing "Welcome to SvelteKit"

Stop the dev server (Ctrl+C)

**Step 4: Commit**

```bash
git add -A
git commit -m "chore: initialize SvelteKit project"
```

---

## Task 2: Add Tailwind CSS

**Files:**
- Modify: `package.json` (via npm)
- Create: `src/app.css`
- Modify: `src/routes/+layout.svelte`

**Step 1: Install Tailwind and dependencies**

Run:
```bash
npm install -D tailwindcss @tailwindcss/vite
```

Expected: Packages added to devDependencies

**Step 2: Configure Vite plugin**

Modify `vite.config.js`:
```javascript
import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()]
});
```

**Step 3: Create app.css with Tailwind import**

Create `src/app.css`:
```css
@import 'tailwindcss';
```

**Step 4: Create layout that imports CSS**

Create `src/routes/+layout.svelte`:
```svelte
<script>
	import '../app.css';
</script>

<slot />
```

**Step 5: Test Tailwind works**

Modify `src/routes/+page.svelte`:
```svelte
<h1 class="text-3xl font-bold text-blue-600">Dashboard</h1>
```

Run:
```bash
npm run dev
```

Expected: "Dashboard" appears in large blue bold text

Stop dev server

**Step 6: Commit**

```bash
git add -A
git commit -m "chore: add Tailwind CSS"
```

---

## Task 3: Environment Setup

**Files:**
- Create: `.env.example`
- Create: `.env`
- Modify: `.gitignore`

**Step 1: Create .env.example template**

Create `.env.example`:
```
GITHUB_TOKEN=ghp_your_personal_access_token_here
GITHUB_USERNAME=your_github_username
```

**Step 2: Create actual .env file**

Create `.env`:
```
GITHUB_TOKEN=<your-actual-token>
GITHUB_USERNAME=<your-github-username>
```

Replace with real values. Token needs `repo` scope.

**Step 3: Ensure .env is gitignored**

Check `.gitignore` includes `.env` (SvelteKit template should have this). If not, add:
```
.env
.env.*
!.env.example
```

**Step 4: Commit**

```bash
git add .env.example .gitignore
git commit -m "chore: add environment variable template"
```

---

## Task 4: GitHub API Client

**Files:**
- Create: `src/lib/github.js`

**Step 1: Create GitHub API client**

Create `src/lib/github.js`:
```javascript
const GITHUB_API = 'https://api.github.com';

export async function fetchGitHubData(token, username) {
	const headers = {
		Authorization: `Bearer ${token}`,
		Accept: 'application/vnd.github.v3+json'
	};

	const queries = {
		reviewRequested: `is:pr is:open review-requested:${username}`,
		prsMentioned: `is:pr is:open mentions:${username}`,
		prsAssigned: `is:pr is:open assignee:${username}`,
		issuesMentioned: `is:issue is:open mentions:${username}`,
		issuesAssigned: `is:issue is:open assignee:${username}`
	};

	const results = {};

	for (const [key, query] of Object.entries(queries)) {
		const url = `${GITHUB_API}/search/issues?q=${encodeURIComponent(query)}&per_page=100`;
		const response = await fetch(url, { headers });

		if (!response.ok) {
			throw new Error(`GitHub API error: ${response.status}`);
		}

		const data = await response.json();
		results[key] = data.items;
	}

	// Deduplicate PRs (might appear in multiple categories)
	const prMap = new Map();
	['reviewRequested', 'prsMentioned', 'prsAssigned'].forEach((key) => {
		results[key].forEach((pr) => {
			if (!prMap.has(pr.id)) {
				prMap.set(pr.id, { ...pr, categories: [key] });
			} else {
				prMap.get(pr.id).categories.push(key);
			}
		});
	});

	// Deduplicate issues
	const issueMap = new Map();
	['issuesMentioned', 'issuesAssigned'].forEach((key) => {
		results[key].forEach((issue) => {
			if (!issueMap.has(issue.id)) {
				issueMap.set(issue.id, { ...issue, categories: [key] });
			} else {
				issueMap.get(issue.id).categories.push(key);
			}
		});
	});

	return {
		prs: Array.from(prMap.values()),
		issues: Array.from(issueMap.values())
	};
}
```

**Step 2: Commit**

```bash
git add src/lib/github.js
git commit -m "feat: add GitHub API client"
```

---

## Task 5: Server API Endpoint

**Files:**
- Create: `src/routes/api/github/+server.js`

**Step 1: Create API endpoint**

Create `src/routes/api/github/+server.js`:
```javascript
import { json } from '@sveltejs/kit';
import { GITHUB_TOKEN, GITHUB_USERNAME } from '$env/static/private';
import { fetchGitHubData } from '$lib/github.js';

export async function GET() {
	if (!GITHUB_TOKEN || !GITHUB_USERNAME) {
		return json({ error: 'Missing GITHUB_TOKEN or GITHUB_USERNAME in .env' }, { status: 500 });
	}

	try {
		const data = await fetchGitHubData(GITHUB_TOKEN, GITHUB_USERNAME);
		return json({
			...data,
			fetchedAt: new Date().toISOString()
		});
	} catch (error) {
		return json({ error: error.message }, { status: 500 });
	}
}
```

**Step 2: Test the endpoint**

Run:
```bash
npm run dev
```

In another terminal or browser, visit: `http://localhost:5173/api/github`

Expected: JSON response with `prs`, `issues`, and `fetchedAt` fields

Stop dev server

**Step 3: Commit**

```bash
git add src/routes/api/github/+server.js
git commit -m "feat: add GitHub API endpoint"
```

---

## Task 6: Quick Links Setup

**Files:**
- Create: `links.yaml`
- Install: `js-yaml`
- Create: `src/lib/links.js`

**Step 1: Install js-yaml**

Run:
```bash
npm install js-yaml
```

**Step 2: Create sample links.yaml**

Create `links.yaml` in project root:
```yaml
- name: GitHub
  url: https://github.com

- name: Google
  url: https://google.com

- name: Stack Overflow
  url: https://stackoverflow.com
```

**Step 3: Create links loader**

Create `src/lib/links.js`:
```javascript
import yaml from 'js-yaml';
import { readFileSync } from 'fs';
import { join } from 'path';

export function loadLinks() {
	try {
		const filePath = join(process.cwd(), 'links.yaml');
		const content = readFileSync(filePath, 'utf8');
		return yaml.load(content) || [];
	} catch (error) {
		console.error('Error loading links.yaml:', error.message);
		return [];
	}
}
```

**Step 4: Commit**

```bash
git add links.yaml src/lib/links.js package.json package-lock.json
git commit -m "feat: add YAML-based quick links"
```

---

## Task 7: Links API Endpoint

**Files:**
- Create: `src/routes/api/links/+server.js`

**Step 1: Create links endpoint**

Create `src/routes/api/links/+server.js`:
```javascript
import { json } from '@sveltejs/kit';
import { loadLinks } from '$lib/links.js';

export async function GET() {
	const links = loadLinks();
	return json(links);
}
```

**Step 2: Test the endpoint**

Run:
```bash
npm run dev
```

Visit: `http://localhost:5173/api/links`

Expected: JSON array with link objects

Stop dev server

**Step 3: Commit**

```bash
git add src/routes/api/links/+server.js
git commit -m "feat: add links API endpoint"
```

---

## Task 8: PR List Component

**Files:**
- Create: `src/lib/components/PRList.svelte`

**Step 1: Create PR list component**

Create `src/lib/components/PRList.svelte`:
```svelte
<script>
	export let prs = [];
</script>

<div class="bg-white rounded-lg shadow p-4">
	<h2 class="text-lg font-semibold mb-3 text-gray-800">Pull Requests</h2>

	{#if prs.length === 0}
		<p class="text-gray-500 text-sm">No PRs awaiting action</p>
	{:else}
		<ul class="space-y-2">
			{#each prs as pr}
				<li class="border-l-4 border-blue-500 pl-3 py-1">
					<a
						href={pr.html_url}
						target="_blank"
						rel="noopener noreferrer"
						class="text-blue-600 hover:underline text-sm font-medium"
					>
						{pr.title}
					</a>
					<div class="text-xs text-gray-500">
						{pr.repository_url.split('/').slice(-1)[0]} · #{pr.number}
						{#if pr.categories.includes('reviewRequested')}
							<span class="ml-1 px-1 py-0.5 bg-yellow-100 text-yellow-800 rounded">review requested</span>
						{/if}
					</div>
				</li>
			{/each}
		</ul>
	{/if}
</div>
```

**Step 2: Commit**

```bash
git add src/lib/components/PRList.svelte
git commit -m "feat: add PRList component"
```

---

## Task 9: Issue List Component

**Files:**
- Create: `src/lib/components/IssueList.svelte`

**Step 1: Create issue list component**

Create `src/lib/components/IssueList.svelte`:
```svelte
<script>
	export let issues = [];
</script>

<div class="bg-white rounded-lg shadow p-4">
	<h2 class="text-lg font-semibold mb-3 text-gray-800">Issues</h2>

	{#if issues.length === 0}
		<p class="text-gray-500 text-sm">No issues awaiting action</p>
	{:else}
		<ul class="space-y-2">
			{#each issues as issue}
				<li class="border-l-4 border-green-500 pl-3 py-1">
					<a
						href={issue.html_url}
						target="_blank"
						rel="noopener noreferrer"
						class="text-blue-600 hover:underline text-sm font-medium"
					>
						{issue.title}
					</a>
					<div class="text-xs text-gray-500">
						{issue.repository_url.split('/').slice(-1)[0]} · #{issue.number}
						{#if issue.categories.includes('issuesAssigned')}
							<span class="ml-1 px-1 py-0.5 bg-purple-100 text-purple-800 rounded">assigned</span>
						{/if}
					</div>
				</li>
			{/each}
		</ul>
	{/if}
</div>
```

**Step 2: Commit**

```bash
git add src/lib/components/IssueList.svelte
git commit -m "feat: add IssueList component"
```

---

## Task 10: Quick Links Component

**Files:**
- Create: `src/lib/components/QuickLinks.svelte`

**Step 1: Create quick links component**

Create `src/lib/components/QuickLinks.svelte`:
```svelte
<script>
	export let links = [];
</script>

<div class="bg-white rounded-lg shadow p-4">
	<h2 class="text-lg font-semibold mb-3 text-gray-800">Quick Links</h2>

	{#if links.length === 0}
		<p class="text-gray-500 text-sm">No links configured</p>
	{:else}
		<div class="flex flex-wrap gap-2">
			{#each links as link}
				<a
					href={link.url}
					target="_blank"
					rel="noopener noreferrer"
					class="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-md text-sm font-medium text-gray-700 transition-colors"
				>
					{link.name}
				</a>
			{/each}
		</div>
	{/if}
</div>
```

**Step 2: Commit**

```bash
git add src/lib/components/QuickLinks.svelte
git commit -m "feat: add QuickLinks component"
```

---

## Task 11: Main Dashboard Page

**Files:**
- Modify: `src/routes/+page.svelte`

**Step 1: Build the main dashboard**

Replace `src/routes/+page.svelte`:
```svelte
<script>
	import { onMount } from 'svelte';
	import PRList from '$lib/components/PRList.svelte';
	import IssueList from '$lib/components/IssueList.svelte';
	import QuickLinks from '$lib/components/QuickLinks.svelte';

	let prs = [];
	let issues = [];
	let links = [];
	let lastUpdated = null;
	let loading = true;
	let error = null;

	const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes

	async function fetchData() {
		loading = true;
		error = null;

		try {
			const [githubRes, linksRes] = await Promise.all([
				fetch('/api/github'),
				fetch('/api/links')
			]);

			if (!githubRes.ok) {
				const err = await githubRes.json();
				throw new Error(err.error || 'Failed to fetch GitHub data');
			}

			const githubData = await githubRes.json();
			prs = githubData.prs;
			issues = githubData.issues;
			lastUpdated = new Date(githubData.fetchedAt);

			links = await linksRes.json();
		} catch (e) {
			error = e.message;
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		fetchData();
		const interval = setInterval(fetchData, REFRESH_INTERVAL);
		return () => clearInterval(interval);
	});

	function formatTime(date) {
		if (!date) return '';
		return date.toLocaleTimeString();
	}
</script>

<div class="min-h-screen bg-gray-100">
	<header class="bg-white shadow">
		<div class="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
			<h1 class="text-xl font-bold text-gray-900">Dashboard</h1>
			<div class="flex items-center gap-4">
				{#if lastUpdated}
					<span class="text-sm text-gray-500">
						Updated {formatTime(lastUpdated)}
					</span>
				{/if}
				<button
					on:click={fetchData}
					disabled={loading}
					class="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
				>
					{loading ? 'Refreshing...' : 'Refresh'}
				</button>
			</div>
		</div>
	</header>

	<main class="max-w-7xl mx-auto px-4 py-6">
		{#if error}
			<div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
				{error}
			</div>
		{/if}

		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
			<PRList {prs} />
			<IssueList {issues} />
			<QuickLinks {links} />
		</div>
	</main>
</div>
```

**Step 2: Test the full dashboard**

Run:
```bash
npm run dev
```

Expected: Dashboard shows with three columns - PRs, Issues, Quick Links. Refresh button works.

Stop dev server

**Step 3: Commit**

```bash
git add src/routes/+page.svelte
git commit -m "feat: build main dashboard page"
```

---

## Task 12: Final Polish and README

**Files:**
- Create: `README.md`

**Step 1: Create README**

Create `README.md`:
```markdown
# Personal Dashboard

A local web dashboard showing GitHub PRs/issues awaiting your action, plus quick-access links.

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   ```

   Edit `.env` and add:
   - `GITHUB_TOKEN`: Personal access token with `repo` scope
   - `GITHUB_USERNAME`: Your GitHub username

3. **Configure quick links:**

   Edit `links.yaml` to add your frequently used links.

4. **Run:**
   ```bash
   npm run dev
   ```

   Open http://localhost:5173

## Features

- PRs awaiting your review (review-requested, mentioned, assigned)
- Issues mentioning or assigned to you
- One-click quick links (configured in `links.yaml`)
- Auto-refresh every 5 minutes
- Manual refresh button

## Portability

To take this to a new job:
1. Copy the entire folder
2. Update `.env` with new GitHub token
3. Update `links.yaml` with new links
4. `npm install && npm run dev`
```

**Step 2: Final commit**

```bash
git add README.md
git commit -m "docs: add README with setup instructions"
```

---

## Summary

12 tasks total:
1. Initialize SvelteKit
2. Add Tailwind CSS
3. Environment setup
4. GitHub API client
5. GitHub API endpoint
6. Quick links setup (YAML + loader)
7. Links API endpoint
8. PRList component
9. IssueList component
10. QuickLinks component
11. Main dashboard page
12. README documentation
