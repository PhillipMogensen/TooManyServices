import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { fetchGitHubData } from '$lib/github.js';

export async function GET() {
	if (!env.GITHUB_TOKEN || !env.GITHUB_USERNAME) {
		return json({
			configured: false,
			prs: [],
			currentIteration: [],
			currentIterationClosed: [],
			futureIterations: [],
			backlog: []
		});
	}

	try {
		const data = await fetchGitHubData(env.GITHUB_TOKEN, env.GITHUB_USERNAME);
		return json({
			configured: true,
			...data,
			fetchedAt: new Date().toISOString()
		});
	} catch (error) {
		return json({
			configured: true,
			error: error.message,
			prs: [],
			currentIteration: [],
			currentIterationClosed: [],
			futureIterations: [],
			backlog: []
		});
	}
}
