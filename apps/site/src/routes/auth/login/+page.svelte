<script lang="ts">
  import AuthProviders from '$lib/components/auth/AuthProviders.svelte';
  import { AUTH_METHODS } from '$lib/components/UserWidget/constants'; // Import provider definitions
  import { enhance } from '$app/forms';
  import { toast } from '@zerodevx/svelte-toast';
  import { page } from '$app/state';

  const redirectPath = page.url.searchParams.get('redirect') || '/';

  type MagicLinkResponse = { success: boolean; message: string };
  let magicLinkEmail = $state('');
  let submittingMagicLink = $state(false);

</script>

<div class="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
  <div class="max-w-md w-full space-y-8 p-10 bg-white rounded-xl shadow-lg">
    <div>
      <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
        Sign in to your account
      </h2>
    </div>

    <form
    method="POST"
    action="/auth/magic-link/request-login"
    class="mt-8 space-y-6"
    use:enhance={() => {
      submittingMagicLink = true;
      return async ({ result }) => {
        submittingMagicLink = false;
        if (result.type === 'success') {
          const data = result.data as MagicLinkResponse | undefined;
          if (data?.success) {
            toast.push('Check your email for a login link!');
            magicLinkEmail = '';
            // Don't redirect here, let the user click the link
          } else {
            const message = data?.message || 'Failed to send login link. Please try again.';
            toast.push(message, { theme: { '--toastBackground': 'var(--color-error)', '--toastColor': 'var(--color-white)' } });
          }
        } else if (result.type === 'failure') {
          const message = (result.data as any)?.message || 'An unexpected error occurred. Please try again.';
          toast.push(message, { theme: { '--toastBackground': 'var(--color-error)', '--toastColor': 'var(--color-white)' } });
        } else if (result.type === 'error') {
          toast.push('A network error occurred. Please check your connection.', { theme: { '--toastBackground': 'var(--color-error)', '--toastColor': 'var(--color-white)' } });
          console.error('Enhance fetch error:', result.error);
        }
      };
    }}
    >
    <div class="rounded-md shadow-sm -space-y-px">
      <div>
        <label for="login-magic-link-email" class="sr-only">Email address</label>
        <input
        id="login-magic-link-email"
        name="email"
        type="email"
        autocomplete="email"
        required
        bind:value={magicLinkEmail}
        disabled={submittingMagicLink}
        class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-secondary focus:border-secondary focus:z-10 sm:text-sm disabled:opacity-50"
        placeholder="Email address"
        />
      </div>
    </div>

    <input type="hidden" name="redirectPath" value={redirectPath} />


    <div>
      <button
      type="submit"
      disabled={submittingMagicLink}
      class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-less-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-secondary disabled:opacity-50"
      >
      {submittingMagicLink ? 'Sending...' : 'Send Login Link'}
    </button>
  </div>
</form>

<div class="relative my-4">
  <div class="absolute inset-0 flex items-center" aria-hidden="true">
    <div class="w-full border-t border-gray-300"></div>
  </div>
  <div class="relative flex justify-center">
    <span class="px-2 bg-white text-sm text-gray-500"> Or continue with </span>
  </div>
</div>


<div class="mt-6">
  <AuthProviders providers={AUTH_METHODS} {redirectPath} />
</div>

</div>
</div>