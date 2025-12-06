<script>
	export let prs = [];

	function timeAgo(dateString) {
		const date = new Date(dateString);
		const now = new Date();
		const seconds = Math.floor((now - date) / 1000);

		if (seconds < 60) return 'just now';
		const minutes = Math.floor(seconds / 60);
		if (minutes < 60) return `${minutes}m ago`;
		const hours = Math.floor(minutes / 60);
		if (hours < 24) return `${hours}h ago`;
		const days = Math.floor(hours / 24);
		if (days < 7) return `${days}d ago`;
		const weeks = Math.floor(days / 7);
		if (weeks < 4) return `${weeks}w ago`;
		const months = Math.floor(days / 30);
		return `${months}mo ago`;
	}
</script>

<div class="bg-white rounded-lg shadow p-4">
	<h2 class="text-lg font-semibold mb-3 text-gray-800">Pull Requests</h2>

	{#if prs.length === 0}
		<p class="text-gray-500 text-sm">No PRs awaiting action</p>
	{:else}
		<ul class="space-y-2">
			{#each prs as pr}
				<li class="border-l-4 border-blue-500 pl-3 py-1">
					<a
						href={pr.html_url}
						target="_blank"
						rel="noopener noreferrer"
						class="text-blue-600 hover:underline text-sm font-medium"
					>
						{pr.title}
					</a>
					<div class="text-xs text-gray-500">
						{pr.repository_url.split('/').slice(-1)[0]} · #{pr.number} · <span class="text-gray-400">{timeAgo(pr.updated_at)}</span>
						{#if pr.categories.includes('reviewRequested')}
							<span class="ml-1 px-1 py-0.5 bg-yellow-100 text-yellow-800 rounded">review requested</span>
						{/if}
					</div>
				</li>
			{/each}
		</ul>
	{/if}
</div>
