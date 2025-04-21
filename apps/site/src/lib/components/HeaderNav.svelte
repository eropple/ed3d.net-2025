<script lang="ts">
  import { page } from '$app/stores';
  import { SITE_NAME } from '$lib/constants';
  import { onMount } from 'svelte';
  import { clsx } from 'clsx';

  let isOpen = false;

  $: pathname = $page.url.pathname;

  function isActive(href: string): boolean {
    return pathname.toLowerCase().startsWith(href.toLowerCase());
  }
</script>

<nav class="bg-primary text-white shadow-xl">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div class="flex justify-between h-16">
      <div class="shrink-0 flex items-center">
        <a href="/" class="text-2xl">
          {SITE_NAME}
        </a>
      </div>
      <div class="hidden md:block">
        <div class="ml-10 flex items-baseline space-x-4">
          <a
            href="/blog"
            class={clsx([
              "mt-3",
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
          </a>
        </div>
      </div>
      <div class="-mr-2 flex md:hidden">
        <button
          on:click={() => (isOpen = !isOpen)}
          type="button"
          class="bg-primary inline-flex items-center justify-center p-2 rounded-md text-gray-300 hover:text-white"
          aria-controls="mobile-menu"
          aria-expanded="false"
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
            "text-base",
            "px-2",
            "py-2",
            "text-lg",
            "hover:underline",
            "hover:decoration-2",
            "hover:decoration-secondary",
            isActive('/blog') ? ["text-white"] : ["text-gray-300", "hover:text-white"],
          ])}
        >
          Blog
        </a>
      </div>
    </div>
  {/if}
</nav>