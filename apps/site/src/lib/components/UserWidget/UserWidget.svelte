<script lang="ts">
  import { DropdownMenu } from 'bits-ui';
  import type { UserPrivate } from "$lib/domain/users/types";

  let { user = $bindable() } = $props<{
    user: UserPrivate;
  }>();
</script>

{#if user}
<DropdownMenu.Root>
  <DropdownMenu.Trigger
    class="inline-flex h-10 w-10 select-none items-center justify-center rounded-full bg-gray-200 text-sm font-medium hover:bg-gray-300 active:scale-[0.98] focus:outline-none"
  >
    <span class="text-gray-500">
      {user.username.substring(0, 2).toUpperCase()}
    </span>
  </DropdownMenu.Trigger>
  <DropdownMenu.Portal>
    <DropdownMenu.Content
      class="w-64 rounded-lg border border-gray-200 bg-white p-2 shadow-lg"
      sideOffset={8}
    >
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
    </DropdownMenu.Content>
  </DropdownMenu.Portal>
</DropdownMenu.Root>
{/if}
