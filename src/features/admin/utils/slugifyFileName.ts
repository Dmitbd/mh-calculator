/** Транслитерация кириллицы в латиницу для имени файла */
const CYRILLIC_TO_LATIN: Record<string, string> = {
  а: "a",
  б: "b",
  в: "v",
  г: "g",
  д: "d",
  е: "e",
  ё: "yo",
  ж: "zh",
  з: "z",
  и: "i",
  й: "y",
  к: "k",
  л: "l",
  м: "m",
  н: "n",
  о: "o",
  п: "p",
  р: "r",
  с: "s",
  т: "t",
  у: "u",
  ф: "f",
  х: "kh",
  ц: "ts",
  ч: "ch",
  ш: "sh",
  щ: "shch",
  ъ: "",
  ы: "y",
  ь: "",
  э: "e",
  ю: "yu",
  я: "ya",
};

function transliterateCyrillic(value: string): string {
  return [...value.toLowerCase()]
    .map((char) => CYRILLIC_TO_LATIN[char] ?? char)
    .join("");
}

/** Имя JSON-файла из имени героя: «Western Queen» → western-queen.json */
export function slugifyFileName(heroName: string): string {
  const slug = transliterateCyrillic(heroName.trim())
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `${slug || "hero"}.json`;
}
