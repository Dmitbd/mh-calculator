export function slugifyFileName(heroName: string): string {
  const slug = heroName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `${slug || "hero"}.json`;
}
