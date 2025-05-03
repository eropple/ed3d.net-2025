<script lang="ts">
	import { Dialog } from 'bits-ui';
	import { enhance } from '$app/forms';
	import { toast } from '@zerodevx/svelte-toast'; // Assuming svelte-toast is available globally or imported
	import { AUTH_METHODS } from '$lib/components/UserWidget/constants'; // Reuse constants
	import { goto } from '$app/navigation'; // Import goto for navigation

	type MagicLinkResponse = { success: boolean; message: string };

	let { open = $bindable(false), redirectPath = $bindable('/') } = $props<{ open: boolean, redirectPath?: string }>();

	let magicLinkEmail = $state('');
	let submittingMagicLink = $state(false);

	function closeModal() {
		open = false;
	}

	// Function to navigate to social start endpoints
	function startSocialLogin(providerId: string) {
		const url = new URL(`/auth/social/${providerId}/start`, window.location.origin);
		if (redirectPath && redirectPath.startsWith('/')) {
			url.searchParams.set('redirect', redirectPath);
		}
		// Use goto for client-side navigation to the endpoint, which will then server-redirect
		goto(url.toString());
		closeModal(); // Close modal after initiating
	}

	// TODO: Implement ATProto start logic if needed
	// function startATProtoLogin() { ... }
</script>

<Dialog.Root bind:open>
	<Dialog.Portal>
		<Dialog.Overlay class="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" />
		<Dialog.Content
			class="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border border-gray-200 bg-white p-6 shadow-lg focus:outline-none"
		>
			<div class="mb-4 flex items-center justify-between border-b border-gray-200 pb-4">
				<Dialog.Title class="text-lg font-semibold text-gray-900">Sign In / Sign Up</Dialog.Title>
				<Dialog.Close
					class="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
					aria-label="Close"
				>
					<!-- Simple X icon -->
					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="h-5 w-5">
						<path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
					</svg>
				</Dialog.Close>
			</div>

			<!-- Magic Link Form - Moved from DropdownMenu -->
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
								toast.push('Check your email for a login link!'); // Use toast for feedback
								magicLinkEmail = '';
								closeModal(); // Close modal on success
							} else {
								const message = data?.message || 'Failed to send login link. Please try again.';
								toast.push(message, { theme: { '--toastBackground': 'hsl(0 100% 50%)', '--toastColor': 'white' } });
							}
						} else if (result.type === 'failure') {
							const message = (result.data as any)?.message || 'An unexpected error occurred. Please try again.';
							toast.push(message, { theme: { '--toastBackground': 'hsl(0 100% 50%)', '--toastColor': 'white' } });
						} else if (result.type === 'error') {
							toast.push('A network error occurred. Please check your connection.', { theme: { '--toastBackground': 'hsl(0 100% 50%)', '--toastColor': 'white' } });
							console.error('Enhance fetch error:', result.error);
						}
					};
				}}
			>
				<label for="modal-magic-link-email" class="mb-1 block text-sm font-medium text-gray-700">Email Login</label>
				<input
					id="modal-magic-link-email"
					type="email"
					name="email"
					placeholder="you@example.com"
					required
					bind:value={magicLinkEmail}
					disabled={submittingMagicLink}
					class="mb-2 w-full rounded-md border border-gray-300 px-3 py-2 text-sm placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
				/>
				<!-- Add hidden input for redirectPath -->
				{#if redirectPath && redirectPath.startsWith('/')}
					<input type="hidden" name="redirectPath" value={redirectPath} />
				{/if}
				<button
					type="submit"
					disabled={submittingMagicLink}
					class="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
				>
					{submittingMagicLink ? 'Sending...' : 'Send Login Link'}
				</button>
			</form>

			<!-- Social Login Buttons - Moved from DropdownMenu -->
			<div class="text-center text-xs font-medium text-gray-500">Or sign in with:</div>
			<div class="mt-2 space-y-2">
				{#each AUTH_METHODS as method}
					<button
						onclick={() => startSocialLogin(method.id)}
						class="flex w-full items-center justify-center rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
					>
						<i class="{method.icon} mr-2"></i>
						{method.label}
					</button>
				{/each}
			</div>
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>