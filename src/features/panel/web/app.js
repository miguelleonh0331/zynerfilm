const $ = id => document.getElementById(id);
const tiles = new Map();
let expandedTile;
let pendingDelete;
let botStatusTimer, pollingBots = false, summaryPoll;
function status(message, error = false) { $('status').textContent = message; $('status').classList.toggle('error', error); }
async function api(path, options = {}) {
  const response = await fetch('/api/' + path, { ...options, headers: { 'Content-Type': 'application/json', ...options.headers } });
  const result = await response.json();
  if (!response.ok) {
    if (response.status === 401) { clearInterval(botStatusTimer); stopAll(); $('login').hidden = false; $('workspace').hidden = $('sidebar-content').hidden = true; }
    throw new Error(result.error || 'No se pudo completar la operacion.');
  }
  return result;
}
function endpoint() {
  const ip = $('ip').value.trim().replace(/^\[|\]$/g, '');
  return (ip.includes(':') ? '[' + ip + ']' : ip) + ':' + $('port').value;
}
function element(tag, className, text) {
  const node = document.createElement(tag); node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
function createTile(device) {
  const target = device.endpoint;
  const tile = { target, paused: false, connected: false, pointer: undefined };
  tile.card = element('article', 'device-tile'); tile.card.dataset.endpoint = target;
  const heading = element('div', 'tile-heading');
  tile.dot = element('span', 'dot');
  tile.title = element('h2', '', device.model);
  const info = element('div', 'tile-info');
  const model = element('div', 'tile-model');
  tile.counter = element('span', 'bot-counter'); tile.counter.hidden = true;
  model.append(tile.dot, tile.title, tile.counter);
  info.append(model, element('div', 'address', target));
  tile.preview = element('div', 'mini-screen');
  tile.preview.tabIndex = 0; tile.preview.setAttribute('role', 'button');
  tile.preview.setAttribute('aria-label', 'Ampliar pantalla de ' + target);
  tile.canvas = element('canvas', ''); tile.canvas.hidden = true; tile.canvas.tabIndex = -1;
  tile.canvas.setAttribute('aria-label', 'Pantalla de ' + target);
  tile.placeholder = element('div', 'mini-placeholder');
  tile.placeholder.append(element('span', '', '▯'), element('p', '', 'Esperando pantalla'));
  tile.preview.append(tile.canvas, tile.placeholder, element('span', 'zoom-label', '↗ Ampliar pantalla'));
  tile.preview.onclick = () => expand(tile);
  tile.preview.onkeydown = event => {
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); expand(tile); }
  };
  tile.state = element('div', 'tile-state', 'Preparando…');
  const menu = element('details', 'tile-menu');
  const summary = element('summary', '', '⋯');
  summary.setAttribute('aria-label', 'Acciones de ' + target);
  const actions = element('div', 'dropdown-actions');
  menu.append(summary, actions);
  tile.toggle = element('button', '', 'Abrir vista');
  tile.toggle.onclick = async () => {
    menu.open = false;
    if (tile.ws) { tile.paused = true; stopPreview(tile); tile.state.textContent = 'Vista pausada'; tile.placeholder.lastChild.textContent = 'Vista pausada'; return; }
    tile.toggle.disabled = true;
    try {
      tile.paused = false;
      if (!tile.connected) { await api('devices', { method: 'POST', body: JSON.stringify({ endpoint: target }) }); await refresh(); }
      else startPreview(tile);
    } catch (error) { status(error.message, true); tile.state.textContent = error.message; }
    finally { tile.toggle.disabled = false; }
  };
  const disconnect = element('button', '', 'Desconectar');
  disconnect.onclick = async () => {
    menu.open = false;
    try {
      tile.paused = true; stopPreview(tile);
      await api('disconnect', { method: 'POST', body: JSON.stringify({ endpoint: target }) });
      await refresh(); status('Equipo desconectado.');
    } catch (error) { status(error.message, true); }
  };
  const remove = element('button', 'delete-action', 'Eliminar equipo');
  remove.onclick = () => {
    menu.open = false; pendingDelete = tile;
    $('delete-target').textContent = tile.title.textContent + ' · ' + target;
    $('delete-error').textContent = '';
    $('delete-dialog').showModal();
  };
  const agent = element('button', '', 'Agente IA');
  agent.onclick = () => { menu.open = false; openAgent(target, tile.title.textContent); };
  tile.botButton = element('button', 'bot-toggle', 'Iniciar bot');
  tile.botButton.onclick = async () => {
    menu.open = false; tile.botPending = true; tile.botButton.disabled = true;
    try {
      const current = await api('bot?endpoint=' + encodeURIComponent(target));
      const result = await api('bot', { method: current.running ? 'DELETE' : 'POST', body: JSON.stringify({ endpoint: target }) });
      paintBot(tile, result);
      status(result.running ? 'Bot iniciado en ' + tile.title.textContent + '.' : 'Bot detenido.');
    } catch (error) { status(error.message, true); }
    finally { tile.botPending = false; tile.botButton.disabled = false; }
  };
  actions.append(tile.toggle, disconnect, agent, tile.botButton, remove);
  info.append(tile.state); heading.append(info, menu);
  tile.card.append(heading, tile.preview);
  installControls(tile);
  return tile;
}
async function refresh() {
  const result = await api('devices');
  const available = new Set(result.devices.map(device => device.endpoint));
  for (const [target, tile] of tiles) {
    if (!available.has(target)) { stopPreview(tile); tile.card.remove(); tiles.delete(target); }
  }
  $('device-list').replaceChildren(); $('count').textContent = result.devices.length;
  $('empty').hidden = result.devices.length > 0;
  for (const device of result.devices) {
    let tile = tiles.get(device.endpoint);
    if (!tile) { tile = createTile(device); tiles.set(device.endpoint, tile); }
    tile.title.textContent = device.model;
    tile.connected = device.state === 'device';
    tile.dot.classList.toggle('offline', !tile.connected);
    $('devices').append(tile.card);
    const link = element('button', 'device-link');
    const dot = element('span', 'dot' + (tile.connected ? '' : ' offline'));
    const details = element('span', '');
    const linkCounter = element('small', 'link-counter'); linkCounter.hidden = true;
    details.append(element('strong', '', device.model), element('small', '', device.endpoint), linkCounter);
    tile.link = link; tile.linkCounter = linkCounter;
    paintBot(tile, { running: Boolean(device.botRunning) });
    link.append(dot, details); link.onclick = () => expand(tile); $('device-list').append(link);
    if (tile.connected && !tile.ws && !tile.paused) startPreview(tile);
    if (!tile.connected) {
      stopPreview(tile);
      tile.state.textContent = ({ offline: 'Offline', unauthorized: 'Sin autorizar', disconnected: 'Desconectado' })[device.state] || device.state;
      tile.placeholder.lastChild.textContent = tile.state.textContent;
      tile.toggle.textContent = 'Reconectar';
    }
  }
}
async function ready() {
  await refresh(); $('login').hidden = true; $('workspace').hidden = $('sidebar-content').hidden = false;
  status('Miniaturas activas. Pulsa una pantalla para ampliarla.');
  clearInterval(botStatusTimer);
  await pollBotStates();
  botStatusTimer = setInterval(pollBotStates, 2000);
}
$('login-form').onsubmit = async event => {
  event.preventDefault();
  try { await api('login', { method: 'POST', body: JSON.stringify({ token: $('token').value }) }); $('token').value = ''; await ready(); }
  catch (error) { status(error.message, true); }
};
$('add-form').onsubmit = async event => {
  event.preventDefault(); $('add-error').textContent = ''; $('add-button').disabled = true; status('Conectando con el equipo…');
  try {
    await api('devices', { method: 'POST', body: JSON.stringify({ endpoint: endpoint() }) });
    $('add-dialog').close(); $('add-form').reset(); $('add-error').textContent = '';
    await refresh(); status('Equipo agregado a la cuadrícula.');
  } catch (error) { $('add-error').textContent = error.message; status(error.message, true); }
  finally { $('add-button').disabled = false; }
};
$('open-add').onclick = () => { $('add-error').textContent = ''; $('add-dialog').showModal(); };
$('cancel-add').onclick = () => $('add-dialog').close();
$('cancel-delete').onclick = () => { $('delete-dialog').close(); pendingDelete = undefined; };
$('delete-dialog').addEventListener('close', () => { pendingDelete = undefined; });
$('confirm-delete').onclick = async () => {
  const tile = pendingDelete;
  if (!tile) return;
  $('confirm-delete').disabled = true; $('delete-error').textContent = '';
  try {
    await api('devices', { method: 'DELETE', body: JSON.stringify({ endpoint: tile.target }) });
    stopPreview(tile); $('delete-dialog').close();
    await refresh(); status('Equipo eliminado del catálogo.');
  } catch (error) { $('delete-error').textContent = error.message; status(error.message, true); }
  finally { $('confirm-delete').disabled = false; }
};
document.addEventListener('click', event => {
  for (const menu of document.querySelectorAll('.tile-menu[open]')) if (!menu.contains(event.target)) menu.open = false;
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') for (const menu of document.querySelectorAll('.tile-menu[open]')) menu.open = false;
});
$('refresh').onclick = () => refresh().then(() => status('Estados actualizados.')).catch(error => status(error.message, true));
$('logout').onclick = async () => {
  clearInterval(botStatusTimer); clearInterval(summaryPoll); clearInterval(accountPoll); stopAll();
  try { await api('logout', { method: 'POST' }); $('login').hidden = false; $('workspace').hidden = $('sidebar-content').hidden = true; status('Sesion cerrada.'); }
  catch (error) { status(error.message, true); }
};
function send(tile, message) { if (tile?.ws?.readyState === WebSocket.OPEN) tile.ws.send(JSON.stringify(message)); }
function releasePointer(tile) {
  if (tile?.pointer !== undefined && tile.lastPosition) send(tile, { type: 'touch', action: 1, ...tile.lastPosition });
  if (tile) tile.pointer = undefined;
}
function collapse() {
  if (!expandedTile) return;
  const tile = expandedTile;
  releasePointer(tile); expandedTile = undefined;
  tile.canvas.tabIndex = -1;
  tile.preview.prepend(tile.canvas);
  $('expanded').close();
  tile.preview.focus();
}
function expand(tile) {
  if (expandedTile === tile) return;
  collapse(); expandedTile = tile;
  $('viewer-title').textContent = tile.title.textContent + ' · ' + tile.target;
  $('viewer-status').textContent = tile.state.textContent;
  $('large-screen').append(tile.canvas);
  tile.canvas.tabIndex = 0;
  $('expanded').showModal();
  if (!tile.ws && tile.connected) { tile.paused = false; startPreview(tile); }
  tile.canvas.focus();
}
$('close-screen').onclick = collapse;
$('expanded').addEventListener('cancel', event => { event.preventDefault(); collapse(); });
function stopPreview(tile) {
  if (expandedTile === tile) collapse();
  const ws = tile.ws; tile.ws = undefined;
  if (ws) ws.close();
  tile.dispose?.(); tile.dispose = undefined;
  tile.canvas.hidden = true; tile.placeholder.hidden = false;
  tile.toggle.textContent = tile.connected ? 'Reanudar vista' : 'Reconectar';
}
function stopAll() { collapse(); for (const tile of tiles.values()) stopPreview(tile); }
function installControls(tile) {
  const canvas = tile.canvas;
  function position(event) {
    const box = canvas.getBoundingClientRect();
    return { x: Math.max(0, Math.min(canvas.width - 1, Math.floor((event.clientX - box.left) / box.width * canvas.width))),
      y: Math.max(0, Math.min(canvas.height - 1, Math.floor((event.clientY - box.top) / box.height * canvas.height))),
      width: canvas.width, height: canvas.height };
  }
  canvas.onpointerdown = event => {
    if (expandedTile !== tile || event.button !== 0) return;
    event.preventDefault(); canvas.focus(); tile.pointer = event.pointerId; canvas.setPointerCapture(tile.pointer);
    tile.lastPosition = position(event); send(tile, { type: 'touch', action: 0, ...tile.lastPosition });
  };
  let moveAt = 0;
  canvas.onpointermove = event => {
    if (tile.pointer !== event.pointerId || performance.now() - moveAt < 20) return;
    moveAt = performance.now(); tile.lastPosition = position(event); send(tile, { type: 'touch', action: 2, ...tile.lastPosition });
  };
  function release(event) {
    if (tile.pointer !== event.pointerId) return;
    tile.lastPosition = position(event); releasePointer(tile);
  }
  canvas.onpointerup = release; canvas.onpointercancel = release;
  canvas.onkeydown = event => {
    if (expandedTile !== tile) return;
    if (event.key === 'Escape') { event.preventDefault(); collapse(); return; }
    const key = { Backspace: 'backspace', Enter: 'enter', Home: 'home', ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' }[event.key];
    if (key) { event.preventDefault(); send(tile, { type: 'key', key }); }
    else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey) { event.preventDefault(); send(tile, { type: 'text', text: event.key }); }
  };
}
document.querySelectorAll('[data-key]').forEach(button => { button.onclick = () => send(expandedTile, { type: 'key', key: button.dataset.key }); });
$('text-form').onsubmit = event => {
  event.preventDefault(); const text = $('remote-text').value;
  if (new TextEncoder().encode(text).length > 300) { status('Texto demasiado largo: maximo 300 bytes.', true); return; }
  if (text) { send(expandedTile, { type: 'text', text }); $('remote-text').value = ''; }
};
window.addEventListener('beforeunload', () => { clearInterval(botStatusTimer); clearInterval(summaryPoll); stopAll(); });
(async () => {
  try {
    const token = new URLSearchParams(location.hash.slice(1)).get('token');
    if (token) { history.replaceState(null, '', '/'); await api('login', { method: 'POST', body: JSON.stringify({ token }) }); }
    await ready();
  } catch (error) { status(error.message, true); }
})();

function codecFromConfig(bytes) {
  for (let i = 0; i + 7 < bytes.length; i++) {
    let offset = -1;
    if (bytes[i] === 0 && bytes[i + 1] === 0 && bytes[i + 2] === 1) offset = i + 3;
    else if (bytes[i] === 0 && bytes[i + 1] === 0 && bytes[i + 2] === 0 && bytes[i + 3] === 1) offset = i + 4;
    if (offset >= 0 && (bytes[offset] & 31) === 7)
      return 'avc1.' + [...bytes.subarray(offset + 1, offset + 4)].map(byte => byte.toString(16).padStart(2, '0')).join('');
  }
  throw new Error('No se recibio configuracion H264 valida.');
}

function startPreview(tile) {
  if (tile.ws) return;
  const target = tile.target;
  const canvas = tile.canvas;
  const context = canvas.getContext('2d', { alpha: false });
  let decoder, config, frameCount = 0, lastError = '';
  function report(message, error = false) {
    tile.state.textContent = message;
    tile.placeholder.lastChild.textContent = message;
    if (expandedTile === tile) $('viewer-status').textContent = message;
    if (error) status(message, true);
  }
  if (!window.isSecureContext || !window.VideoDecoder) { report('El video requiere Electron o Chrome/Edge con HTTPS (localhost tambien funciona).', true); return; }


  report('Preparando video del telefono…');
  const ws = new WebSocket((location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/api/stream?endpoint=' + encodeURIComponent(target));
  ws.target = target; tile.ws = ws; tile.toggle.textContent = 'Pausar vista'; ws.binaryType = 'arraybuffer';
  tile.dispose = () => { if (decoder && decoder.state !== 'closed') decoder.close(); };
  let awaitingKey = true;
  ws.onmessage = event => {
    if (tile.ws !== ws) return;
    try {
      if (typeof event.data === 'string') {
        const result = JSON.parse(event.data);
        if (result.error) { lastError = result.error; report(result.error, true); return; }
        if (result.metadata) { canvas.width = result.metadata.width; canvas.height = result.metadata.height; }
        return;
      }
      const view = new DataView(event.data); const flags = view.getBigUint64(0);
      const isConfig = !!(flags & (1n << 63n)); const key = !!(flags & (1n << 62n));
      let data = new Uint8Array(event.data, 12);
      if (isConfig) {
        config = new Uint8Array(data);
        if (decoder?.state !== 'closed') decoder?.close();
        decoder = new VideoDecoder({
          output(frame) {
            if (tile.ws !== ws) { frame.close(); return; }
            canvas.width = frame.displayWidth; canvas.height = frame.displayHeight;
            context.drawImage(frame, 0, 0); frame.close();
            canvas.hidden = false; tile.placeholder.hidden = true;
            frameCount++; canvas.dataset.frames = String(frameCount);
            if (frameCount === 1) report('En directo');
          },
          error(error) { lastError = 'No se pudo decodificar el video: ' + error.message; report(lastError, true); ws.close(); }
        });
        decoder.configure({ codec: codecFromConfig(config), optimizeForLatency: true });
        awaitingKey = true; return;
      }
      if (!decoder || (awaitingKey && !key)) return;
      if (decoder.decodeQueueSize > 15) { lastError = 'El video acumulo retraso. Vuelve a abrir la pantalla.'; ws.close(); return; }
      if (key && config) { const combined = new Uint8Array(config.length + data.length); combined.set(config); combined.set(data, config.length); data = combined; }
      awaitingKey = false;
      decoder.decode(new EncodedVideoChunk({ type: key ? 'key' : 'delta', timestamp: Number(flags & ((1n << 62n) - 1n)), data }));
    } catch (error) { lastError = error.message; report(error.message, true); ws.close(); }
  };
  ws.onerror = () => { lastError = 'No se pudo abrir el video. Revisa la sesion y la conexion.'; report(lastError, true); };
  ws.onclose = () => {
    if (tile.ws === ws) { stopPreview(tile); report(lastError || 'Vista cerrada. Reabre desde el menú de acciones.', !!lastError); }
  };
}

// One selected endpoint per dialog; stale responses cannot replace another phone's conversation.
let selectedAgent, agentPoll, accountPoll;
let modelCatalog = [], agentBusy = false, botBusy = false, modelsReady = false;
async function updateAccount() {
  const info = await api('ai/account');
  $('ai-account').textContent = info.connected ? 'Conectada: ' + info.email + (info.plan ? ' · ' + info.plan : '') : 'Sin cuenta conectada';
  $('ai-error').textContent = info.error || '';
  $('ai-connect').hidden = info.connected; $('ai-disconnect').hidden = !info.connected;
  if (!info.pending) { $('ai-link').hidden = true; $('ai-code').textContent = ''; $('ai-verification').removeAttribute('href'); }
}
$('open-settings').onclick = async () => {
  $('settings-dialog').showModal(); $('ai-error').textContent = '';
  $('audio-error').textContent = ''; $('audio-key').value = '';
  updateAudio().catch(error => { $('audio-error').textContent = error.message; });
  try { await updateAccount(); } catch (error) { $('ai-error').textContent = error.message; }
  clearInterval(accountPoll);
  if (!$('settings-dialog').open) return;
  accountPoll = setInterval(() => { updateAccount().catch(error => { $('ai-error').textContent = error.message; }); }, 2500);
};
$('close-settings').onclick = () => $('settings-dialog').close();
$('settings-dialog').onclose = () => clearInterval(accountPoll);
$('ai-connect').onclick = async () => {
  $('ai-connect').disabled = true; $('ai-error').textContent = '';
  try {
    const result = await api('ai/login', { method: 'POST' });
    const url = new URL(result.verificationUrl);
    if (url.protocol !== 'https:' || url.hostname !== 'auth.openai.com') throw new Error('Enlace de acceso no valido.');
    $('ai-verification').href = url.href; $('ai-code').textContent = result.userCode; $('ai-link').hidden = false;
    $('ai-account').textContent = 'Esperando autorización en OpenAI…';
  } catch (error) { $('ai-error').textContent = error.message; }
  finally { $('ai-connect').disabled = false; }
};
$('ai-disconnect').onclick = async () => {
  $('ai-disconnect').disabled = true;
  try { await api('ai/logout', { method: 'POST' }); await updateAccount(); }
  catch (error) { $('ai-error').textContent = error.message; }
  finally { $('ai-disconnect').disabled = false; }
};
function renderAgent(info) {
  if (selectedAgent !== info.endpoint) return;
  const log = $('agent-messages');
  const signature = JSON.stringify(info.messages);
  if (log.dataset.signature !== signature) {
    log.replaceChildren(...info.messages.map(message => element('p', 'agent-message ' + message.role, (message.role === 'user' ? 'Tú: ' : message.role === 'error' ? 'Aviso: ' : 'Agente: ') + message.text)));
    log.dataset.signature = signature; log.scrollTop = log.scrollHeight;
  }
  $('agent-state').textContent = info.busy ? 'El agente está trabajando…' : 'Agente disponible';
  agentBusy = info.busy;
  $('agent-send').disabled = $('save-preferences').disabled = $('save-model').disabled = info.busy || botBusy;
  $('save-task').disabled = info.busy || botBusy || !modelsReady;
}
async function openAgent(target, model) {
  selectedAgent = target; agentBusy = botBusy = modelsReady = false; modelCatalog = []; $('bot-log').textContent = ''; $('bot-state').textContent = 'Consultando bot...'; $('save-task').disabled = true;
  $('bot-limit').value = '10'; $('bot-watch').value = '10'; $('bot-likes').checked = false;
  selectedAgent = target; $('agent-target').textContent = model + ' · ' + target;
  $('agent-error').textContent = ''; $('agent-preferences').value = ''; $('agent-input').value = '';
  $('agent-messages').replaceChildren(); delete $('agent-messages').dataset.signature;
  $('agent-dialog').showModal(); clearInterval(agentPoll);
  try {
    const info = await api('ai/agent?endpoint=' + encodeURIComponent(target));
    if (selectedAgent === target) {
      $('agent-preferences').value = info.preferences; renderAgent(info);
      const bot = await api('bot?endpoint=' + encodeURIComponent(target));
      if (selectedAgent !== target) return;
      if (bot.options) { $('bot-limit').value = bot.options.maxVideos; $('bot-watch').value = bot.options.watchSeconds; $('bot-likes').checked = bot.options.likes; }
      renderBot(bot);
      const catalog = await api('ai/models');
      if (selectedAgent !== target) return;
      modelCatalog = catalog.models; modelsReady = true;
      $('agent-model').replaceChildren(element('option', '', 'Predeterminado de la cuenta'));
      $('agent-model').firstChild.value = '';
      for (const model of modelCatalog) { const option = element('option', '', model.name + (model.vision ? '' : ' (sin vision)')); option.value = model.model; $('agent-model').append(option); }
      if (info.model && !modelCatalog.some(m => m.model === info.model)) { const missing = element('option', '', info.model + ' (no disponible)'); missing.value = info.model; $('agent-model').append(missing); }
      $('agent-model').value = info.model || ''; fillEfforts(info.effort || '');
      if (bot.options) { $('bot-limit').value = bot.options.maxVideos; $('bot-watch').value = bot.options.watchSeconds; $('bot-likes').checked = bot.options.likes; }
      renderBot(bot);
    }
  } catch (error) { $('agent-error').textContent = error.message; }
  if (selectedAgent !== target || !$('agent-dialog').open) return;
  agentPoll = setInterval(() => {
    const current = selectedAgent;
    Promise.all([api('ai/agent?endpoint=' + encodeURIComponent(current)), api('bot?endpoint=' + encodeURIComponent(current))]).then(([agent, bot]) => { renderAgent(agent); renderBot(bot); }).catch(error => { if (selectedAgent === current) $('agent-error').textContent = error.message; });
  }, 2000);
}
$('close-agent').onclick = () => $('agent-dialog').close();
$('agent-dialog').onclose = () => { clearInterval(agentPoll); selectedAgent = undefined; };
$('save-preferences').onclick = async () => {
  const target = selectedAgent;
  try {
    const info = await api('ai/agent', { method: 'PUT', body: JSON.stringify({ endpoint: target, preferences: $('agent-preferences').value }) });
    renderAgent(info); if (selectedAgent === target) $('agent-error').textContent = '';
  } catch (error) { if (selectedAgent === target) $('agent-error').textContent = error.message; }
};
$('agent-form').onsubmit = async event => {
  event.preventDefault(); const target = selectedAgent; const text = $('agent-input').value;
  $('agent-send').disabled = true; $('agent-error').textContent = '';
  try {
    const info = await api('ai/message', { method: 'POST', body: JSON.stringify({ endpoint: target, text }) });
    if (selectedAgent === target) { $('agent-input').value = ''; renderAgent(info); }
  } catch (error) { if (selectedAgent === target) { $('agent-error').textContent = error.message; $('agent-send').disabled = false; } }
};

function fillEfforts(saved = '') {
  const selected = modelCatalog.find(m => m.model === $('agent-model').value) || modelCatalog.find(m => m.isDefault);
  $('agent-effort').replaceChildren(element('option', '', 'Predeterminado del modelo'));
  $('agent-effort').firstChild.value = '';
  for (const effort of selected?.efforts || []) { const option = element('option', '', effort); option.value = effort; $('agent-effort').append(option); }
  if (saved && !selected?.efforts.includes(saved)) { const missing = element('option', '', saved + ' (no disponible)'); missing.value = saved; $('agent-effort').append(missing); }
  $('agent-effort').value = saved;
}
$('agent-model').onchange = () => fillEfforts();
$('save-model').onclick = async () => {
  const target = selectedAgent;
  try {
    const info = await api('ai/config', { method: 'PUT', body: JSON.stringify({ endpoint: target, model: $('agent-model').value, effort: $('agent-effort').value }) });
    if (selectedAgent === target) { renderAgent(info); $('agent-error').textContent = ''; }
  } catch (error) { if (selectedAgent === target) $('agent-error').textContent = error.message; }
};
function renderBot(info) {
  updateBotIndicators(info);
  if (info.endpoint !== selectedAgent) return;
  botBusy = info.running;
  $('bot-state').textContent = info.status + ' | Videos: ' + info.watched + ' | Likes confirmados: ' + info.likes + ' | Audios: ' + (info.heard || 0);
  $('bot-log').textContent = (info.log || []).join('\n');
  $('save-task').disabled = info.running || agentBusy || !modelsReady;
  $('agent-send').disabled = $('save-preferences').disabled = $('save-model').disabled = info.running || agentBusy;
  for (const id of ['agent-model', 'agent-effort', 'bot-limit', 'bot-watch', 'bot-likes']) $(id).disabled = info.running || agentBusy;
}
$('save-task').onclick = async () => {
  const target = selectedAgent; $('agent-error').textContent = ''; $('save-task').disabled = true;
  const config = { endpoint: target, model: $('agent-model').value, effort: $('agent-effort').value };
  const preferences = $('agent-preferences').value;
  const options = { maxVideos: Number($('bot-limit').value), watchSeconds: Number($('bot-watch').value), likes: $('bot-likes').checked };
  try {
    await api('ai/config', { method: 'PUT', body: JSON.stringify(config) });
    await api('ai/agent', { method: 'PUT', body: JSON.stringify({ endpoint: target, preferences }) });
    const info = await api('bot', { method: 'PUT', body: JSON.stringify({ endpoint: target, options }) });
    renderBot(info);
    if (selectedAgent === target) { $('agent-dialog').close(); status('Tarea guardada. Inicia el bot desde el menu del equipo.'); }
  } catch (error) { if (selectedAgent === target) { $('agent-error').textContent = error.message; $('save-task').disabled = false; } }
};

// El contador solo sirve para ver cuantos videos quedan y si la tarea dejo de avanzar.
const STALLED_MS = 120000;
function paintCounter(tile) {
  const progress = tile.botProgress;
  const show = tile.botRunning && progress && progress.total > 0;
  for (const node of [tile.counter, tile.linkCounter]) {
    if (!node) continue;
    node.hidden = !show;
    if (!show) { node.textContent = ''; node.classList.remove('stalled'); continue; }
    const stalled = progress.updatedAt && Date.now() - new Date(progress.updatedAt).getTime() > STALLED_MS;
    node.textContent = progress.current + '/' + progress.total + (stalled ? ' ⚠' : '');
    node.classList.toggle('stalled', Boolean(stalled));
    node.title = stalled
      ? 'Sin avance desde hace mas de 2 minutos; puede estar colgado.'
      : 'Video ' + progress.current + ' de ' + progress.total;
  }
}
function paintBot(tile, info) {
  tile.botRunning = Boolean(info.running);
  tile.card.dataset.botRunning = String(tile.botRunning);
  tile.title.classList.toggle('bot-running', tile.botRunning);
  tile.title.title = tile.botRunning ? 'Bot en funcionamiento' : 'Bot detenido';
  tile.link?.classList.toggle('bot-running', tile.botRunning);
  tile.botButton.textContent = tile.botRunning ? 'Detener bot' : 'Iniciar bot';
  tile.botButton.disabled = Boolean(tile.botPending);
  // refresh() repinta sin progreso: conservar el ultimo conocido evita que parpadee.
  if (info.total !== undefined) tile.botProgress = { current: Number(info.current) || 0, total: Number(info.total) || 0, updatedAt: info.updatedAt || null };
  if (!tile.botRunning) tile.botProgress = undefined;
  paintCounter(tile);
}
function updateBotIndicators(info) {
  const tile = tiles.get(info.endpoint);
  if (tile) paintBot(tile, info);
}
async function pollBotStates() {
  if (pollingBots || $('sidebar-content').hidden) return;
  pollingBots = true;
  try { const result = await api('bots'); result.bots.forEach(updateBotIndicators); }
  catch (error) { status(error.message, true); }
  finally { pollingBots = false; }
}

// Oido Groq: la clave solo viaja hacia el servidor; el panel nunca la recibe de vuelta.
async function updateAudio() {
  const info = await api('audio');
  $('audio-state').textContent = info.configured
    ? 'Oído activo · ' + info.model
    : 'Sin clave de Groq: el bot decide solo con la imagen.';
  $('audio-state').classList.toggle('ready', Boolean(info.configured));
  $('save-audio').textContent = info.configured ? 'Reemplazar clave de Groq' : 'Guardar clave de Groq';
}
$('save-audio').onclick = async () => {
  const key = $('audio-key').value.trim();
  $('audio-error').textContent = '';
  if (!key) { $('audio-error').textContent = 'Introduce la clave de Groq.'; return; }
  $('save-audio').disabled = true;
  try {
    await api('audio', { method: 'PUT', body: JSON.stringify({ key }) });
    $('audio-key').value = '';
    await updateAudio();
    status('Oído Groq configurado. El bot combinará imagen y audio.');
  } catch (error) { $('audio-error').textContent = error.message; }
  finally { $('save-audio').disabled = false; }
};

function statTile(label, value) {
  const tile = element('div', 'stat-tile');
  tile.append(element('strong', '', String(value)), element('small', '', label));
  return tile;
}
async function renderSummary() {
  const info = await api('summary');
  $('summary-totals').replaceChildren(
    statTile('Videos recorridos', info.totals.watched),
    statTile('Likes confirmados', info.totals.likes),
    statTile('Videos escuchados', info.totals.heard),
    statTile('Tareas lanzadas', info.totals.tasks)
  );
  if (!info.devices.length) {
    $('summary-detail').replaceChildren(element('p', 'muted', 'Todavía no hay actividad registrada. Inicia el bot en algún equipo desde su menú ⋯.'));
    return;
  }
  const table = element('table', 'summary-table');
  const header = element('tr', '');
  for (const label of ['Equipo', 'Videos', 'Likes', 'Oídos', 'Tareas', 'Última actividad'])
    header.append(element('th', '', label));
  const head = element('thead', ''); head.append(header);
  const rows = element('tbody', '');
  for (const device of info.devices) {
    const row = element('tr', device.running ? 'row-running' : '');
    const name = element('td', 'summary-device');
    name.append(element('strong', '', device.model || device.endpoint),
      element('small', '', device.endpoint + (device.saved ? '' : ' · fuera del panel')));
    row.append(name, element('td', '', String(device.watched)), element('td', '', String(device.likes)),
      element('td', '', String(device.heard)), element('td', '', String(device.tasks)),
      element('td', '', device.updatedAt ? new Date(device.updatedAt).toLocaleString() : '—'));
    rows.append(row);
  }
  table.append(head, rows);
  $('summary-detail').replaceChildren(table);
}
$('open-summary').onclick = async () => {
  $('summary-error').textContent = '';
  $('summary-dialog').showModal();
  try { await renderSummary(); } catch (error) { $('summary-error').textContent = error.message; }
  clearInterval(summaryPoll);
  if (!$('summary-dialog').open) return;
  summaryPoll = setInterval(() => { renderSummary().catch(error => { $('summary-error').textContent = error.message; }); }, 3000);
};
$('close-summary').onclick = () => $('summary-dialog').close();
$('summary-dialog').onclose = () => clearInterval(summaryPoll);
