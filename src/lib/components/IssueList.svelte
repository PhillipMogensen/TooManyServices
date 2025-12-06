<script>
	export let issues = [];

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

	function isBug(issue) {
		return issue.labels?.some((label) =>
			label.name?.toLowerCase().includes('bug')
		);
	}
</script>

<div class="bg-white rounded-lg shadow p-4">
	<h2 class="text-lg font-semibold mb-3 text-gray-800">Issues</h2>

	{#if issues.length === 0}
		<p class="text-gray-500 text-sm">No issues awaiting action</p>
	{:else}
		<ul class="space-y-2">
			{#each issues as issue}
				<li class="border-l-4 pl-3 py-1 {isBug(issue) ? 'border-red-500' : 'border-green-500'}">
					<a
						href={issue.html_url}
						target="_blank"
						rel="noopener noreferrer"
						class="text-blue-600 hover:underline text-sm font-medium"
					>
						{issue.title}
					</a>
					<div class="text-xs text-gray-500">
						{issue.repository_url.split('/').slice(-1)[0]} · #{issue.number} · <span class="text-gray-400">{timeAgo(issue.updated_at)}</span>
						{#if issue.categories.includes('issuesAssigned')}
							<span class="ml-1 px-1 py-0.5 bg-purple-100 text-purple-800 rounded">assigned</span>
						{/if}
					</div>
					{#if issue.labels?.length > 0}
						<div class="flex flex-wrap gap-1 mt-1">
							{#each issue.labels as label}
								<span
									class="px-1.5 py-0.5 text-xs rounded"
									style="background-color: #{label.color}; color: {parseInt(label.color, 16) > 0x7fffff ? '#000' : '#fff'}"
								>
									{label.name}
								</span>
							{/each}
						</div>
					{/if}
				</li>
			{/each}
		</ul>
	{/if}
</div>
