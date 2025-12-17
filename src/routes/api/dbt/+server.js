import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { fetchLatestRun } from '$lib/dbt.js';
import { getDbtJobs } from '$lib/config.js';

export async function GET() {
	const jobs = getDbtJobs();

	// Return empty if no token or no jobs configured
	if (!env.DBT_TOKEN || jobs.length === 0) {
		return json({ configured: false, runs: [] });
	}

	try {
		// Fetch all jobs in parallel
		const runPromises = jobs.map(async (job) => {
			try {
				const run = await fetchLatestRun(
					env.DBT_TOKEN,
					job.accountId,
					job.jobId,
					job.baseUrl
				);
				return {
					name: job.name,
					...run
				};
			} catch (error) {
				return {
					name: job.name,
					error: error.message,
					status: 'Error',
					statusColor: 'red'
				};
			}
		});

		const runs = await Promise.all(runPromises);

		return json({
			configured: true,
			runs,
			fetchedAt: new Date().toISOString()
		});
	} catch (error) {
		return json({ configured: true, error: error.message, runs: [] }, { status: 500 });
	}
}
