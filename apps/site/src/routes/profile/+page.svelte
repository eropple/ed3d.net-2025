<script lang="ts">
  import { enhance } from '$app/forms';
  import { Avatar } from 'bits-ui';
  import type { PageData, ActionData } from './$types';
  import { Fa } from 'svelte-fa';
  import { faGithub, faGoogle, faDiscord } from '@fortawesome/free-brands-svg-icons';
	import { AUTH_METHODS } from "../../lib/components/UserWidget/constants.js";

  let { data, form }: { data: PageData; form: ActionData & { formName?: string } | undefined | null } = $props();

  const connections = $derived(data.connections);
  const missingConnections = $derived(data.missingConnections);
  const showDiscordJoinCTA = $derived(data.showDiscordJoinCTA);
  const discordServerId = $derived(data.discordServerId);
  const discordInviteLink = $derived(data.discordInviteLink);
  const user = $derived(data.user);

  // State for email update feedback
  let emailUpdateSuccess = $state(false);

  // Local state for username input - initialized from user prop
  // svelte-ignore state_referenced_locally
  let currentUsername = $state(user?.username || '');

  // Derive errors based on formName
  const emailFormError = $derived(
    form?.formName === 'updateEmail' && form.success === false
      ? form
      : null
  );

  const usernameFormError = $derived(
    form?.formName === 'updateUsername' && form.success === false
      ? form
      : null
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

</script>

<svelte:head>
  <title>Your Profile | ed3d.net</title>
  <meta name="description" content="Manage your ed3d.net profile and connections." />
</svelte:head>

<div class="max-w-3xl mx-auto py-8">
  <h1 class="text-2xl font-bold mb-8">Your Profile</h1>

  {#if showDiscordJoinCTA && discordServerId}
    <section class="mb-8 p-6 bg-white rounded-lg shadow border border-primary space-y-4">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
        <div class="space-y-4">
          <h2 class="text-xl font-semibold flex items-center space-x-2">
            Come hang out.
          </h2>
          <p>
            To my everlasting shame, I've got a Discord server now. I'm not proud of it.
          </p>
          {#if discordInviteLink}
            <a
              href={discordInviteLink}
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
            src={`https://discord.com/widget?id=${discordServerId}&theme=light`}
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

  <!-- User Information Section -->
  <section class="mb-8 p-6 bg-white rounded-lg shadow space-y-6">
    <h2 class="text-xl font-semibold">Account Information</h2>

    <!-- Email update form -->
    <form
      method="POST"
      action="?/updateEmail"
      use:enhance={() => {
        return ({ result }) => {
          if (result.type === 'success') {
            emailUpdateSuccess = true;
            setTimeout(() => { emailUpdateSuccess = false; }, 3000);
          } else if (result.type === 'error') {
            console.error("Email update error:", result.error);
          }
          // No need to handle 'invalid' (fail) here if using derived state
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
        />
        <div id="email-status" class="mt-1 text-sm">
          {#if user?.emailVerified}
            <span class="text-green-600">
              <svg class="inline-block w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
              </svg>
              Verified
            </span>
          {:else}
            <span class="text-yellow-600">Not verified</span>
          {/if}
        </div>
      </div>

      <button type="submit" class="px-4 py-2 bg-primary text-white rounded-md hover:bg-less-dark focus:outline-none focus:ring-2 focus:ring-secondary focus:ring-offset-2">
        Update Email
      </button>

      <!-- Email Form Feedback -->
      <div id="email-feedback" class="mt-2 text-sm">
        {#if emailFormError}
          <p class="text-red-500">{emailFormError.message || 'An error occurred.'}</p>
        {/if}
        {#if emailUpdateSuccess}
          <p class="text-green-500">Check your email to verify the new address.</p>
        {/if}
      </div>
    </form>

    <!-- Separator -->
    <hr class="border-gray-200">

    <!-- Username update form -->
    <form
        method="POST"
        action="?/updateUsername"
        use:enhance={() => {
            emailUpdateSuccess = false;
            return ({ result, update }) => {
              if (result.type === 'redirect') {
                  window.location.href = result.location;
                  return;
              } else if (result.type === 'error') {
                 console.error("Username update error:", result.error);
              }
              update();
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
                title="Username must be 2-50 characters, start/end with alphanumeric, contain only letters, numbers, or underscores."
                aria-describedby="username-feedback"
                aria-invalid={!!usernameFormError}
            />
        </div>
        <button type="submit" class="px-4 py-2 bg-primary text-white rounded-md hover:bg-less-dark focus:outline-none focus:ring-2 focus:ring-secondary focus:ring-offset-2">
            Update Username
        </button>

        <!-- Username Form Feedback -->
        <div id="username-feedback" class="mt-2 text-sm">
            {#if usernameFormError}
                <p class="text-red-500">{usernameFormError.message || 'An error occurred.'}</p>
            {/if}
        </div>
    </form>

  </section>

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
          {#each connections.social as connection}
            {@const icon = AUTH_METHODS.find(method => method.id === connection.provider)?.icon}
            <li class="flex items-center justify-between">
              <div class="flex items-center">
                <Avatar.Root class="h-8 w-8 mr-3 bg-gray-100 rounded-full flex items-center justify-center text-gray-600">
                  {#if icon}
                    <Fa {icon} class="w-5 h-5" />
                  {:else}
                    <span class="text-xs font-bold">{connection.providerName.substring(0, 1)}</span>
                  {/if}
                </Avatar.Root>
                <div>
                  <p class="font-medium">{connection.providerName}</p>
                  <p class="text-sm text-gray-500">Connected as {connection.username}</p>
                </div>
              </div>
              <form method="POST" action="?/removeConnection" use:enhance>
                <input type="hidden" name="identityUuid" value={connection.identityUuid} />
                <button type="submit" class="text-sm text-red-600 hover:text-red-800 ml-4">
                  Remove
                </button>
              </form>
            </li>
          {/each}
        </ul>
      {/if}
    </div>

    <!-- Connect new accounts -->
    <div>
      <h3 class="text-lg font-medium mb-3">Link new accounts</h3>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        {#each missingConnections.social as providerId}
          {@const icon = AUTH_METHODS.find(method => method.id === providerId)?.icon}
          {@const providerName = AUTH_METHODS.find(method => method.id === providerId)?.label || providerId}
          {#if icon}
            <a href={`/auth/social/${providerId}/start`} class="flex items-center p-3 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-secondary focus:ring-offset-1">
              <span class="w-8 h-8 mr-3 bg-gray-100 rounded-full flex items-center justify-center text-gray-600">
                <Fa {icon} class="w-5 h-5" />
              </span>
              <span>Connect with {providerName}</span>
            </a>
          {/if}
        {/each}
      </div>
    </div>
  </section>
</div>
