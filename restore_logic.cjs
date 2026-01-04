const fs = require('fs');
const { execSync } = require('child_process');

async function restore() {
    console.log('Reading functions from json2.txt...');
    const functions = JSON.parse(fs.readFileSync('json2.txt', 'utf8'));
    
    console.log(`Found ${functions.length} functions.`);
    
    for (const func of functions) {
        console.log(`Applying function: ${func.function_name}...`);
        try {
            fs.writeFileSync('temp_func.sql', func.definition);
            // Используем docker exec для выполнения SQL напрямую в контейнере
            execSync('docker exec -i supabase_db_supabase_migration psql -U postgres -d postgres < temp_func.sql', { stdio: 'ignore' });
        } catch (error) {
            // Если имя контейнера другое, попробуем через стандартный префикс
            try {
                execSync('docker exec -i supabase_db_supabase psql -U postgres -d postgres < temp_func.sql', { stdio: 'ignore' });
            } catch (e) {
                console.error(`Error applying function ${func.function_name}:`, e.message);
            }
        }
    }
    
    if (fs.existsSync('temp_func.sql')) fs.unlinkSync('temp_func.sql');
    console.log('Logic restoration complete.');
}

restore();