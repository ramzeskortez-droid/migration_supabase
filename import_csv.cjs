const fs = require('fs');
const { spawnSync } = require('child_process');

function importCSV(filePath, tableName) {
    if (!fs.existsSync(filePath)) return;

    console.log(`Importing ${filePath} to ${tableName}...`);
    
    // Читаем файл
    const csvContent = fs.readFileSync(filePath);
    
    // Формируем команду для psql, которая будет читать из STDIN
    const sql = `COPY public.${tableName} FROM STDIN WITH (FORMAT csv, HEADER true, QUOTE '"', DELIMITER ',');`;
    
    // Запускаем docker exec и передаем контент через stdin
    const result = spawnSync('docker', [
        'exec', '-i', 'supabase_db_supabase', 
        'psql', '-U', 'postgres', '-d', 'postgres', '-c', sql
    ], { input: csvContent });

    if (result.status !== 0) {
        console.error(`Error: ${result.stderr.toString()}`);
    } else {
        console.log(`Result: ${result.stdout.toString().trim()}`);
    }
}

// Сначала очистим всё
spawnSync('docker', ['exec', '-i', 'supabase_db_supabase', 'psql', '-U', 'postgres', '-d', 'postgres', '-c', 'TRUNCATE orders, order_items CASCADE;']);

importCSV('orders_rows.csv', 'orders');
importCSV('order_items_rows.csv', 'order_items');
