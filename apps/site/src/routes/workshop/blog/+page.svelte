<script lang="ts">
  import { page } from "$app/stores";
  import { writable } from "svelte/store";
  import PostsIndex from "./components/PostsIndex.svelte";
  import CategoriesIndex from "./components/CategoriesIndex.svelte";
  import TagsIndex from "./components/TagsIndex.svelte";

  // Get user data from page data
  $: user = $page.data.user;

  // Tabs state
  const tabs = [
    { id: "posts", label: "Posts" },
    { id: "categories", label: "Categories" },
    { id: "tags", label: "Tags" },
  ];

  const activeTab = writable("posts");

  function setActiveTab(id: string) {
    activeTab.set(id);
  }
</script>

<div class="p-4">
  <h1 class="text-3xl font-bold mb-6">Blog Management</h1>

  <div class="tabs tabs-boxed mb-6">
    {#each tabs as tab}
      <button
        class="tab {$activeTab === tab.id ? 'tab-active' : ''}"
        on:click={() => setActiveTab(tab.id)}
      >
        {tab.label}
      </button>
    {/each}
  </div>

  <div class="tab-content">
    {#if $activeTab === "posts"}
      <PostsIndex />
    {:else if $activeTab === "categories"}
      <CategoriesIndex />
    {:else if $activeTab === "tags"}
      <TagsIndex />
    {/if}
  </div>
</div>
