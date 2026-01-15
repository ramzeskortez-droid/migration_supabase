import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { text } = await req.json();
    const API_KEY = Deno.env.get('GROQ_API_KEY'); // Ключ от Zhipu

    if (!API_KEY) throw new Error('API Key is not set');

    // Прямой запрос к Zhipu AI (GLM-4-Flash)
    const response = await fetch("https://open.bigmodel.cn/api/paas/v4/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: "glm-4-flash",
        messages: [
          {
            role: "system",
            content: `You are a specialized assistant for extracting auto parts data. 
CRITICAL PARSING RULES:
1. ARTICLE DEFINITION: Any string containing numbers and dashes (e.g., "0007-2557-600", "123-456", "A-100") is ALWAYS an ARTICLE. NEVER split it into Brand and Article.
2. BRAND DEFINITION: Brands are typically words (e.g., "Danfoss", "Bosch", "Toyota", "VAG"). Numeric codes are rarely brands.
3. CONTEXT: If a line starts with a long code like "0007-2557-600", treat it as the Article.
4. BRAND INHERITANCE (IMPORTANT): If a brand is mentioned in the header (e.g. "з/ч Hitachi", "Order for Danfoss") or only in the first item, you MUST APPLY THIS BRAND TO ALL ITEMS in the list that do not have their own explicit brand.
5. JSON ONLY: Return strictly valid JSON.`
          },
          {
            role: "user",
            content: `Analyze the following text and extract auto parts orders.
      Text: "${text}"
      
      === EXAMPLES OF CORRECT PARSING ===
      Input: "0007-2557-600 уплотнение 2 шт"
      Result: { "parts": [{ "article": "0007-2557-600", "name": "уплотнение", "quantity": 2, "brand": "", "uom": "шт" }] }

      Input: "Клапан 027H0438 Danfoss 3шт"
      Result: { "parts": [{ "article": "027H0438", "brand": "Danfoss", "name": "Клапан", "quantity": 3, "uom": "шт" }] }
      
      Input: "Запчасти Hitachi:\nНасос 12345 1шт\nФильтр 67890 2шт"
      Result: { "parts": [
          { "brand": "Hitachi", "name": "Насос", "article": "12345", "quantity": 1 },
          { "brand": "Hitachi", "name": "Фильтр", "article": "67890", "quantity": 2 }
      ]}
      ===================================
      
      Task 1: Extract parts list (parts).
      Task 2: Extract order metadata (order_info).
      
      Required JSON Structure:
      {
        "order_info": {
          "deadline": "YYYY-MM-DD", "region": "", "city": "", "email": "", 
          "client_name": "", "client_phone": "", "email_subject": ""
        },
        "parts": [
          { "name": "...", "brand": "...", "article": "...", "quantity": 0, "uom": "..." }
        ]
      }`
          }
        ],
        temperature: 0.1
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      return new Response(JSON.stringify({ error: `Zhipu API error: ${response.status}`, details: errorText }), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});