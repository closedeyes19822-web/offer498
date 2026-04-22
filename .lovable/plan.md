
# Smart Retail Printing App — Voice-to-Offer

A mobile-friendly Arabic/English retail offer generator that turns spoken phrases into print-ready promotional cards, laid out exactly 6 per A4 page.

## Core User Flow
1. Tap 🎤 **سجل العرض** → speak an offer (e.g. "الحبتين بعشرة")
2. Speech is transcribed live (Web Speech API, Arabic default)
3. Parser detects offer type (gift / bundle / discount / custom) → structured data
4. Voice confirmation reads it back → Confirm / Edit / Cancel
5. Card appears instantly in the 3×2 live preview grid
6. User can edit any card manually or add an optional image
7. Tap **Quick Print** → 6 cards print at exact 6cm × 13cm dimensions on A4

## Components
- **VoiceOfferRecorder** — Big record button, live interim transcript, language toggle (AR/EN)
- **OfferParser** — Pattern matching for Arabic phrases (gift / bundle price / % discount), with optional Lovable AI fallback for fuzzy phrases
- **OfferPreviewGrid** — Fixed 3×2 grid, exactly 6 slots per page, paginates extras
- **OfferCard** — 6cm × 13cm, 5cm top blank area + 8cm content (name, offer text, price), auto-fit font, color-coded (green=gift, red=discount, neutral=bundle)
- **OfferEditor** — Side panel to manually edit selected card (name, text, price, image upload)
- **PrintController** — Triggers print with strict `@page` A4 portrait, zero margins, no scaling
- **HistoryProvider** — Undo/Redo stack for all offer changes

## Top Toolbar
🎤 Record · ↶ Undo · ↷ Redo · 🗑 Clear All · 🖨 Quick Print · 🌐 AR/EN

## Parser Rules (Arabic)
- **Gift**: "الحبة عليها حبة هدية", "الحبتين عليهم حبة هدية" → green card
- **Bundle**: "الحبتين بعشرة", "الثلاث حبات بعشرين" → neutral card with big price
- **Discount**: "خصم ٥٠٪ على الحبة الثانية" → red card
- **Custom**: free text fallback
- Auto-extracts quantity, price, discount %, product name

## Voice Confirmation
After parse, browser speaks back: *"تم تسجيل العرض: الحبتين بسعر عشرة"* using SpeechSynthesis. Three buttons: ✔ Confirm · ✏ Edit · ❌ Cancel.

## Card Design
- 6cm × 13cm, rounded corners, bold typography
- 5cm empty top (for product placement on shelf)
- 8cm content: PRODUCT NAME (bold), offer text, large price
- Auto-shrink font to fit 8cm
- Optional image slot (auto-scaled)
- Color band: green (gift) / red (discount) / blue (bundle)

## Print Layout
```
@page { size: A4 portrait; margin: 0; }
.print-grid {
  grid-template-columns: repeat(3, 6cm);
  grid-template-rows: repeat(2, 13cm);
  gap: 0.4cm;
}
```
Print preview hides UI chrome; only the 6-card grid renders. `print-color-adjust: exact` preserves colors.

## Tech Choices
- **Web Speech API** for recognition (Arabic ar-SA default, English en-US toggle)
- **SpeechSynthesis** for read-back confirmation
- **Local state + history stack** for undo/redo (no backend needed for v1)
- **Lovable AI (Gemini Flash)** — optional toggle, used only when regex parser fails, to extract structured offer JSON
- **shadcn/ui** for toolbar, dialogs, inputs, toasts
- **Tailwind** with custom print stylesheet

## Mobile & Performance
- Touch-optimized record button (full-width on mobile)
- Preview grid scrolls horizontally on small screens, prints correctly regardless
- Instant updates (no reloads), debounced edits

## Out of Scope (v1)
- Saving offer history across sessions (can add Lovable Cloud later)
- Multi-store / user accounts
- Barcode or inventory integration
