// Prefect 3 Cloud API client
// Docs: https://docs.prefect.io/latest/api-ref/rest-api/

function getApiBase(accountId, workspaceId) {
	return `https://api.prefect.cloud/api/accounts/${accountId}/workspaces/${workspaceId}`;
}

// Status mapping for Prefect 3 flow run states
const STATE_COLORS = {
	COMPLETED: 'green',
	FAILED: 'red',
	CRASHED: 'red',
	CANCELLED: 'gray',
	CANCELLING: 'gray',
	RUNNING: 'blue',
	PENDING: 'yellow',
	SCHEDULED: 'yellow',
	PAUSED: 'yellow',
	LATE: 'yellow'
};

function getStatusColor(state) {
	return STATE_COLORS[state?.toUpperCase()] || 'gray';
}

/**
 * Fetch deployments that have a specific tag
 */
async function fetchDeploymentsByTags(apiKey, apiBase, tags) {
	const headers = {
		Authorization: `Bearer ${apiKey}`,
		'Content-Type': 'application/json'
	};

	// Prefect 3 uses POST for filtering deployments
	const response = await fetch(`${apiBase}/deployments/filter`, {
		method: 'POST',
		headers,
		body: JSON.stringify({
			deployments: {
				tags: {
					any_: tags
				}
			},
			sort: 'NAME_ASC',
			limit: 100
		})
	});

	if (!response.ok) {
		const text = await response.text();
		throw new Error(`Failed to fetch deployments: ${response.status} ${text}`);
	}

	return response.json();
}

/**
 * Fetch recent flow runs for a deployment
 */
async function fetchRecentRuns(apiKey, apiBase, deploymentId, limit = 10) {
	const headers = {
		Authorization: `Bearer ${apiKey}`,
		'Content-Type': 'application/json'
	};

	const response = await fetch(`${apiBase}/flow_runs/filter`, {
		method: 'POST',
		headers,
		body: JSON.stringify({
			flow_runs: {
				deployment_id: {
					any_: [deploymentId]
				}
			},
			sort: 'START_TIME_DESC',
			limit
		})
	});

	if (!response.ok) {
		const text = await response.text();
		throw new Error(`Failed to fetch flow runs: ${response.status} ${text}`);
	}

	return response.json();
}

/**
 * Fetch flow information by ID
 */
async function fetchFlow(apiKey, apiBase, flowId) {
	const headers = {
		Authorization: `Bearer ${apiKey}`,
		'Content-Type': 'application/json'
	};

	const response = await fetch(`${apiBase}/flows/${flowId}`, {
		method: 'GET',
		headers
	});

	if (!response.ok) {
		return null;
	}

	return response.json();
}

// States that indicate a run has not yet executed
const PENDING_STATES = ['SCHEDULED', 'PENDING', 'LATE'];

/**
 * Check if a run has actually executed (not just scheduled)
 */
function hasExecuted(run) {
	const state = (run.state_type || run.state?.type || '').toUpperCase();
	return !PENDING_STATES.includes(state);
}

/**
 * Main function to fetch Prefect data for the dashboard
 * Returns deployments where the most recent executed run failed or crashed, along with run history
 */
export async function fetchPrefectData(apiKey, config) {
	const { accountId, workspaceId, tags } = config;

	if (!apiKey || !accountId || !workspaceId || !tags || tags.length === 0) {
		return { configured: false, deployments: [] };
	}

	const apiBase = getApiBase(accountId, workspaceId);

	try {
		// Fetch all deployments with the specified tags
		const deployments = await fetchDeploymentsByTags(apiKey, apiBase, tags);

		if (!deployments || deployments.length === 0) {
			return { configured: true, deployments: [] };
		}

		// For each deployment, fetch recent runs
		const deploymentsWithRuns = await Promise.all(
			deployments.map(async (deployment) => {
				try {
					const runs = await fetchRecentRuns(apiKey, apiBase, deployment.id, 20);

					// Filter to only runs that have actually executed (not scheduled/pending)
					const executedRuns = runs.filter(hasExecuted);

					// Sort executed runs by start time (newest first)
					const sortedRuns = executedRuns.sort(
						(a, b) => new Date(b.start_time || 0) - new Date(a.start_time || 0)
					);

					const latestRun = sortedRuns[0];
					const latestState = latestRun?.state_type || latestRun?.state?.type;

					// Get flow name
					let flowName = deployment.name;
					if (deployment.flow_id) {
						const flow = await fetchFlow(apiKey, apiBase, deployment.flow_id);
						if (flow) {
							flowName = flow.name;
						}
					}

					return {
						id: deployment.id,
						name: deployment.name,
						flowName,
						tags: deployment.tags || [],
						latestRun: latestRun
							? {
									id: latestRun.id,
									state: latestState,
									stateColor: getStatusColor(latestState),
									stateName: latestRun.state_name || latestState,
									startTime: latestRun.start_time,
									endTime: latestRun.end_time,
									expectedStartTime: latestRun.expected_start_time
								}
							: null,
						// Run history for the mini graph - only executed runs, oldest first
						runHistory: sortedRuns.slice(0, 10).reverse().map((run) => ({
							id: run.id,
							state: run.state_type || run.state?.type,
							stateColor: getStatusColor(run.state_type || run.state?.type),
							startTime: run.start_time,
							endTime: run.end_time
						})),
						// Build URL to Prefect Cloud UI
						url: `https://app.prefect.cloud/account/${accountId}/workspace/${workspaceId}/deployments/deployment/${deployment.id}`
					};
				} catch (error) {
					console.error(`Error fetching runs for deployment ${deployment.id}:`, error);
					return null;
				}
			})
		);

		// Filter out nulls
		const validDeployments = deploymentsWithRuns.filter((d) => d && d.latestRun);

		// Calculate summary stats per tag
		const tagSummary = {};
		for (const tag of tags) {
			tagSummary[tag] = { total: 0, successful: 0 };
		}

		for (const deployment of validDeployments) {
			const state = deployment.latestRun.state?.toUpperCase();
			const isSuccessful = state === 'COMPLETED';

			// Count for each monitored tag this deployment has
			for (const tag of tags) {
				if (deployment.tags.includes(tag)) {
					tagSummary[tag].total++;
					if (isSuccessful) {
						tagSummary[tag].successful++;
					}
				}
			}
		}

		// Filter to only failed/crashed deployments
		const failedDeployments = validDeployments.filter((d) => {
			const state = d.latestRun.state?.toUpperCase();
			return state === 'FAILED' || state === 'CRASHED';
		});

		return {
			configured: true,
			deployments: failedDeployments,
			tagSummary
		};
	} catch (error) {
		console.error('Error fetching Prefect data:', error);
		throw error;
	}
}
