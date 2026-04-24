// Edge function: analyze offer images via Lovable AI Gateway (vision)
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `أنت مساعد ذكي متخصص في استخراج عروض المتاجر من الصور أو من نص منطوق (صوت).
حلل المدخل (صورة منتج/إعلان/فاتورة/لوحة أسعار، أو نص مكتوب من تعرف الكلام) واستخرج كل العروض.

لكل عرض أعد الحقول:
- productName: اسم المنتج (نص قصير بالعربية أو الإنجليزية كما هو مكتوب، وإلا "منتج")
- itemCode: كود الصنف السداسي (6 أرقام) إن ظهر في الصورة أو النص — مثل 301156 أو 240436. ابحث عن "Item Number" أو "Code" أو "كود" أو أي رقم سداسي مستقل. اتركه فارغاً إن لم يوجد.
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
- text: نص العرض القصير المعروض على البطاقة بالعربية الواضحة

تعرّف على كل النسب من 5% إلى 95% (بفواصل 5) لكل من الحبة الأولى والثانية.
تعرف على المنتجات في فئات: مستحضرات الأطفال (Baby Milk/Toiletries)، التجميل (Beauty)، العناية بالجسم (Bodycare)، الحفاضات (Diapers)، مزيلات العرق (Deodorant).
يعمل بالعربية والإنجليزية. أعد دائماً قائمة "offers" حتى لو عرض واحد.`;

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

    const userContent: any = transcript
      ? `استخرج كل العروض من النص التالي المنطوق:\n"""${transcript}"""`
      : [
          { type: "text", text: "استخرج كل العروض من هذه الصورة." },
          { type: "image_url", image_url: { url: imageBase64 } },
        ];

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userContent },
          ],
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
                          itemCode: { type: "string", description: "6-digit item number if visible (e.g. 301156)" },
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
    const args = toolCall ? JSON.parse(toolCall.function.arguments) : { offers: [] };

    return new Response(JSON.stringify(args), {
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
