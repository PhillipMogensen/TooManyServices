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

	function getRepoName(pr) {
		return pr.repository_url.split('/').slice(-1)[0];
	}
</script>

<div class="bg-white rounded-lg shadow p-4">
	<div class="flex items-center gap-2 mb-3">
		<h2 class="text-lg font-semibold text-gray-800">Pull Requests</h2>
		{#if prs.length > 0}
			<span class="text-sm text-gray-500">({prs.length})</span>
		{/if}
	</div>

	{#if prs.length === 0}
		<p class="text-gray-500 text-sm">No PRs awaiting action</p>
	{:else}
		<div class="flex flex-wrap gap-3">
			{#each prs as pr}
				<a
					href={pr.html_url}
					target="_blank"
					rel="noopener noreferrer"
					class="flex-shrink-0 max-w-md border border-gray-200 rounded-lg p-3 hover:border-blue-300 hover:bg-blue-50 transition-colors group"
				>
					<div class="flex items-start gap-2">
						<div class="w-1 h-full bg-blue-500 rounded-full self-stretch"></div>
						<div class="flex-1 min-w-0">
							<div class="text-sm font-medium text-gray-900 group-hover:text-blue-600 line-clamp-2">
								{pr.title}
							</div>
							<div class="flex items-center gap-1.5 mt-1 text-xs text-gray-500">
								<span class="font-medium">{getRepoName(pr)}</span>
								<span>·</span>
								<span>#{pr.number}</span>
								<span>·</span>
								<span class="text-gray-400">{timeAgo(pr.updated_at)}</span>
								{#if pr.categories.includes('reviewRequested')}
									<span class="ml-1 px-1.5 py-0.5 bg-yellow-100 text-yellow-800 rounded text-xs">review</span>
								{/if}
								{#if pr.categories.includes('prsAuthored')}
									<span class="ml-1 px-1.5 py-0.5 bg-green-100 text-green-800 rounded text-xs">author</span>
								{/if}
							</div>
						</div>
					</div>
				</a>
			{/each}
		</div>
	{/if}
</div>
