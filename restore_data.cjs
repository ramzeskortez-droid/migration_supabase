const fs = require('fs');
const { execSync } = require('child_process');

async function restore() {
    console.log('Reading data from json1.txt...');
    const rawData = JSON.parse(fs.readFileSync('json1.txt', 'utf8'));
    const data = rawData[0].all_data;
    
    const tables = ['orders', 'order_items', 'offers', 'offer_items'];
    
    for (const table of tables) {
        const rows = data[table];
        if (!rows || rows.length === 0) {
            console.log(`No data for table ${table}, skipping.`);
            continue;
        }
        
        console.log(`Restoring ${rows.length} rows to ${table}...`);
        
        let sql = `TRUNCATE TABLE public.${table} CASCADE;\n`;
        for (const row of rows) {
            const columns = Object.keys(row);
            const values = columns.map(col => {
                const val = row[col];
                if (val === null) return 'NULL';
                if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
                if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
                return val;
            });
            sql += `INSERT INTO public.${table} (${columns.join(', ')}) VALUES (${values.join(', ')});\n`;
        }
        
        fs.writeFileSync('temp_data.sql', sql);
        try {
            execSync('docker exec -i supabase_db_supabase_migration psql -U postgres -d postgres < temp_data.sql', { stdio: 'ignore' });
        } catch (error) {
            try {
                execSync('docker exec -i supabase_db_supabase psql -U postgres -d postgres < temp_data.sql', { stdio: 'ignore' });
            } catch (e) {
                console.error(`Error restoring table ${table}:`, e.message);
            }
        }
    }
    
    if (fs.existsSync('temp_data.sql')) fs.unlinkSync('temp_data.sql');
    console.log('Data restoration complete.');
}

restore();