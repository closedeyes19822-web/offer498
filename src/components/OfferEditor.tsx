import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Upload } from "lucide-react";
import type { Offer, OfferType } from "@/types/offer";
import { useRef } from "react";

interface Props {
  offer: Offer | null;
  onClose: () => void;
  onUpdate: (id: string, patch: Partial<Offer>) => void;
  onDelete: (id: string) => void;
}

export function OfferEditor({ offer, onClose, onUpdate, onDelete }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);

  if (!offer) return null;

  const update = (patch: Partial<Offer>) => onUpdate(offer.id, patch);

  const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => update({ image: reader.result as string });
    reader.readAsDataURL(f);
  };

  return (
    <Sheet open={!!offer} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="left" className="w-full sm:max-w-md overflow-y-auto" dir="rtl">
        <SheetHeader>
          <SheetTitle>تعديل العرض</SheetTitle>
        </SheetHeader>

        <div className="space-y-4 mt-6">
          <div>
            <Label>اسم المنتج</Label>
            <Input value={offer.productName} onChange={(e) => update({ productName: e.target.value })} />
          </div>

          <div>
            <Label>نوع العرض</Label>
            <Select value={offer.offerType} onValueChange={(v: OfferType) => update({ offerType: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="bundle">عرض سعر (Bundle)</SelectItem>
                <SelectItem value="gift">هدية (Gift)</SelectItem>
                <SelectItem value="discount">خصم (Discount)</SelectItem>
                <SelectItem value="custom">مخصص</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>الكمية</Label>
              <Input type="number" min={1} value={offer.quantity} onChange={(e) => update({ quantity: parseInt(e.target.value) || 1 })} />
            </div>
            <div>
              <Label>{offer.offerType === "discount" ? "نسبة الخصم %" : "السعر"}</Label>
              <Input
                type="number"
                min={0}
                value={offer.offerType === "discount" ? offer.discount : offer.price}
                onChange={(e) =>
                  update(offer.offerType === "discount"
                    ? { discount: parseFloat(e.target.value) || 0 }
                    : { price: parseFloat(e.target.value) || 0 })
                }
              />
            </div>
          </div>

          <div>
            <Label>نص العرض</Label>
            <Textarea value={offer.text} onChange={(e) => update({ text: e.target.value })} rows={2} />
          </div>

          <div>
            <Label>صورة المنتج (اختياري)</Label>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleImage} />
            <div className="flex gap-2 mt-1">
              <Button type="button" variant="outline" className="gap-2" onClick={() => fileRef.current?.click()}>
                <Upload className="h-4 w-4" /> رفع صورة
              </Button>
              {offer.image && (
                <Button type="button" variant="ghost" onClick={() => update({ image: undefined })}>
                  إزالة
                </Button>
              )}
            </div>
            {offer.image && <img src={offer.image} alt="" className="mt-2 h-24 object-contain rounded border" />}
          </div>

          <div className="pt-4 border-t flex gap-2">
            <Button variant="destructive" className="gap-2 flex-1" onClick={() => { onDelete(offer.id); onClose(); }}>
              <Trash2 className="h-4 w-4" /> حذف العرض
            </Button>
            <Button className="flex-1" onClick={onClose}>تم</Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
