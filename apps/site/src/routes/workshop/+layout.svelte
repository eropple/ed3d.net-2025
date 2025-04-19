<script>
  import { page } from "$app/stores";
  import WorkshopSidebar from "./WorkshopSidebar.svelte";

  // Get the current path for highlighting the active menu item
  $: currentPath = $page.url.pathname;
</script>

<div id="daisyui-root" data-theme="dark" class="min-h-screen bg-base-100">
  <div class="drawer lg:drawer-open">
    <input id="workshop-drawer" type="checkbox" class="drawer-toggle" />

    <div class="drawer-content flex flex-col p-4">
      <!-- Top navigation for mobile -->
      <div class="navbar bg-base-100 lg:hidden">
        <div class="flex-none">
          <label for="workshop-drawer" class="btn btn-square btn-ghost drawer-button">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="inline-block w-5 h-5 stroke-current">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
            </svg>
          </label>
        </div>
        <div class="flex-1">
          <a href="/workshop" class="btn btn-ghost text-xl">workshop</a>
        </div>
      </div>

      <!-- Main content -->
      <div class="p-4">
        <slot />
      </div>
    </div>

    <!-- Sidebar -->
    <div class="drawer-side">
      <label for="workshop-drawer" aria-label="close sidebar" class="drawer-overlay"></label>
      <WorkshopSidebar currentPath={currentPath} />
    </div>
  </div>
</div>