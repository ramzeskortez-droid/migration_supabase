const http = require('http');
const { exec } = require('child_process');

// --- CONFIGURATION ---
// Keys are loaded from Environment Variables for security
const KEYS = [
    process.env.GROQ_KEY_1 || 'PLACEHOLDER_KEY_1',
    process.env.GROQ_KEY_2 || 'PLACEHOLDER_KEY_2',
    process.env.GROQ_KEY_3 || 'PLACEHOLDER_KEY_3'
].filter(k => k.startsWith('gsk_')); // Only use valid keys if present

const PROXY = process.env.PROXY_URL || 'http://KrtYV5:Q5cRGt@70.38.2.19:10978';
const MODEL = 'llama-3.3-70b-versatile';

let currentKeyIndex = 0;

if (KEYS.length === 0) {
    console.error("❌ NO API KEYS FOUND! Please set GROQ_KEY_1, GROQ_KEY_2, GROQ_KEY_3 env vars.");
    // We don't exit process to keep server alive, but requests will fail
}

const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, apikey, x-client-info');

    if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return; }

    if (req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            const t0 = Date.now();
            
            let parsedBody;
            try { parsedBody = JSON.parse(body || '{}'); } 
            catch (e) { res.writeHead(400); res.end(JSON.stringify({ error: "Invalid JSON" })); return; }
            
            const { text } = parsedBody;
            if (!text) { res.writeHead(400); res.end(JSON.stringify({ error: "Empty text" })); return; }

            console.log(`[${new Date().toLocaleTimeString()}] 📨 REQ (Size: ${body.length})`);

            if (KEYS.length === 0) {
                res.writeHead(500); res.end(JSON.stringify({ error: "Server Configuration Error: No API Keys" }));
                return;
            }

            const currentYear = 2026;
            const emailMatch = text.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
            const manualEmail = emailMatch ? emailMatch[1] : '';

            const payload = JSON.stringify({
                model: MODEL,
                messages: [
                    { role: 'system', content: `You are a parts assistant. Year is ${currentYear}. Rules: 1. Deadline: use ${currentYear}. 2. Address: Extract full line. 3. Brand: Propagation. JSON only.` },
                    { role: 'user', content: `Extract data from: "${text}". Result format: { "order_info": { "deadline": "YYYY-MM-DD", "full_address": "", "email": "", "client_name": "" }, "parts": [] }` }
                ],
                temperature: 0.1,
                response_format: { type: 'json_object' }
            }).replace(/'/g, "'\\''");

            const attemptRequest = (retryCount = 0) => {
                const maxRetries = KEYS.length + 1; 

                const apiKey = KEYS[currentKeyIndex];
                const maskedKey = apiKey.substring(0, 8) + '...';
                
                console.log(`[${new Date().toLocaleTimeString()}] 🚀 TRYING GROQ (Key: ${maskedKey}, Attempt: ${retryCount + 1}/${maxRetries})`);

                const cmd = `curl -x ${PROXY} -s -X POST "https://api.groq.com/openai/v1/chat/completions" \
                    -H "Authorization: Bearer ${apiKey}" \
                    -H "Content-Type: application/json" \
                    -d '${payload}'`;

                exec(cmd, { maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
                    const t2 = Date.now();

                    if (error) {
                        console.error('⚠️ CURL Error:', error);
                        if (retryCount < maxRetries) {
                            console.log(`🔄 Retrying in 1s...`);
                            setTimeout(() => attemptRequest(retryCount + 1), 1000);
                            return;
                        }
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'Network Error', details: error.message }));
                        return;
                    }

                    let data;
                    try { data = JSON.parse(stdout); } 
                    catch (e) {
                        console.error('⚠️ JSON Parse Error:', stdout.substring(0, 100));
                        res.writeHead(500); res.end(JSON.stringify({ error: 'Invalid AI Response', raw: stdout }));
                        return;
                    }

                    if (data.error) {
                        const errMsg = data.error.message || '';
                        console.warn(`⚠️ API ERROR (Key ${maskedKey}):`, errMsg);
                        
                        if (retryCount < maxRetries) {
                            const oldIndex = currentKeyIndex;
                            currentKeyIndex = (currentKeyIndex + 1) % KEYS.length;
                            
                            let waitTime = 1000;
                            const waitMatch = errMsg.match(/try again in (\d+(\.\d+)?)(s|ms)/);
                            if (waitMatch) {
                                const val = parseFloat(waitMatch[1]);
                                const unit = waitMatch[3];
                                if (unit === 's') waitTime = val * 1000;
                                else waitTime = val;
                                if (waitTime > 3000) waitTime = 1500; 
                            }

                            console.log(`🔄 SWITCHING KEY: ${oldIndex} -> ${currentKeyIndex}. Waiting ${waitTime}ms...`);
                            setTimeout(() => attemptRequest(retryCount + 1), waitTime);
                            return;
                        } else {
                            res.writeHead(429, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ error: 'Rate Limit Exceeded', last_error: data.error }));
                            return;
                        }
                    }

                    try {
                        console.log(`[${new Date().toLocaleTimeString()}] 📊 Usage: ${JSON.stringify(data.usage || {})}`);
                        let content = data.choices?.[0]?.message?.content || '';
                        let result = JSON.parse(content);

                        if (!result.order_info) result.order_info = {};
                        if (manualEmail) result.order_info.email = manualEmail;

                        const lines = text.split('\n');
                        let manualAddress = '';
                        let maxCommas = -1;
                        for (const line of lines) {
                            const lower = line.toLowerCase();
                            if ((lower.includes('россия') || lower.includes('ул.') || lower.includes('г.')) && line.length > 15) {
                                const commas = (line.match(/,/g) || []).length;
                                if (commas > maxCommas) { maxCommas = commas; manualAddress = line.trim(); }
                            }
                        }
                        if (manualAddress && manualAddress.length > (result.order_info.full_address || '').length) {
                            result.order_info.full_address = manualAddress;
                        }
                        if (result.order_info.deadline) {
                            result.order_info.deadline = result.order_info.deadline.replace(/202[0-5]/g, '2026');
                        }

                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ choices: [{ message: { content: JSON.stringify(result) } }] }));
                        console.log(`[${new Date().toLocaleTimeString()}] ✅ DONE. AI: ${t2 - t0}ms\n`);
                    } catch (e) {
                        console.error('Logic Error:', e);
                        res.writeHead(500); res.end(JSON.stringify({ error: 'Processing Error', details: e.message }));
                    }
                });
            };

            attemptRequest(0);
        });
    } else {
        res.writeHead(404); res.end('Not Found');
    }
});

server.listen(3000, '0.0.0.0', () => {
    console.log('🚀 AI Worker (GROQ ROTATION) on port 3000');
    console.log(`Keys loaded: ${KEYS.length}`);
});