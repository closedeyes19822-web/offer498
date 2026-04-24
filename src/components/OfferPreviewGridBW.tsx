import type { Offer } from "@/types/offer";
import { OfferCardBW } from "./OfferCardBW";
import { usePreviewScale } from "@/hooks/usePreviewScale";

interface Props {
  offers: Offer[];
  startDate?: string;
  endDate?: string;
  itemCode?: string;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
}

const SLOTS_PER_PAGE = 6;

function chunk<T>(arr: T[], size: number): T[][] {
  if (arr.length === 0) return [[]];
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/** Remove duplicate product names within the SAME page (sheet). */
function dedupeAcrossPages(offers: Offer[], slotsPerPage: number): Offer[] {
  const result: Offer[] = [];
  let pageSeen = new Set<string>();
  for (const o of offers) {
    const key = (o.productName || "").trim().toLowerCase().replace(/\s+/g, " ");
    if (key && pageSeen.has(key)) continue; // skip duplicate on same page
    result.push(o);
    pageSeen.add(key);
    if (result.length % slotsPerPage === 0) pageSeen = new Set<string>();
  }
  return result;
}

export function OfferPreviewGridBW({ offers, startDate, endDate, itemCode, selectedId, onSelect }: Props) {
  const deduped = dedupeAcrossPages(offers, SLOTS_PER_PAGE);
  const pages = chunk(deduped, SLOTS_PER_PAGE);
  const scale = usePreviewScale();

  return (
    <div className="flex flex-col items-center gap-6 py-4">
      {pages.map((pageOffers, pIdx) => (
        <div key={pIdx} className="print-page-wrap preview-scale-wrap" style={{ ["--preview-scale" as any]: scale }}>
          <div className="preview-grid" style={{ marginTop: "1cm" }}>
            {Array.from({ length: SLOTS_PER_PAGE }).map((_, i) => {
              const offer = pageOffers[i];
              if (!offer) {
                return (
                  <div
                    key={i}
                    className="preview-card rounded-none border-2 border-dashed border-black/40 flex items-center justify-center text-black/40 text-xs bg-white"
                  >
                    فارغ
                  </div>
                );
              }
              return (
                <OfferCardBW
                  key={offer.id}
                  offer={offer}
                  startDate={startDate}
                  endDate={endDate}
                  itemCode={itemCode}
                  selected={selectedId === offer.id}
                  onClick={() => onSelect?.(offer.id)}
                />
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
