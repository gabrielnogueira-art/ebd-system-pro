const fs = require('fs');
const path = require('path');

const migrationsDir = path.join(__dirname, 'supabase', 'migrations');
const files = fs.readdirSync(migrationsDir)
  .filter(f => f.startsWith('2026') && f.endsWith('.sql'))
  .sort();

let finalSql = '';

for (const file of files) {
  let content = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
  
  finalSql += `\n\n-- ========================================================\n`;
  finalSql += `-- MIGRATION: ${file}\n`;
  finalSql += `-- ========================================================\n\n`;
  
  finalSql += content;
}

const policyRegex = /CREATE POLICY\s+"([^"]+)"\s+ON\s+([a-zA-Z0-9_\.]+)/gi;

finalSql = finalSql.replace(policyRegex, (match, p1, p2) => {
  return `DROP POLICY IF EXISTS "${p1}" ON ${p2};\n${match}`;
});

finalSql = finalSql.replace(/ALTER TYPE public\.app_role ADD VALUE IF NOT EXISTS '[^']+';/g, (match) => {
  return `${match}\nCOMMIT;`;
});

// Inject setval to fix sequence out of sync for classes
finalSql = finalSql.replace(/DO \$seed\$/g, (match) => {
  return `SELECT setval(pg_get_serial_sequence('public.classes', 'id'), coalesce(max(id), 0) + 1, false) FROM public.classes;\n\n${match}`;
});

fs.writeFileSync('00_APPLY_HIERARCHY.sql', finalSql, 'utf8');
console.log('Clean SQL file generated with', files.length, 'migrations, with COMMITs and setval added.');
