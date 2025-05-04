<script lang="ts">
  import { Fa } from 'svelte-fa';
  import { goto } from '$app/navigation';
  import type { IconDefinition } from "@fortawesome/free-brands-svg-icons";

  // Define the expected structure for a provider
  type AuthProvider = {
    id: string;
    label: string;
    icon: IconDefinition;
  };

  // Props: list of providers and optional redirect path
  let { providers, redirectPath } = $props<{
    providers: AuthProvider[];
    redirectPath?: string;
  }>();

  function startSocialLogin(providerId: string) {
    const url = new URL(`/auth/social/${providerId}/start`, window.location.origin);
    if (redirectPath && redirectPath.startsWith('/')) {
      url.searchParams.set('redirect', redirectPath);
    }
    // Use goto for client-side navigation to the endpoint, which will then server-redirect
    goto(url.toString());
  }
</script>

<div class="text-center text-xs font-medium text-gray-500">Or sign in with:</div>
<div class="mt-2 space-y-2">
  {#each providers as method}
  <button
  onclick={() => startSocialLogin(method.id)}
  class="flex w-full items-center justify-center rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-secondary focus:ring-offset-2"
  >
  <Fa icon={method.icon} class="mr-2 h-4 w-4" />
  {method.label}
</button>
{/each}
</div>