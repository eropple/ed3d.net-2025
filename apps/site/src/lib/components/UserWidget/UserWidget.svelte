<script lang="ts">
  import { DropdownMenu } from "bits-ui";
  import type { UserPrivate } from "$lib/domain/users/types";
  import { AUTH_METHODS } from "./constants";

  export let user: UserPrivate | null = null;
  export let loading: boolean = false;
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
      class="w-56 rounded-lg border border-gray-200 bg-white p-1.5 shadow-lg"
      sideOffset={8}
    >
      {#if user}
        <DropdownMenu.Item
          class="flex h-10 select-none items-center rounded-md px-3 py-2 text-sm font-medium data-[highlighted]:bg-gray-100 focus:outline-none"
        >
          <span class="flex items-center">
            <i class="fa-regular fa-user mr-2"></i>
            Profile
          </span>
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
        <div class="p-2 text-center text-sm font-medium text-gray-700">
          Sign in with:
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
