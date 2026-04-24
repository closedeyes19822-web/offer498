import productsData from "@/data/products.json";

export interface ProductRecord {
  code: string;
  name: string;
  category: string;
}

const PRODUCTS: ProductRecord[] = productsData as ProductRecord[];

const byCode = new Map<string, ProductRecord>();
for (const p of PRODUCTS) byCode.set(p.code, p);

/** Normalize text: lowercase, remove diacritics/punct, collapse spaces. */
function norm(s: string): string {
  return s
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Find a product by exact code match (6-digit). Returns null when not found. */
export function findProductByCode(code: string): ProductRecord | null {
  const c = String(code).replace(/\D/g, "");
  if (!c) return null;
  return byCode.get(c.padStart(6, "0")) ?? byCode.get(c) ?? null;
}

/** Try to extract a 6-digit Item Number from arbitrary text. */
export function extractItemCode(text: string): string | null {
  if (!text) return null;
  // Look for explicit "code/كود/item" prefixes with 5-7 digits
  const re = /(?:item\s*(?:no\.?|number|#)?|code|كود|الكود|الصنف)\D*(\d{5,7})/i;
  const m = text.match(re);
  if (m) return m[1].padStart(6, "0").slice(-6);
  // Fallback: any standalone 6-digit run
  const six = text.match(/\b(\d{6})\b/);
  return six ? six[1] : null;
}

/** Best-effort fuzzy match by product name (token overlap). */
export function findProductByName(name: string): ProductRecord | null {
  const q = norm(name);
  if (!q) return null;
  const qTokens = new Set(q.split(" ").filter((t) => t.length >= 2));
  if (qTokens.size === 0) return null;

  let best: { p: ProductRecord; score: number } | null = null;
  for (const p of PRODUCTS) {
    if (!p.name) continue;
    const n = norm(p.name);
    if (!n) continue;
    if (n === q) return p;
    const nTokens = n.split(" ");
    let hit = 0;
    for (const t of nTokens) if (qTokens.has(t)) hit++;
    const score = hit / Math.max(qTokens.size, nTokens.length);
    if (score >= 0.5 && (!best || score > best.score)) best = { p, score };
  }
  return best?.p ?? null;
}

/** Resolve product info from any free text (name OR code embedded). */
export function resolveProduct(input: string): ProductRecord | null {
  const code = extractItemCode(input);
  if (code) {
    const byC = findProductByCode(code);
    if (byC) return byC;
    // Even if not in DB, return a stub so the code shows up.
    return { code, name: input.trim(), category: "" };
  }
  return findProductByName(input);
}

export const PRODUCT_COUNT = PRODUCTS.length;
