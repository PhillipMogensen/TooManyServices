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
