<script lang="ts">
	import { enhance } from '$app/forms';
	import { Avatar } from 'bits-ui';
	import type { PageData, ActionData } from './$types'; // Types for this specific page
	import { Fa } from 'svelte-fa';
	import { AUTH_METHODS } from '$lib/components/UserWidget/constants.js'; // Shared auth methods data

	// Get props: page-specific data from load and potential form action results
	let { data, form }: { data: PageData; form: ActionData & { formName?: string } | undefined | null } = $props();

	// Derive state from loaded data
	const connections = $derived(data.connections);
	const missingConnections = $derived(data.missingConnections);
    const providerNameMap = $derived(data.providerNameMap); // Map for display names

    // Derive error state specifically for the removeConnection form
    const removeConnectionError = $derived(
        form?.formName === 'removeConnection' && form.success === false ? form : null
    );

</script>

<svelte:head>
	<title>Connected Accounts | Your Profile | ed3d.net</title>
	<meta name="description" content="Manage your connected social accounts on ed3d.net." />
</svelte:head>

<!-- Connected Accounts Section -->
<section class="p-6 bg-white rounded-lg shadow">
	<h2 class="text-xl font-semibold mb-4">Connected Accounts</h2>

	<!-- Show connected accounts -->
	<div class="mb-6">
		<h3 class="text-lg font-medium mb-3">Your connections</h3>

		{#if connections.social.length === 0}
			<p class="text-gray-500">You don't have any connected accounts yet.</p>
		{:else}
			<ul class="space-y-3">
				{#each connections.social as connection (connection.identityUuid)}
					{@const methodInfo = AUTH_METHODS.find((method) => method.id === connection.provider)}
					<li class="flex items-center justify-between">
						<div class="flex items-center">
							<Avatar.Root
								class="h-8 w-8 mr-3 bg-gray-100 rounded-full flex items-center justify-center text-gray-600"
							>
								{#if methodInfo?.icon}
									<Fa icon={methodInfo.icon} class="w-5 h-5" />
								{:else}
									<span class="text-xs font-bold">{connection.providerName.substring(0, 1)}</span>
								{/if}
							</Avatar.Root>
							<div>
								<p class="font-medium">{connection.providerName}</p>
								<p class="text-sm text-gray-500">Connected as {connection.username}</p>
							</div>
						</div>
						<form method="POST" action="?/removeConnection" use:enhance={() => {
                            return ({ result, update }) => {
                                // Success is handled by flash message redirect
                                if (result.type === 'error') {
                                    console.error("Remove connection error:", result.error);
                                }
                                // Update needed to get form prop for errors
                                update({ reset: false });
                            }
                        }}>
							<input type="hidden" name="identityUuid" value={connection.identityUuid} />
							<button type="submit" class="text-sm text-error hover:text-red-800 ml-4 focus:outline-none focus:underline">
								Remove
							</button>
						</form>
					</li>
				{/each}
			</ul>
		{/if}
	</div>

    <!-- Display general error from removeConnection action if any -->
    {#if removeConnectionError}
        <div class="mb-4 p-3 bg-red-100 border border-red-400 text-error rounded-md text-sm">
            { removeConnectionError.message || 'Could not remove connection.' }
        </div>
    {/if}
    <!-- Success message is handled by flash redirect -->


	<!-- Connect new accounts -->
	{#if missingConnections.social.length > 0}
	<div>
		<h3 class="text-lg font-medium mb-3">Link new accounts</h3>

		<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
			{#each missingConnections.social as providerId}
				{@const methodInfo = AUTH_METHODS.find((method) => method.id === providerId)}
				{@const providerName = methodInfo?.label || providerNameMap[providerId] || providerId}
				{#if methodInfo}
					<a
						href={`/auth/social/${providerId}/start`}
						class="flex items-center p-3 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-secondary focus:ring-offset-1 transition-colors"
					>
						<span
							class="w-8 h-8 mr-3 bg-gray-100 rounded-full flex items-center justify-center text-gray-600"
						>
							<Fa icon={methodInfo.icon} class="w-5 h-5" />
						</span>
						<span>Connect with {providerName}</span>
					</a>
				{/if}
			{/each}
		</div>
	</div>
	{/if}
</section>