# VoicePrint Pro

Build a full interactive UI for a smart retail printing app with instant Voice-to-Offer generation and precise 6-card printing layout.



Use:

React + TypeScript

Tailwind

Shadcn UI

Web Speech API

Optional OpenAI for NLP parsing



The system must work fast, mobile friendly, and optimized for printing.



--------------------------------------------------



APP STRUCTURE



Create the following main components:



VoiceOfferRecorder

OfferPreviewGrid

OfferCard

OfferEditor

OfferParser

PrintController



--------------------------------------------------



1️⃣ MAIN INTERFACE



Layout sections:



Top Toolbar

Voice Input Area

Live Card Preview

Manual Edit Panel

Print Controls



Top Toolbar contains:



• Record Offer Button

• Undo

• Redo

• Clear All

• Quick Print



--------------------------------------------------



2️⃣ RECORD OFFER BUTTON



Large primary button:



"🎤 سجل العرض"



Behavior:



Press → start recording

Press again → stop recording



Use Web Speech API for Arabic speech recognition.



Example code logic:



const recognition = new webkitSpeechRecognition();

recognition.lang = "ar-SA";

recognition.continuous = false;

recognition.interimResults = true;



On speech result:



convert speech → text instantly



Example spoken phrases:



"الحبة عليها حبة هدية"

"الحبتين بعشرة"

"الثلاث حبات بعشرين"

"الأربع حبات بثلاثين"

"خصم خمسين بالمية على الحبة الثانية"



--------------------------------------------------



3️⃣ OFFER PARSER (AI LOGIC)



Create an intelligent parser to detect:



product name

offer type

item count

price

discount

gift offers



Recognize patterns automatically:



1️⃣ Gift patterns



الحبة عليها حبة هدية

الحبتين عليهم حبة هدية

الثلاث حبات عليهم حبة هدية



2️⃣ Price bundle



الحبتين بسعر 10

الثلاث حبات بسعر 20

الأربع حبات بسعر 30



3️⃣ Discount pattern



خصم 50٪ على الحبة الثانية



4️⃣ Custom offer



Allow free text if pattern not detected.



Output structured object:



{

 productName: "",

 offerType: "gift | bundle | discount | custom",

 quantity: number,

 price: number,

 discount: number,

 text: ""

}



Replace placeholders automatically.



--------------------------------------------------



4️⃣ LIVE PREVIEW PANEL



Show real-time preview of cards.



Grid layout:



3 columns

2 rows



Exactly:



6 cards per page



Grid CSS:



grid-template-columns: repeat(3, 6cm)

grid-template-rows: repeat(2, 13cm)



Gap:



0.4 cm



--------------------------------------------------



5️⃣ CARD DESIGN



Each card:



Width:



6 cm



Height:



13 cm



Structure:



Top padding area



5 cm empty space



Content area



8 cm



Content area includes:



Product Name

Offer Text

Price

Optional Image



Auto adjust font size to fit inside 8cm area.



Large bold price.



Gift offers → green highlight



Discount offers → red highlight



--------------------------------------------------



6️⃣ OFFER CARD COMPONENT



Card design:



Rounded corners

Bold typography

High contrast colors



Example layout:



--------------------------------



[5 cm empty space]



PRODUCT NAME



Offer Text



PRICE



--------------------------------



--------------------------------------------------



7️⃣ VOICE CONFIRMATION



After speech recognition:



AI voice reads back the offer:



"تم تسجيل العرض: الحبتين بسعر عشرة"



User options:



✔ Confirm

✏ Edit

❌ Cancel



--------------------------------------------------



8️⃣ EDIT OFFER PANEL



Allow manual correction:



Product Name field

Offer Text field

Price field



Update preview instantly.



--------------------------------------------------



9️⃣ UNDO / REDO



Implement history stack.



Undo last spoken offer

Redo removed offer



--------------------------------------------------



🔟 QUICK PRINT



Add big print button.



Behavior:



Print exactly 6 cards.



Use CSS print rules.



@page {

 size: A4 portrait;

 margin: 0;

}



Prevent scaling:



body {

 print-color-adjust: exact;

}



Card rules:



width: 6cm

height: 13cm

page-break-inside: avoid



Disable browser scaling.



--------------------------------------------------



11️⃣ PRINT GRID



Ensure exact layout:



3 columns

2 rows



Centered on page.



Top margin:



0 cm



Cards remain exact size.



--------------------------------------------------



12️⃣ REAL TIME UPDATE



Whenever user:



speaks new offer

edits offer

deletes offer



Preview updates instantly.



--------------------------------------------------



13️⃣ MULTI LANGUAGE



Primary language:



Arabic



Extendable to:



English



Voice recognition automatically adapts.



--------------------------------------------------



14️⃣ OPTIONAL IMAGE SUPPORT



Allow optional product image.



Image auto scales inside card.



--------------------------------------------------



15️⃣ PERFORMANCE



The system must:



process speech instantly

update preview without reload

support mobile browsers



--------------------------------------------------



FINAL RESULT



User flow:



Tap record

Speak offer

AI converts speech → structured offer

Preview card appears instantly

User edits if needed

Tap print

6 cards printed perfectly aligned

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://offer498.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/d770db45-f9a8-4a99-9194-bf758c5b7ee0).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
