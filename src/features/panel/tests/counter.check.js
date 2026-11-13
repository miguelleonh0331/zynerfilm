(async () => {
  const assert = (value, label) => { if (!value) throw new Error(label); };
  const tile = createTile({ endpoint: '192.0.2.5:5555', model: 'Fixture C' });
  try {
    assert(tile.counter, 'El tile incluye contador');
    assert(tile.counter.hidden, 'Oculto mientras el bot no trabaja');

    paintBot(tile, { running: true, current: 7, total: 50, updatedAt: new Date().toISOString() });
    assert(!tile.counter.hidden, 'Visible con el bot en marcha');
    assert(tile.counter.textContent === '7/50', 'Muestra actual/total: ' + tile.counter.textContent);
    assert(tile.counter.title.includes('7 de 50'), 'Explica el contador al pasar el raton');
    assert(!tile.counter.classList.contains('stalled'), 'Avance reciente no se marca como colgado');

    // refresh() repinta sin progreso; el contador no debe parpadear a vacio.
    paintBot(tile, { running: true });
    assert(tile.counter.textContent === '7/50', 'Conserva el ultimo progreso conocido');

    paintBot(tile, { running: true, current: 7, total: 50, updatedAt: new Date(Date.now() - 300000).toISOString() });
    assert(tile.counter.classList.contains('stalled'), 'Marca la tarea sin avance');
    assert(tile.counter.textContent.includes('⚠'), 'Avisa visualmente del posible cuelgue');
    assert(tile.counter.title.includes('colgado'), 'Explica que puede estar colgado');

    paintBot(tile, { running: true, current: 8, total: 50, updatedAt: new Date().toISOString() });
    assert(!tile.counter.classList.contains('stalled'), 'Al avanzar deja de avisar');

    paintBot(tile, { running: false });
    assert(tile.counter.hidden, 'Se oculta al detener el bot');
    assert(tile.counter.textContent === '', 'No deja cifras viejas');

    paintBot(tile, { running: true, current: 0, total: 0, updatedAt: null });
    assert(tile.counter.hidden, 'Sin total conocido no inventa contador');

    return { ok: true, contador: true, avisoDeCuelgue: true };
  } finally { tile.card.remove(); }
})()
