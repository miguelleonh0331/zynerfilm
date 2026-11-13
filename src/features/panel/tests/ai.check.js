(async () => {
  const assert = (value, label) => { if (!value) throw new Error(label); };
  const original = window.fetch;
  const calls = []; let running = false;
  window.fetch = async (url, options = {}) => {
    if (!String(url).startsWith('/api/ai/') && !String(url).startsWith('/api/bot')) return original(url, options);
    const input = options.body ? JSON.parse(options.body) : {};
    calls.push({ url, input, method: options.method || 'GET' });
    if (url === '/api/ai/models') return new Response(JSON.stringify({ models: [
      { model: 'fixture-vision', name: 'Fixture Vision', isDefault:true, vision:true, efforts:['low','medium'] },
      { model: 'fixture-text', name:'Fixture Text', vision:false, efforts:['low'] }
    ] }), {status:200});
    if (String(url).startsWith('/api/bot')) {
      if(options.method==='POST') running=true;
      if(options.method==='DELETE') running=false;
      return new Response(JSON.stringify({endpoint:input.endpoint || new URL(url,location.origin).searchParams.get('endpoint'), running,status:running?'running':'idle',watched:0,likes:0,log:[]}),{status:200});
    }
    const endpoint = input.endpoint || new URL(url, location.origin).searchParams.get('endpoint');
    return new Response(JSON.stringify({ endpoint, preferences: endpoint === '192.0.2.1:5555' ? 'tecnologia' : 'cocina', busy: false,
      messages: [{ role: 'assistant', text: 'Contexto de ' + endpoint }] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };
  try {
    assert($('open-settings'), 'Configuracion disponible');
    await openAgent('192.0.2.1:5555', 'Fixture A');
    $('agent-model').value = 'fixture-text'; $('agent-model').onchange();
    assert([...$('agent-effort').options].map(o=>o.value).join(',') === ',low', 'Esfuerzos filtrados por modelo');
    $('agent-effort').value = 'low';
    await $('save-model').onclick();
    assert(calls.at(-1).input.model === 'fixture-text' && calls.at(-1).input.effort === 'low', 'Modelo y esfuerzo enviados');
    assert($('agent-preferences').value === 'tecnologia', 'Preferencias A');
    $('agent-dialog').close();
    await openAgent('192.0.2.2:5555', 'Fixture B');
    assert($('agent-preferences').value === 'cocina', 'Preferencias B');
    assert(!$('agent-messages').textContent.includes('192.0.2.1'), 'Sin historial de A en B');
    $('agent-preferences').value = 'cocina vegetariana';
    await $('save-preferences').onclick();
    assert(calls.at(-1).input.endpoint === '192.0.2.2:5555', 'Guardar solo en B');
    $('agent-input').value = 'hola B';
    await $('agent-form').onsubmit({ preventDefault() {} });
    assert(calls.at(-1).input.endpoint === '192.0.2.2:5555', 'Mensaje solo a B');
    $('agent-model').value = 'fixture-vision'; $('agent-model').onchange(); $('agent-effort').value = 'low';
    $('bot-limit').value = '3'; $('bot-watch').value = '5'; $('bot-likes').checked = true;
    await $('save-task').onclick();
    assert(calls.at(-1).url === '/api/bot' && calls.at(-1).method === 'PUT', 'Guardar sin iniciar');
    assert(calls.at(-1).input.options.maxVideos === 3 && calls.at(-1).input.options.likes, 'Opciones guardadas');
    const tile=createTile({endpoint:'192.0.2.2:5555',model:'Fixture B'});
    await tile.botButton.onclick();
    assert(calls.at(-1).method==='POST' && calls.at(-1).input.endpoint===tile.target,'Iniciar desde dropdown B');
    assert(tile.title.classList.contains('bot-running'),'Parpadeo activo');
    assert(!$('agent-dialog').open,'Pantalla libre de popup al iniciar');
    await tile.botButton.onclick();
    assert(calls.at(-1).method==='DELETE' && !tile.title.classList.contains('bot-running'),'Detener elimina parpadeo');
    return { ok: true, separatePreferences: true, separateMessages: true, dynamicEfforts: true, noPhoneActions: true };
  } finally {
    $('agent-dialog').close(); clearInterval(agentPoll); selectedAgent = undefined; window.fetch = original;
  }
})()
