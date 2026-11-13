(() => {
  const original = { WebSocket: window.WebSocket, VideoDecoder: window.VideoDecoder };
  const created = [];
  const source = document.createElement('canvas'); source.width = 108; source.height = 228;
  source.getContext('2d').fillRect(0, 0, 108, 228);
  const assert = (value, label) => { if (!value) throw new Error(label); };
  class FakeSocket {
    static OPEN = 1;
    constructor() { this.readyState = 1; this.messages = []; created.push(this); }
    send(message) { this.messages.push(JSON.parse(message)); }
    close() { this.readyState = 3; this.onclose?.(); }
  }
  class FakeDecoder {
    constructor({ output }) { this.output = output; this.state = 'unconfigured'; this.decodeQueueSize = 0; }
    configure() { this.state = 'configured'; }
    decode() { this.output(new VideoFrame(source, { timestamp: 0 })); }
    close() { this.state = 'closed'; }
  }
  function packet(config) {
    const bytes = config ? [0, 0, 0, 1, 0x67, 0x42, 0xe0, 0x1e, 0] : [0, 0, 1, 0x65];
    const buffer = new ArrayBuffer(12 + bytes.length); const view = new DataView(buffer);
    view.setBigUint64(0, 1n << (config ? 63n : 62n)); view.setUint32(8, bytes.length);
    new Uint8Array(buffer, 12).set(bytes); return buffer;
  }
  const previews = [];
  try {
    window.WebSocket = FakeSocket; window.VideoDecoder = FakeDecoder;
    for (let i = 0; i < 2; i++) {
      const tile = createTile({ endpoint: '192.0.2.' + (i + 1) + ':5555', model: 'Prueba ' + i });
      tile.connected = true; previews.push(tile); $('devices').append(tile.card);
      startPreview(tile);
      tile.ws.onmessage({ data: packet(true) }); tile.ws.onmessage({ data: packet(false) });
      assert(tile.canvas.dataset.frames === '1', 'Cada miniatura debe decodificar su propio video');
    }
    const [first, second] = previews; const firstCanvas = first.canvas;
    first.preview.click();
    assert($('expanded').open && $('large-screen').firstChild === firstCanvas, 'Click amplia la misma pantalla');
    assert(created.length === 2 && !created[0].messages.length, 'Ampliar no reconecta ni toca el telefono');
    first.canvas.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }));
    assert(created[0].messages.length === 1 && created[1].messages.length === 0, 'Control solo al equipo ampliado');
    $('close-screen').click();
    assert(!$('expanded').open && first.preview.firstChild === firstCanvas, 'Cerrar devuelve canvas a miniatura');
    assert(created[0].readyState === 1, 'Cerrar ampliacion mantiene video');
    second.preview.click();
    second.canvas.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    assert(!$('expanded').open && created[1].messages.length === 0, 'Escape vuelve sin enviar tecla al Android');
    first.toggle.click();
    assert(created[0].readyState === 3 && created[1].readyState === 1, 'Pausar una vista conserva las demas');
    return { ok: true, independentStreams: 2, expandReconnections: 0, controlIsolation: true, escapeToGrid: true };
  } finally {
    for (const tile of previews) { stopPreview(tile); tile.card.remove(); }
    window.WebSocket = original.WebSocket; window.VideoDecoder = original.VideoDecoder;
  }
})()
