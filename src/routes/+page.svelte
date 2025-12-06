<script>
	import { onMount } from 'svelte';
	import PRList from '$lib/components/PRList.svelte';
	import IssueList from '$lib/components/IssueList.svelte';

	let prs = [];
	let issues = [];
	let links = [];
	let dbtRun = null;
	let dbtConfigured = false;
	let lastUpdated = null;
	let loading = true;
	let error = null;

	const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes

	async function fetchData() {
		loading = true;
		error = null;

		try {
			const [githubRes, linksRes, dbtRes] = await Promise.all([
				fetch('/api/github'),
				fetch('/api/links'),
				fetch('/api/dbt')
			]);

			if (!githubRes.ok) {
				const err = await githubRes.json();
				throw new Error(err.error || 'Failed to fetch GitHub data');
			}

			const githubData = await githubRes.json();
			prs = githubData.prs;
			issues = githubData.issues;
			lastUpdated = new Date(githubData.fetchedAt);

			links = await linksRes.json();

			const dbtData = await dbtRes.json();
			dbtConfigured = dbtData.configured;
			dbtRun = dbtData.run;
		} catch (e) {
			error = e.message;
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		fetchData();
		const interval = setInterval(fetchData, REFRESH_INTERVAL);
		return () => clearInterval(interval);
	});

	function formatTime(date) {
		if (!date) return '';
		return date.toLocaleTimeString();
	}

	function timeAgo(dateString) {
		if (!dateString) return '';
		const date = new Date(dateString);
		const now = new Date();
		const seconds = Math.floor((now - date) / 1000);

		if (seconds < 60) return 'just now';
		const minutes = Math.floor(seconds / 60);
		if (minutes < 60) return `${minutes}m ago`;
		const hours = Math.floor(minutes / 60);
		if (hours < 24) return `${hours}h ago`;
		const days = Math.floor(hours / 24);
		return `${days}d ago`;
	}

	const statusColors = {
		green: 'bg-green-100 text-green-800',
		red: 'bg-red-100 text-red-800',
		yellow: 'bg-yellow-100 text-yellow-800',
		blue: 'bg-blue-100 text-blue-800',
		gray: 'bg-gray-100 text-gray-800'
	};
</script>

<div class="min-h-screen bg-gray-100">
	<header class="bg-white shadow">
		<div class="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
			<h1 class="text-xl font-bold text-gray-900">Dashboard</h1>
			<div class="flex items-center gap-4">
				{#if lastUpdated}
					<span class="text-sm text-gray-500">
						Updated {formatTime(lastUpdated)}
					</span>
				{/if}
				<button
					on:click={fetchData}
					disabled={loading}
					class="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
				>
					{loading ? 'Refreshing...' : 'Refresh'}
				</button>
			</div>
		</div>
	</header>

	<!-- Status bar: dbt + links -->
	{#if dbtConfigured || links.length > 0}
		<div class="bg-white border-b">
			<div class="max-w-7xl mx-auto px-4 py-2 flex items-center gap-4 flex-wrap">
				<!-- dbt Cloud status -->
				{#if dbtConfigured && dbtRun}
					<div class="flex items-center gap-2">
						<span class="text-xs text-gray-500">dbt:</span>
						<a
							href={dbtRun.runUrl}
							target="_blank"
							rel="noopener noreferrer"
							class="flex items-center gap-1.5 px-2 py-1 rounded text-xs {statusColors[dbtRun.statusColor]} hover:opacity-80"
						>
							<span class="font-medium">{dbtRun.status}</span>
							<span class="text-gray-500">·</span>
							<span>{timeAgo(dbtRun.finishedAt)}</span>
							{#if dbtRun.duration}
								<span class="text-gray-500">·</span>
								<span>{dbtRun.duration}</span>
							{/if}
						</a>
					</div>
				{/if}

				<!-- Separator -->
				{#if dbtConfigured && dbtRun && links.length > 0}
					<div class="h-4 w-px bg-gray-300"></div>
				{/if}

				<!-- Quick links -->
				{#if links.length > 0}
					<div class="flex items-center gap-2 flex-wrap">
						<span class="text-xs text-gray-500">Links:</span>
						{#each links as link}
							<a
								href={link.url}
								target="_blank"
								rel="noopener noreferrer"
								class="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded text-gray-700 transition-colors"
							>
								{link.name}
							</a>
						{/each}
					</div>
				{/if}
			</div>
		</div>
	{/if}

	<main class="max-w-7xl mx-auto px-4 py-6">
		{#if error}
			<div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
				{error}
			</div>
		{/if}

		<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
			<PRList {prs} />
			<IssueList {issues} />
		</div>
	</main>
</div>
