const fs = require('fs');
const path = require('path');
const os = require('os');

const configPath = path.join(os.homedir(), '.gemini', 'antigravity', 'mcp_config.json');

let config = { mcpServers: {} };

if (fs.existsSync(configPath)) {
  try {
    const raw = fs.readFileSync(configPath, 'utf8');
    config = JSON.parse(raw);
  } catch (e) {
    console.error('Error reading existing config', e);
  }
}

if (!config.mcpServers) config.mcpServers = {};

config.mcpServers.supabase = {
  serverUrl: "https://mcp.supabase.com/mcp?project_ref=fotzydevyvvklalgsomf&features=docs%2Caccount%2Cdatabase%2Cdebugging%2Cdevelopment%2Cfunctions%2Cbranching%2Cstorage"
};

fs.mkdirSync(path.dirname(configPath), { recursive: true });
fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');

console.log('MCP config updated successfully at ' + configPath);
