<script>
  import { page } from "$app/stores";

  // Get user data from page data
  $: user = $page.data.user;
</script>

<div class="p-4">
  <h1 class="text-3xl font-bold mb-6">Dashboard</h1>

  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    <!-- Stats cards -->
    <div class="stats shadow">
      <div class="stat">
        <div class="stat-figure text-primary">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="inline-block w-8 h-8 stroke-current">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
          </svg>
        </div>
        <div class="stat-title">Total Blog Posts</div>
        <div class="stat-value text-primary">25</div>
        <div class="stat-desc">12% more than last month</div>
      </div>
    </div>

    <div class="stats shadow">
      <div class="stat">
        <div class="stat-figure text-secondary">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="inline-block w-8 h-8 stroke-current">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
          </svg>
        </div>
        <div class="stat-title">Page Views</div>
        <div class="stat-value text-secondary">2.6K</div>
        <div class="stat-desc">21% more than last month</div>
      </div>
    </div>

    <div class="stats shadow">
      <div class="stat">
        <div class="stat-figure text-accent">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="inline-block w-8 h-8 stroke-current">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"></path>
          </svg>
        </div>
        <div class="stat-title">New Users</div>
        <div class="stat-value">12</div>
        <div class="stat-desc">↗︎ 6 (30%)</div>
      </div>
    </div>
  </div>

  <div class="mt-8 flex flex-col md:flex-row gap-6">
    <!-- Recent activity -->
    <div class="card bg-base-200 shadow-xl flex-1">
      <div class="card-body">
        <h2 class="card-title">Recent Activity</h2>
        <ul class="timeline timeline-vertical">
          <li>
            <div class="timeline-start">Today</div>
            <div class="timeline-middle">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clip-rule="evenodd" /></svg>
            </div>
            <div class="timeline-end timeline-box">New blog post published</div>
            <hr/>
          </li>
          <li>
            <hr/>
            <div class="timeline-start">Yesterday</div>
            <div class="timeline-middle">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clip-rule="evenodd" /></svg>
            </div>
            <div class="timeline-end timeline-box">3 new categories added</div>
            <hr/>
          </li>
          <li>
            <hr/>
            <div class="timeline-start">3 days ago</div>
            <div class="timeline-middle">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clip-rule="evenodd" /></svg>
            </div>
            <div class="timeline-end timeline-box">New content update</div>
          </li>
        </ul>
      </div>
    </div>

    <!-- Quick actions -->
    <div class="card bg-base-200 shadow-xl w-full md:w-80">
      <div class="card-body">
        <h2 class="card-title">Quick Actions</h2>
        <div class="flex flex-col gap-2">
          <a href="/workshop/blog-posts/new" class="btn btn-primary">New Blog Post</a>
          <a href="/workshop/categories/new" class="btn btn-outline">Add Category</a>
          <a href="/workshop/tags/new" class="btn btn-outline">Add Tag</a>
        </div>
      </div>
    </div>
  </div>
</div>