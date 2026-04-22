import { Mic, MicOff, Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Language } from "@/types/offer";

interface Props {
  listening: boolean;
  interim: string;
  supported: boolean;
  language: Language;
  onToggle: () => void;
  onLanguageChange: (l: Language) => void;
}

export function VoiceOfferRecorder({ listening, interim, supported, language, onToggle, onLanguageChange }: Props) {
  return (
    <div className="rounded-2xl border bg-card p-4 sm:p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold">{language === "ar" ? "تسجيل العرض الصوتي" : "Voice Offer Recording"}</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onLanguageChange(language === "ar" ? "en" : "ar")}
          className="gap-2"
        >
          <Languages className="h-4 w-4" />
          {language === "ar" ? "AR" : "EN"}
        </Button>
      </div>

      <button
        onClick={onToggle}
        disabled={!supported}
        className={cn(
          "w-full rounded-2xl py-6 sm:py-8 px-4 font-bold text-xl sm:text-2xl transition-all",
          "flex items-center justify-center gap-3 select-none",
          listening
            ? "bg-destructive text-destructive-foreground recording-pulse"
            : "text-primary-foreground shadow-lg hover:shadow-xl active:scale-[0.98]",
          !supported && "opacity-50 cursor-not-allowed",
        )}
        style={!listening ? { background: "var(--gradient-primary)" } : undefined}
      >
        {listening ? <MicOff className="h-7 w-7" /> : <Mic className="h-7 w-7" />}
        {!supported
          ? (language === "ar" ? "المتصفح لا يدعم التعرف الصوتي" : "Browser doesn't support speech")
          : listening
            ? (language === "ar" ? "أوقف التسجيل" : "Stop Recording")
            : (language === "ar" ? "🎤 سجل العرض" : "🎤 Record Offer")}
      </button>

      <div className="mt-4 min-h-[3rem] rounded-lg border bg-muted/40 p-3 text-center">
        {interim ? (
          <p className="text-foreground font-medium" dir={language === "ar" ? "rtl" : "ltr"}>{interim}</p>
        ) : (
          <p className="text-muted-foreground text-sm">
            {language === "ar"
              ? "مثال: «الحبتين بعشرة» أو «خصم ٥٠٪ على المنتج»"
              : "Example: 'two for ten' or 'fifty percent off'"}
          </p>
        )}
      </div>
    </div>
  );
}
