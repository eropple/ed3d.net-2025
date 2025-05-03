<script lang="ts">
  import { onMount } from 'svelte';
  import { userStore } from '$lib/stores/user';
  import UserWidget from './UserWidget.svelte';
	import type { UserPrivate } from "../../domain/users/types.js";

  let user: UserPrivate | null = null;
  let loading = true;

  // Subscribe to the user store
  onMount(() => {
    const unsubscribe = userStore.subscribe((state) => {
      user = state.user;
      loading = state.loading;
    });

    return unsubscribe;
  });
</script>

<UserWidget {user} {loading} />
