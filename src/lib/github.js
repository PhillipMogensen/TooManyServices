const GITHUB_API = 'https://api.github.com';
const GITHUB_GRAPHQL = 'https://api.github.com/graphql';

// Fetch parent info and project status for issues using GraphQL
async function fetchIssueMetadata(token, issues) {
	if (issues.length === 0) return issues;

	const headers = {
		Authorization: `Bearer ${token}`,
		'Content-Type': 'application/json'
	};

	const nodeIds = issues.map((issue) => issue.node_id);

	// Query for parent info and iteration data
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
					projectItems(first: 10) {
						nodes {
							fieldValueByName(name: "Iteration") {
								... on ProjectV2ItemFieldIterationValue {
									title
									startDate
									duration
								}
							}
						}
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
			// Continue with partial data - parent info might still work
		}

		// Map node_id to metadata
		const metadataMap = new Map();
		data.data?.nodes?.forEach((node) => {
			if (node?.id) {
				// Find iteration from project items
				let iteration = null;
				node.projectItems?.nodes?.forEach((item) => {
					const iterValue = item?.fieldValueByName;
					if (iterValue?.title) {
						iteration = {
							title: iterValue.title,
							startDate: iterValue.startDate,
							duration: iterValue.duration
						};
					}
				});

				metadataMap.set(node.id, {
					parent: node.parent || null,
					iteration
				});
			}
		});

		// Enrich issues with metadata
		return issues.map((issue) => {
			const metadata = metadataMap.get(issue.node_id) || {};
			return {
				...issue,
				parent: metadata.parent || null,
				iteration: metadata.iteration || null
			};
		});
	} catch (error) {
		console.error('Failed to fetch issue metadata:', error);
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
		prsAuthored: `is:pr is:open author:${username}`,
		issuesMentioned: `is:issue is:open mentions:${username}`,
		issuesAssigned: `is:issue is:open assignee:${username}`,
		// Closed issues (for current iteration tracking) - last 30 days
		issuesClosedMentioned: `is:issue is:closed mentions:${username} closed:>${new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}`,
		issuesClosedAssigned: `is:issue is:closed assignee:${username} closed:>${new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}`
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
	['reviewRequested', 'prsMentioned', 'prsAssigned', 'prsAuthored'].forEach((key) => {
		results[key].forEach((pr) => {
			if (!prMap.has(pr.id)) {
				prMap.set(pr.id, { ...pr, categories: [key] });
			} else {
				prMap.get(pr.id).categories.push(key);
			}
		});
	});

	// Deduplicate open issues
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

	// Deduplicate closed issues
	const closedIssueMap = new Map();
	['issuesClosedMentioned', 'issuesClosedAssigned'].forEach((key) => {
		results[key].forEach((issue) => {
			if (!closedIssueMap.has(issue.id)) {
				closedIssueMap.set(issue.id, { ...issue, categories: [key], isClosed: true });
			} else {
				closedIssueMap.get(issue.id).categories.push(key);
			}
		});
	});

	// Sort by most recent activity (updated_at)
	const sortByActivity = (a, b) => new Date(b.updated_at) - new Date(a.updated_at);

	// Fetch metadata for open issues and group
	const issuesWithMetadata = await fetchIssueMetadata(token, Array.from(issueMap.values()));
	const groupedIssues = groupIssuesByParent(issuesWithMetadata);

	// Fetch metadata for closed issues (don't group - just get iteration info)
	const closedIssuesWithMetadata = await fetchIssueMetadata(token, Array.from(closedIssueMap.values()));

	// Sort helper for issue groups
	const getGroupTime = (issue) => {
		if (issue.subIssues?.length) {
			return Math.max(
				new Date(issue.updated_at || 0),
				...issue.subIssues.map((s) => new Date(s.updated_at))
			);
		}
		return new Date(issue.updated_at);
	};

	// Get iteration info for an issue group (check parent first, then sub-issues)
	const getGroupIteration = (issue) => {
		if (issue.iteration) return issue.iteration;
		const subWithIter = issue.subIssues?.find((s) => s.iteration);
		return subWithIter?.iteration || null;
	};

	// Determine if an iteration is current (started but not ended)
	const isCurrentIteration = (iteration) => {
		if (!iteration?.startDate) return false;
		const start = new Date(iteration.startDate);
		const duration = iteration.duration || 14; // default 2 weeks
		const end = new Date(start);
		end.setDate(end.getDate() + duration);
		const now = new Date();
		return now >= start && now <= end;
	};

	// Determine if an iteration is in the future
	const isFutureIteration = (iteration) => {
		if (!iteration?.startDate) return false;
		const start = new Date(iteration.startDate);
		const now = new Date();
		return start > now;
	};

	// Split by iteration category
	const currentIteration = groupedIssues.filter((i) => {
		const iter = getGroupIteration(i);
		return isCurrentIteration(iter);
	});
	const futureIterations = groupedIssues.filter((i) => {
		const iter = getGroupIteration(i);
		return isFutureIteration(iter);
	});
	const backlog = groupedIssues.filter((i) => {
		const iter = getGroupIteration(i);
		return !iter || (!isCurrentIteration(iter) && !isFutureIteration(iter));
	});

	// Add iteration title for display
	const addIterationTitle = (list) => list.map((issue) => ({
		...issue,
		displayIteration: getGroupIteration(issue)?.title || null
	}));

	// Sort each list by activity
	[currentIteration, futureIterations, backlog].forEach((list) => {
		list.sort((a, b) => getGroupTime(b) - getGroupTime(a));
	});

	// Filter closed issues that are in the current iteration
	const closedInCurrentIteration = closedIssuesWithMetadata
		.filter((issue) => isCurrentIteration(issue.iteration))
		.map((issue) => ({ ...issue, displayIteration: issue.iteration?.title || null }))
		.sort(sortByActivity);

	return {
		prs: Array.from(prMap.values()).sort(sortByActivity),
		currentIteration: addIterationTitle(currentIteration),
		currentIterationClosed: closedInCurrentIteration,
		futureIterations: addIterationTitle(futureIterations),
		backlog: addIterationTitle(backlog)
	};
}
