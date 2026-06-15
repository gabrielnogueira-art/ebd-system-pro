import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://tqgsirutntejwkowplnc.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxZ3NpcnV0bnRlandrb3dwbG5jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1OTMwMjgsImV4cCI6MjA3MjE2OTAyOH0._qK4nd6o6CDsl2X_anEC6Ds8R21NJfTQXmiPZwxw8bc";

const db = createClient(supabaseUrl, supabaseKey);

async function testUpdate() {
  console.log("Testing update on congregations...");
  
  // Try to find a congregation
  const { data: congs, error: err1 } = await db.from('congregations').select('*').limit(1);
  if (err1) {
    console.error("Select error:", err1);
    return;
  }
  if (!congs || congs.length === 0) {
    console.log("No congregations found.");
    return;
  }
  
  const target = congs[0];
  console.log("Target congregation:", target);
  
  const { data, error } = await db.from('congregations').update({
    name: target.name + " test"
  }).eq('id', target.id).select();
  
  if (error) {
    console.error("Update error:", error);
  } else {
    console.log("Update success:", data);
    
    // revert
    await db.from('congregations').update({
      name: target.name
    }).eq('id', target.id);
    console.log("Reverted.");
  }
}

testUpdate();
