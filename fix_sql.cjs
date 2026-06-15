const fs = require('fs');

try {
  let content = fs.readFileSync('00_APPLY_HIERARCHY.sql', 'utf8');
  
  // Replace CREATE POLICY even if spanning newlines
  content = content.replace(/CREATE POLICY "([^"]+)"\s*ON\s*(public\.[a-zA-Z0-9_]+)/gi, 'DROP POLICY IF EXISTS "$1" ON $2;\nCREATE POLICY "$1" ON $2');
  
  // Replace CREATE TRIGGER IF NOT EXISTS -> wait, postgres doesn't have CREATE TRIGGER IF NOT EXISTS before PG 14? We're on Supabase (PG 15).
  // But triggers might crash. Let's see if there are any "already exists" errors for policies, those are the common ones.

  fs.writeFileSync('00_APPLY_HIERARCHY.sql', content, 'utf8');
  console.log('Fixed SQL file successfully.');
} catch (e) {
  console.error(e);
}
