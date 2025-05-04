<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types'; // Note: These types now refer to info/$types
	import { page } from '$app/state'; // Import page store if needed for layout data access
	import { Fa } from 'svelte-fa';
	import { faCheckCircle } from '@fortawesome/free-solid-svg-icons'; // Example icon for verified

	// Get props: layout data (includes user) and potential form action results
	let { data: layoutData, form }: { data: PageData; form: ActionData & { formName?: string } | undefined | null } = $props();

	// User data comes from the layout's load function via PageData
	const user = $derived(layoutData.user);

	// State for email update feedback
	let emailUpdateSuccess = $state(false);

	// Local state for username input - initialized from user prop
	// svelte-ignore state_referenced_locally
	let currentUsername = $state(user?.username || '');

	// Derive errors based on formName matching the actions in info/+page.server.ts
	const emailFormError = $derived(
		form?.formName === 'updateEmail' && form.success === false ? form : null
	);

	const usernameFormError = $derived(
		form?.formName === 'updateUsername' && form.success === false ? form : null
	);

	// Repopulate username input if there was an error for *that* specific form
	// AND the error data includes the submitted username
	$effect(() => {
		if (
			usernameFormError &&
			'username' in usernameFormError &&
			typeof usernameFormError.username === 'string' &&
			currentUsername !== usernameFormError.username
		) {
			currentUsername = usernameFormError.username;
		}
	});

    // Clear email success message when form data changes (e.g., on new errors)
    $effect(() => {
        if (form && form.formName === 'updateEmail') {
            emailUpdateSuccess = false;
        }
    })

</script>

<svelte:head>
	<title>Account Information | Your Profile | ed3d.net</title>
	<meta name="description" content="Manage your email address and username on ed3d.net." />
</svelte:head>

<!-- User Information Section -->
<section class="p-6 bg-white rounded-lg shadow space-y-6">
	<h2 class="text-xl font-semibold">Account Information</h2>

	<!-- Email update form -->
	<form
		method="POST"
		action="?/updateEmail"
		use:enhance={() => {
            emailUpdateSuccess = false; // Clear success on new submission attempt
			return ({ result, update }) => {
				if (result.type === 'success') {
					emailUpdateSuccess = true;
                    // Optionally clear the field or show persistent message managed by state
                    // setTimeout(() => { emailUpdateSuccess = false; }, 5000); // Auto-hide after 5s
				} else if (result.type === 'error') {
					console.error('Email update error:', result.error);
                    emailUpdateSuccess = false;
				} else if (result.type === 'failure') {
                    emailUpdateSuccess = false;
                }
                // Important: call update() to make server 'form' data available
                update({ reset: false }); // reset: false prevents form fields clearing automatically
			};
		}}
	>
		<h3 class="text-lg font-medium mb-2">Email Address</h3>
		<div class="mb-2">
			<label for="email" class="sr-only">Email Address</label>
			<input
				type="email"
				id="email"
				name="email"
				value={user?.email || ''}
				class="w-full px-3 py-2 border border-gray-300 rounded-md focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
				required
				aria-describedby="email-status email-feedback"
                aria-invalid={!!emailFormError}
			/>
			<div id="email-status" class="mt-1 text-sm">
				{#if user?.emailVerified}
					<span class="text-green-600 inline-flex items-center">
						<Fa icon={faCheckCircle} class="inline-block w-4 h-4 mr-1" />
						Verified
					</span>
				{:else}
					<span class="text-yellow-600">Not verified</span>
				{/if}
			</div>
		</div>

		<button
			type="submit"
			class="px-4 py-2 bg-primary text-white rounded-md hover:bg-less-dark focus:outline-none focus:ring-2 focus:ring-secondary focus:ring-offset-2"
		>
			Update Email
		</button>

		<!-- Email Form Feedback -->
		<div id="email-feedback" class="mt-2 text-sm min-h-[1.25rem]">
			{#if emailFormError}
				<p class="text-error">{emailFormError.message || 'An error occurred.'}</p>
			{/if}
			{#if emailUpdateSuccess && !emailFormError}
				<p class="text-green-500">Check your email to verify the new address.</p>
			{/if}
		</div>
	</form>

	<hr class="border-gray-200" />

	<!-- Username update form -->
	<form
		method="POST"
		action="?/updateUsername"
		use:enhance={() => {
            // Clear previous email success message if user interacts with username form
            emailUpdateSuccess = false;
			return ({ result, update }) => {
        // Username update redirects on success (handled by flash message)
        // or returns 'fail' on validation/server error.
				if (result.type === 'error') {
					console.error('Username update error:', result.error);
				}

        // Update needed to receive 'form' prop for error messages
				update({ reset: false });
			};
		}}
	>
		<h3 class="text-lg font-medium mb-2">Username</h3>
		<div class="mb-2">
			<label for="username" class="sr-only">Username</label>
			<input
				type="text"
				id="username"
				name="username"
				bind:value={currentUsername}
				class="w-full px-3 py-2 border border-gray-300 rounded-md focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
				required
				minlength="2"
				maxlength="50"
				pattern="^[a-zA-Z0-9](?:[a-zA-Z0-9_]*[a-zA-Z0-9])?$"
				title="Must be 2-50 characters, start/end with alphanumeric, contain only letters, numbers, or underscores."
				aria-describedby="username-feedback"
				aria-invalid={!!usernameFormError}
			/>
		</div>
		<button
			type="submit"
			class="px-4 py-2 bg-primary text-white rounded-md hover:bg-less-dark focus:outline-none focus:ring-2 focus:ring-secondary focus:ring-offset-2"
		>
			Update Username
		</button>

		<!-- Username Form Feedback -->
		<div id="username-feedback" class="mt-2 text-sm min-h-[1.25rem]">
			{#if usernameFormError}
				<p class="text-error">{usernameFormError.message || 'An error occurred.'}</p>
			{/if}
      <!-- Success message is handled via flash message on redirect -->
		</div>
	</form>
</section>