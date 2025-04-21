<script lang="ts">
  import { Fa } from 'svelte-fa';
  import { SOCIALS } from '$lib/socials';
</script>

<footer class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
  <hr />
  <div class="sm:grid sm:grid-cols-3 sm:gap-4 py-4 text-sm text-center">
    <div class="italic sm:text-left">
      <p>
        Site the responsibility of
        <a href="mailto:ed+site@ed3d.net">Ed Ropple</a>. Content under
        permissive license is marked where used. I've got a
        <a href="/boilerplate/privacy-policy">privacy policy</a> and a
        <a href="/boilerplate/terms-of-service">terms of service</a>
        if you're into that sort of thing.
      </p>
    </div>
    <div></div>
    <div>
      <ul class="flex space-x-4 justify-center mt-8 md:justify-end sm:mt-0">
        {#each SOCIALS as item, i}
          <li>
            <a
              target="_blank"
              rel="noopener noreferrer me"
              href={item.href}
              title={item.name}
            >
              <Fa size="lg" icon={item.icon} />
            </a>
          </li>
        {/each}
      </ul>
    </div>
  </div>
</footer>