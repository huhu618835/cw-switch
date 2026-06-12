const express = require('express');
const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const http = require('http');

// ── Paths ──────────────────────────────────────────────────────────────────
const CONFIG_DIR = path.join(os.homedir(), '.codewhale');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.toml');
const SECRETS_FILE = path.join(CONFIG_DIR, 'secrets', 'secrets.json');
const PROFILES_DIR = path.join(CONFIG_DIR, 'profiles');

// ── Find codewhale binary ──────────────────────────────────────────────────
function findCodewhale() {
  const npmDir = path.join(os.homedir(), 'AppData', 'Roaming', 'npm');
  const candidates = [
    // .cmd first on Windows — spawn() needs explicit extension for cmd wrappers
    path.join(npmDir, 'codewhale.cmd'),
    path.join(npmDir, 'codewhale'),
    path.join(npmDir, 'codewhale.exe'),
    path.join(npmDir, 'node_modules', 'codewhale', 'bin', 'codewhale.js'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  // On Windows, try .cmd fallback via PATH
  if (process.platform === 'win32') return 'codewhale.cmd';
  return 'codewhale';
}
const CODEWHALE_BIN = findCodewhale();
console.log(`[cw-switch] codewhale binary: ${CODEWHALE_BIN}`);

// ── Known Providers ────────────────────────────────────────────────────────
const PROVIDERS = [
  { id: 'deepseek',      name: 'DeepSeek',     models: ['deepseek-v4-pro', 'deepseek-v4-flash'],     defaultModel: 'deepseek-v4-pro',   defaultBaseUrl: 'https://api.deepseek.com/beta' },
  { id: 'nvidia-nim',    name: 'NVIDIA NIM',   models: ['deepseek-ai/deepseek-v4-pro', 'deepseek-ai/deepseek-v4-flash'], defaultModel: 'deepseek-ai/deepseek-v4-pro', defaultBaseUrl: 'https://integrate.api.nvidia.com/v1' },
  { id: 'openai',        name: 'OpenAI',       models: ['gpt-4o', 'gpt-4o-mini', 'gpt-5.5'],         defaultModel: 'gpt-4o',            defaultBaseUrl: 'https://api.openai.com/v1' },
  { id: 'openai-codex',  name: 'OpenAI Codex', models: ['codex'],                                   defaultModel: 'codex',             defaultBaseUrl: 'https://api.openai.com/v1' },
  { id: 'ollama',        name: 'Ollama',       models: ['CUSTOM'],                                  defaultModel: '',                  defaultBaseUrl: 'http://localhost:11434/v1' },
  { id: 'vllm',          name: 'vLLM',         models: ['CUSTOM'],                                  defaultModel: '',                  defaultBaseUrl: 'http://localhost:8000/v1' },
  { id: 'sglang',        name: 'SGLang',       models: ['CUSTOM'],                                  defaultModel: '',                  defaultBaseUrl: 'http://localhost:30000/v1' },
  { id: 'huggingface',   name: 'HuggingFace',  models: ['deepseek-ai/DeepSeek-V4-Pro', 'deepseek-ai/DeepSeek-V4-Flash', 'CUSTOM'], defaultModel: 'deepseek-ai/DeepSeek-V4-Pro', defaultBaseUrl: 'https://api-inference.huggingface.co/v1' },
  { id: 'together',      name: 'Together AI',  models: ['deepseek-ai/DeepSeek-V4-Pro', 'deepseek-ai/DeepSeek-V4-Flash'], defaultModel: 'deepseek-ai/DeepSeek-V4-Pro', defaultBaseUrl: 'https://api.together.xyz/v1' },
  { id: 'siliconflow',   name: 'SiliconFlow',  models: ['deepseek-ai/DeepSeek-V4-Pro', 'deepseek-ai/DeepSeek-V4-Flash'], defaultModel: 'deepseek-ai/DeepSeek-V4-Pro', defaultBaseUrl: 'https://api.siliconflow.cn/v1' },
  { id: 'siliconflow-CN',name: 'SiliconFlow CN',models: ['deepseek-ai/DeepSeek-V4-Pro', 'deepseek-ai/DeepSeek-V4-Flash'], defaultModel: 'deepseek-ai/DeepSeek-V4-Pro', defaultBaseUrl: 'https://api.siliconflow.cn/v1' },
  { id: 'fireworks',     name: 'Fireworks AI', models: ['accounts/fireworks/models/deepseek-v4-pro', 'accounts/fireworks/models/deepseek-v4-flash'], defaultModel: 'accounts/fireworks/models/deepseek-v4-pro', defaultBaseUrl: 'https://api.fireworks.ai/inference/v1' },
  { id: 'atlascloud',    name: 'AtlasCloud',   models: ['deepseek-v4-pro', 'deepseek-v4-flash'],     defaultModel: 'deepseek-v4-pro',   defaultBaseUrl: 'https://api.atlascloud.xyz/v1' },
  { id: 'wanjie-ark',    name: 'Wanjie Ark',   models: ['deepseek-reasoner', 'deepseek-v4'],         defaultModel: 'deepseek-reasoner', defaultBaseUrl: 'https://maas-openapi.wanjiedata.com/api/v1' },
  { id: 'volcengine',    name: 'Volcengine',   models: ['deepseek-v4'],                              defaultModel: 'deepseek-v4',       defaultBaseUrl: 'https://ark.cn-beijing.volces.com/api/v3' },
  { id: 'openrouter',    name: 'OpenRouter',   models: ['deepseek/deepseek-v4-pro', 'deepseek/deepseek-v4-flash'], defaultModel: 'deepseek/deepseek-v4-pro', defaultBaseUrl: 'https://openrouter.ai/api/v1' },
  { id: 'novita',        name: 'Novita AI',    models: ['deepseek/deepseek-v4-pro', 'deepseek/deepseek-v4-flash'], defaultModel: 'deepseek/deepseek-v4-pro', defaultBaseUrl: 'https://api.novita.ai/v1' },
  { id: 'xiaomi-mimo',   name: 'Xiaomi MiMo',  models: ['mimo-pro', 'mimo-flash'],                   defaultModel: 'mimo-pro',          defaultBaseUrl: 'https://api.mimo.xiaomi.com/v1' },
  { id: 'moonshot',      name: 'Moonshot',     models: ['moonshot-v1'],                              defaultModel: 'moonshot-v1',       defaultBaseUrl: 'https://api.moonshot.cn/v1' },
  { id: 'arcee',         name: 'Arcee',        models: ['trinity-large-thinking'],                   defaultModel: 'trinity-large-thinking', defaultBaseUrl: 'https://api.arcee.ai/api/v1' },
];

const REASONING_EFFORTS = ['off', 'low', 'medium', 'high', 'max'];

// ── Helpers ────────────────────────────────────────────────────────────────

/** Run `codewhale <args>` and return stdout string. */
function cw(args, timeout = 15000) {
  return new Promise((resolve, reject) => {
    const npmBin = path.join(os.homedir(), 'AppData', 'Roaming', 'npm');
    const env = { ...process.env };
    if (process.platform === 'win32' && env.PATH && !env.PATH.includes(npmBin)) {
      env.PATH = npmBin + path.delimiter + env.PATH;
    }
    // On Windows, route through cmd.exe to handle .cmd wrappers properly
    const spawnCmd = process.platform === 'win32' ? 'cmd' : CODEWHALE_BIN;
    const spawnArgs = process.platform === 'win32'
      ? ['/d', '/c', CODEWHALE_BIN, ...args]
      : args;
    const child = spawn(spawnCmd, spawnArgs, {
      windowsHide: true,
      env,
    });
    // Manual timeout via timer (Windows can't use spawn timeout option with .cmd)
    const timer = setTimeout(() => { child.kill(); reject(new Error('Command timed out')); }, timeout);
    let stdout = '', stderr = '';
    child.stdout.on('data', d => stdout += d);
    child.stderr.on('data', d => stderr += d);
    child.on('close', code => {
      clearTimeout(timer);
      if (code === 0) resolve(stdout.trim());
      else reject(new Error(stderr.trim() || stdout.trim() || `Exit code ${code}`));
    });
    child.on('error', e => reject(new Error(`Failed to spawn codewhale: ${e.message}`)));
  });
}

/** Parse `codewhale config list` output (TOML lines) into an object. */
function parseConfigList(tomlStr) {
  const obj = {};
  for (const line of tomlStr.split('\n')) {
    const m = line.match(/^(\w+)\s*=\s*(.+)$/);
    if (m) {
      let val = m[2].trim();
      if (val === 'true') val = true;
      else if (val === 'false') val = false;
      else if (/^\d+$/.test(val)) val = Number(val);
      else if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
      obj[m[1]] = val;
    }
  }
  return obj;
}

/** Check if a config key is safe to write via 'config set'.
 *  Complex TOML structures (tables, nested paths) get flattened by config list
 *  and writing them back as flat strings corrupts the TOML file. */
function isSafeConfigKey(key) {
  if (!key || typeof key !== 'string') return false;
  // TOML table/section keys — never write back
  if (key === 'projects' || key === 'workspace' || key === 'http_headers') return false;
  // Nested keys (e.g. projects.'path'.trust_level) — flattened table refs
  if (key.includes('.') || key.includes("'") || key.includes('"')) return false;
  // Keys starting with common table prefixes
  if (key.startsWith('projects.') || key.startsWith('workspace.') || key.startsWith('providers.')) return false;
  return true;
}

/** Read secrets.json – always returns an object. */
function readSecrets() {
  try {
    if (fs.existsSync(SECRETS_FILE)) {
      const raw = fs.readFileSync(SECRETS_FILE, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (e) {
    // corrupted — back it up
    try {
      fs.renameSync(SECRETS_FILE, SECRETS_FILE + '.bak');
    } catch (_) {}
  }
  return { entries: {} };
}

function writeSecrets(data) {
  fs.mkdirSync(path.dirname(SECRETS_FILE), { recursive: true });
  fs.writeFileSync(SECRETS_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

/** List profile files */
function listProfiles() {
  try {
    if (!fs.existsSync(PROFILES_DIR)) return [];
    return fs.readdirSync(PROFILES_DIR).filter(f => f.endsWith('.toml')).map(f => ({
      name: f.replace(/\.toml$/, ''),
      file: path.join(PROFILES_DIR, f),
    }));
  } catch { return []; }
}

// ── Express App ────────────────────────────────────────────────────────────
const app = express();
app.use(express.json());

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// ── API Routes ─────────────────────────────────────────────────────────────

/** GET /api/status — summary of current config */
app.get('/api/status', async (req, res) => {
  try {
    const raw = await cw(['config', 'list']);
    const config = parseConfigList(raw);
    const secrets = readSecrets();

    res.json({
      provider: config.provider || '',
      default_text_model: config.default_text_model || '',
      reasoning_effort: config.reasoning_effort || '',
      base_url: config.base_url || '',
      auth_mode: config.auth_mode || '',
      api_key_masked: maskKey(secrets.entries[config.provider] || ''),
      has_api_key: !!secrets.entries[config.provider],
      memory_enabled: config.memory_enabled === true,
      approval_policy: config.approval_policy || '',
      sandbox_mode: config.sandbox_mode || '',
      allow_shell: config.allow_shell !== false,
      max_subagents: config.max_subagents || 10,
    });
  } catch (e) {
    if (e.message.includes('Failed to spawn')) {
      return res.status(500).json({ error: 'CODEWHALE_NOT_FOUND', detail: '未找到 codewhale，请确认已安装: npm install -g codewhale' });
    }
    if (e.message.includes('Exit code') || e.message.includes('config')) {
      return res.json({ provider: '', default_text_model: '', reasoning_effort: '', base_url: '', auth_mode: '', api_key_masked: '', has_api_key: false, memory_enabled: false, approval_policy: '', sandbox_mode: '', allow_shell: true, max_subagents: 10 });
    }
    res.status(500).json({ error: 'CONFIG_READ_FAILED', detail: e.message });
  }
});

/** GET /api/config — full config object */
app.get('/api/config', async (req, res) => {
  try {
    const raw = await cw(['config', 'list']);
    const config = parseConfigList(raw);
    res.json(config);
  } catch (e) {
    if (e.message.includes('Failed to spawn')) {
      return res.status(500).json({ error: 'CODEWHALE_NOT_FOUND', detail: '未找到 codewhale' });
    }
    res.json({});
  }
});

/** PUT /api/config — set a single config key */
app.put('/api/config', async (req, res) => {
  const { key, value } = req.body;
  if (!key) return res.status(400).json({ error: 'key is required' });
  if (!isSafeConfigKey(key)) return res.status(400).json({ error: `Cannot set '${key}' — this key manages complex TOML structure and cannot be modified via this tool.` });

  // Protect secrets from log
  const isKeyLike = key.toLowerCase().includes('key');

  try {
    await cw(['config', 'set', key, String(value)]);
    res.json({ ok: true, key, value });
  } catch (e) {
    res.status(500).json({ error: 'CONFIG_SET_FAILED', detail: e.message, key });
  }
});

/** POST /api/config/batch — apply multiple changes */
app.post('/api/config/batch', async (req, res) => {
  const pairs = req.body;
  if (!Array.isArray(pairs)) return res.status(400).json({ error: 'body must be an array of {key, value}' });

  const results = [];
  for (const { key, value } of pairs) {
    if (!key) { results.push({ key, error: 'missing key' }); continue; }
    if (!isSafeConfigKey(key)) { results.push({ key, error: 'skipped — complex TOML structure', skipped: true }); continue; }
    try {
      await cw(['config', 'set', key, String(value)]);
      results.push({ key, ok: true });
    } catch (e) {
      results.push({ key, error: e.message });
    }
  }
  res.json({ ok: results.every(r => r.ok), results });
});

/** GET /api/auth/:provider — check if API key exists */
app.get('/api/auth/:provider', (req, res) => {
  const secrets = readSecrets();
  const key = secrets.entries[req.params.provider] || '';
  res.json({ has_key: !!key, masked: maskKey(key) });
});

/** POST /api/auth/:provider — set API key */
app.post('/api/auth/:provider', async (req, res) => {
  const { apiKey } = req.body;
  if (!apiKey) return res.status(400).json({ error: 'apiKey is required' });

  const secrets = readSecrets();
  secrets.entries[req.params.provider] = apiKey;
  writeSecrets(secrets);

  // Clear stale api_key from config.toml so CodeWhale reads from secrets.json
  const provider = req.params.provider;
  try { await cw(['config', 'set', 'api_key', '']); } catch (_) {}
  try { await cw(['config', 'set', `providers.${provider}.api_key`, '']); } catch (_) {}

  res.json({ ok: true });
});

/** DELETE /api/auth/:provider — remove API key */
app.delete('/api/auth/:provider', async (req, res) => {
  const secrets = readSecrets();
  delete secrets.entries[req.params.provider];
  writeSecrets(secrets);

  // Also clean up config.toml to prevent stale key conflicts
  const provider = req.params.provider;
  try { await cw(['config', 'set', 'api_key', '']); } catch (_) {}
  try { await cw(['config', 'set', `providers.${provider}.api_key`, '']); } catch (_) {}

  res.json({ ok: true });
});

/** GET /api/providers — list known providers */
app.get('/api/providers', (req, res) => {
  res.json(PROVIDERS);
});

/** GET /api/models — list available models from CLI */
app.get('/api/models', async (req, res) => {
  try {
    const raw = await cw(['models'], 10000);
    const lines = raw.split('\n').filter(l => l.trim());
    res.json(lines.map(l => ({ name: l.trim(), isDefault: false })));
  } catch {
    // Fallback: return empty, frontend will use static per-provider list
    res.json([]);
  }
});

/** GET /api/profiles — list saved profiles */
app.get('/api/profiles', (req, res) => {
  const profiles = listProfiles();
  const result = profiles.map(p => {
    try {
      const content = fs.readFileSync(p.file, 'utf-8');
      const meta = {};
      for (const line of content.split('\n')) {
        const m = line.match(/^(\w+)\s*=\s*"(.+)"$/);
        if (m) meta[m[1]] = m[2];
      }
      return { name: p.name, description: meta.description || '', key_count: Object.keys(parseProfileConfig(content)).length };
    } catch {
      return { name: p.name, description: '', key_count: 0 };
    }
  });
  res.json(result);
});

/** POST /api/profiles — save current config as a profile */
app.post('/api/profiles', async (req, res) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  if (!/^[\w-]+$/.test(name)) return res.status(400).json({ error: 'name must be alphanumeric, dashes or underscores only' });

  try {
    const raw = await cw(['config', 'list']);
    const config = parseConfigList(raw);
    const secrets = readSecrets();

    // Build profile TOML — exclude keys that shouldn't be saved
    const excludeKeys = ['api_key', 'projects', 'harness_profiles', 'auth_mode', 'http_headers'];
    const lines = [
      `name = "${name}"`,
      description ? `description = "${description}"` : '',
      `created = "${new Date().toISOString()}"`,
      '',
      '[config]',
    ].filter(Boolean);

    for (const [k, v] of Object.entries(config)) {
      if (excludeKeys.includes(k)) continue;
      if (k.startsWith('projects.') || k.startsWith('providers.') || k.startsWith('workspace.')) continue;
      if (typeof v === 'string') lines.push(`${k} = "${v}"`);
      else if (typeof v === 'boolean') lines.push(`${k} = ${v}`);
      else if (typeof v === 'number') lines.push(`${k} = ${v}`);
    }

    // Include API key hint
    const apiKey = secrets.entries[config.provider] || '';
    if (apiKey) {
      lines.push('');
      lines.push(`[secrets]`);
      lines.push(`${config.provider} = "${maskKey(apiKey)}"`);
    }

    fs.mkdirSync(PROFILES_DIR, { recursive: true });
    fs.writeFileSync(path.join(PROFILES_DIR, `${name}.toml`), lines.join('\n'), 'utf-8');
    res.json({ ok: true, name });
  } catch (e) {
    res.status(500).json({ error: 'PROFILE_SAVE_FAILED', detail: e.message });
  }
});

/** PUT /api/profiles/:name — load a profile */
app.put('/api/profiles/:name', async (req, res) => {
  const name = req.params.name;
  const file = path.join(PROFILES_DIR, `${name}.toml`);
  if (!fs.existsSync(file)) return res.status(404).json({ error: 'Profile not found' });

  try {
    const content = fs.readFileSync(file, 'utf-8');
    const config = parseProfileConfig(content);
    const results = [];

    for (const [key, value] of Object.entries(config)) {
      if (!isSafeConfigKey(key)) continue;
      try {
        await cw(['config', 'set', key, String(value)]);
        results.push({ key, ok: true });
      } catch (e) {
        results.push({ key, error: e.message });
      }
    }

    res.json({ ok: results.every(r => r.ok), results });
  } catch (e) {
    res.status(500).json({ error: 'PROFILE_LOAD_FAILED', detail: e.message });
  }
});

/** DELETE /api/profiles/:name — delete a profile */
app.delete('/api/profiles/:name', (req, res) => {
  const file = path.join(PROFILES_DIR, `${req.params.name}.toml`);
  if (!fs.existsSync(file)) return res.status(404).json({ error: 'Profile not found' });
  fs.unlinkSync(file);
  res.json({ ok: true });
});

/** POST /api/launch — start codewhale in new terminal */
app.post('/api/launch', (req, res) => {
  try {
    if (process.platform === 'win32') {
      exec(`start "" codewhale`);
    } else {
      exec(`x-terminal-emulator codewhale`);
    }
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'LAUNCH_FAILED', detail: e.message });
  }
});

// ── Helpers ────────────────────────────────────────────────────────────────

function maskKey(key) {
  if (!key || key.length < 8) return key || '';
  return key.slice(0, 7) + '*'.repeat(Math.min(key.length - 7, 16)) + key.slice(-3);
}

function parseProfileConfig(tomlContent) {
  const config = {};
  let inConfig = false;
  for (const line of tomlContent.split('\n')) {
    if (line.trim() === '[config]') { inConfig = true; continue; }
    if (line.startsWith('[')) { inConfig = false; continue; }
    if (!inConfig) continue;
    const m = line.match(/^(\w+)\s*=\s*(.+)$/);
    if (m) {
      let val = m[2].trim();
      if (val === 'true') val = true;
      else if (val === 'false') val = false;
      else if (/^\d+$/.test(val)) val = Number(val);
      else if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
      config[m[1]] = val;
    }
  }
  return config;
}

// ── Server Start ───────────────────────────────────────────────────────────
function startServer() {
  const server = http.createServer(app);

  server.listen(0, '127.0.0.1', () => {
    const port = server.address().port;
    console.log(`\n  🐋 cw-switch 已启动！`);
    console.log(`  ─────────────────────────────`);
    console.log(`  🌐 打开浏览器访问:`);
    console.log(`  →  http://127.0.0.1:${port}`);
    console.log(`  `);
    console.log(`  ⌨  Ctrl+C 停止服务\n`);

    // Auto-open browser
    const url = `http://127.0.0.1:${port}`;
    if (process.env.ELECTRON_RUN !== '1') {
      // Try a few ways to open browser on Windows
      exec(`start "" "${url}"`, () => {});
    }
  });
}

startServer();
