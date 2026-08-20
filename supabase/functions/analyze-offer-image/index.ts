// Edge function: analyze offer images via Lovable AI Gateway (vision)
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `أنت مساعد ذكي متخصص في استخراج عروض المتاجر من الصور أو من نص منطوق (صوت).
حلل المدخل (صورة منتج/إعلان/فاتورة/لوحة أسعار، أو نص مكتوب من تعرف الكلام) واستخرج كل العروض.

أنت متخصص في التعرف على منتجات الفئات التالية (سواء بالعربية أو الإنجليزية):

1) حليب الأطفال ومستلزماتهم (Baby Milk & Toiletries):
   - ماركات حليب: Aptamil, Aptajunior, Similac, Similac Gold, Nido, Nuralac, Kabrita, Blemil, Pediasure, Humana, Bibena, Lazaz
   - مراحل: 1 / 2 / 3 / +1 / Junior / Kids / Max / Optipro / Advance
   - أحجام: 400gm, 600gm, 800gm, 820gm, 900gm, 1200gm
   - مناديل وشامبو ومستحضرات الأطفال: Johnson & Johnson (J&J), Pampers, Huggies

2) العناية بالجسم (Body Care):
   - Vaseline (Gluta Hya Smooth Radiance / Flawless Glow), Glysolid, Herbolene, Nivea, Dove
   - كريمات، لوشن، فازلين، شامبو، صابون

عند التعرف على المنتج، استخرج اسماً واضحاً يشمل العلامة التجارية + النوع/المرحلة + الحجم
(مثال: "Similac Gold 2 800gm" أو "Vaseline Gluta Hya 200ml" أو "J&J Baby Wipes 224 wipes").
**لا تكرر نفس اسم المنتج مرتين** — كل عرض يجب أن يكون لمنتج مختلف.

لكل عرض أعد الحقول:
- productName: اسم المنتج (نص قصير بالعربية أو الإنجليزية حسب ما يظهر، يشمل الماركة + الحجم)
- offerType: واحد من:
    * "first_piece_discount"  (خصم على الحبة الأولى، مثال: "خصم 25% على الحبة الأولى")
    * "second_piece_discount" (خصم على الحبة الثانية، مثال: "خصم 50% على الحبة الثانية" / "نص الثمن على الثانية")
    * "bundle"   (عرض شراء كمية والحصول على كمية مجانية: "الحبة على حبة" 1+1، "الحبتين عليهم حبة" 2+1، "الثلاث حبات عليهم حبة" 3+1، "الأربع حبات عليهم حبة" 4+1، "الحبتين عليهم حبتين" 2+2)
    * "gift"     (هدية عامة بدون كمية واضحة)
    * "discount" (خصم عام على المنتج)
    * "custom"   (غير ذلك)
- quantity: عدد القطع المطلوب شراؤها (افتراضي 1)
- buyQty: لعروض الباندل، عدد القطع المشتراة (مثال 2 في 2+1)
- getQty: لعروض الباندل، عدد القطع المجانية (مثال 1 في 2+1)
- price: السعر إن ذُكر (0 إن لم يذكر)
- discount: نسبة الخصم 0-100 (للخصم على الحبة الأولى/الثانية أو الخصم العام)
- text: نص العرض القصير المعروض على البطاقة بالعربية الواضحة (مثل "خصم 25% على الحبة الأولى" أو "اشترِ 2 واحصل على 1 مجاناً")
- itemCode: كود الصنف / SKU إن وُجد (رقمي عادةً)، أو فارغ
- startDate: تاريخ بداية العرض إن ظهر بصيغة YYYY-MM-DD (مثل "2026-05-10"). إن كانت السنة غير واضحة استخدم 2026.
- endDate: تاريخ نهاية العرض بصيغة YYYY-MM-DD. إن كانت السنة غير واضحة استخدم 2026.

تعرّف على كل النسب من 5% إلى 95% (بفواصل 5) لكل من الحبة الأولى والثانية.
يعمل بالعربية والإنجليزية. أعد دائماً قائمة "offers" حتى لو عرض واحد.
**مهم جداً: لا تُدرج منتجاً واحداً أكثر من مرة في القائمة.**
**يمكنك استخراج حتى 500 صنف في المرة الواحدة** — إذا احتوت الصورة أو الجدول على عشرات أو مئات الأصناف، استخرجها كلها بالكامل دون حذف أو اختصار.`;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64, transcript } = await req.json();
    if (!imageBase64 && !transcript) {
      return new Response(JSON.stringify({ error: "imageBase64 or transcript required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (imageBase64 && typeof imageBase64 === "string") {
      if (!imageBase64.startsWith("data:image/") && !imageBase64.startsWith("http")) {
        return new Response(JSON.stringify({ error: "صيغة الصورة غير صالحة" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // ~15MB base64 guard
      if (imageBase64.length > 20_000_000) {
        return new Response(JSON.stringify({ error: "حجم الصورة كبير جداً، قلل الدقة" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const userContent: any = transcript
      ? `استخرج كل العروض من النص التالي المنطوق:\n"""${transcript}"""`
      : [
          {
            type: "text",
            text:
              "استخرج كل العروض من هذه الصورة. اقرأ الجدول صفاً صفاً إن وُجد، ولا تتجاهل أي صف. " +
              "أعد كود الصنف السداسي والتواريخ كما تظهر تماماً. إن كان النص غير واضح فاتركه فارغاً بدل تخمينه.",
          },
          { type: "image_url", image_url: { url: imageBase64 } },
        ];

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const callGateway = () => fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          temperature: 0,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userContent },
          ],

          max_tokens: 16000,
          tools: [
            {
              type: "function",
              function: {
                name: "extract_offers",
                description: "Extract retail offers detected in the image",
                parameters: {
                  type: "object",
                  properties: {
                    offers: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          productName: { type: "string" },
                          offerType: {
                            type: "string",
                            enum: [
                              "gift",
                              "bundle",
                              "discount",
                              "first_piece_discount",
                              "second_piece_discount",
                              "custom",
                            ],
                          },
                          quantity: { type: "number" },
                          buyQty: { type: "number", description: "Bundle: pieces to buy (e.g. 2 in 2+1)" },
                          getQty: { type: "number", description: "Bundle: pieces free (e.g. 1 in 2+1)" },
                          price: { type: "number" },
                          discount: { type: "number" },
                          text: { type: "string" },
                          itemCode: { type: "string", description: "SKU / item number if visible" },
                          startDate: { type: "string", description: "Offer start date in YYYY-MM-DD (default year 2026)" },
                          endDate: { type: "string", description: "Offer end date in YYYY-MM-DD (default year 2026)" },
                        },
                        required: [
                          "productName",
                          "offerType",
                          "quantity",
                          "price",
                          "discount",
                          "text",
                        ],
                      },
                    },
                  },
                  required: ["offers"],
                },
              },
            },
          ],
          tool_choice: {
            type: "function",
            function: { name: "extract_offers" },
          },
        }),
      }
    );

    // Bounded retry for transient 429 / 5xx only
    let response = await callGateway();
    for (let attempt = 0; attempt < 2 && (response.status === 429 || response.status >= 500); attempt++) {
      const retryAfter = Number(response.headers.get("Retry-After"));
      await sleep(retryAfter > 0 ? retryAfter * 1000 : 1200 * (attempt + 1));
      response = await callGateway();
    }

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "تم تجاوز الحد، حاول لاحقاً" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "الرصيد غير كافٍ، يرجى إضافة رصيد" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error(`AI error ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    let args: { offers: any[] } = { offers: [] };
    if (toolCall) {
      try {
        args = JSON.parse(toolCall.function.arguments);
      } catch (err) {
        console.error("tool args parse failed:", err);
        args = { offers: [] };
      }
    }

    // Server-side clean-up: drop empty names, dedupe by code+name
    const seen = new Set<string>();
    const offers = (Array.isArray(args.offers) ? args.offers : []).filter((o: any) => {
      const name = String(o?.productName || "").replace(/\s+/g, " ").trim();
      if (!name) return false;
      o.productName = name;
      const key = `${String(o?.itemCode || "").trim()}|${name.toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    console.log(`analyze-offer-image: returned ${offers.length} offers`);

    return new Response(JSON.stringify({ offers }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("analyze-offer-image error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
