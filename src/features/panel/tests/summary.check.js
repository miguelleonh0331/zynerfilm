(async () => {
  const assert = (value, label) => { if (!value) throw new Error(label); };
  const original = window.fetch;
  const calls = [];
  let configured = false;
  window.fetch = async (url, options = {}) => {
    const path = String(url);
    if (!path.startsWith('/api/audio') && !path.startsWith('/api/summary')) return original(url, options);
    const method = options.method || 'GET';
    const input = options.body ? JSON.parse(options.body) : {};
    calls.push({ path, method, input });
    if (path.startsWith('/api/audio')) {
      if (method === 'PUT') {
        if (!/^gsk_[A-Za-z0-9]{20,200}$/.test(input.key || ''))
          return new Response(JSON.stringify({ error: 'Clave Groq no valida.' }), { status: 400 });
        configured = true;
        return new Response(JSON.stringify({ configured: true, model: 'whisper-large-v3-turbo' }), { status: 200 });
      }
      return new Response(JSON.stringify({ configured, model: 'whisper-large-v3-turbo' }), { status: 200 });
    }
    return new Response(JSON.stringify({
      totals: { watched: 21, likes: 5, heard: 13, tasks: 4, devices: 2 },
      devices: [
        { endpoint: '192.0.2.1:5555', model: 'Fixture A', saved: true, running: true, watched: 17, likes: 5, heard: 11, tasks: 3, updatedAt: '2026-11-13T12:34:56Z' },
        { endpoint: '192.0.2.9:5555', model: null, saved: false, running: false, watched: 4, likes: 0, heard: 2, tasks: 1, updatedAt: null }
      ]
    }), { status: 200 });
  };
  try {
    assert($('open-summary'), 'Boton Resumen presente en la barra lateral');
    await $('open-summary').onclick();
    assert($('summary-dialog').open, 'Resumen se abre como popup');
    assert(!$('summary-error').textContent, 'Resumen sin error: ' + $('summary-error').textContent);

    const totals = [...$('summary-totals').querySelectorAll('.stat-tile strong')].map(node => node.textContent);
    assert(totals.join(',') === '21,5,13,4', 'Totales videos/likes/audios/tareas: ' + totals.join(','));

    const rows = [...$('summary-detail').querySelectorAll('tbody tr')];
    assert(rows.length === 2, 'Una fila por equipo con actividad');
    assert(rows[0].querySelector('strong').textContent === 'Fixture A', 'Identifica el equipo por marca y modelo');
    assert(rows[0].classList.contains('row-running'), 'Destaca el equipo que esta trabajando');
    assert(rows[0].children[1].textContent === '17', 'Videos recorridos por equipo');
    assert(rows[0].children[2].textContent === '5', 'Likes confirmados por equipo');
    assert(rows[0].children[3].textContent === '11', 'Videos escuchados por equipo');
    assert(rows[1].textContent.includes('fuera del panel'), 'Avisa cuando el equipo ya no esta guardado');
    assert(rows[1].children[5].textContent === '—', 'Sin actividad fechada muestra guion');

    $('summary-dialog').close();
    assert(!$('summary-dialog').open, 'Resumen se cierra sin dejar el popup abierto');

    await updateAudio();
    assert($('audio-state').textContent.includes('Sin clave'), 'Avisa que el bot decide solo con imagen');
    assert(!$('audio-state').classList.contains('ready'), 'Indicador apagado mientras no hay clave');

    $('audio-key').value = 'no-sirve';
    await $('save-audio').onclick();
    assert($('audio-error').textContent.includes('no valida'), 'Rechaza clave invalida: ' + $('audio-error').textContent);
    assert(configured === false, 'No guarda una clave con formato invalido');

    $('audio-key').value = 'gsk_' + 'K'.repeat(44);
    await $('save-audio').onclick();
    assert(configured === true, 'Guarda la clave valida');
    assert($('audio-key').value === '', 'Limpia el campo despues de guardar');
    assert($('audio-state').classList.contains('ready'), 'Indicador encendido con oido activo');
    assert($('audio-state').textContent.includes('whisper'), 'Muestra el modelo de transcripcion');
    assert($('save-audio').textContent.includes('Reemplazar'), 'Ofrece reemplazar la clave existente');
    assert(!document.body.textContent.includes('gsk_'), 'La clave nunca queda escrita en la pagina');

    const sent = calls.filter(call => call.method === 'PUT');
    assert(sent.length === 2, 'Dos intentos de guardado');
    assert(sent.every(call => call.path === '/api/audio'), 'La clave viaja solo a /api/audio');
    assert(!calls.some(call => call.path.includes('gsk_')), 'La clave nunca viaja en la URL');

    return { ok: true, resumen: true, oido: true, claveFueraDeLaPagina: true, filas: rows.length };
  } finally {
    $('summary-dialog').close();
    clearInterval(summaryPoll);
    $('audio-key').value = '';
    window.fetch = original;
  }
})()
