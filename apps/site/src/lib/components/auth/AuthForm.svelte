<script lang="ts">
	import { enhance } from '$app/forms';
	import { toast } from '@zerodevx/svelte-toast';
	import { AUTH_METHODS } from '$lib/components/UserWidget/constants'; // Import provider definitions
	import AuthProviders from './AuthProviders.svelte'; // Import the providers component

	type MagicLinkResponse = { success: boolean; message: string };

	// Props
	let { redirectPath = $bindable('/'), close: closeParent } = $props<{ redirectPath?: string, close?: () => void }>();

	// Local state for magic link form
	let magicLinkEmail = $state('');
	let submittingMagicLink = $state(false);
</script>

<!-- Magic Link Form -->
<form
	method="POST"
	action="/auth/magic-link/request-login"
	class="mb-4 border-b border-gray-200 pb-4"
	use:enhance={() => {
		submittingMagicLink = true;
		return async ({ result }) => {
			submittingMagicLink = false;
			if (result.type === 'success') {
				const data = result.data as MagicLinkResponse | undefined;
				if (data?.success) {
					toast.push('Check your email for a login link!');
					magicLinkEmail = '';
					closeParent?.(); // Close parent (e.g., modal) if callback provided
				} else {
					const message = data?.message || 'Failed to send login link. Please try again.';
					toast.push(message, {
						theme: { '--toastBackground': 'var(--color-error)', '--toastColor': 'var(--color-white)' }
					});
				}
			} else if (result.type === 'failure') {
				const message =
					(result.data as any)?.message || 'An unexpected error occurred. Please try again.';
				toast.push(message, {
					theme: { '--toastBackground': 'var(--color-error)', '--toastColor': 'var(--color-white)' }
				});
			} else if (result.type === 'error') {
				toast.push('A network error occurred. Please check your connection.', {
					theme: { '--toastBackground': 'var(--color-error)', '--toastColor': 'var(--color-white)' }
				});
				console.error('Enhance fetch error:', result.error);
			}
		};
	}}
>
	<label for="authform-magic-link-email" class="mb-1 block text-sm font-medium text-gray-700"
		>Email Login</label
	>
	<input
		id="authform-magic-link-email"
		type="email"
		name="email"
		placeholder="you@example.com"
		required
		bind:value={magicLinkEmail}
		disabled={submittingMagicLink}
		class="mb-2 w-full rounded-md border border-gray-300 px-3 py-2 text-sm placeholder-gray-400 focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary disabled:opacity-50"
	/>
	{#if redirectPath && redirectPath.startsWith('/')}
		<input type="hidden" name="redirectPath" value={redirectPath} />
	{/if}
	<button
		type="submit"
		disabled={submittingMagicLink}
		class="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-less-dark focus:outline-none focus:ring-2 focus:ring-secondary focus:ring-offset-2 disabled:opacity-50"
	>
		{submittingMagicLink ? 'Sending...' : 'Send Login Link'}
	</button>
</form>

<AuthProviders providers={AUTH_METHODS} {redirectPath} />