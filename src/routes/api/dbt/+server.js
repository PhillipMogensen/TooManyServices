import { json } from '@sveltejs/kit';
import { DBT_TOKEN, DBT_ACCOUNT_ID, DBT_JOB_ID, DBT_BASE_URL } from '$env/static/private';
import { fetchLatestRun } from '$lib/dbt.js';

export async function GET() {
	// Return null if dbt Cloud is not configured
	if (!DBT_TOKEN || !DBT_ACCOUNT_ID || !DBT_JOB_ID || !DBT_BASE_URL) {
		return json({ configured: false, run: null });
	}

	try {
		const run = await fetchLatestRun(DBT_TOKEN, DBT_ACCOUNT_ID, DBT_JOB_ID, DBT_BASE_URL);
		return json({
			configured: true,
			run,
			fetchedAt: new Date().toISOString()
		});
	} catch (error) {
		return json({ configured: true, error: error.message, run: null }, { status: 500 });
	}
}
