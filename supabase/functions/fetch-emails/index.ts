import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { ImapFlow } from "npm:imapflow"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*', 
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const client = new ImapFlow({
      host: 'imap.mail.ru',
      port: 993,
      secure: true,
      auth: {
        user: 'china.flow@mail.ru',
        pass: '3BH5D67YlJ4qYW24j5rR'
      },
      logger: false
    });

    console.log("Connecting to Gmail...");
    await client.connect();
    
    let lock = await client.getMailboxLock('INBOX');
    const emailsFound = [];

    try {
      // Ищем только непрочитанные (seen: false)
      for await (let message of client.list({ seen: false }, { source: true })) {
        const subject = message.envelope.subject || "";
        const from = message.envelope.from[0].address;
        
        // Фильтр по теме "ЗАЯВКА"
        if (subject.toUpperCase().startsWith('ЗАЯВКА')) {
          const body = message.source.toString(); 

          const { error } = await supabase
            .from('incoming_emails')
            .insert({
              from_address: from,
              subject: subject,
              body: body,
              status: 'new'
            });

          if (!error) {
            await client.messageFlagsAdd(message.uid, ['\Seen']);
            emailsFound.push(subject);
          }
        } else {
            // Помечаем как прочитанные даже не подходящие, чтобы не сканить их вечно
            await client.messageFlagsAdd(message.uid, ['\Seen']);
        }
      }
    } finally {
      lock.release();
    }

    await client.logout();
    return new Response(JSON.stringify({ success: true, processed: emailsFound.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error("ERROR:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})