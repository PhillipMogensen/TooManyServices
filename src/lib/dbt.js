export async function fetchLatestRun(token, accountId, jobId, baseUrl) {
	const apiUrl = `${baseUrl}/api/v2`;
	const headers = {
		Authorization: `Token ${token}`,
		'Content-Type': 'application/json'
	};

	const url = `${apiUrl}/accounts/${accountId}/runs/?job_definition_id=${jobId}&limit=1&order_by=-finished_at`;
	const response = await fetch(url, { headers });

	if (!response.ok) {
		throw new Error(`dbt Cloud API error: ${response.status}`);
	}

	const data = await response.json();

	if (!data.data || data.data.length === 0) {
		return null;
	}

	const run = data.data[0];

	// Status codes: 1=Queued, 2=Starting, 3=Running, 10=Success, 20=Error, 30=Cancelled
	const statusMap = {
		1: { label: 'Queued', color: 'gray' },
		2: { label: 'Starting', color: 'yellow' },
		3: { label: 'Running', color: 'blue' },
		10: { label: 'Success', color: 'green' },
		20: { label: 'Error', color: 'red' },
		30: { label: 'Cancelled', color: 'gray' }
	};

	const status = statusMap[run.status] || { label: 'Unknown', color: 'gray' };

	return {
		id: run.id,
		status: status.label,
		statusColor: status.color,
		finishedAt: run.finished_at,
		startedAt: run.started_at,
		duration: run.duration_humanized || `${Math.round(run.duration / 60)}m`,
		jobName: run.job?.name || 'Production Build',
		runUrl: run.href
	};
}
