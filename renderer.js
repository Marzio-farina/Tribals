const { ipcRenderer } = require('electron');

ipcRenderer.on('openQg', (event, data) => {
    console.log("DEBUG: Dati ricevuti in renderer.js per openQg:", data);  // Log per vedere i dati ricevuti

    if (!data) {
        console.error("Errore: ricevuto 'openQg' senza dati validi.");
        return;
    }

    const { villaggio, struttura } = data;
    console.log(`DEBUG: Cambiando pagina per Villaggio: ${villaggio}, Struttura: ${struttura}`);  // Log per confermare i dati

    // Esegui il cambio di pagina nel renderer
    const url = `https://it91.tribals.it/game.php?village=${villaggio}&screen=${struttura}`;
    console.log(`DEBUG: Cambio URL a ${url}`);  // Log per confermare il cambio URL
    window.location.href = url;
});