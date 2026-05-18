import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";
import QRCode from "qrcode";
import type { Offer } from "@/types/offer";
import { cn } from "@/lib/utils";

interface Props {
  offer: Offer;
  selected?: boolean;
  onClick?: () => void;
}

const MONTH_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function fmtEn(d?: string): string {
  if (!d) return "";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return d;
  return `${MONTH_EN[dt.getMonth()]} ${dt.getDate()}`;
}

function offerTitle(o: Offer): { ar: string; en: string } {
  switch (o.offerType) {
    case "second_piece_discount":
      return { ar: `خصم ${o.discount}% على الحبة الثانية`, en: `${o.discount}% off on 2nd` };
    case "first_piece_discount":
      return { ar: `خصم ${o.discount}% على الحبة الأولى`, en: `${o.discount}% off on 1st` };
    case "discount":
      return { ar: `خصم ${o.discount}%`, en: `${o.discount}% OFF` };
    case "gift":
      return { ar: `${o.quantity > 1 ? o.quantity : 1} + 1 مجاناً`, en: `${o.quantity > 1 ? o.quantity : 1} + 1 FREE` };
    case "bundle":
      if (o.buyQty && o.getQty) return { ar: `اشترِ ${o.buyQty} واحصل ${o.getQty} مجاناً`, en: `Buy ${o.buyQty} Get ${o.getQty} Free` };
      if (o.price > 0) return { ar: `${o.quantity || 2} بـ ${o.price} ر.س`, en: `${o.quantity || 2} for ${o.price} SAR` };
      return { ar: o.text || "عرض", en: "Special" };
    default:
      return { ar: o.text || "عرض", en: "Special" };
  }
}

export function SapOfferCard({ offer, selected, onClick }: Props) {
  const barcodeRef = useRef<SVGSVGElement | null>(null);
  const qrRef = useRef<HTMLCanvasElement | null>(null);
  const title = offerTitle(offer);
  const code = (offer.itemCode || "000000").toString();

  useEffect(() => {
    if (barcodeRef.current) {
      try {
        JsBarcode(barcodeRef.current, code, {
          format: "CODE128",
          displayValue: false,
          margin: 0,
          width: 1.4,
          height: 40,
          background: "transparent",
          lineColor: "#000",
        });
      } catch {}
    }
    if (qrRef.current) {
      QRCode.toCanvas(qrRef.current, code, { margin: 0, width: 60, color: { dark: "#000", light: "#fff" } }).catch(() => {});
    }
  }, [code]);

  return (
    <div
      onClick={onClick}
      dir="rtl"
      className={cn(
        "preview-card relative bg-white text-black border flex flex-col overflow-hidden cursor-pointer",
        selected ? "ring-4 ring-primary border-primary" : "border-gray-300",
      )}
    >
      {/* Top empty product placement area */}
      <div className="relative" style={{ height: "4.2cm" }}>
        {offer.image && (
          <img src={offer.image} alt={offer.productName} className="w-full h-full object-contain p-1" />
        )}
      </div>

      {/* Middle: green circle + vertical barcode */}
      <div className="relative flex items-start justify-between px-2" style={{ height: "2.8cm" }}>
        {/* Green discount circle */}
        <div
          className="flex flex-col items-center justify-center text-white font-extrabold text-center leading-tight shrink-0"
          style={{
            width: "2.6cm",
            height: "2.6cm",
            borderRadius: "50%",
            background: "hsl(145 70% 38%)",
            padding: "0.15cm",
          }}
        >
          {offer.offerType === "discount" || offer.offerType === "first_piece_discount" || offer.offerType === "second_piece_discount" ? (
            <>
              <div style={{ fontSize: "22px", lineHeight: 1 }}>
                {offer.discount}<span style={{ fontSize: "12px" }}>%</span>
              </div>
              <div style={{ fontSize: "7px" }} className="mt-0.5">
                {offer.offerType === "second_piece_discount" ? "الحبة الثانية" : offer.offerType === "first_piece_discount" ? "الحبة الأولى" : "خصم"}
              </div>
            </>
          ) : offer.offerType === "gift" ? (
            <>
              <div style={{ fontSize: "18px", lineHeight: 1 }}>+1</div>
              <div style={{ fontSize: "8px" }}>مجاناً</div>
            </>
          ) : offer.offerType === "bundle" && offer.buyQty && offer.getQty ? (
            <>
              <div style={{ fontSize: "16px", lineHeight: 1 }}>{offer.buyQty}+{offer.getQty}</div>
              <div style={{ fontSize: "7px" }}>عرض</div>
            </>
          ) : offer.price > 0 ? (
            <>
              <div style={{ fontSize: "18px", lineHeight: 1 }}>{offer.price}</div>
              <div style={{ fontSize: "7px" }}>ر.س</div>
            </>
          ) : (
            <div style={{ fontSize: "9px" }}>عرض</div>
          )}
        </div>

        {/* Vertical barcode */}
        <div className="flex flex-col items-center justify-center" style={{ width: "1.2cm" }}>
          <svg
            ref={barcodeRef}
            style={{ transform: "rotate(90deg)", transformOrigin: "center", width: "2.4cm", height: "1cm" }}
          />
        </div>
      </div>

      {/* Bottom: titles + dates + SKU + QR */}
      <div className="flex-1 flex flex-col px-2 pb-1.5">
        <div className="font-bold text-center leading-tight" style={{ fontSize: "11px" }}>
          {title.ar}
        </div>
        <div className="text-center font-semibold" style={{ fontSize: "9px", color: "hsl(145 70% 30%)" }}>
          {title.en}
        </div>

        <div className="text-center text-gray-500 mt-0.5" style={{ fontSize: "8px" }}>
          {fmtEn(offer.startDate)}{(offer.startDate || offer.endDate) && " – "}{fmtEn(offer.endDate)}
        </div>

        <div className="font-bold text-center uppercase mt-1 leading-tight" style={{ fontSize: "10px" }}>
          {offer.productName}
        </div>

        <div className="mt-auto flex items-end justify-between pt-1">
          <span className="font-mono text-gray-500" style={{ fontSize: "7px" }}>{code}</span>
          <canvas ref={qrRef} style={{ width: "1.4cm", height: "1.4cm" }} />
        </div>
      </div>
    </div>
  );
}
