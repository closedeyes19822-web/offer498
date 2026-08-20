import type { Offer, OfferType } from "@/types/offer";

const AR_DIGITS = "٠١٢٣٤٥٦٧٨٩";

export function toWesternDigits(s: string): string {
  return String(s || "").replace(/[٠-٩]/g, (d) => String(AR_DIGITS.indexOf(d)));
}

const WORD_QTY: Record<string, number> = {
  "حبة": 1, "حبه": 1, "واحدة": 1, "واحده": 1,
  "حبتين": 2, "اثنين": 2, "اثنتين": 2,
  "ثلاث": 3, "ثلاثة": 3, "ثلاثه": 3,
  "أربع": 4, "اربع": 4, "أربعة": 4, "اربعة": 4,
  "خمس": 5, "خمسة": 5, "خمسه": 5,
};

/** Extract offer semantics from a free-form Arabic/English phrase. */
export function inferFromText(raw: string): Partial<Offer> {
  const s = toWesternDigits(raw).trim();
  if (!s) return {};
  const low = s.toLowerCase();

  const pct = low.match(/(\d{1,2}(?:\.\d+)?)\s*(?:%|٪|percent|بالمائة|بالمئة)/);
  const discount = pct ? clampPct(parseFloat(pct[1])) : 0;

  const second =
    /2nd|second|الثانية|الثانيه|التانية|التانيه|الحبه الثانيه/.test(low);
  const first =
    /1st|first|الأولى|الاولى|الاولي|الأولي/.test(low);

  if (discount > 0 && second) return { offerType: "second_piece_discount", discount };
  if (discount > 0 && first) return { offerType: "first_piece_discount", discount };

  // "2+1", "3 + 1"
  const plus = low.match(/(\d+)\s*\+\s*(\d+)/);
  if (plus) return { offerType: "bundle", buyQty: +plus[1], getQty: +plus[2] };

  // "buy 2 get 1"
  const bg = low.match(/buy\s*(\d+)\s*get\s*(\d+)/);
  if (bg) return { offerType: "bundle", buyQty: +bg[1], getQty: +bg[2] };

  // Arabic: "الحبتين عليهم حبة", "الحبة على حبة", "الثلاث حبات عليهم حبتين"
  const arBundle = s.match(
    /(?:ال)?(حبة|حبه|حبتين|ثلاث|ثلاثة|ثلاثه|أربع|اربع|أربعة|اربعة|خمس|خمسة|خمسه)\s*(?:حبات|حبة|حبه)?\s*(?:علي?ه?م?|على|\+|مع)\s*(?:ال)?(حبة|حبه|حبتين|ثلاث|ثلاثة|ثلاثه|أربع|اربع)?/
  );
  if (arBundle && /هدية|هديه|مجان|علي?ه?م|على/.test(s)) {
    const buyQty = WORD_QTY[arBundle[1]] ?? 1;
    const getQty = arBundle[2] ? WORD_QTY[arBundle[2]] ?? 1 : 1;
    return { offerType: "bundle", buyQty, getQty };
  }

  // "3 pcs for 275" / "الثلاث حبات بعشرين"
  const pcsFor = low.match(/(\d+)\s*(?:pcs?|pieces?|حبات|حبة)\s*(?:for|ب|بسعر)\s*(\d+(?:\.\d+)?)/);
  if (pcsFor) return { offerType: "bundle", quantity: +pcsFor[1], price: parseFloat(pcsFor[2]) };

  if (discount > 0) return { offerType: "discount", discount };
  if (/هدية|هديه|gift|free|مجان/.test(low)) return { offerType: "gift" };
  return {};
}

export function clampPct(n: number): number {
  if (!isFinite(n) || n <= 0) return 0;
  return Math.min(95, Math.max(1, Math.round(n)));
}

/** Extract the first 6-digit SAP code, else any digit run. */
export function extractItemCode(raw: unknown): string | undefined {
  const s = toWesternDigits(String(raw ?? "")).trim();
  if (!s) return undefined;
  return s.match(/\d{6}/)?.[0] || s.match(/\d{3,}/)?.[0] || s || undefined;
}

/** Normalize an ISO-ish date to YYYY-MM-DD, defaulting the year to 2026. */
export function normalizeDate(raw: unknown): string | undefined {
  const s = toWesternDigits(String(raw ?? "")).trim();
  if (!s) return undefined;
  const iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) return `${iso[1]}-${pad(iso[2])}-${pad(iso[3])}`;
  const dmy = s.match(/^(\d{1,2})[\/\-.](\d{1,2})(?:[\/\-.](\d{2,4}))?$/);
  if (dmy) {
    const y = dmy[3] ? (dmy[3].length === 2 ? 2000 + +dmy[3] : +dmy[3]) : 2026;
    return `${y}-${pad(dmy[2])}-${pad(dmy[1])}`;
  }
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return undefined;
}

const pad = (v: string | number) => String(v).padStart(2, "0");

/** Clean up an AI/Excel detected offer: infer missing type, clamp values, drop junk. */
export function normalizeDetected(d: Partial<Offer>): Offer | null {
  const productName = cleanName(String(d.productName ?? ""));
  if (!productName) return null;

  const text = String(d.text ?? "").trim();
  const inferred = inferFromText(text || productName);

  let offerType: OfferType = (d.offerType as OfferType) || "custom";
  let discount = clampPct(Number(d.discount) || 0);
  let buyQty = posInt(d.buyQty);
  let getQty = posInt(d.getQty);
  let quantity = posInt(d.quantity) ?? 1;
  let price = Math.max(0, Number(d.price) || 0);

  if (offerType === "custom" && inferred.offerType) offerType = inferred.offerType;
  if (!discount && inferred.discount) discount = inferred.discount;
  if (!buyQty && inferred.buyQty) buyQty = inferred.buyQty;
  if (!getQty && inferred.getQty) getQty = inferred.getQty;
  if (!price && inferred.price) price = inferred.price;
  if (quantity === 1 && inferred.quantity) quantity = inferred.quantity;

  // Consistency repairs
  if (offerType === "bundle" && !buyQty && !getQty && !(price > 0 && quantity > 1)) {
    offerType = discount > 0 ? "discount" : "custom";
  }
  if (
    (offerType === "discount" ||
      offerType === "first_piece_discount" ||
      offerType === "second_piece_discount") &&
    discount === 0
  ) {
    offerType = buyQty && getQty ? "bundle" : "custom";
  }
  if (offerType === "custom") {
    if (discount > 0) offerType = "discount";
    else if (buyQty && getQty) offerType = "bundle";
    else if (price > 0 && quantity > 1) offerType = "bundle";
  }

  return {
    id: crypto.randomUUID(),
    productName,
    offerType,
    quantity,
    buyQty,
    getQty,
    price,
    discount,
    text,
    startDate: normalizeDate(d.startDate),
    endDate: normalizeDate(d.endDate),
    itemCode: extractItemCode(d.itemCode),
    createdAt: Date.now(),
  };
}

function posInt(v: unknown): number | undefined {
  const n = Number(v);
  return isFinite(n) && n > 0 ? Math.round(n) : undefined;
}

/** Remove a repeated product name inside the same string ("X 400gm X 400gm"). */
export function cleanName(raw: string): string {
  let s = toWesternDigits(raw).replace(/\s+/g, " ").trim();
  if (!s) return "";
  const half = Math.floor(s.length / 2);
  const a = s.slice(0, half).trim();
  const b = s.slice(half).trim();
  if (a && a.toLowerCase() === b.toLowerCase()) s = a;
  // token-level duplicate run ("Nido Nido 400gm")
  const parts = s.split(" ");
  const out: string[] = [];
  for (const p of parts) {
    if (out.length && out[out.length - 1].toLowerCase() === p.toLowerCase()) continue;
    out.push(p);
  }
  return out.join(" ").trim();
}

/** Case/space-insensitive dedupe by product name (+ item code when present). */
export function dedupeOffers(offers: Offer[], existing: Offer[] = []): Offer[] {
  const seen = new Set(
    existing.map((o) => dedupKey(o))
  );
  const out: Offer[] = [];
  for (const o of offers) {
    const k = dedupKey(o);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(o);
  }
  return out;
}

const dedupKey = (o: Offer) =>
  `${(o.itemCode || "").trim()}|${o.productName.toLowerCase().replace(/\s+/g, " ").trim()}`;
