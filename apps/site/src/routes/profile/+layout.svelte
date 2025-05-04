<script lang="ts">
	import type { LayoutData } from './$types';
	import ProfileSubNav from '$lib/components/Profile/ProfileSubNav.svelte'; // Import the new component
    import { page } from '$app/state'; // Needed to determine active path for nav

	// Get user data loaded from +layout.server.ts
	let { data, children } = $props();
	const user = $derived(data.user);

	// Define the sections for the sub-navigation
	const profileSections = [
		{ href: '/profile', label: 'Dashboard' },
		{ href: '/profile/info', label: 'Account Information' },
		{ href: '/profile/connections', label: 'Connected Accounts' }
	];

    // We'll pass the current path and sections to the actual nav component later
    const currentPath = $derived(page.url.pathname);

</script>

<svelte:head>
	<!-- Base title for profile sections -->
	<title>Your Profile | ed3d.net</title>
	<meta name="description" content="Manage your ed3d.net profile settings and connections." />
</svelte:head>

<div class="max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
	<h1 class="text-3xl font-bold mb-8">Your Profile</h1>

	<div class="md:grid md:grid-cols-4 md:gap-8">
		<!-- Sub Navigation Area (Left column on medium screens and up) -->
		<aside class="md:col-span-1 mb-6 md:mb-0">
            <!-- Use the ProfileSubNav component -->
			<ProfileSubNav sections={profileSections} {currentPath} />
		</aside>

		<!-- Main Content Area (Right column on medium screens and up) -->
		<main class="md:col-span-3">
			{#key user.userId}
				{@render children()}
			{/key}
		</main>
	</div>
</div>