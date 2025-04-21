export function blogPostUrl(slug: string) {
  return `/blog/posts/${slug}`;
}

export function blogCategoryListUrl(slug: string) {
  return `/blog/by-category/${slug}`;
}

export function blogTagListUrl(slug: string) {
  return `/blog/by-tag/${slug}`;
}
