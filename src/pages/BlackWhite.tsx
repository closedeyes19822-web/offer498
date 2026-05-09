import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Undo2, Redo2, Trash2, Printer, ArrowLeftRight, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { useOfferHistory } from "@/hooks/useOfferHistory";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { parseOffer, speakOfferSummary } from "@/lib/offerParser";
import { VoiceOfferRecorder } from "@/components/VoiceOfferRecorder";
import { OfferPreviewGridBW } from "@/components/OfferPreviewGridBW";
import { OfferConfirmDialog } from "@/components/OfferConfirmDialog";
import { OfferEditor } from "@/components/OfferEditor";
import { AiOfferScanner } from "@/components/AiOfferScanner";
import type { Language, Offer } from "@/types/offer";

const BlackWhite = () => {
  const [language, setLanguage] = useState<Language>("ar");
  const { offers, addOffer, addOffers, updateOffer, removeOffer, clearAll, undo, redo } = useOfferHistory([]);
  const [pendingOffer, setPendingOffer] = useState<Offer | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Global offer settings applied to ALL cards
  const [startDate, setStartDate] = useState<string>("");
  const endDate = "2026";
  const [itemCode, setItemCode] = useState<string>("");
  const [setupOpen, setSetupOpen] = useState<boolean>(true);

  // Ask once at start of work session
  useEffect(() => {
    const saved = sessionStorage.getItem("bw-offer-settings");
    if (saved) {
      try {
        const s = JSON.parse(saved);
        setStartDate(s.startDate || "");
        setItemCode(s.itemCode || "");
        if (s.startDate || s.itemCode) setSetupOpen(false);
      } catch {/* ignore */}
    }
  }, []);

  const saveSettings = () => {
    sessionStorage.setItem(
      "bw-offer-settings",
      JSON.stringify({ startDate, itemCode }),
    );
    setSetupOpen(false);
    toast.success("تم حفظ بيانات العرض وستطبق على جميع الكروت");
  };

  const handleFinal = useCallback((text: string) => {
    if (!text.trim()) return;
    const parsed = parseOffer(text);
    setPendingOffer(parsed);
    speakOfferSummary(parsed, language);
  }, [language]);

  const sr = useSpeechRecognition({
    lang: language === "ar" ? "ar-SA" : "en-US",
    onFinal: handleFinal,
  });

  const confirmPending = () => {
    if (!pendingOffer) return;
    addOffer(pendingOffer);
    toast.success("تمت إضافة العرض");
    setPendingOffer(null);
  };

  const editPending = () => {
    if (!pendingOffer) return;
    addOffer(pendingOffer);
    setEditingId(pendingOffer.id);
    setPendingOffer(null);
  };

  const cancelPending = () => {
    setPendingOffer(null);
    if (typeof window !== "undefined") window.speechSynthesis?.cancel();
  };

  const editingOffer = offers.find((o) => o.id === editingId) || null;

  const handlePrint = () => {
    if (offers.length === 0) {
      toast.error("لا توجد عروض للطباعة");
      return;
    }
    window.print();
  };

  const handleClear = () => {
    if (offers.length === 0) return;
    clearAll();
    toast.success("تم مسح جميع العروض");
  };

  const totalPages = Math.max(1, Math.ceil(offers.length / 6));

  return (
    <div className="min-h-screen bg-white text-black" dir="rtl">
      {/* Toolbar */}
      <header className="no-print sticky top-0 z-40 bg-white border-b-2 border-black">
        <div className="container py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-none flex items-center justify-center bg-black text-white border-2 border-black">
              <Printer className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-extrabold leading-tight">
                عروض المتجر — أبيض وأسود
              </h1>
              <p className="text-[10px] sm:text-xs text-black/60">
                تصميم بدون ألوان — جاهز للطباعة الاقتصادية
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
            <Button asChild variant="outline" size="sm" className="gap-1 border-black text-black hover:bg-black hover:text-white">
              <Link to="/">
                <ArrowLeftRight className="h-4 w-4" /> <span className="hidden sm:inline">النسخة الملونة</span>
              </Link>
            </Button>
            <Button variant="outline" size="sm" onClick={() => setSetupOpen(true)} className="gap-1 border-black text-black hover:bg-black hover:text-white">
              <Settings2 className="h-4 w-4" /> <span className="hidden sm:inline">بيانات العرض</span>
            </Button>
            <Button variant="outline" size="sm" onClick={undo} className="gap-1 border-black text-black hover:bg-black hover:text-white">
              <Undo2 className="h-4 w-4" /> <span className="hidden sm:inline">تراجع</span>
            </Button>
            <Button variant="outline" size="sm" onClick={redo} className="gap-1 border-black text-black hover:bg-black hover:text-white">
              <Redo2 className="h-4 w-4" /> <span className="hidden sm:inline">إعادة</span>
            </Button>
            <Button variant="outline" size="sm" onClick={handleClear} className="gap-1 border-black text-black hover:bg-black hover:text-white">
              <Trash2 className="h-4 w-4" /> <span className="hidden sm:inline">مسح الكل</span>
            </Button>
            <Button size="sm" onClick={handlePrint} className="gap-1 bg-black text-white hover:bg-black/80">
              <Printer className="h-4 w-4" /> طباعة
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-4 sm:py-6">
        <div className="grid lg:grid-cols-[380px_1fr] gap-6">
          {/* Left: voice + scanner + summary */}
          <aside className="no-print space-y-4">
            <VoiceOfferRecorder
              listening={sr.listening}
              interim={sr.interim}
              supported={sr.supported}
              language={language}
              onToggle={sr.toggle}
              onLanguageChange={setLanguage}
            />

            <AiOfferScanner language={language} onOffersDetected={addOffers} />

            {/* Current global settings preview */}
            <div className="rounded-none border-2 border-black bg-white p-4">
              <h3 className="font-bold mb-2 flex items-center justify-between">
                بيانات العرض المطبقة
                <button
                  onClick={() => setSetupOpen(true)}
                  className="text-xs underline font-normal"
                >
                  تعديل
                </button>
              </h3>
              <div className="text-xs space-y-1">
                <div className="flex justify-between"><span>من:</span><span className="font-mono">{startDate || "—"}</span></div>
                <div className="flex justify-between"><span>إلى:</span><span className="font-mono">{endDate || "—"}</span></div>
                <div className="flex justify-between"><span>كود الصنف:</span><span className="font-mono">{itemCode || "—"}</span></div>
              </div>
            </div>

            <div className="rounded-none border-2 border-black bg-white p-4">
              <h3 className="font-bold mb-2">إحصائيات</h3>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="border border-black p-2">
                  <div className="text-2xl font-extrabold">{offers.length}</div>
                  <div className="text-[10px]">عروض</div>
                </div>
                <div className="border border-black p-2">
                  <div className="text-2xl font-extrabold">{totalPages}</div>
                  <div className="text-[10px]">صفحات</div>
                </div>
                <div className="border border-black p-2">
                  <div className="text-2xl font-extrabold">6</div>
                  <div className="text-[10px]">بطاقة/صفحة</div>
                </div>
              </div>
            </div>
          </aside>

          {/* Right: Preview */}
          <section>
            <div className="no-print mb-3 flex items-center justify-between">
              <h2 className="font-bold text-lg">معاينة الطباعة (أبيض وأسود)</h2>
              <span className="text-xs text-black/60">{offers.length} عرض · {totalPages} صفحة</span>
            </div>

            {offers.length === 0 && (
              <div className="no-print border-2 border-dashed border-black p-12 text-center bg-white">
                <Printer className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p className="font-semibold">لا توجد عروض بعد</p>
                <p className="text-sm">اضغط زر التسجيل وقل العرض</p>
              </div>
            )}

            <div className="print-area">
              <OfferPreviewGridBW
                offers={offers}
                startDate={startDate}
                endDate={endDate}
                itemCode={itemCode}
                selectedId={selectedId}
                onSelect={(id) => { setSelectedId(id); setEditingId(id); }}
              />
            </div>
          </section>
        </div>
      </main>

      {/* Setup dialog — asked at start of work */}
      <Dialog open={setupOpen} onOpenChange={setSetupOpen}>
        <DialogContent dir="rtl" className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>بيانات العرض</DialogTitle>
            <DialogDescription>
              هذه البيانات ستطبق على جميع كروت العروض في هذه الجلسة.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <Label htmlFor="bw-start">تاريخ بداية العروض</Label>
              <Input id="bw-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="rounded border border-black/20 p-2 bg-black/5">
              <div className="text-xs text-black/70">تاريخ نهاية العروض</div>
              <div className="font-bold text-sm">2026</div>
            </div>
            <div>
              <Label htmlFor="bw-code">كود الصنف (افتراضي)</Label>
              <Input id="bw-code" placeholder="مثال: 12345" value={itemCode} onChange={(e) => setItemCode(e.target.value)} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSetupOpen(false)}>لاحقاً</Button>
            <Button onClick={saveSettings} className="bg-black text-white hover:bg-black/80">حفظ وتطبيق</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <OfferConfirmDialog
        offer={pendingOffer}
        onConfirm={confirmPending}
        onEdit={editPending}
        onCancel={cancelPending}
      />

      <OfferEditor
        offer={editingOffer}
        onClose={() => setEditingId(null)}
        onUpdate={updateOffer}
        onDelete={removeOffer}
      />
    </div>
  );
};

export default BlackWhite;
