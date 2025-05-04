<script lang="ts">
	import { Dialog } from 'bits-ui';
	import AuthForm from './auth/AuthForm.svelte';

	// Keep modal state logic
	let { open = $bindable(false), redirectPath = $bindable('/') } = $props<{
		open: boolean;
		redirectPath?: string;
	}>();

	function closeModal() {
		open = false;
	}
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
					class="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-secondary focus:ring-offset-2"
					aria-label="Close"
				>
					<!-- Simple X icon -->
					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="h-5 w-5">
						<path
							d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z"
						/>
					</svg>
				</Dialog.Close>
			</div>

			<!-- Use the single AuthForm component, passing the closeModal callback -->
			<AuthForm bind:redirectPath close={closeModal} />
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>