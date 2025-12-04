const fs = require('fs');
const path = require('path');

const OUT_DIR = path.join(__dirname, '..', 'out', 'backtests');
const JSON_DIR = path.join(__dirname, '..', 'web', 'public', 'data', 'backtests');

// Erstelle Ausgabeverzeichnis
if (!fs.existsSync(JSON_DIR)) {
    fs.mkdirSync(JSON_DIR, { recursive: true });
}

// Finde alle team_backtest_summary_*.csv Dateien
const files = fs.readdirSync(OUT_DIR).filter(f => f.startsWith('team_backtest_summary_') && f.endsWith('.csv'));

console.log(`Gefunden: ${files.length} Backtest-Summary-Dateien`);

files.forEach(filename => {
    // Parse filename: team_backtest_summary_2020-21_gw2-38.csv
    const match = filename.match(/team_backtest_summary_(.+)_gw(\d+-\d+)\.csv/);
    if (!match) {
        console.log(`Überspringe: ${filename} (ungültiges Format)`);
        return;
    }

    const season = match[1];
    const gwRange = match[2];

    // Lese CSV
    const csvPath = path.join(OUT_DIR, filename);
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const lines = csvContent.trim().split('\n');

    // Parse CSV (einfach, ohne Bibliothek)
    const headers = lines[0].split(',');
    const records = [];

    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',');
        const record = {
            method: values[0],
            season: season,
            gw_range: gwRange,
            avg_points: parseFloat(values[1]),
            efficiency: parseFloat(values[4])
        };
        records.push(record);
    }

    // Schreibe JSON
    const jsonPath = path.join(JSON_DIR, `${season}_gw${gwRange}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(records, null, 2));
    console.log(`✓ ${season}_gw${gwRange}.json`);
});

console.log('\nFertig!');
