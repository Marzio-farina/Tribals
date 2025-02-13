const { ipcRenderer } = require('electron');

ipcRenderer.on('openQg', (event, data) => {
    if (!data) {
        console.error("Errore: ricevuto 'openQg' senza dati validi.");
        return;
    }
    const { villaggio, struttura } = data;
    const url = `https://it91.tribals.it/game.php?village=${villaggio}&screen=${struttura}`;
    window.location.href = url;
});