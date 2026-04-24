import type { Offer } from "@/types/offer";
import { cn } from "@/lib/utils";

interface OfferCardBWProps {
  offer: Offer;
  startDate?: string;
  endDate?: string;
  itemCode?: string;
  onClick?: () => void;
  selected?: boolean;
}

/** Build a detailed Arabic description of the offer. */
function buildArabicOffer(offer: Offer): string {
  switch (offer.offerType) {
    case "discount":
      return `خصم ${offer.discount}٪ على ${offer.productName}`;
    case "first_piece_discount":
      return `خصم ${offer.discount}٪ على الحبة الأولى من ${offer.productName}`;
    case "second_piece_discount":
      return `خصم ${offer.discount}٪ على الحبة الثانية من ${offer.productName}`;
    case "gift":
      return `عند شراء ${offer.quantity > 1 ? offer.quantity : 1} من ${offer.productName} تحصل على 1 مجاناً`;
    case "bundle":
      if (offer.buyQty && offer.getQty)
        return `عند شراء ${offer.buyQty} من ${offer.productName} تحصل على ${offer.getQty} مجاناً`;
      return `${offer.quantity > 1 ? offer.quantity + " حبات" : "حبة واحدة"} من ${offer.productName} بسعر ${offer.price} ريال`;
    default:
      return offer.text || `عرض خاص على ${offer.productName}`;
  }
}

function formatDate(d?: string): string {
  if (!d) return "—";
  try {
    const dt = new Date(d);
    return dt.toLocaleDateString("ar-SA-u-ca-gregory", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  } catch {
    return d;
  }
}

export function OfferCardBW({ offer, startDate, endDate, itemCode, onClick, selected }: OfferCardBWProps) {
  const arabicOffer = buildArabicOffer(offer);
  const effectiveCode = offer.itemCode || itemCode;

  return (
    <div
      onClick={onClick}
      dir="rtl"
      className={cn(
        "preview-card relative overflow-hidden bg-white text-black border-2 border-black flex flex-col",
        onClick && "cursor-pointer",
        selected && "is-selected",
      )}
    >
      {/* Top: product image area — 4.5cm */}
      <div className="relative border-b-2 border-black" style={{ height: "4.5cm" }}>
        {offer.image ? (
          <img src={offer.image} alt={offer.productName} className="w-full h-full object-contain p-2" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-black/30 text-[10px]">
            مساحة المنتج
          </div>
        )}
      </div>

      {/* Content area — 8cm */}
      <div className="flex-1 flex flex-col p-2 gap-1.5" style={{ height: "8cm" }}>
        {/* Product name */}
        <div
          className="font-extrabold leading-tight text-center overflow-hidden"
          style={{ fontSize: "16px", maxHeight: "1.6cm" }}
        >
          {offer.productName}
        </div>

        {/* Detailed Arabic offer text — placed ABOVE the bottom box */}
        <div
          className="font-bold text-center leading-snug overflow-hidden border border-black/40 rounded-sm py-1 px-1.5 bg-white"
          style={{ fontSize: "12px", minHeight: "1.4cm" }}
        >
          {arabicOffer}
        </div>

        {/* Item code — placed ABOVE the date */}
        <div className="flex justify-between text-[10px] font-semibold mt-auto">
          <span>كود الصنف:</span>
          <span className="font-mono">{effectiveCode || "—"}</span>
        </div>

        {/* Dates row */}
        <div className="flex justify-between text-[9px] border-t border-black/40 pt-1">
          <div>
            <div className="font-bold">من:</div>
            <div>{formatDate(startDate)}</div>
          </div>
          <div className="text-left">
            <div className="font-bold">إلى:</div>
            <div>{formatDate(endDate)}</div>
          </div>
        </div>

        {/* Bottom box: was the discount/price box — now shows Arabic offer summary in big */}
        <div className="border-2 border-black rounded-sm py-1.5 px-2 text-center bg-black text-white">
          {offer.offerType === "discount" ? (
            <div className="font-black leading-none" style={{ fontSize: "32px" }}>
              {offer.discount}<span style={{ fontSize: "18px" }}>٪</span>
              <div className="text-[10px] font-bold mt-1">خصم</div>
            </div>
          ) : offer.offerType === "first_piece_discount" ? (
            <div className="font-black leading-none" style={{ fontSize: "30px" }}>
              {offer.discount}<span style={{ fontSize: "16px" }}>٪</span>
              <div className="text-[10px] font-bold mt-1">على الحبة الأولى</div>
            </div>
          ) : offer.offerType === "second_piece_discount" ? (
            <div className="font-black leading-none" style={{ fontSize: "30px" }}>
              {offer.discount}<span style={{ fontSize: "16px" }}>٪</span>
              <div className="text-[10px] font-bold mt-1">على الحبة الثانية</div>
            </div>
          ) : offer.offerType === "bundle" ? (
            offer.buyQty && offer.getQty ? (
              <div className="font-black leading-none" style={{ fontSize: "26px" }}>
                {offer.buyQty}+{offer.getQty}
                <div className="text-[10px] font-bold mt-1">اشترِ {offer.buyQty} واحصل على {offer.getQty}</div>
              </div>
            ) : offer.price > 0 ? (
              <div className="font-black leading-none" style={{ fontSize: "26px" }}>
                {offer.price}<span style={{ fontSize: "12px" }}> ر.س</span>
                <div className="text-[10px] font-bold mt-1">{offer.quantity > 1 ? `${offer.quantity} حبات` : "حبة"}</div>
              </div>
            ) : (
              <div className="font-bold text-xs">{offer.text || "عرض خاص"}</div>
            )
          ) : offer.offerType === "gift" ? (
            <div className="font-black leading-none" style={{ fontSize: "20px" }}>
              {offer.quantity > 1 ? `${offer.quantity}+1` : "1+1"}
              <div className="text-[10px] font-bold mt-1">هدية مجانية</div>
            </div>
          ) : (
            <div className="font-bold text-xs">{offer.text || "عرض خاص"}</div>
          )}
        </div>
      </div>
    </div>
  );
}
