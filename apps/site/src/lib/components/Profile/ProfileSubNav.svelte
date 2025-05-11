<script lang="ts">
	import { goto } from '$app/navigation';
	// import { page } from '$app/state'; // Unused
	import clsx from 'clsx';

	type NavSection = {
		href: string;
		label: string;
	};

	// Define props using $props rune
	let { sections = [], currentPath }: { sections: NavSection[]; currentPath: string } = $props();

	// Handler for mobile dropdown navigation
	function handleMobileNavChange(event: Event & { currentTarget: HTMLSelectElement }) {
		const selectedPath = event.currentTarget.value;
		// Always attempt navigation. goto() is idempotent if path is the same.
		// This also simplifies logic if currentPath prop hasn't updated yet for some reason.
		goto(selectedPath);
	}
</script>

<!-- Desktop Navigation (Visible md and up) -->
<nav class="hidden md:block space-y-1" aria-label="Profile sections">
	{#each sections as section}
		<a
			href={section.href}
			class={clsx(
				'block rounded-md px-3 py-2 text-base font-medium transition-colors duration-150 ease-in-out',
				currentPath === section.href // Use currentPath prop for styling active state
					? 'bg-primary/10 text-primary'
					: 'text-gray-700 hover:bg-gray-100 hover:text-primary',
				'focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-secondary'
			)}
			aria-current={currentPath === section.href ? 'page' : undefined}
		>
			{section.label}
		</a>
	{/each}
</nav>

<!-- Mobile Navigation (Hidden md and up) -->
<div class="md:hidden">
	<label for="profile-nav-select" class="sr-only">Select profile section</label>
	<select
		id="profile-nav-select"
		name="profile-nav-select"
		class="block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-secondary focus:outline-none focus:ring-secondary sm:text-sm"
		value={currentPath}
		onchange={handleMobileNavChange}
	>
		{#each sections as section}
			<option value={section.href}>{section.label}</option>
		{/each}
	</select>
</div>