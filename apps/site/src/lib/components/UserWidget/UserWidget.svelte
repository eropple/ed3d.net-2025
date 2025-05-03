<script lang="ts">
  import { enhance } from '$app/forms';
  import { DropdownMenu } from 'bits-ui';
  import { toast } from '@zerodevx/svelte-toast';
  import type { UserPrivate } from "$lib/domain/users/types";
  import { AUTH_METHODS } from "./constants";

  type MagicLinkResponse = { success: boolean; message: string };

  let { user = $bindable(null), loading = $bindable(false) } = $props<{
    user?: UserPrivate | null;
    loading?: boolean;
  }>();

  let magicLinkEmail = $state('');
  let submittingMagicLink = $state(false);
</script>

<DropdownMenu.Root>
  <DropdownMenu.Trigger
    class="inline-flex h-10 w-10 select-none items-center justify-center rounded-full bg-gray-200 text-sm font-medium hover:bg-gray-300 active:scale-[0.98] focus:outline-none"
  >
    <!-- Show a gray circle for logged-out users -->
    <span class="text-gray-500">
      {#if loading}
        <span class="animate-pulse">...</span>
      {:else if user}
        {user.username.substring(0, 2).toUpperCase()}
      {:else}
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="h-6 w-6">
          <path fill-rule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clip-rule="evenodd" />
        </svg>
      {/if}
    </span>
  </DropdownMenu.Trigger>
  <DropdownMenu.Portal>
    <DropdownMenu.Content
      class="w-64 rounded-lg border border-gray-200 bg-white p-2 shadow-lg"
      sideOffset={8}
    >
      {#if user}
        <DropdownMenu.Item
          class="flex h-10 select-none items-center rounded-md px-3 py-2 text-sm font-medium data-[highlighted]:bg-gray-100 focus:outline-none"
        >
          <a href="/profile" class="flex items-center">
            <i class="fa-regular fa-user mr-2"></i>
            Profile
          </a>
        </DropdownMenu.Item>
        <DropdownMenu.Item
          class="flex h-10 select-none items-center rounded-md px-3 py-2 text-sm font-medium data-[highlighted]:bg-gray-100 focus:outline-none"
          onSelect={() => window.location.href = '/auth/logout'}
        >
          <span class="flex items-center">
            <i class="fa-solid fa-arrow-right-from-bracket mr-2"></i>
            Sign out
          </span>
        </DropdownMenu.Item>
      {:else}
        <form
          method="POST"
          action="/auth/magic-link/request-login"
          class="p-2 border-b border-gray-200 mb-2"
          use:enhance={() => {
            submittingMagicLink = true;
            return async ({ result }) => {
              submittingMagicLink = false;
              if (result.type === 'success') {
                // Assert the type of result.data
                const data = result.data as MagicLinkResponse | undefined;
                if (data?.success) {
                  toast.push('Check your email for a login link!');
                  magicLinkEmail = '';
                } else {
                  // Handle cases where fetch succeeded but server reported failure
                  const message = data?.message || 'Failed to send login link. Please try again.';
                  toast.push(message, { theme: { '--toastBackground': 'hsl(0 100% 50%)', '--toastColor': 'white' } });
                }
              } else if (result.type === 'failure') {
                // Handle fetch errors (network issues, 4xx/5xx status codes without specific JSON)
                // Try to get a message from the potentially non-JSON response or use a default
                const message = (result.data as any)?.message || 'An unexpected error occurred. Please try again.';
                toast.push(message, { theme: { '--toastBackground': 'hsl(0 100% 50%)', '--toastColor': 'white' } });
              } else if (result.type === 'error') {
                // Handle client-side errors during fetch preparation or processing
                toast.push('A network error occurred. Please check your connection.', { theme: { '--toastBackground': 'hsl(0 100% 50%)', '--toastColor': 'white' } });
                console.error('Enhance fetch error:', result.error);
              }
            };
          }}
        >
          <label for="magic-link-email" class="block text-sm font-medium text-gray-700 mb-1">Email Login</label>
          <input
            id="magic-link-email"
            type="email"
            name="email"
            placeholder="you@example.com"
            required
            bind:value={magicLinkEmail}
            disabled={submittingMagicLink}
            class="w-full px-3 py-2 text-sm border border-gray-300 rounded-md mb-2 disabled:opacity-50 focus:ring-blue-500 focus:border-blue-500"
          />
          <button
            type="submit"
            disabled={submittingMagicLink}
            class="w-full px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            {submittingMagicLink ? 'Sending...' : 'Send Login Link'}
          </button>
        </form>

        <div class="p-2 text-center text-xs font-medium text-gray-500">
          Or sign in with:
        </div>
        {#each AUTH_METHODS as method}
          <DropdownMenu.Item
            class="flex h-10 select-none items-center rounded-md px-3 py-2 text-sm font-medium data-[highlighted]:bg-gray-100 focus:outline-none"
            onSelect={() => {
              window.location.href = `/auth/social/${method.id}/authorize`;
            }}
          >
            <span class="flex items-center">
              <i class="{method.icon} mr-2"></i>
              {method.label}
            </span>
          </DropdownMenu.Item>
        {/each}
      {/if}
    </DropdownMenu.Content>
  </DropdownMenu.Portal>
</DropdownMenu.Root>
