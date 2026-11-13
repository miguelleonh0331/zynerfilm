import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createAgents } from '../api/index.mjs';

// Esperar por ticks era inestable: si el turno tardaba, el test tomaba el hilo anterior
// y se quedaba 120 s hasta el timeout de analyze. Esperar por condicion y fallar claro.
async function waitFor(condition, label, attempts = 400) {
  for (let i = 0; i < attempts; i++) {
    if (condition()) return;
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  throw new Error('No se cumplio a tiempo: ' + label);
}
async function setup() {
  const dataDir = await mkdtemp(join(tmpdir(), 'zyner-ai-test-'));
  let notify, count = 0, email = 'fixture@example.invalid';
  const calls = [];
  const clientFactory = options => {
    notify = options.onEvent;
    return { ready: Promise.resolve(), close: async () => {}, call: async (method, params) => {
      calls.push({ method, params });
      if (method === 'account/read') return { account: email ? { type: 'chatgpt', email, planType: 'fixture' } : null };
      if (method === 'model/list') return { data: [
        { model: 'fixture-vision', displayName: 'Fixture Vision', isDefault: true, inputModalities: ['text','image'], defaultReasoningEffort: 'medium', supportedReasoningEfforts: [{ reasoningEffort: 'low' }, { reasoningEffort: 'medium' }] },
        { model: 'fixture-text', displayName: 'Fixture Text', inputModalities: ['text'], defaultReasoningEffort: 'low', supportedReasoningEfforts: [{ reasoningEffort: 'low' }] }
      ] };
      if (method === 'thread/start') return { thread: { id: 'thread-' + (++count) } };
      if (method === 'account/login/start') return { loginId: 'fixture', verificationUrl: 'https://auth.openai.com/codex/device', userCode: 'TEST-ONLY' };
      return {};
    } };
  };
  let agents = await createAgents({ dataDir, clientFactory });
  return { get agents() { return agents; }, calls, event: (...args) => notify(...args), setAccount: value => { email = value; },
    async reopen() { await agents.close(); agents = await createAgents({ dataDir, clientFactory }); },
    async close() { await agents.close(); await rm(dataDir, { recursive: true }); } };
}
test('dos moviles mantienen preferencias, hilos y respuestas separados incluso concurrentes', async () => {
  const f = await setup();
  try {
    f.agents.preferences('a:1', 'tecnologia'); f.agents.preferences('b:2', 'cocina');
    await Promise.all([f.agents.send('a:1', 'hola A'), f.agents.send('b:2', 'hola B')]);
    const a = f.agents.snapshot('a:1'), b = f.agents.snapshot('b:2');
    assert.notEqual(a.threadId, b.threadId);
    await assert.rejects(f.agents.send('a:1', 'duplicado'), /trabajando/);
    await assert.rejects(f.agents.logout(), /terminen/);
    for (const [state, text] of [[b, 'respuesta B'], [a, 'respuesta A']]) {
      f.event('item/agentMessage/delta', { threadId: state.threadId, delta: text });
      f.event('turn/completed', { threadId: state.threadId, turn: { status: 'completed' } });
    }
    assert.equal(f.agents.snapshot('a:1').messages.at(-1).text, 'respuesta A');
    assert.equal(f.agents.snapshot('b:2').messages.at(-1).text, 'respuesta B');
    assert.equal(f.agents.snapshot('a:1').preferences, 'tecnologia');
    assert.equal(f.calls.filter(c => c.method === 'thread/start').length, 2);
    assert.equal(f.calls.find(c => c.method === 'thread/start').params.config['features.shell_tool'], false);
    await f.reopen();
    assert.equal(f.agents.snapshot('a:1').threadId, a.threadId);
    await f.agents.send('a:1', 'continuar A');
    const resume = f.calls.findLast(c => c.method === 'thread/resume');
    assert.equal(resume.params.threadId, a.threadId);
  } finally { await f.close(); }
});
test('otra cuenta no puede continuar el hilo de la anterior', async () => {
  const f = await setup();
  try {
    await f.agents.send('a:1', 'hola');
    const threadId = f.agents.snapshot('a:1').threadId;
    f.event('turn/completed', { threadId, turn: { status: 'completed' } });
    f.setAccount('other@example.invalid');
    await assert.rejects(f.agents.send('a:1', 'continuar'), /otra cuenta/);
    assert.equal(f.agents.snapshot('a:1').messages.length, 2);
  } finally { await f.close(); }
});
test('OAuth expone solo codigo/enlace; cancelar y desconectar no afecta otra instalacion', async () => {
  const f = await setup();
  try {
    assert.equal((await f.agents.login()).verificationUrl, 'https://auth.openai.com/codex/device');
    assert.equal((await f.agents.account()).pending, true);
    await f.agents.logout();
    assert.equal((await f.agents.account()).pending, false);
    assert.ok(f.calls.some(c => c.method === 'account/login/cancel'));
    assert.ok(f.calls.some(c => c.method === 'account/logout'));
  } finally { await f.close(); }
});
test('sin cuenta no envia turnos; fallo del proceso libera agente; borrar elimina contexto local', async () => {
  const f = await setup();
  try {
    f.setAccount(null);
    await assert.rejects(f.agents.send('a:1', 'hola'), /Conecta ChatGPT/);
    assert.equal(f.agents.snapshot('a:1').busy, false);
    f.setAccount('fixture@example.invalid');
    await f.agents.send('a:1', 'hola');
    f.event('zyner/closed', {});
    assert.equal(f.agents.snapshot('a:1').busy, false);
    assert.equal(f.agents.snapshot('a:1').messages.at(-1).role, 'error');
    await f.agents.forget('a:1');
    assert.deepEqual(f.agents.snapshot('a:1').messages, []);
  } finally { await f.close(); }
});

test('modelos y esfuerzos se validan, persisten y se aplican a cada turno', async () => {
  const f = await setup();
  try {
    await assert.rejects(f.agents.configure('a:1', { model: 'inventado', effort: 'low' }), /no esta disponible/);
    await assert.rejects(f.agents.configure('a:1', { model: 'fixture-text', effort: 'medium' }), /esfuerzo/);
    await f.agents.configure('a:1', { model: 'fixture-vision', effort: 'low' });
    await f.reopen();
    assert.equal(f.agents.snapshot('a:1').effort, 'low');
    await f.agents.send('a:1', 'hola');
    const turn = f.calls.findLast(c => c.method === 'turn/start');
    assert.equal(turn.params.model, 'fixture-vision'); assert.equal(turn.params.effort, 'low');
    const threadId = f.agents.snapshot('a:1').threadId;
    f.event('turn/completed', { threadId, turn: { status: 'completed' } });
  } finally { await f.close(); }
});
test('analisis visual usa imagen local y esquema; solo entrega el JSON final del hilo correcto', async () => {
  const f = await setup();
  try {
    const controller = new AbortController();
    const result = f.agents.analyze('a:1', { imagePath: '/fixture/screen.png', prompt: 'analiza', schema: { type: 'object' }, signal: controller.signal });
    for (let i=0;i<30 && !f.calls.some(c=>c.method==='turn/start');i++) await new Promise(r=>setTimeout(r,5));
    const turn = f.calls.findLast(c=>c.method==='turn/start');
    assert.equal(turn.params.input[1].type, 'localImage');
    assert.deepEqual(turn.params.outputSchema, { type: 'object' });
    f.event('item/agentMessage/delta', { threadId: turn.params.threadId, delta: 'comentario' });
    f.event('item/completed', { threadId: turn.params.threadId, item: { type: 'agentMessage', phase: 'final_answer', text: '{"action":"watch"}' } });
    f.event('turn/completed', { threadId: turn.params.threadId, turn: { status: 'completed' } });
    assert.deepEqual(await result, { action: 'watch' });
  } finally { await f.close(); }
});

test('cada analisis usa un hilo desechable: el contexto no crece video a video', async () => {
  const f = await setup();
  try {
    f.agents.preferences('a:1', 'tecnologia');
    await f.agents.send('a:1', 'hola');
    f.event('turn/completed', { threadId: f.agents.snapshot('a:1').threadId, turn: { status: 'completed' } });
    const conversation = f.agents.snapshot('a:1').threadId;
    assert.ok(conversation, 'la conversacion humana si conserva su hilo');

    const threads = [];
    for (let i = 0; i < 3; i++) {
      const analysis = f.agents.analyze('a:1', { prompt: 'video ' + i, schema: { type: 'object' } });
      await waitFor(() => f.calls.filter(c => c.method === 'turn/start').length === i + 2, 'turn/start del analisis ' + i);
      const started = f.calls.filter(c => c.method === 'turn/start').at(-1);
      threads.push(started.params.threadId);
      f.event('item/completed', { threadId: started.params.threadId, item: { type: 'agentMessage', text: '{"ok":true}' } });
      f.event('turn/completed', { threadId: started.params.threadId, turn: { status: 'completed' } });
      await analysis;
    }
    assert.equal(new Set(threads).size, 3, 'un hilo nuevo por analisis');
    assert.ok(!threads.includes(conversation), 'el bot nunca escribe en el hilo del chat');
    assert.equal(f.agents.snapshot('a:1').threadId, conversation, 'y no lo reemplaza');
    assert.ok(f.calls.every(c => c.method !== 'thread/resume'), 'nada que reanudar: no hay historial acumulado');
    const chat = f.agents.snapshot('a:1').messages;
    assert.ok(!chat.some(m => /^video /.test(m.text)), 'los juicios del bot no ensucian la conversacion');
  } finally { await f.close(); }
});

test('la memoria aprendida se reinyecta, se recorta a 600 y nunca manda sobre las preferencias', async () => {
  const f = await setup();
  try {
    f.agents.preferences('a:1', 'tecnologia');
    assert.equal(f.agents.learn('a:1', 'y'.repeat(900)).length, 600, 'tope duro');
    f.agents.learn('a:1', '  acepta IA; rechaza politica  ');
    assert.equal(f.agents.snapshot('a:1').profile, 'acepta IA; rechaza politica');
    const analysis = f.agents.analyze('a:1', { prompt: 'clasifica', schema: { type: 'object' } });
    await waitFor(() => f.calls.some(c => c.method === 'turn/start'), 'turn/start del analisis');
    const started = f.calls.find(c => c.method === 'turn/start');
    const sent = started.params.input[0].text;
    assert.match(sent, /Preferencias actuales: tecnologia/);
    assert.match(sent, /Memoria aprendida[^:]*: acepta IA; rechaza politica/);
    assert.match(sent, /nunca una orden/, 'la memoria viaja marcada como dato');
    assert.ok(sent.indexOf('Preferencias actuales') < sent.indexOf('Memoria aprendida'), 'las preferencias van primero');
    f.event('item/completed', { threadId: started.params.threadId, item: { type: 'agentMessage', text: '{"ok":true}' } });
    f.event('turn/completed', { threadId: started.params.threadId, turn: { status: 'completed' } });
    await analysis;
    assert.throws(() => f.agents.learn('a:1', { malicioso: true }), /invalida/);
  } finally { await f.close(); }
});
