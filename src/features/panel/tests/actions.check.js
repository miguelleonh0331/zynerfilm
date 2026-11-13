(() => {
  const assert = (value, label) => { if (!value) throw new Error(label); };
  assert($('ip').closest('dialog') === $('add-dialog'), 'IP debe existir solo dentro del popup');
  assert(!$('ip').closest('aside'), 'No deben verse campos IP en sidebar');
  $('open-add').click();
  assert($('add-dialog').open, 'Agregar abre popup');
  $('cancel-add').click();
  assert(!$('add-dialog').open, 'Cancelar cierra popup');
  const tile = createTile({ endpoint: '192.0.2.201:5555', model: 'Fixture de acciones' });
  $('devices').append(tile.card);
  try {
    const menu = tile.card.querySelector('details');
    menu.querySelector('summary').click();
    assert(menu.open, 'Summary abre dropdown');
    assert(menu.querySelectorAll('button').length === 5, 'Dropdown debe agrupar cinco acciones');
    assert(menu.contains(tile.botButton), 'Inicio del bot dentro del dropdown');
    paintBot(tile,{running:true}); assert(tile.title.classList.contains('bot-running') && tile.botButton.textContent === 'Detener bot','Indicador activo');
    paintBot(tile,{running:false}); assert(!tile.title.classList.contains('bot-running'),'Indicador apagado al terminar');
    assert(!tile.card.querySelector('.tile-footer'), 'Miniatura sin bloque inferior');
    assert(menu.closest('.tile-heading') && tile.state.closest('.tile-heading'), 'Menu y estado junto al modelo');
    menu.querySelector('.delete-action').click();
    assert($('delete-dialog').open && $('delete-target').textContent.includes(tile.target), 'Eliminar confirma equipo correcto');
    $('cancel-delete').click();
    assert(!$('delete-dialog').open && tile.card.isConnected, 'Cancelar no elimina equipo');
    return { ok: true, popupOnly: true, compactDropdown: true, deleteConfirmation: true };
  } finally {
    if ($('delete-dialog').open) $('delete-dialog').close();
    stopPreview(tile); tile.card.remove();
  }
})()
