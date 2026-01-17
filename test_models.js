const { exec } = require('child_process');
const key = 'd2e30fb3ab3845e784a558acad923543.XTDy6rAt9fwzyAX1';
const url = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';

// Пробуем разные написания
const models = ['glm-4.5-flash', 'glm-4-flash', 'glm-4.6v-flash'];

function test(model) {
    const cmd = `curl -s -X POST "${url}" -H "Authorization: Bearer ${key}" -H "Content-Type: application/json" -d '{"model":"${model}","messages":[{"role":"user","content":"Hi"}]}'`;
    console.log(`Testing ${model}...`);
    exec(cmd, (err, stdout) => {
        console.log(`[${model}] Result:`, stdout);
    });
}

models.forEach(test);