import { useRef, useState } from "react";
import { Camera, Upload, FileSpreadsheet, Loader2, ScanLine, Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import * as XLSX from "xlsx";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { prepareImageForAI } from "@/lib/imagePrep";
import { normalizeDetected, dedupeOffers, extractItemCode } from "@/lib/normalizeOffer";
import type { Language, Offer, OfferType } from "@/types/offer";

interface Props {
  language: Language;
  onOffersDetected: (offers: Offer[]) => void;
}


type DetectedOffer = {
  productName: string;
  offerType: OfferType;
  quantity: number;
  buyQty?: number;
  getQty?: number;
  price: number;
  discount: number;
  text: string;
  startDate?: string;
  endDate?: string;
  itemCode?: string;
};

const MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

function parseShortDate(raw: any, year = 2026): string {
  if (raw === null || raw === undefined || raw === "") return "";
  // Excel serial number
  if (typeof raw === "number") {
    const d = new Date(Math.round((raw - 25569) * 86400 * 1000));
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  }
  const s = String(raw).trim();
  // "10-May" or "10 May" or "10-May-2026"
  let m = s.match(/^(\d{1,2})[\-\s]([A-Za-z]+)(?:[\-\s](\d{2,4}))?$/);
  if (m) {
    const day = String(m[1]).padStart(2, "0");
    const mo = MONTHS[m[2].slice(0, 3).toLowerCase()];
    if (mo !== undefined) {
      const y = m[3] ? (m[3].length === 2 ? 2000 + +m[3] : +m[3]) : year;
      return `${y}-${String(mo + 1).padStart(2, "0")}-${day}`;
    }
  }
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return s;
}

function parseOfferText(text: string): Partial<DetectedOffer> {
  const s = String(text || "").trim();
  if (!s) return { offerType: "custom" };
  let m = s.match(/(\d+(?:\.\d+)?)\s*%\s*2nd/i);
  if (m) return { offerType: "second_piece_discount", discount: parseFloat(m[1]), text: s };
  m = s.match(/(\d+(?:\.\d+)?)\s*%\s*1st/i);
  if (m) return { offerType: "first_piece_discount", discount: parseFloat(m[1]), text: s };
  m = s.match(/^\s*(\d+)\s*\+\s*(\d+)\s*$/);
  if (m) return { offerType: "bundle", buyQty: +m[1], getQty: +m[2], text: s };
  m = s.match(/(\d+)\s*pcs?\s*for\s*(\d+(?:\.\d+)?)/i);
  if (m) return { offerType: "bundle", quantity: +m[1], price: parseFloat(m[2]), text: s };
  m = s.match(/(\d+(?:\.\d+)?)\s*%/);
  if (m) return { offerType: "discount", discount: parseFloat(m[1]), text: s };
  return { offerType: "custom", text: s };
}

const t = (lang: Language, ar: string, en: string) => (lang === "ar" ? ar : en);

export function AiOfferScanner({ language, onOffersDetected }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [transcript, setTranscript] = useState("");
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const excelRef = useRef<HTMLInputElement>(null);

  const analyzeTranscript = async (text: string) => {
    if (!text.trim()) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-offer-image", {
        body: { transcript: text },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const offers: Offer[] = (data?.offers || []).map(buildOffer);
      if (offers.length === 0) {
        toast.error(t(language, "لم يتم اكتشاف عروض", "No offers detected"));
        return;
      }
      onOffersDetected(offers);
      toast.success(
        t(language, `تم اكتشاف ${offers.length} عرض`, `${offers.length} offer(s) detected`)
      );
      setTranscript("");
      setOpen(false);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || t(language, "فشل التحليل", "Analysis failed"));
    } finally {
      setLoading(false);
    }
  };

  const speech = useSpeechRecognition({
    lang: language === "ar" ? "ar-SA" : "en-US",
    onFinal: (text) => {
      setTranscript((prev) => (prev ? prev + " " + text : text));
    },
  });

  const fileToDataUrl = (f: File) =>
    new Promise<string>((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result as string);
      r.onerror = rej;
      r.readAsDataURL(f);
    });

  const buildOffer = (d: Partial<DetectedOffer>): Offer => ({
    id: crypto.randomUUID(),
    productName: d.productName || "منتج",
    offerType: (d.offerType as OfferType) || "custom",
    quantity: Number(d.quantity) || 1,
    buyQty: d.buyQty ? Number(d.buyQty) : undefined,
    getQty: d.getQty ? Number(d.getQty) : undefined,
    price: Number(d.price) || 0,
    discount: Number(d.discount) || 0,
    text: d.text || "",
    startDate: d.startDate || undefined,
    endDate: d.endDate || undefined,
    itemCode: d.itemCode || undefined,
    createdAt: Date.now(),
  });

  const handleImage = async (file: File) => {
    setLoading(true);
    try {
      const imageBase64 = await fileToDataUrl(file);
      const { data, error } = await supabase.functions.invoke("analyze-offer-image", {
        body: { imageBase64 },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const offers: Offer[] = (data?.offers || []).map(buildOffer);
      if (offers.length === 0) {
        toast.error(t(language, "لم يتم اكتشاف عروض", "No offers detected"));
        return;
      }
      onOffersDetected(offers);
      toast.success(
        t(language, `تم اكتشاف ${offers.length} عرض`, `${offers.length} offer(s) detected`)
      );
      setOpen(false);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || t(language, "فشل التحليل", "Analysis failed"));
    } finally {
      setLoading(false);
    }
  };

  const handleExcel = async (file: File) => {
    setLoading(true);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      // Aggregate rows from ALL sheets in the workbook
      const rows: any[] = [];
      for (const sheetName of wb.SheetNames) {
        const sheet = wb.Sheets[sheetName];
        if (!sheet) continue;
        const sheetRows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });
        for (const r of sheetRows) rows.push({ __sheet: sheetName, ...r });
      }

      const norm = (s: string) => String(s || "").toLowerCase().trim();
      const seen = new Set<string>();
      const offers: Offer[] = rows
        .map((row) => {
          const keys = Object.keys(row);
          const get = (...names: string[]) => {
            for (const n of names) {
              const k = keys.find((kk) => norm(kk) === norm(n));
              if (k && row[k] !== "") return row[k];
            }
            return "";
          };
          // Supports both offer sheets and SAP inventory exports
          // (Plant | Item Number | Description | Quantity)
          const productName = String(
            get(
              "productName", "product", "اسم المنتج", "المنتج", "name",
              "description", "desc", "الوصف", "البيان", "اسم الصنف"
            ) || ""
          ).trim();
          if (!productName) return null;
          // Skip duplicate product names within the same import
          const dedupKey = productName.toLowerCase().replace(/\s+/g, " ");
          if (seen.has(dedupKey)) return null;
          seen.add(dedupKey);
          const rawType = norm(String(get("offerType", "type", "نوع العرض", "النوع")));
          let offerType: OfferType = "custom";
          if (["gift", "هدية"].includes(rawType)) offerType = "gift";
          else if (["bundle", "عرض", "سعر"].includes(rawType)) offerType = "bundle";
          else if (["first_piece_discount", "first piece", "الحبة الأولى", "حبة اولى", "خصم حبة اولى"].some((s) => rawType.includes(norm(s))))
            offerType = "first_piece_discount";
          else if (["second_piece_discount", "second piece", "الحبة الثانية", "حبة ثانية", "خصم حبة ثانية"].some((s) => rawType.includes(norm(s))))
            offerType = "second_piece_discount";
          else if (["discount", "خصم"].includes(rawType)) offerType = "discount";

          let price = Number(get("price", "السعر", "سعر")) || 0;
          let quantity = Number(get("quantity", "qty", "الكمية", "كمية")) || 1;
          let discount = Number(get("discount", "الخصم", "نسبة الخصم")) || 0;
          let buyQty = Number(get("buyQty", "buy", "اشتري", "اشترِ")) || undefined;
          let getQty = Number(get("getQty", "get", "مجاناً", "مجانا", "هدية كمية")) || undefined;

          // Parse free-form Offer column (e.g. "25%", "70% 2nd PCS", "2+1", "3pcs FOR 275")
          const offerCell = String(get("offer", "العرض", "نص العرض") || "").trim();
          if (offerCell) {
            const parsed = parseOfferText(offerCell);
            if (offerType === "custom" && parsed.offerType) offerType = parsed.offerType;
            if (!discount && parsed.discount) discount = parsed.discount;
            if (!buyQty && parsed.buyQty) buyQty = parsed.buyQty;
            if (!getQty && parsed.getQty) getQty = parsed.getQty;
            if (!price && parsed.price) price = parsed.price;
            if (parsed.quantity && quantity === 1) quantity = parsed.quantity;
          }

          if (offerType === "custom") {
            if (discount > 0) offerType = "discount";
            else if (buyQty && getQty) offerType = "bundle";
            else if (price > 0 && quantity > 1) offerType = "bundle";
          }
          const text = String(get("text", "نص العرض") || offerCell || "").trim();

          // Per-item dates and item code — extract 6-digit code only
          const rawCode = String(get("itemCode", "item number", "item no", "item code", "كود الصنف", "كود", "رقم الصنف") || "").trim();
          const sixMatch = rawCode.match(/\d{6}/);
          const itemCode = sixMatch ? sixMatch[0] : rawCode;
          const startDate = parseShortDate(get("from", "start", "startDate", "تاريخ البداية", "بداية", "من"));
          const endDate = parseShortDate(get("to", "end", "endDate", "تاريخ النهاية", "نهاية", "إلى", "الى"));

          return buildOffer({ productName, offerType, quantity, buyQty, getQty, price, discount, text, startDate, endDate, itemCode });
        })
        .filter(Boolean) as Offer[];

      if (offers.length === 0) {
        toast.error(
          t(language, "لم يتم العثور على عروض في الملف", "No offers found in file")
        );
        return;
      }
      onOffersDetected(offers);
      const sheetCount = wb.SheetNames.length;
      toast.success(
        t(
          language,
          `تم استيراد ${offers.length} عرض من ${sheetCount} ورقة`,
          `Imported ${offers.length} offer(s) from ${sheetCount} sheet(s)`
        )
      );
      setOpen(false);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || t(language, "فشل قراءة الملف", "Failed to read file"));
    } finally {
      setLoading(false);
    }
  };

  const onFile = (e: React.ChangeEvent<HTMLInputElement>, kind: "image" | "excel") => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (kind === "image") handleImage(f);
    else handleExcel(f);
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="w-full gap-2 h-11 font-bold"
        onClick={() => setOpen(true)}
      >
        <ScanLine className="h-5 w-5 text-primary" />
        {t(language, "كاميرا AI / استيراد", "AI Camera / Import")}
      </Button>

      <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => onFile(e, "image")} />
      <input ref={galleryRef} type="file" accept="image/*" hidden onChange={(e) => onFile(e, "image")} />
      <input ref={excelRef} type="file" accept=".xlsx,.xls,.csv" hidden onChange={(e) => onFile(e, "excel")} />

      <Dialog open={open} onOpenChange={(o) => !loading && setOpen(o)}>
        <DialogContent dir={language === "ar" ? "rtl" : "ltr"} className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ScanLine className="h-5 w-5 text-primary" />
              {t(language, "اكتشاف العروض بالذكاء الاصطناعي", "AI Offer Detection")}
            </DialogTitle>
            <DialogDescription>
              {t(
                language,
                "صوّر العرض، ارفع صورة، أو حمّل ملف Excel.",
                "Snap a photo, upload an image, or import an Excel file."
              )}
            </DialogDescription>
          </DialogHeader>

          {loading ? (
            <div className="py-10 flex flex-col items-center gap-3 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm font-medium">
                {t(language, "جاري التحليل بالذكاء الاصطناعي...", "Analyzing with AI...")}
              </p>
            </div>
          ) : (
            <div className="grid gap-3 py-2">
              <Button
                size="lg"
                className="h-16 justify-start gap-3 text-primary-foreground"
                style={{ background: "var(--gradient-primary)" }}
                onClick={() => cameraRef.current?.click()}
              >
                <Camera className="h-6 w-6" />
                <div className="text-start">
                  <div className="font-bold">
                    {t(language, "التقط بالكاميرا", "Take Photo")}
                  </div>
                  <div className="text-xs opacity-90">
                    {t(language, "صوّر إعلان أو منتج", "Snap an ad or product")}
                  </div>
                </div>
              </Button>

              <Button
                size="lg"
                variant="outline"
                className="h-16 justify-start gap-3"
                onClick={() => galleryRef.current?.click()}
              >
                <Upload className="h-6 w-6 text-[hsl(var(--info))]" />
                <div className="text-start">
                  <div className="font-bold">
                    {t(language, "رفع صورة", "Upload Image")}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {t(language, "من المعرض", "From gallery")}
                  </div>
                </div>
              </Button>

              <Button
                size="lg"
                variant="outline"
                className="h-16 justify-start gap-3"
                onClick={() => excelRef.current?.click()}
              >
                <FileSpreadsheet className="h-6 w-6 text-[hsl(var(--success))]" />
                <div className="text-start">
                  <div className="font-bold">
                    {t(language, "تحليل ملف Excel", "Analyze Excel")}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {t(language, "أعمدة: المنتج, السعر, النوع...", "Columns: product, price, type...")}
                  </div>
                </div>
              </Button>

              {/* Mic / voice */}
              <div className="rounded-md border-2 border-dashed border-primary/40 p-3 space-y-2 bg-muted/30">
                <div className="flex items-center gap-2">
                  <Button
                    size="lg"
                    type="button"
                    variant={speech.listening ? "destructive" : "default"}
                    className="h-12 flex-1 gap-2"
                    disabled={!speech.supported}
                    onClick={speech.toggle}
                  >
                    {speech.listening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                    {speech.listening
                      ? t(language, "إيقاف الاستماع", "Stop Listening")
                      : t(language, "تحدث بالعرض", "Speak Offer")}
                  </Button>
                  <Button
                    size="lg"
                    type="button"
                    variant="secondary"
                    className="h-12"
                    disabled={!transcript.trim()}
                    onClick={() => analyzeTranscript(transcript)}
                  >
                    {t(language, "تحليل", "Analyze")}
                  </Button>
                </div>
                {!speech.supported && (
                  <p className="text-[11px] text-destructive">
                    {t(language, "المتصفح لا يدعم التعرف على الصوت", "Speech recognition not supported")}
                  </p>
                )}
                <textarea
                  value={transcript + (speech.interim ? " " + speech.interim : "")}
                  onChange={(e) => setTranscript(e.target.value)}
                  dir={language === "ar" ? "rtl" : "ltr"}
                  placeholder={t(
                    language,
                    'مثال: "خصم 25% على الحبة الأولى من شامبو هيد آند شولدرز" أو "الحبتين عليهم حبة"',
                    'e.g. "25% off first piece of shampoo" or "buy 2 get 1 free"'
                  )}
                  className="w-full min-h-[60px] text-sm rounded-md border border-input bg-background p-2 focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <p className="text-[10px] text-muted-foreground">
                  {t(
                    language,
                    "يدعم: خصم 5–95% على الحبة الأولى/الثانية، الحبة على حبة، الحبتين عليهم حبة، 3+1، 4+1، 2+2",
                    "Supports: 5–95% off first/second piece, 1+1, 2+1, 3+1, 4+1, 2+2"
                  )}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
