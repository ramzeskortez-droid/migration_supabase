const Imap = require('imap');
const { simpleParser } = require('mailparser');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

const imapConfig = {
  user: 'dimmy.kortez@gmail.com',
  password: 'qgbt qonr bcqq eaxk',
  host: 'imap.gmail.com',
  port: 993,
  tls: true,
  tlsOptions: { 
    rejectUnauthorized: false, 
    servername: 'imap.gmail.com'
  },
  authTimeout: 10000,
  keepalive: {
    interval: 10000,
    idleInterval: 300000,
    forceNoop: true
  }
};

let imap = null;
let isReady = false;

function setupImap() {
  if (imap) {
    imap.removeAllListeners();
    try { imap.destroy(); } catch (e) {}
  }

  console.log(`[${new Date().toLocaleTimeString()}] 🔌 Подключение к IMAP (IDLE Mode)...`);
  imap = new Imap(imapConfig);

  imap.once('ready', () => {
    console.log('✅ IMAP соединение установлено.');
    openInbox();
  });

  imap.once('error', (err) => {
    console.error('❌ Ошибка соединения:', err.message);
    isReady = false;
    retryConnection();
  });

  imap.once('end', () => {
    console.log('⚠️ Соединение закрыто сервером.');
    isReady = false;
    retryConnection();
  });

  imap.connect();
}

function openInbox() {
  imap.openBox('INBOX', false, (err, box) => {
    if (err) {
      console.error('❌ Ошибка открытия INBOX:', err.message);
      return retryConnection();
    }
    
    isReady = true;
    console.log(`📬 INBOX открыт. Ожидание новых писем...`);
    searchUnseen();

    imap.on('mail', (numNewMsgs) => {
      console.log(`🔔 Уведомление: Пришло новых писем: ${numNewMsgs} шт.`);
      searchUnseen();
    });
  });
}

function searchUnseen() {
  if (!isReady) return;

  // Ищем только непрочитанные с 6 января 2026 года
  imap.search(['UNSEEN', ['SINCE', 'Jan 06, 2026']], (err, results) => {
    if (err) {
      console.error('Ошибка поиска:', err.message);
      return;
    }

    if (!results || !results.length) {
      console.log('🔎 Новых (UNSEEN) писем в ящике сейчас нет.');
      return;
    }

    console.log(`🔎 Найдено новых: ${results.length}. Начинаю разбор...`);
    
    try {
      const f = imap.fetch(results, { bodies: '', markSeen: true });

      f.on('message', (msg, seqno) => {
        msg.on('body', (stream, info) => {
          simpleParser(stream, async (err, parsed) => {
            if (err) {
                console.error('Ошибка парсинга:', err);
                return;
            }

            const subject = (parsed.subject || '').trim();
            const from = parsed.from?.value[0]?.address || 'Unknown';
            const body = parsed.text || parsed.textAsHtml || '';

            console.log(`📩 ПИСЬМО: "${subject}" [ОТ: ${from}]`);

            if (subject.toUpperCase().startsWith('ЗАЯВКА')) {
              console.log(`   ✅ Подходит под фильтр. Сохраняю в Supabase...`);
              
              const { error } = await supabase.from('incoming_emails').insert({
                  from_address: from, subject: subject, body: body, status: 'new'
              });

              if (error) {
                console.error('    ⛔ БД ОШИБКА:', error.message);
              } else {
                console.log('    ✨ Успешно сохранено.');
              }
            } else {
              console.log(`   ⏩ Пропуск (Не начинается с "ЗАЯВКА")`);
            }
          });
        });
      });

      f.once('error', (err) => {
        console.error('Fetch error:', err);
      });
      
    } catch (e) {
      console.error('Ошибка при fetch:', e.message);
    }
  });
}

function retryConnection() {
  if (imap && !isReady) {
    console.log('⏳ Реконнект через 5 сек...');
    setTimeout(setupImap, 5000);
  }
}

console.log('--- 🚀 СЕРВИС ПОЧТЫ (PUSH + ДЕТАЛЬНЫЕ ЛОГИ) ЗАПУЩЕН ---');
setupImap();