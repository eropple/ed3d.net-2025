<script lang="ts">
  import { clsx } from 'clsx';
  import _ from 'lodash';
  import { DateTime } from 'luxon';
  import type { BlogCountsType } from '$lib/domain/blogs/types';
  import { blogCategoryListUrl, blogTagListUrl } from '$lib/url-builders';

  export let rollup: BlogCountsType;
  export let current: { type: string; value: string } | undefined = undefined;
</script>

<div>
  <ul class={clsx(['list-none', 'margin-none', 'text-sm'])}>
    <li
      class={clsx([
        'italic',
        'underline',
        'decoration-dotted',
        'hover:decoration-solid',
        current?.type === 'all' && 'font-bold'
      ])}
    >
      <a href="/blog" class="text-base">
        all posts ({rollup.all})
      </a>
    </li>
    <li>
      <span class="text-base">categories</span>

      <ul class={clsx(['list-none', 'ml-4'])}>
        {#each _.sortBy(Object.values(rollup.categories), 'slug').filter(category => category.total > 0) as category}
          <li
            title={category.description}
            class={clsx([
              'my-0',
              current?.type === 'category' && current.value === category.slug && 'font-bold'
            ])}
          >
            <a
              class="italic underline decoration-dotted hover:decoration-solid"
              href={blogCategoryListUrl(category.slug)}
            >
              {category.slug} ({category.total})
            </a>
          </li>
        {/each}
      </ul>
    </li>
    <li>
      <span class="text-base">tags</span>

      <div class="ml-4">
        {#each _.sortBy(Object.entries(rollup.tags), 1).filter(t => t[1] > 0) as [tag, count], idx}
          <span
            class={clsx([
              'inline-block',
              'italic',
              idx > 0 && 'pl-2'
            ])}
          >
            <a
              class="underline decoration-dotted hover:decoration-solid"
              href={blogTagListUrl(tag)}
            >
              {tag} ({count})
            </a>
          </span>
        {/each}
      </div>
    </li>
    <!-- Commented out in the original React component - keeping commented here too
    <li>
      <span class="text-base">by date</span>

      <ul class={clsx(['list-none', 'ml-4'])}>
        {#each sortBy(Object.entries(rollup.byMonths), 0) as [date, count]}
          <li
            class={clsx([
              'my-0',
              current?.type === 'date' && current.value === date && 'font-bold'
            ])}
          >
            <a
              class="underline decoration-dotted hover:decoration-solid"
              href={`/blog/by-date/${date}`}
            >
              {DateTime.fromObject({
                year: parseInt(date.split('-')[0], 10),
                month: parseInt(date.split('-')[1], 10),
                day: 1
              }).toFormat('MMMM yyyy')} ({count})
            </a>
          </li>
        {/each}
      </ul>
    </li>
    -->
  </ul>
</div>