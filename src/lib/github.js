const GITHUB_API = 'https://api.github.com';
const GITHUB_GRAPHQL = 'https://api.github.com/graphql';

// Fetch parent info for issues using GraphQL
async function fetchIssueParents(token, issues) {
	if (issues.length === 0) return issues;

	const headers = {
		Authorization: `Bearer ${token}`,
		'Content-Type': 'application/json'
	};

	// Build GraphQL query for each issue's parent
	// We need to query each issue individually by its node_id
	const nodeIds = issues.map((issue) => issue.node_id);

	const query = `
		query($ids: [ID!]!) {
			nodes(ids: $ids) {
				... on Issue {
					id
					parent {
						id
						number
						title
						url
					}
				}
			}
		}
	`;

	try {
		const response = await fetch(GITHUB_GRAPHQL, {
			method: 'POST',
			headers,
			body: JSON.stringify({ query, variables: { ids: nodeIds } })
		});

		if (!response.ok) {
			console.error('GraphQL error:', response.status);
			return issues;
		}

		const data = await response.json();

		if (data.errors) {
			console.error('GraphQL errors:', data.errors);
			return issues;
		}

		// Map node_id to parent info
		const parentMap = new Map();
		data.data?.nodes?.forEach((node) => {
			if (node?.id && node?.parent) {
				parentMap.set(node.id, node.parent);
			}
		});

		// Enrich issues with parent info
		return issues.map((issue) => ({
			...issue,
			parent: parentMap.get(issue.node_id) || null
		}));
	} catch (error) {
		console.error('Failed to fetch parents:', error);
		return issues;
	}
}

// Group issues by parent
function groupIssuesByParent(issues) {
	const parentMap = new Map(); // parent node_id -> { parent, children }
	const topLevel = []; // issues without parents

	issues.forEach((issue) => {
		if (issue.parent) {
			const parentId = issue.parent.id;
			if (!parentMap.has(parentId)) {
				parentMap.set(parentId, {
					parent: issue.parent,
					children: []
				});
			}
			parentMap.get(parentId).children.push(issue);
		} else {
			topLevel.push(issue);
		}
	});

	// Build final list: parent issues with their children nested
	const result = [];

	topLevel.forEach((issue) => {
		// Check if this issue is a parent to other issues
		const group = parentMap.get(issue.node_id);
		if (group) {
			result.push({ ...issue, subIssues: group.children });
			parentMap.delete(issue.node_id);
		} else {
			result.push(issue);
		}
	});

	// Add remaining parent groups (parents not in our issue list)
	parentMap.forEach((group) => {
		result.push({
			isExternalParent: true,
			...group.parent,
			html_url: group.parent.url,
			subIssues: group.children
		});
	});

	return result;
}

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

	// Sort by most recent activity (updated_at)
	const sortByActivity = (a, b) => new Date(b.updated_at) - new Date(a.updated_at);

	// Fetch parent relationships and group issues
	const issuesWithParents = await fetchIssueParents(token, Array.from(issueMap.values()));
	const groupedIssues = groupIssuesByParent(issuesWithParents);

	// Sort: parent issues by their most recent child activity, standalone by their own
	groupedIssues.sort((a, b) => {
		const aTime = a.subIssues?.length
			? Math.max(new Date(a.updated_at || 0), ...a.subIssues.map((s) => new Date(s.updated_at)))
			: new Date(a.updated_at);
		const bTime = b.subIssues?.length
			? Math.max(new Date(b.updated_at || 0), ...b.subIssues.map((s) => new Date(s.updated_at)))
			: new Date(b.updated_at);
		return bTime - aTime;
	});

	return {
		prs: Array.from(prMap.values()).sort(sortByActivity),
		issues: groupedIssues
	};
}
