import { useEffect, useRef, useState } from "react";
import type { Offer } from "@/types/offer";
import { cn } from "@/lib/utils";

interface OfferCardProps {
  offer: Offer;
  printMode?: boolean;
  onClick?: () => void;
  selected?: boolean;
}

// Color rules: direct discount = red, second piece = yellow, bundle = green, free/gift = blue
const typeStyles: Record<Offer["offerType"], { band: string; accent: string; label: string }> = {
  gift:                   { band: "bg-[hsl(var(--info))] text-[hsl(var(--info-foreground))]", accent: "text-[hsl(var(--info))]", label: "هدية مجانية" },
  discount:               { band: "bg-[hsl(var(--destructive))] text-[hsl(var(--destructive-foreground))]", accent: "text-[hsl(var(--destructive))]", label: "خصم خاص" },
  first_piece_discount:   { band: "bg-[hsl(var(--destructive))] text-[hsl(var(--destructive-foreground))]", accent: "text-[hsl(var(--destructive))]", label: "خصم على الحبة الأولى" },
  second_piece_discount:  { band: "bg-[hsl(var(--warning))] text-[hsl(var(--warning-foreground))]", accent: "text-[hsl(var(--warning))]", label: "خصم على الحبة الثانية" },
  bundle:                 { band: "bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))]", accent: "text-[hsl(var(--success))]", label: "عرض الباندل" },
  custom:                 { band: "bg-primary text-primary-foreground", accent: "text-primary", label: "عرض" },
};

function formatDate(d?: string): string {
  if (!d) return "";
  if (d === "2026") return "2026";
  try {
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return d;
    return dt.toLocaleDateString("ar-SA-u-ca-gregory", { year: "numeric", month: "2-digit", day: "2-digit" });
  } catch { return d; }
}

/** Auto-shrinks text to fit container height. */
function useAutoFit<T extends HTMLElement>(deps: any[], min = 10, max = 32) {
  const ref = useRef<T | null>(null);
  const [size, setSize] = useState(max);
  useEffect(() => {
    if (!ref.current) return;
    const el = ref.current;
    let s = max;
    el.style.fontSize = `${s}px`;
    while ((el.scrollHeight > el.clientHeight || el.scrollWidth > el.clientWidth) && s > min) {
      s -= 1;
      el.style.fontSize = `${s}px`;
    }
    setSize(s);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return { ref, size };
}

export function OfferCard({ offer, printMode, onClick, selected }: OfferCardProps) {
  const styles = typeStyles[offer.offerType];
  const nameFit = useAutoFit<HTMLDivElement>([offer.productName], 14, 30);
  const textFit = useAutoFit<HTMLDivElement>([offer.text], 11, 22);

  return (
    <div
      onClick={onClick}
      className={cn(
        printMode ? "print-card" : "preview-card",
        "relative rounded-lg overflow-hidden bg-card text-card-foreground border-2 flex flex-col",
        selected ? "border-primary ring-4 ring-primary/30" : "border-border",
        !printMode && "cursor-pointer transition-shadow hover:shadow-lg",
      )}
      dir="rtl"
    >
      {/* Top empty area — 4.5cm — for product placement on shelf */}
      <div className="relative bg-gradient-to-br from-muted/30 to-background" style={{ height: "4.5cm" }}>
        {offer.image ? (
          <img src={offer.image} alt={offer.productName} className="w-full h-full object-contain p-2" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/30 text-[10px]">
            مساحة المنتج
          </div>
        )}
        <div className={cn("absolute top-0 inset-x-0 h-1.5", styles.band.split(" ")[0])} />
      </div>

      {/* Content area — 8cm */}
      <div className="flex-1 flex flex-col p-2" style={{ height: "8cm" }}>
        {/* Type badge */}
        <div className={cn("self-start px-2 py-0.5 rounded-full text-[10px] font-bold mb-1", styles.band)}>
          {styles.label}
        </div>

        {/* Product name — auto-fit, ~1.6cm */}
        <div
          ref={nameFit.ref}
          className="font-extrabold leading-tight text-foreground overflow-hidden text-center"
          style={{ height: "1.6cm", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}
        >
          {offer.productName}
        </div>

        {/* Offer text — ~1.4cm */}
        <div
          ref={textFit.ref}
          className={cn("font-semibold mt-1 text-center overflow-hidden", styles.accent)}
          style={{ height: "1.4cm" }}
        >
          {offer.text}
        </div>

        {/* Price block — fills remainder */}
        <div className={cn("mt-auto rounded-md flex flex-col items-center justify-center py-2", styles.band)}>
          {offer.offerType === "discount" ? (
            <>
              <div className="text-[10px] font-bold opacity-90">خصم</div>
              <div className="font-black leading-none" style={{ fontSize: "48px" }}>
                {offer.discount}<span style={{ fontSize: "24px" }}>%</span>
              </div>
            </>
          ) : offer.offerType === "first_piece_discount" ? (
            <>
              <div className="text-[10px] font-bold opacity-90">خصم على الحبة الأولى</div>
              <div className="font-black leading-none" style={{ fontSize: "44px" }}>
                {offer.discount}<span style={{ fontSize: "22px" }}>%</span>
              </div>
            </>
          ) : offer.offerType === "second_piece_discount" ? (
            <>
              <div className="text-[10px] font-bold opacity-90">خصم على الحبة الثانية</div>
              <div className="font-black leading-none" style={{ fontSize: "44px" }}>
                {offer.discount}<span style={{ fontSize: "22px" }}>%</span>
              </div>
            </>
          ) : offer.offerType === "gift" ? (
            <>
              <div className="text-[11px] font-bold opacity-90">{offer.quantity > 1 ? `${offer.quantity} +` : "1 +"}</div>
              <div className="font-black leading-none" style={{ fontSize: "32px" }}>1 مجاناً</div>
            </>
          ) : offer.offerType === "bundle" ? (
            offer.buyQty && offer.getQty ? (
              <>
                <div className="text-[11px] font-bold opacity-90">اشترِ {offer.buyQty} واحصل على</div>
                <div className="font-black leading-none" style={{ fontSize: "32px" }}>{offer.getQty} مجاناً</div>
              </>
            ) : offer.price > 0 ? (
              <>
                <div className="text-[11px] font-bold opacity-90">{offer.quantity > 1 ? `${offer.quantity} حبات` : "حبة واحدة"} بـ</div>
                <div className="font-black leading-none flex items-baseline gap-1" style={{ fontSize: "44px" }}>
                  {offer.price}
                  <span style={{ fontSize: "16px" }}>ر.س</span>
                </div>
              </>
            ) : (
              <div className="font-bold text-sm px-2 text-center">{offer.text || "عرض خاص"}</div>
            )
          ) : (
            <div className="font-bold text-sm px-2 text-center">{offer.text || "عرض خاص"}</div>
          )}
        </div>

        {/* SKU + dates footer */}
        {(offer.itemCode || offer.startDate || offer.endDate) && (
          <div className="mt-1 flex items-center justify-between text-[9px] text-muted-foreground border-t border-border/60 pt-1">
            <span className="font-mono">{offer.itemCode || ""}</span>
            <span>
              {formatDate(offer.startDate)}
              {(offer.startDate || offer.endDate) && " — "}
              {formatDate(offer.endDate)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
