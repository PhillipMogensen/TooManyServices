// Status codes: 1=Queued, 2=Starting, 3=Running, 10=Success, 20=Error, 30=Cancelled
const statusMap = {
	1: { label: 'Queued', color: 'gray' },
	2: { label: 'Starting', color: 'yellow' },
	3: { label: 'Running', color: 'blue' },
	10: { label: 'Success', color: 'green' },
	20: { label: 'Error', color: 'red' },
	30: { label: 'Cancelled', color: 'gray' }
};

export async function fetchLatestRun(token, accountId, jobId, baseUrl) {
	const apiUrl = `${baseUrl}/api/v2`;
	const headers = {
		Authorization: `Token ${token}`,
		'Content-Type': 'application/json'
	};

	// Get latest run for the job with run_steps included
	const listUrl = `${apiUrl}/accounts/${accountId}/runs/?job_definition_id=${jobId}&limit=1&order_by=-finished_at&include_related=run_steps`;
	const listResponse = await fetch(listUrl, { headers });

	if (!listResponse.ok) {
		throw new Error(`dbt Cloud API error: ${listResponse.status}`);
	}

	const listData = await listResponse.json();

	if (!listData.data || listData.data.length === 0) {
		return null;
	}

	const run = listData.data[0];
	const runSteps = run.run_steps || [];

	// Find the freshness step (looks for "freshness" in the step name)
	const freshnessStep = runSteps.find((step) =>
		step.name?.toLowerCase().includes('freshness')
	);

	let freshnessStatus = null;
	if (freshnessStep) {
		const freshStatus = statusMap[freshnessStep.status] || { label: 'Unknown', color: 'gray' };
		freshnessStatus = {
			status: freshStatus.label,
			statusColor: freshStatus.color
		};
	}

	const status = statusMap[run.status] || { label: 'Unknown', color: 'gray' };

	return {
		id: run.id,
		status: status.label,
		statusColor: status.color,
		finishedAt: run.finished_at,
		startedAt: run.started_at,
		duration: run.duration_humanized || `${Math.round(run.duration / 60)}m`,
		jobName: run.job?.name || 'Production Build',
		runUrl: run.href,
		freshness: freshnessStatus
	};
}
