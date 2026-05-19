import { useCallback, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Undo2, Redo2, Trash2, Printer, Sparkles, FileText, FileDown } from "lucide-react";
import { exportPrintAreaToPdf } from "@/lib/exportPdf";
import { toast } from "sonner";
import { useOfferHistory } from "@/hooks/useOfferHistory";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { parseOffer, speakOfferSummary } from "@/lib/offerParser";
import { VoiceOfferRecorder } from "@/components/VoiceOfferRecorder";
import { OfferPreviewGrid } from "@/components/OfferPreviewGrid";
import { OfferConfirmDialog } from "@/components/OfferConfirmDialog";
import { OfferEditor } from "@/components/OfferEditor";
import { AiOfferScanner } from "@/components/AiOfferScanner";
import type { Language, Offer } from "@/types/offer";

const Index = () => {
  const [language, setLanguage] = useState<Language>("ar");
  const { offers, addOffer, addOffers, updateOffer, removeOffer, clearAll, undo, redo } = useOfferHistory([]);
  const [pendingOffer, setPendingOffer] = useState<Offer | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

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
    toast.success(language === "ar" ? "تمت إضافة العرض" : "Offer added");
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
      toast.error(language === "ar" ? "لا توجد عروض للطباعة" : "No offers to print");
      return;
    }
    window.print();
  };

  const handleExportPdf = async () => {
    if (offers.length === 0) {
      toast.error(language === "ar" ? "لا توجد عروض للتصدير" : "No offers to export");
      return;
    }
    const t = toast.loading(language === "ar" ? "جاري إنشاء PDF..." : "Generating PDF...");
    try {
      await exportPrintAreaToPdf(`offers-${Date.now()}.pdf`);
      toast.success(language === "ar" ? "تم تصدير PDF" : "PDF exported", { id: t });
    } catch (e) {
      toast.error(language === "ar" ? "فشل التصدير" : "Export failed", { id: t });
    }
  };

  const handleClear = () => {
    if (offers.length === 0) return;
    clearAll();
    toast.success(language === "ar" ? "تم مسح جميع العروض" : "All offers cleared");
  };

  const totalPages = Math.max(1, Math.ceil(offers.length / 6));

  return (
    <div className="min-h-screen bg-background" dir={language === "ar" ? "rtl" : "ltr"}>
      {/* Toolbar */}
      <header className="no-print sticky top-0 z-40 bg-card/95 backdrop-blur border-b shadow-sm">
        <div className="container py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg flex items-center justify-center text-primary-foreground" style={{ background: "var(--gradient-primary)" }}>
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-extrabold leading-tight">
                {language === "ar" ? "عروض المتجر الذكية" : "Smart Retail Offers"}
              </h1>
              <p className="text-[10px] sm:text-xs text-muted-foreground">
                {language === "ar" ? "تحويل الصوت إلى عروض مطبوعة" : "Voice to printed offers"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
            <Button asChild variant="outline" size="sm" className="gap-1">
              <Link to="/bw"><FileText className="h-4 w-4" /> <span className="hidden sm:inline">أبيض/أسود</span></Link>
            </Button>
            <Button variant="outline" size="sm" onClick={undo} className="gap-1">
              <Undo2 className="h-4 w-4" /> <span className="hidden sm:inline">تراجع</span>
            </Button>
            <Button variant="outline" size="sm" onClick={redo} className="gap-1">
              <Redo2 className="h-4 w-4" /> <span className="hidden sm:inline">إعادة</span>
            </Button>
            <Button variant="outline" size="sm" onClick={handleClear} className="gap-1">
              <Trash2 className="h-4 w-4" /> <span className="hidden sm:inline">مسح الكل</span>
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportPdf} className="gap-1">
              <FileDown className="h-4 w-4" /> <span className="hidden sm:inline">PDF</span>
            </Button>
            <Button size="sm" onClick={handlePrint} className="gap-1 text-primary-foreground" style={{ background: "var(--gradient-primary)" }}>
              <Printer className="h-4 w-4" /> {language === "ar" ? "طباعة" : "Print"}
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-4 sm:py-6">
        <div className="grid lg:grid-cols-[380px_1fr] gap-6">
          {/* Left: Voice + stats */}
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

            <div className="rounded-2xl border bg-card p-4 shadow-sm">
              <h3 className="font-bold mb-2">{language === "ar" ? "إحصائيات" : "Stats"}</h3>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-muted/50 p-2">
                  <div className="text-2xl font-extrabold text-primary">{offers.length}</div>
                  <div className="text-[10px] text-muted-foreground">{language === "ar" ? "عروض" : "Offers"}</div>
                </div>
                <div className="rounded-lg bg-muted/50 p-2">
                  <div className="text-2xl font-extrabold text-[hsl(var(--info))]">{totalPages}</div>
                  <div className="text-[10px] text-muted-foreground">{language === "ar" ? "صفحات" : "Pages"}</div>
                </div>
                <div className="rounded-lg bg-muted/50 p-2">
                  <div className="text-2xl font-extrabold text-[hsl(var(--success))]">6</div>
                  <div className="text-[10px] text-muted-foreground">{language === "ar" ? "بطاقة/صفحة" : "Per page"}</div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border bg-card p-4 shadow-sm text-sm space-y-2">
              <h3 className="font-bold">{language === "ar" ? "أمثلة" : "Examples"}</h3>
              <ul className="space-y-1 text-muted-foreground text-xs">
                <li>• الحبة عليها حبة هدية</li>
                <li>• الحبتين بعشرة</li>
                <li>• الثلاث حبات بعشرين</li>
                <li>• خصم ٥٠٪ على المنتج</li>
              </ul>
            </div>
          </aside>

          {/* Right: Preview */}
          <section>
            <div className="no-print mb-3 flex items-center justify-between">
              <h2 className="font-bold text-lg">{language === "ar" ? "معاينة الطباعة" : "Print Preview"}</h2>
              <span className="text-xs text-muted-foreground">
                {language === "ar" ? `${offers.length} عرض · ${totalPages} صفحة` : `${offers.length} offers · ${totalPages} pages`}
              </span>
            </div>

            {offers.length === 0 && (
              <div className="no-print rounded-2xl border-2 border-dashed p-12 text-center text-muted-foreground bg-muted/20">
                <Sparkles className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p className="font-semibold">{language === "ar" ? "لا توجد عروض بعد" : "No offers yet"}</p>
                <p className="text-sm">{language === "ar" ? "اضغط زر التسجيل وقل العرض" : "Tap record and speak an offer"}</p>
              </div>
            )}

            <div className="print-area">
              <OfferPreviewGrid
                offers={offers}
                selectedId={selectedId}
                onSelect={(id) => { setSelectedId(id); setEditingId(id); }}
              />
            </div>
          </section>
        </div>
      </main>

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

export default Index;
