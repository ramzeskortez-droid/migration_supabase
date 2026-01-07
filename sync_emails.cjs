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
  authTimeout: 10000
};

function fetchEmails() {
  console.log(`[${new Date().toLocaleTimeString()}] Проверка почты (IMAP: kortez.pc@gmail.com)...`);
  
  const imap = new Imap(imapConfig);

  imap.once('ready', () => {
    imap.openBox('INBOX', false, (err, box) => {
      if (err) {
        console.error('Ошибка папки:', err.message);
        return imap.end();
      }

      // Ищем непрочитанные
      imap.search(['UNSEEN'], (err, results) => {
        if (err) {
          console.error('Ошибка поиска:', err.message);
          return imap.end();
        }

        if (!results || !results.length) {
          console.log('Новых писем нет.');
          return imap.end();
        }

        console.log(`Найдено писем: ${results.length}. Обработка...`);
        const f = imap.fetch(results, { bodies: '' });
        
        f.on('message', (msg, seqno) => {
          msg.on('body', (stream, info) => {
            simpleParser(stream, async (err, parsed) => {
              const subject = (parsed.subject || '').trim();
              const from = parsed.from?.value[0]?.address || 'Unknown';
              const body = parsed.text || parsed.textAsHtml || '';

              if (subject.toUpperCase().startsWith('ЗАЯВКА')) {
                console.log(`[+] ЗАЯВКА: "${subject}"`);
                const { error } = await supabase.from('incoming_emails').insert({
                    from_address: from, subject: subject, body: body, status: 'new'
                });
                if (!error) {
                    console.log('    Сохранено.');
                    imap.addFlags(seqno, ['\Seen'], () => {});
                } else {
                    console.error('    БД ОШИБКА:', error.message);
                }
              } else {
                console.log(`[-] Пропуск: "${subject}"`);
                imap.addFlags(seqno, ['\Seen'], () => {});
              }
            });
          });
        });

        f.once('end', () => imap.end());
      });
    });
  });

  imap.once('error', (err) => {
    console.error('CONNECTION ERROR:', err.message);
    if (err.message.includes('Invalid credentials')) {
        console.error('СОВЕТ: Проверьте почту и пароль. Возможно, нужно подтвердить вход в Gmail.');
    }
  });

  imap.connect();
}

console.log('--- СЕРВИС ПОЧТЫ ЗАПУЩЕН ---');
fetchEmails();
setInterval(fetchEmails, 60000);
