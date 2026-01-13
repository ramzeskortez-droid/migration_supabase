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
    const API_KEY = Deno.env.get('GROQ_API_KEY');

    if (!API_KEY) {
      throw new Error('GROQ_API_KEY is not set');
    }

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: "You are a specialized assistant for extracting auto parts data and order details. You always return valid JSON."
          },
          {
            role: "user",
            content: `Проанализируй текст заявки на автозапчасти.
      Текст: "${text}"
      
      Задача 1: Извлечь список позиций с максимальной точностью.
      
      Задача 2: Извлечь метаданные заявки:
      - Дедлайн (deadline): YYYY-MM-DD.
      - Регион (region).
      - Город (city).
      - Email клиента (email).
      - Имя клиента (client_name).
      - Телефон (client_phone).
      - Тема письма (email_subject): Возьми из строки "ТЕМА ПИСЬМА: ..." или определи по контексту.

      Верни JSON объект:
      {
        "order_info": {
          "deadline": "", "region": "", "city": "", "email": "", 
          "client_name": "", "client_phone": "", "email_subject": ""
        },
        "parts": [
          { "name": "...", "brand": "...", "article": "...", "quantity": 0, "uom": "..." }
        ]
      }`
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.1
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      return new Response(JSON.stringify({ error: `Groq API error: ${response.status}`, details: errorText }), {
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
