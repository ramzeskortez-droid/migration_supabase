import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { text } = await req.json();
    const API_KEY = Deno.env.get('GROQ_API_KEY');
    const currentYear = 2026;

    // 1. Пытаемся сами найти полный адрес (строка с "Россия")
    const addressMatch = text.match(/(Россия.*?\n|Россия.*?[а-я0-9]\s\s)/i) || text.match(/(Россия.*$)/im);
    const fallbackAddress = addressMatch ? addressMatch[0].trim() : "";

    const response = await fetch("https://open.bigmodel.cn/api/paas/v4/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${API_KEY}` },
      body: JSON.stringify({
        model: "glm-4-flash",
        messages: [
          {
            role: "system",
            content: `Extract auto parts. Year is ${currentYear}. 
            Address rule: find the full string starting with 'Россия'. 
            JSON only.`
          },
          {
            role: "user",
            content: `Text: "${text}"
            Return JSON: { "order_info": { "deadline": "YYYY-MM-DD", "full_address": "", "email": "", "client_name": "" }, "parts": [] }`
          }
        ],
        temperature: 0.1
      })
    });

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content.replace(/```json/g, '').replace(/```/g, '').trim();
    let result = JSON.parse(content);

    // 2. ПОСТ-ПРОЦЕССИНГ (ЖЕСТКИЙ)
    if (!result.order_info) result.order_info = {};

    // ФИКС АДРЕСА: Если AI вернул коротыша, а у нас есть "fallback" из текста
    if (fallbackAddress.length > (result.order_info.full_address || "").length) {
        result.order_info.full_address = fallbackAddress;
    }

    // ФИКС ГОДА: Находим любую дату в формате DD.MM.YYYY или YYYY-MM-DD и меняем 2024/2025 на 2026
    if (result.order_info.deadline) {
        result.order_info.deadline = result.order_info.deadline.replace(/202[3-5]/g, '2026');
        // Если дата пришла как 23.01 -> 2026-01-23
        if (result.order_info.deadline.match(/^\d{2}\.\d{2}$/)) {
            const [d, m] = result.order_info.deadline.split('.');
            result.order_info.deadline = `2026-${m}-${d}`;
        }
    }

    return new Response(JSON.stringify({
        choices: [{ message: { content: JSON.stringify(result) } }]
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }
});