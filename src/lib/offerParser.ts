import type { Offer, OfferType } from "@/types/offer";

// Arabic-Indic + Western digit normalization
const digitMap: Record<string, string> = {
  "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4",
  "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9",
};
const normalizeDigits = (s: string) => s.replace(/[٠-٩]/g, (d) => digitMap[d] || d);

// Spelled-out Arabic numbers we care about
const arabicWordToNumber: Record<string, number> = {
  "صفر": 0, "واحد": 1, "واحدة": 1, "حبة": 1,
  "اثنين": 2, "اثنان": 2, "حبتين": 2, "اتنين": 2,
  "ثلاثة": 3, "ثلاث": 3, "تلاتة": 3, "تلات": 3,
  "أربعة": 4, "اربعة": 4, "أربع": 4, "اربع": 4,
  "خمسة": 5, "خمس": 5,
  "ستة": 6, "ست": 6,
  "سبعة": 7, "سبع": 7,
  "ثمانية": 8, "ثماني": 8, "تمانية": 8,
  "تسعة": 9, "تسع": 9,
  "عشرة": 10, "عشر": 10,
  "عشرين": 20, "عشرون": 20,
  "ثلاثين": 30, "ثلاثون": 30,
  "أربعين": 40, "اربعين": 40,
  "خمسين": 50,
  "ستين": 60,
  "سبعين": 70,
  "ثمانين": 80,
  "تسعين": 90,
  "مية": 100, "مائة": 100, "مائه": 100,
  "ميتين": 200, "مئتين": 200,
};

const stripDiacritics = (s: string) => s.replace(/[\u064B-\u0652\u0670]/g, "");

function extractNumber(text: string): number | null {
  const norm = normalizeDigits(text);
  const numMatch = norm.match(/\d+(?:\.\d+)?/);
  if (numMatch) return parseFloat(numMatch[0]);
  // try word
  for (const [word, val] of Object.entries(arabicWordToNumber)) {
    if (text.includes(word)) return val;
  }
  return null;
}

function extractAllNumbers(text: string): number[] {
  const norm = normalizeDigits(text);
  const out: number[] = [];
  const re = /\d+(?:\.\d+)?/g;
  let m;
  while ((m = re.exec(norm))) out.push(parseFloat(m[0]));
  if (out.length === 0) {
    for (const [word, val] of Object.entries(arabicWordToNumber)) {
      if (text.includes(word)) out.push(val);
    }
  }
  return out;
}

function detectQuantity(text: string): number {
  if (/حبتين|اتنين|اثنين/.test(text)) return 2;
  if (/ثلاث|تلات/.test(text)) return 3;
  if (/أربع|اربع/.test(text)) return 4;
  if (/خمس/.test(text)) return 5;
  if (/ست(?!ين)/.test(text)) return 6;
  if (/سبع(?!ين)/.test(text)) return 7;
  if (/الحبة|حبة واحدة|حبه/.test(text)) return 1;
  return 1;
}

function extractProductName(text: string): string {
  // crude: words that aren't stopwords
  const stop = /^(الحبة|الحبه|الحبتين|الحبات|حبة|حبه|حبتين|حبات|عليها|عليهم|هدية|هديه|بسعر|بـ|ب|على|الثانية|الثاني|الثالثة|الثالث|خصم|في|من|إلى|الى|بمبلغ|كل|واحد|واحدة|اثنين|ثلاث|ثلاثة|أربع|أربعة|خمس|خمسة|عشرة|عشرين|ثلاثين|أربعين|خمسين|بالمية|بالميه|بالمائة|عرض|سعر|ريال|درهم|جنيه|دينار)$/;
  const tokens = stripDiacritics(text)
    .replace(/[٪%.,،]/g, " ")
    .split(/\s+/)
    .filter((t) => t && !/^\d+$/.test(normalizeDigits(t)) && !stop.test(t));
  // take first 1-3 meaningful tokens
  return tokens.slice(0, 3).join(" ").trim();
}

export function parseOffer(rawText: string): Offer {
  const text = stripDiacritics(rawText.trim());
  const id = `offer-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const createdAt = Date.now();
  const productName = extractProductName(text) || "منتج";

  // Discount: "خصم ٥٠٪" or "خصم 50 بالمية"
  if (/خصم/.test(text)) {
    const nums = extractAllNumbers(text);
    const discount = nums[0] ?? 50;
    return {
      id,
      productName,
      offerType: "discount" as OfferType,
      quantity: 1,
      price: 0,
      discount,
      text: `خصم ${discount}%`,
      createdAt,
    };
  }

  // Gift: "حبة هدية" / "عليها/عليهم ... هدية"
  if (/هدية|هديه/.test(text) || /عليها|عليهم/.test(text)) {
    const qty = detectQuantity(text);
    return {
      id,
      productName,
      offerType: "gift" as OfferType,
      quantity: qty,
      price: 0,
      discount: 0,
      text: qty === 1 ? "اشترِ 1 واحصل على 1 مجاناً" : `اشترِ ${qty} واحصل على 1 مجاناً`,
      createdAt,
    };
  }

  // Bundle: quantity + price, e.g. "الحبتين بعشرة"
  if (/بسعر|بـ|ب\s|بعشر|بخمس|بثلاث|بأربع|باربع/.test(text) || /\d/.test(normalizeDigits(text))) {
    const qty = detectQuantity(text);
    const nums = extractAllNumbers(text);
    // last number is usually the price
    const price = nums.length > 0 ? nums[nums.length - 1] : 0;
    if (price > 0) {
      return {
        id,
        productName,
        offerType: "bundle" as OfferType,
        quantity: qty,
        price,
        discount: 0,
        text: qty === 1 ? `بسعر ${price}` : `${qty} بسعر ${price}`,
        createdAt,
      };
    }
  }

  // Custom fallback
  return {
    id,
    productName,
    offerType: "custom" as OfferType,
    quantity: 1,
    price: 0,
    discount: 0,
    text: rawText.trim(),
    createdAt,
  };
}

export function speakOfferSummary(offer: Offer, lang: "ar" | "en" = "ar") {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  let msg = "";
  if (lang === "ar") {
    const prefix = "تم تسجيل العرض: ";
    if (offer.offerType === "gift") msg = `${prefix} ${offer.productName}، ${offer.text}`;
    else if (offer.offerType === "bundle") msg = `${prefix} ${offer.productName}، ${offer.quantity} بسعر ${offer.price}`;
    else if (offer.offerType === "discount") msg = `${prefix} ${offer.productName}، خصم ${offer.discount} بالمئة`;
    else msg = `${prefix} ${offer.text}`;
  } else {
    msg = `Offer recorded: ${offer.productName}, ${offer.text}`;
  }
  const u = new SpeechSynthesisUtterance(msg);
  u.lang = lang === "ar" ? "ar-SA" : "en-US";
  u.rate = 1;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
}
