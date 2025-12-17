import { json } from '@sveltejs/kit';
import { PREFECT_API_KEY } from '$env/static/private';
import { fetchPrefectData } from '$lib/prefect.js';
import { getPrefectConfig } from '$lib/config.js';

export async function GET() {
	const config = getPrefectConfig();

	// Return empty if not fully configured
	if (!PREFECT_API_KEY || !config.accountId || !config.workspaceId || config.tags.length === 0) {
		return json({ configured: false, deployments: [] });
	}

	try {
		const data = await fetchPrefectData(PREFECT_API_KEY, config);

		return json({
			...data,
			tags: config.tags,
			fetchedAt: new Date().toISOString()
		});
	} catch (error) {
		return json({ configured: true, error: error.message, deployments: [] }, { status: 500 });
	}
}
