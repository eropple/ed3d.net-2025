<script lang="ts">
	import type { PageData } from './$types';
	import DiscordCTA from '$lib/components/Profile/DiscordCTA.svelte';

	let { data }: { data: PageData } = $props();

	const showDiscordJoinCTA = $derived(data.showDiscordJoinCTA);
	const discordServerId = $derived(data.discordServerId);
	const discordInviteLink = $derived(data.discordInviteLink);
</script>

<svelte:head>
	<!-- Updated title for Dashboard -->
	<title>Profile Dashboard | ed3d.net</title>
	<meta name="description" content="Your profile dashboard on ed3d.net." />
</svelte:head>

<DiscordCTA showCTA={showDiscordJoinCTA} serverId={discordServerId} inviteLink={discordInviteLink} />
