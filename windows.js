const { BrowserWindow, ipcRenderer } = require('electron');
const { login, loginMondo91 } = require('./login');
const { risorse } = require('./risorse');
const path = require('path');

let risorseAttuali = { legno: 'N/A', argilla: 'N/A', ferro: 'N/A' };

function createWindows() {

    //FINESTRA PRINCIPALE CON IL GIOCO
    const winMain = new BrowserWindow({
        width: 1300,
        height: 1000,
        x: 0,
        y: 0,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: false,
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

    winMain.webContents.once('did-finish-load', () => {
        const fetchResources = async () => {
            try {
                const { legno, argilla, ferro } = await risorse(winMain);
                risorseAttuali = { legno, argilla, ferro };
                console.log('Risorse ottenute:', risorseAttuali);
                winMain.webContents.send('update-risorse', risorseAttuali);
            } catch (error) {
                console.error('Errore nel recupero delle risorse:', error);
            }
        };
        setInterval(fetchResources, 5000);
    });

    //FINESTRA LATERALE CHE AUTOMATIZZA
    const winSide = new BrowserWindow({
        width: 460,
        height: 1000,
        x: 1290,
        y: 0,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
    });

    winSide.loadFile(path.join(__dirname, 'index.html'));

    winSide.webContents.once('did-fail-load', (event, errorCode, errorDescription) => {
        console.error(`Errore nel caricamento della finestra laterale: ${errorDescription} (Codice errore: ${errorCode})`);
    });

    return { winMain, winSide };
}

module.exports = createWindows;