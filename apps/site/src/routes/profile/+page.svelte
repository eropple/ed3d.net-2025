<script lang="ts">
  import { enhance } from '$app/forms';
  import { Avatar } from 'bits-ui';
  import type { PageData } from './$types';

  // Get data from the server
  let { data, form } = $props();

  // Local state
  let emailUpdateSuccess = $state(false);
</script>

<div class="max-w-3xl mx-auto py-8">
  <h1 class="text-2xl font-bold mb-8">Your Profile</h1>

  <!-- User Information Section -->
  <section class="mb-8 p-6 bg-white rounded-lg shadow">
    <h2 class="text-xl font-semibold mb-4">Account Information</h2>

    <!-- Email update form -->
    <form
      method="POST"
      action="?/updateEmail"
      class="mb-6"
      use:enhance={() => {
        return ({ result }) => {
          if (result.type === 'success') {
            emailUpdateSuccess = true;
            setTimeout(() => {
              emailUpdateSuccess = false;
            }, 3000);
          }
        };
      }}
    >
      <div class="mb-4">
        <label for="email" class="block text-sm font-medium text-gray-700 mb-1">
          Email Address
        </label>
        <input
          type="email"
          id="email"
          name="email"
          value={data.user?.email || ''}
          class="w-full px-3 py-2 border border-gray-300 rounded-md"
          required
        />
        {#if data.user?.emailVerified}
          <span class="text-sm text-green-600 mt-1 inline-block">
            <svg class="inline-block w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
            </svg>
            Verified
          </span>
        {:else}
          <span class="text-sm text-yellow-600 mt-1 inline-block">Not verified</span>
        {/if}
      </div>

      <button type="submit" class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
        Update Email
      </button>

      {#if form?.success === false}
        <p class="text-red-500 mt-2">{form.message}</p>
      {/if}

      {#if emailUpdateSuccess}
        <p class="text-green-500 mt-2">Email successfully updated. It's now marked as unverified.</p>
      {/if}
    </form>
  </section>

  <!-- Connected Accounts Section -->
  <section class="p-6 bg-white rounded-lg shadow">
    <h2 class="text-xl font-semibold mb-4">Connected Accounts</h2>

    <!-- Show connected accounts -->
    <div class="mb-6">
      <h3 class="text-lg font-medium mb-3">Your connections</h3>

      {#if data.connections.social.length === 0 && !data.connections.atproto}
        <p class="text-gray-500">You don't have any connected accounts yet.</p>
      {:else}
        <ul class="space-y-3">
          {#each data.connections.social as connection}
            <li class="flex items-center">
              <Avatar.Root class="h-8 w-8 mr-3 bg-gray-100 rounded-full flex items-center justify-center">
                <Avatar.Fallback>
                  {#if connection.provider === 'github'}
                    <svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                    </svg>
                  {:else if connection.provider === 'google'}
                    <svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z"/>
                    </svg>
                  {/if}
                </Avatar.Fallback>
              </Avatar.Root>
              <div>
                <p class="font-medium">{connection.providerName}</p>
                <p class="text-sm text-gray-500">Connected as {connection.username}</p>
              </div>
            </li>
          {/each}

          {#if data.connections.atproto}
            <li class="flex items-center">
              <Avatar.Root class="h-8 w-8 mr-3 bg-gray-100 rounded-full flex items-center justify-center">
                <Avatar.Fallback>
                  <svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="12" cy="12" r="10"/>
                  </svg>
                </Avatar.Fallback>
              </Avatar.Root>
              <div>
                <p class="font-medium">Bluesky (ATProto)</p>
                <p class="text-sm text-gray-500">Connected as {data.connections.atproto.handle}</p>
              </div>
            </li>
          {/if}
        </ul>
      {/if}
    </div>

    <!-- Connect new accounts -->
    <div>
      <h3 class="text-lg font-medium mb-3">Link new accounts</h3>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        {#if data.missingConnections.social.includes('github')}
          <a href="/auth/social/github/authorize" class="flex items-center p-3 border border-gray-300 rounded-md hover:bg-gray-50">
            <span class="w-8 h-8 mr-3 bg-gray-100 rounded-full flex items-center justify-center">
              <svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
            </span>
            <span>Connect with GitHub</span>
          </a>
        {/if}

        {#if data.missingConnections.social.includes('google')}
          <a href="/auth/social/google/authorize" class="flex items-center p-3 border border-gray-300 rounded-md hover:bg-gray-50">
            <span class="w-8 h-8 mr-3 bg-gray-100 rounded-full flex items-center justify-center">
              <svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z"/>
              </svg>
            </span>
            <span>Connect with Google</span>
          </a>
        {/if}

        {#if data.missingConnections.atproto}
          <button
            onclick={() => {
              const handle = prompt('Enter your Bluesky handle:');
              if (handle) {
                window.location.href = `/auth/atproto/authorize?handle=${handle}`;
              }
            }}
            class="flex items-center p-3 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            <span class="w-8 h-8 mr-3 bg-gray-100 rounded-full flex items-center justify-center">
              <svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="12" r="10"/>
              </svg>
            </span>
            <span>Connect with Bluesky</span>
          </button>
        {/if}
      </div>
    </div>
  </section>
</div>
