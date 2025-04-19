<script lang="ts">
  import Fa from 'svelte-fa';
  import {
    faTachometerAlt,
    faNewspaper,
    faLayerGroup,
    faTag,
    faUsers,
    faCog,
    type IconDefinition
  } from '@fortawesome/free-solid-svg-icons';

  // Props
  export let label = "";
  export let path = "";
  export let icon = "";
  export let isActive = false;

  // Define valid icon names as a type
  type IconName = 'dashboard' | 'article' | 'category' | 'tag' | 'people' | 'settings';

  // Map material icon names to Font Awesome icons with proper typing
  const iconMap: Record<IconName, IconDefinition> = {
    dashboard: faTachometerAlt,
    article: faNewspaper,
    category: faLayerGroup,
    tag: faTag,
    people: faUsers,
    settings: faCog
  };

  // Function to safely get the icon or return a default
  function getIcon(name: string): IconDefinition {
    return (name in iconMap) ? iconMap[name as IconName] : faCog;
  }
</script>

<li>
  <a href={path} class={isActive ? 'active font-bold' : ''}>
    <Fa icon={getIcon(icon)} />
    {label}
  </a>
</li>