<script>
  import MenuItem from "./MenuItem.svelte";

  // Props
  export let currentPath = "/workshop";

  // Menu structure
  const menuItems = [
    {
      label: "Dashboard",
      path: "/workshop",
      icon: "dashboard"
    },
    {
      label: "Blog Posts",
      path: "/workshop/blog",
      icon: "article"
    },
    {
      label: "Users",
      path: "/workshop/users",
      icon: "people"
    },
    {
      label: "Settings",
      path: "/workshop/settings",
      icon: "settings"
    }
  ];
</script>

<aside class="bg-base-200 w-80 h-screen pt-5">
  <div class="px-4 mb-6 hidden lg:block">
    <h1 class="text-2xl font-bold">Ed3D Workshop</h1>
  </div>

  <ul class="menu menu-md p-4 [&_li>*]:rounded-md">
    {#each menuItems as item}
      <MenuItem
        label={item.label}
        path={item.path}
        icon={item.icon}
        isActive={currentPath === item.path || currentPath.startsWith(`${item.path}/`)}
      />
    {/each}
  </ul>
</aside>