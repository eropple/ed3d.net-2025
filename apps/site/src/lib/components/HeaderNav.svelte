<script lang="ts">
  import { page } from '$app/state';
  import { SITE_NAME } from '$lib/constants';
  import { clsx } from 'clsx';
  import AuthModal from './AuthModal.svelte';
  import { NavigationMenu, DropdownMenu } from 'bits-ui';
  import { faExclamationCircle } from '@fortawesome/free-solid-svg-icons';
  import { Fa } from 'svelte-fa';

  let isOpen = $state(false);
  let authModalOpen = $state(false);

  function isActive(href: string): boolean {
    return page.url.pathname?.toLowerCase().startsWith(href.toLowerCase()) ?? false;
  }

  function openAuthModal() {
    authModalOpen = true;
  }

  const itemClasses = "flex h-10 select-none items-center rounded-md px-3 py-2 text-sm font-medium data-[highlighted]:bg-gray-100 focus:outline-none";
</script>

<nav class="relative z-10 bg-primary text-white shadow-xl">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div class="flex justify-between h-16">
      <div class="shrink-0 flex items-center">
        <a href="/" class="text-2xl">
          {SITE_NAME}
        </a>
      </div>
      <div class="hidden md:block">
        <NavigationMenu.Root class="flex h-full items-center">
          <NavigationMenu.List class="flex items-baseline space-x-4">
            <NavigationMenu.Item>
              <NavigationMenu.Link
              href="/blog"
              class={clsx([
                "px-3",
                "pt-2",
                "pb-2",
                "text-lg",
                "hover:underline",
                "hover:decoration-2",
                "hover:decoration-secondary",
                isActive('/blog')
                ? [
                "text-white",
                "underline",
                "decoration-2",
                "decoration-secondary",
                ]
                : ["text-gray-300", "hover:text-white"],
                ])}
                >
                Blog
              </NavigationMenu.Link>
            </NavigationMenu.Item>

            {#if page.data.user}
            <DropdownMenu.Root>
              <DropdownMenu.Trigger
              class="relative inline-flex h-10 w-10 select-none items-center justify-center rounded-full bg-gray-200 text-sm font-medium hover:bg-gray-300 active:scale-[0.98] focus:outline-none data-[state=open]:ring-2 data-[state=open]:ring-secondary data-[state=open]:ring-offset-2 data-[state=open]:ring-offset-primary"
              >
              <span class="text-gray-500">
                {page.data.user.username.substring(0, 2).toUpperCase()}
              </span>
              {#if !page.data.user.emailVerified}
              <div
              class="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 ring-1 ring-white"
              title="Email unverified"
              >
              <Fa icon={faExclamationCircle} class="text-white" size="xs" />
            </div>
            {/if}
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
            class="z-50 w-56 rounded-lg border border-gray-200 bg-white p-2 text-gray-900 shadow-lg focus:outline-none"
            sideOffset={8}
            align="end"
            >
            <div class="px-3 py-2">
              <p class="text-sm font-medium truncate">{page.data.user.username}</p>
              {#if page.data.user.email}
              <p class="text-sm text-gray-500 truncate">{page.data.user.email}</p>
              {/if}
              {#if !page.data.user.emailVerified}
              <a href="/profile/info" class="block text-xs text-red-600 hover:underline mt-0.5">
                Email unverified
              </a>
              {/if}
            </div>
            <div class="h-px my-1 bg-gray-200"></div>
            <DropdownMenu.Item class={itemClasses} onSelect={() => window.location.href='/profile'}>
              <i class="fa-regular fa-user mr-2 w-4 text-center"></i>
              Profile
            </DropdownMenu.Item>
            <DropdownMenu.Item class={itemClasses} onSelect={() => window.location.href='/auth/logout'}>
              <i class="fa-solid fa-arrow-right-from-bracket mr-2 w-4 text-center"></i>
              Sign out
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
      {:else}
      <NavigationMenu.Item>
        <button
        onclick={openAuthModal}
        class={clsx([
          "rounded-md",
          "px-3",
          "py-2",
          "text-lg",
          "font-medium",
          "text-gray-300",
          "hover:text-white",
          "hover:underline",
          "hover:decoration-2",
          "hover:decoration-secondary"
          ])}
          >
          Log In
        </button>
      </NavigationMenu.Item>
      {/if}
    </NavigationMenu.List>
    <NavigationMenu.Viewport />
  </NavigationMenu.Root>
</div>
<div class="-mr-2 flex items-center md:hidden">
  <button
  onclick={() => (isOpen = !isOpen)}
  type="button"
  class="bg-primary inline-flex items-center justify-center p-2 rounded-md text-gray-300 hover:text-white"
  aria-controls="mobile-menu"
  aria-expanded={isOpen}
  >
  <span class="sr-only">Open main menu</span>
  {#if isOpen}
  <svg
  class="block h-6 w-6"
  xmlns="http://www.w3.org/2000/svg"
  fill="none"
  viewBox="0 0 24 24"
  stroke="currentColor"
  aria-hidden="true"
  >
  <path
  stroke-linecap="round"
  stroke-linejoin="round"
  stroke-width={2}
  d="M6 18L18 6M6 6l12 12"
  />
</svg>
{:else}
<svg
class="block h-6 w-6"
xmlns="http://www.w3.org/2000/svg"
fill="none"
viewBox="0 0 24 24"
stroke="currentColor"
aria-hidden="true"
>
<path
stroke-linecap="round"
stroke-linejoin="round"
stroke-width={2}
d="M4 6h16M4 12h16M4 18h16"
/>
</svg>
{/if}
</button>
</div>
</div>
</div>
{#if isOpen}
<div class="md:hidden" id="mobile-menu">
  <div class="px-2 pt-2 pb-3 space-y-1 sm:px-3">
    <a
    href="/blog"
    class={clsx([
      "block",
      "rounded-md",
      "text-base",
      "px-3",
      "py-2",
      "text-lg",
      "hover:underline",
      "hover:decoration-2",
      "hover:decoration-secondary",
      isActive('/blog') ? ["text-white", "bg-primary-dark"] : ["text-gray-300", "hover:text-white", "hover:bg-primary-dark"],
      ])}
      onclick={() => isOpen = false}
      >
      Blog
    </a>

    {#if page.data.user}
    <div class="border-t border-gray-700 pt-3 mt-2">
      <div class="flex items-center px-3 mb-3">
        <div class="relative inline-flex h-10 w-10 shrink-0 select-none items-center justify-center rounded-full bg-gray-200 text-sm font-medium">
          <span class="text-gray-500">{page.data.user.username.substring(0, 2).toUpperCase()}</span>
          {#if !page.data.user.emailVerified}
          <div
          class="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 ring-1 ring-white"
          title="Email unverified"
          >
          <Fa icon={faExclamationCircle} class="text-white" size="xs" />
        </div>
        {/if}
      </div>
      <div class="ml-3">
        <div class="text-base font-medium text-white">{page.data.user.username}</div>
        {#if page.data.user.email}
        <div class="text-sm font-medium text-gray-400">{page.data.user.email}</div>
        {/if}
        {#if !page.data.user.emailVerified}
        <a href="/profile/info" class="block text-xs text-red-400 hover:underline mt-0.5" onclick={() => isOpen = false}>
          Email unverified
        </a>
        {/if}
      </div>
    </div>
    <div class="space-y-1">
      <a href="/profile"
      class="block rounded-md px-3 py-2 text-base font-medium text-gray-300 hover:text-white hover:bg-primary-dark"
      onclick={() => isOpen = false}>
      <i class="fa-regular fa-user mr-2 w-4 text-center inline-block"></i>
      Profile
    </a>
    <a href="/auth/logout"
    class="block rounded-md px-3 py-2 text-base font-medium text-gray-300 hover:text-white hover:bg-primary-dark"
    onclick={() => isOpen = false}>
    <i class="fa-solid fa-arrow-right-from-bracket mr-2 w-4 text-center inline-block"></i>
    Sign out
  </a>
</div>
</div>
{:else}
<button
onclick={() => { openAuthModal(); isOpen = false; }}
class={clsx([
  "block",
  "w-full",
  "rounded-md",
  "px-3",
  "py-2",
  "text-left",
  "text-base",
  "font-medium",
  "text-gray-300",
  "hover:text-white",
  "hover:bg-primary-dark"
  ])}
  >
  Log In
</button>
{/if}
</div>
</div>
{/if}
</nav>

<AuthModal bind:open={authModalOpen} redirectPath={page.url.pathname} />