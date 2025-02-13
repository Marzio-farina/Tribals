const { ipcRenderer } = require('electron');

let ultimoDelay = null;

ipcRenderer.on('openQg', (event, data) => {
    if (!data) {
        console.error("Errore: ricevuto 'openQg' senza dati validi.");
        return;
    }

    console.log(`Ricevuto openQg per: ${data.villaggio} - ${data.struttura}`);
    ipcRenderer.send('openQg', data);
});