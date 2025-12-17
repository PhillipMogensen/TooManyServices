<script>
	export let deployments = [];
	export let tagSummary = {};
	export let monitoredTags = [];

	const stateColors = {
		green: 'bg-green-500',
		red: 'bg-red-500',
		yellow: 'bg-yellow-500',
		blue: 'bg-blue-500',
		gray: 'bg-gray-400'
	};

	const stateBgColors = {
		green: 'bg-green-100 text-green-800',
		red: 'bg-red-100 text-red-800',
		yellow: 'bg-yellow-100 text-yellow-800',
		blue: 'bg-blue-100 text-blue-800',
		gray: 'bg-gray-100 text-gray-800'
	};

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
		if (days < 7) return `${days}d ago`;
		const weeks = Math.floor(days / 7);
		if (weeks < 4) return `${weeks}w ago`;
		const months = Math.floor(days / 30);
		return `${months}mo ago`;
	}
</script>

<div class="bg-white rounded-lg shadow p-4">
	<div class="flex items-center gap-2 mb-3 flex-wrap">
		<h2 class="text-lg font-semibold text-gray-800">Prefect Deployments</h2>
		{#if deployments.length > 0}
			<span class="text-sm text-gray-500">({deployments.length})</span>
		{/if}
		{#if monitoredTags.length > 0}
			<div class="flex items-center gap-2 ml-auto">
				{#each monitoredTags as tag}
					{@const summary = tagSummary[tag] || { total: 0, successful: 0 }}
					<span
						class="px-2 py-0.5 rounded text-xs {summary.successful === summary.total ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}"
						title="{tag}: {summary.successful} of {summary.total} successful"
					>
						{tag}: {summary.successful}/{summary.total}
					</span>
				{/each}
			</div>
		{/if}
	</div>

	{#if deployments.length === 0}
		<p class="text-gray-500 text-sm">All deployments successful</p>
	{:else}
		<div class="flex flex-wrap gap-3">
			{#each deployments as deployment}
				<a
					href={deployment.url}
					target="_blank"
					rel="noopener noreferrer"
					class="flex-shrink-0 max-w-md border border-gray-200 rounded-lg p-3 hover:border-red-300 hover:bg-red-50 transition-colors group"
				>
					<div class="flex items-start gap-2">
						<div class="w-1 h-full bg-red-500 rounded-full self-stretch"></div>
						<div class="flex-1 min-w-0">
							<div class="text-sm font-medium text-gray-900 group-hover:text-red-600 line-clamp-2">
								{deployment.flowName}
							</div>
							<div class="text-xs text-gray-500 mt-0.5">
								{deployment.name}
							</div>
							<!-- Show monitored tags this deployment belongs to -->
							{#if deployment.tags && deployment.tags.length > 0}
								<div class="flex items-center gap-1 mt-1">
									{#each deployment.tags.filter(t => monitoredTags.includes(t)) as tag}
										<span class="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
											{tag}
										</span>
									{/each}
								</div>
							{/if}
							<div class="flex items-center gap-1.5 mt-1 text-xs text-gray-500">
								{#if deployment.latestRun}
									<span class="px-1.5 py-0.5 rounded {stateBgColors[deployment.latestRun.stateColor]}">
										{deployment.latestRun.stateName}
									</span>
									{#if deployment.latestRun.endTime || deployment.latestRun.startTime}
										<span>·</span>
										<span class="text-gray-400">
											{timeAgo(deployment.latestRun.endTime || deployment.latestRun.startTime)}
										</span>
									{/if}
								{/if}
							</div>

							<!-- Run history mini graph -->
							{#if deployment.runHistory && deployment.runHistory.length > 0}
								<div class="flex items-center gap-0.5 mt-2" title="Recent runs (oldest to newest)">
									{#each deployment.runHistory as run}
										<div
											class="w-3 h-3 rounded-sm {stateColors[run.stateColor]}"
											title="{run.state} - {run.startTime ? timeAgo(run.startTime) : 'scheduled'}"
										></div>
									{/each}
								</div>
							{/if}
						</div>
					</div>
				</a>
			{/each}
		</div>
	{/if}
</div>
