import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, X, Pencil } from "lucide-react";
import { OfferCard } from "./OfferCard";
import type { Offer } from "@/types/offer";

interface Props {
  offer: Offer | null;
  onConfirm: () => void;
  onEdit: () => void;
  onCancel: () => void;
}

export function OfferConfirmDialog({ offer, onConfirm, onEdit, onCancel }: Props) {
  return (
    <Dialog open={!!offer} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle>تأكيد العرض</DialogTitle>
        </DialogHeader>
        {offer && (
          <div className="flex justify-center py-2 overflow-hidden">
            <div style={{ transform: "scale(0.6)", transformOrigin: "top center", height: "8cm" }}>
              <OfferCard offer={offer} />
            </div>
          </div>
        )}
        <DialogFooter className="flex-row justify-center gap-2 sm:justify-center">
          <Button onClick={onConfirm} className="gap-2 bg-[hsl(var(--success))] hover:bg-[hsl(var(--success))]/90 text-[hsl(var(--success-foreground))]">
            <Check className="h-4 w-4" /> تأكيد
          </Button>
          <Button variant="outline" onClick={onEdit} className="gap-2">
            <Pencil className="h-4 w-4" /> تعديل
          </Button>
          <Button variant="destructive" onClick={onCancel} className="gap-2">
            <X className="h-4 w-4" /> إلغاء
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
