<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	type FlashType = 'success' | 'error' | 'info' | 'warning';

	let { type = $bindable('info' as FlashType), message = $bindable('') } = $props<{
		type?: FlashType;
		message?: string;
	}>();

	const dispatch = createEventDispatcher<{ dismiss: void }>();

	const baseClasses = 'p-4 mb-4 rounded-lg flex justify-between items-center shadow';

	const typeClasses: Record<FlashType, string> = {
		success: 'bg-green-100 border border-green-400 text-green-700',
		error: 'bg-red-100 border border-red-400 text-red-700',
		info: 'bg-blue-100 border border-blue-400 text-blue-700',
		warning: 'bg-yellow-100 border border-yellow-400 text-yellow-700'
	};

	const iconClasses: Record<FlashType, string> = {
		success: 'fa-solid fa-check-circle',
		error: 'fa-solid fa-exclamation-circle',
		info: 'fa-solid fa-info-circle',
		warning: 'fa-solid fa-exclamation-triangle'
	}

	function dismiss() {
		dispatch('dismiss');
	}
</script>

{#if message}
<div class="{baseClasses} {typeClasses[type]}" role="alert">
	<div>
		<i class="{iconClasses[type]} mr-2"></i>
		<span>{message}</span>
	</div>
  <button
    onclick={dismiss}
    type="button"
		class="ml-4 -mx-1.5 -my-1.5 rounded-lg p-1.5 inline-flex h-8 w-8 focus:outline-none focus:ring-2"
		aria-label="Dismiss"
		class:text-green-500={type === 'success'} class:hover:bg-green-200={type === 'success'} class:focus:ring-green-400={type === 'success'}
		class:text-red-500={type === 'error'} class:hover:bg-red-200={type === 'error'} class:focus:ring-red-400={type === 'error'}
		class:text-blue-500={type === 'info'} class:hover:bg-blue-200={type === 'info'} class:focus:ring-blue-400={type === 'info'}
		class:text-yellow-500={type === 'warning'} class:hover:bg-yellow-200={type === 'warning'} class:focus:ring-yellow-400={type === 'warning'}
  >
		<span class="sr-only">Dismiss</span>
		<!-- Heroicon: x-mark -->
		<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5">
			<path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
		</svg>
  </button>
</div>
{/if}