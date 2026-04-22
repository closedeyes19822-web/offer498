// Edge function: analyze offer images via Lovable AI Gateway (vision)
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `أنت مساعد ذكي متخصص في استخراج عروض المتاجر من الصور.
حلل الصورة المرفقة (قد تكون صورة منتج، إعلان، فاتورة، أو لوحة أسعار) واستخرج كل العروض المرئية.
لكل عرض أعد:
- productName: اسم المنتج (نص قصير، بالعربية إن أمكن)
- offerType: واحد من: "gift" (هدية), "bundle" (عرض سعر مجموعة), "discount" (خصم نسبة), "custom"
- quantity: عدد القطع في العرض (رقم صحيح، افتراضي 1)
- price: السعر بالأرقام (0 إن لم يوجد)
- discount: نسبة الخصم 0-100 (0 إن لم توجد)
- text: نص العرض القصير المعروض على البطاقة

أعد قائمة عروض حتى لو كان عرض واحد فقط.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64 } = await req.json();
    if (!imageBase64) {
      return new Response(JSON.stringify({ error: "imageBase64 required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
            {
              role: "user",
              content: [
                { type: "text", text: "استخرج كل العروض من هذه الصورة." },
                { type: "image_url", image_url: { url: imageBase64 } },
              ],
            },
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
                          offerType: {
                            type: "string",
                            enum: ["gift", "bundle", "discount", "custom"],
                          },
                          quantity: { type: "number" },
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
