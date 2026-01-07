import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ИСПОЛЬЗУЕМ HTTP, так как у тестового домена просрочен SSL сертификат
const B24_WEBHOOK = "http://drave5inb2.temp.swtest.ru/rest/1/zt6j93x9rzn0jhtc/";
const TARGET_STAGE_ID = "UC_CWYRMB"; // Стадия "Подписан"

async function b24Request(method: string, params: any = {}) {
  const url = new URL(method, B24_WEBHOOK);
  Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));

  console.log(`B24 Request: ${method}`, params);
  
  const response = await fetch(url.toString(), {
    method: "POST"
  });
  
  const data = await response.json();
  if (data.error) throw new Error(`Bitrix API Error: ${data.error_description || data.error}`);
  return data.result;
}

serve(async (req) => {
  try {
    const payload = await req.json();
    const { record, table } = payload;

    console.log(`Checking order #${record?.id}. Table: ${table}, Status: ${record?.status_admin}, Deal: ${record?.bitrix_deal_id}`);

    // Проверяем, что это UPDATE таблицы orders и статус 'КП отправлено'
    if (table !== 'orders' || record.status_admin !== 'КП отправлено' || record.bitrix_deal_id) {
      console.log("Skipping sync: criteria not met.");
      return new Response("Skipped: Not a target event", { status: 200 });
    }

    console.log("Criteria met! Starting Bitrix24 sync (via HTTP)...");

    // Инициализируем Supabase Client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // ВАЖНО: Мы берем данные клиента прямо из заказа, так как user_id может быть NULL
    // (заказы создаются оператором вручную и не всегда привязаны к app_users)
    const clientName = record.client_name || "Неизвестный клиент";
    const clientPhone = record.client_phone || "";
    const clientEmail = ""; // Email в orders обычно нет, оставляем пустым

    console.log(`Client Info from Order: Name="${clientName}", Phone="${clientPhone}"`);

    // Получаем Товары
    const { data: items, error: itemsError } = await supabaseClient
      .from("order_items")
      .select("*")
      .eq("order_id", record.id);

    if (itemsError) throw new Error("Items not found");

    // БИТРИКС: Ищем контакт по телефону
    let contactId = null;

    if (clientPhone) {
        console.log(`Searching contact by phone: ${clientPhone}`);
        // Очищаем телефон от лишнего форматирования для поиска, если нужно, 
        // но Битрикс обычно ищет и так.
        const contacts = await b24Request("crm.contact.list", { 
            "filter[PHONE]": clientPhone, 
            "select[]": "ID" 
        });
        if (contacts && contacts.length > 0) {
            contactId = contacts[0].ID;
            console.log(`Found Contact: ${contactId}`);
        }
    }

    // Если не нашли — создаем
    if (!contactId) {
        console.log("Contact not found, creating new...");
        contactId = await b24Request("crm.contact.add", {
            "fields[NAME]": clientName,
            "fields[LAST_NAME]": `(Supabase #${record.id})`, // Чтобы отличать
            "fields[PHONE][0][VALUE]": clientPhone,
            "fields[PHONE][0][VALUE_TYPE]": "WORK",
            "fields[EMAIL][0][VALUE]": clientEmail,
            "fields[EMAIL][0][VALUE_TYPE]": "WORK"
        });
        console.log(`Created Contact: ${contactId}`);
    }

    // БИТРИКС: Создаем Сделку
    const dealId = await b24Request("crm.deal.add", {
        "fields[TITLE]": `Заказ #${record.id} (${clientName})`,
        "fields[CONTACT_ID]": contactId,
        "fields[STAGE_ID]": TARGET_STAGE_ID,
        "fields[CURRENCY_ID]": "RUB",
        "fields[OPPORTUNITY]": 0 // Сумма пересчитается от товаров
    });
    console.log(`Created Deal: ${dealId}`);

    // БИТРИКС: Добавляем товары
    // admin_price_rub - это цена для клиента
    const rows = items.map((item) => ({
        PRODUCT_NAME: `${item.name} (${item.brand || 'NoBrand'})`,
        PRICE: item.admin_price_rub || 0,
        QUANTITY: item.quantity || 1,
        MEASURE_CODE: 796 // шт
    }));

    if (rows.length > 0) {
        await b24Request("crm.deal.productrows.set", {
            id: dealId,
            rows: rows
        });
        console.log(`Added ${rows.length} products`);
    } else {
        console.log("No items to add.");
    }

    // Обновляем заказ в Supabase
    await supabaseClient
        .from("orders")
        .update({ bitrix_deal_id: dealId })
        .eq("id", record.id);
    
    console.log("Sync completed successfully.");

    return new Response(JSON.stringify({ success: true, dealId }), {
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("FATAL ERROR:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
