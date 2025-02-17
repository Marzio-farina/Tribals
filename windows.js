const { BrowserWindow } = require('electron');
const path = require('path');

function createWindows() {

    //FINESTRA PRINCIPALE CON IL GIOCO
    const winMain = new BrowserWindow({
        width: 1295,
        height: 1000,
        x: 450,
        y: 0,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
        },
    });

    winMain.on('closed', () => {
        winMain = null;
    });

    winMain.loadURL('https://www.tribals.it/');

    winMain.webContents.once('did-fail-load', (event, errorCode, errorDescription) => {
        console.error(`Errore nel caricamento della finestra principale: ${errorDescription} (Codice errore: ${errorCode})`);
        
        setTimeout(() => {
            console.log("Ricaricamento della finestra...");
            winMain.reload();
        }, 2000);
    });

    //FINESTRA LATERALE CHE AUTOMATIZZA
    const winSide = new BrowserWindow({
        width: 460,
        height: 1000,
        x: 0,
        y: 0,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            preload: path.join(__dirname, 'renderer.js'),
        },
    });

    winSide.loadFile(path.join(__dirname, 'index.html'));

    winSide.webContents.once('did-fail-load', (event, errorCode, errorDescription) => {
        console.error(`Errore nel caricamento della finestra laterale: ${errorDescription} (Codice errore: ${errorCode})`);
    });
    return { winMain, winSide };
}

module.exports = createWindows;