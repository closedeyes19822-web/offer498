import type { Offer } from "@/types/offer";
import { OfferCard } from "./OfferCard";
import { cn } from "@/lib/utils";

interface Props {
  offers: Offer[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  printMode?: boolean;
}

const SLOTS_PER_PAGE = 6;

function chunk<T>(arr: T[], size: number): T[][] {
  if (arr.length === 0) return [[]];
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export function OfferPreviewGrid({ offers, selectedId, onSelect, printMode }: Props) {
  const pages = chunk(offers, SLOTS_PER_PAGE);

  return (
    <div className={cn("flex flex-col items-center gap-6", !printMode && "py-4")}>
      {pages.map((pageOffers, pIdx) => (
        <div key={pIdx} className={cn(printMode ? "print-page" : "")}>
          <div className={printMode ? "print-grid" : "preview-grid"}>
            {Array.from({ length: SLOTS_PER_PAGE }).map((_, i) => {
              const offer = pageOffers[i];
              if (!offer) {
                if (printMode) return <div key={i} />;
                return (
                  <div
                    key={i}
                    className="preview-card rounded-lg border-2 border-dashed border-border/60 flex items-center justify-center text-muted-foreground/50 text-xs bg-muted/20"
                  >
                    فارغ
                  </div>
                );
              }
              return (
                <OfferCard
                  key={offer.id}
                  offer={offer}
                  printMode={printMode}
                  selected={!printMode && selectedId === offer.id}
                  onClick={!printMode ? () => onSelect?.(offer.id) : undefined}
                />
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
