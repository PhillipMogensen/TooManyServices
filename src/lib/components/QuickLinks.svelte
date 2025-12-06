<script>
	export let links = [];
</script>

<div class="bg-white rounded-lg shadow p-4">
	<h2 class="text-lg font-semibold mb-3 text-gray-800">Quick Links</h2>

	{#if links.length === 0}
		<p class="text-gray-500 text-sm">No links configured</p>
	{:else}
		<div class="flex flex-wrap gap-2">
			{#each links as link}
				<a
					href={link.url}
					target="_blank"
					rel="noopener noreferrer"
					class="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-md text-sm font-medium text-gray-700 transition-colors"
				>
					{link.name}
				</a>
			{/each}
		</div>
	{/if}
</div>
