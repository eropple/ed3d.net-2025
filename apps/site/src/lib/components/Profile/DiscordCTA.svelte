<script lang="ts">
	import { Fa } from 'svelte-fa';
	import { faDiscord } from '@fortawesome/free-brands-svg-icons';

	// Props for the component
	let {
		showCTA = false,
		serverId,
		inviteLink
	}: {
		showCTA?: boolean;
		serverId?: string;
		inviteLink?: string;
	} = $props();
</script>

{#if showCTA && serverId}
	<section class="mb-8 p-6 bg-white rounded-lg shadow border border-primary/30 space-y-4">
		<div class="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
			<div class="space-y-4">
				<h2 class="text-xl font-semibold flex items-center space-x-2">Come hang out.</h2>
				<p>To my everlasting shame, I've got a Discord server now. I'm not proud of it.</p>
				{#if inviteLink}
					<a
						href={inviteLink}
						target="_blank"
						rel="noopener noreferrer"
						class="md:hidden inline-flex items-center px-4 py-2 bg-[#5865F2] text-white rounded-md hover:bg-[#4752C4] focus:outline-none focus:ring-2 focus:ring-[#5865F2] focus:ring-offset-2 transition-colors"
					>
						<Fa icon={faDiscord} class="mr-2 h-4 w-4" /> Join Discord Server
					</a>
				{/if}
			</div>

			<div class="hidden md:block">
				<iframe
					title="Discord Server Widget"
					src={`https://discord.com/widget?id=${serverId}&theme=light`}
					width="100%"
					height="300"
					frameborder="0"
					sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"
					class="rounded-md"
				></iframe>
			</div>
		</div>
	</section>
{/if}