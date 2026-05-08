/** URL for a file in Vite `public/` (`path` without leading slash). Honors `base` in vite.config. */
export function publicUrl(path: string): string {
  const p = path.replace(/^\//, '');
  return `${import.meta.env.BASE_URL}${p}`;
}
