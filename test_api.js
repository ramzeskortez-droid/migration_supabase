const { exec } = require('child_process');
const key = 'd2e30fb3ab3845e784a558acad923543.XTDy6rAt9fwzyAX1';
const url = 'https://open.bigmodel.cn/api/paas/v4/chat/completions'; // Пробуем оригинал

const cmd = `curl -s -X POST "${url}" -H "Authorization: Bearer ${key}" -H "Content-Type: application/json" -d '{"model":"glm-4-flash","messages":[{"role":"user","content":"Hi"}]}'`;

console.log("Testing API...");
exec(cmd, (err, stdout, stderr) => {
    if (err) console.error("EXEC ERROR:", err);
    console.log("STDOUT:", stdout);
    console.log("STDERR:", stderr);
});
