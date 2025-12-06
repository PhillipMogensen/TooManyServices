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
