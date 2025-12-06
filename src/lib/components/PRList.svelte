<script>
	export let prs = [];
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
						{pr.repository_url.split('/').slice(-1)[0]} · #{pr.number}
						{#if pr.categories.includes('reviewRequested')}
							<span class="ml-1 px-1 py-0.5 bg-yellow-100 text-yellow-800 rounded">review requested</span>
						{/if}
					</div>
				</li>
			{/each}
		</ul>
	{/if}
</div>
