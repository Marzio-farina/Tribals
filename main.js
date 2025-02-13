const { app, BrowserWindow, ipcMain } = require('electron');
const createWindows = require('./windows');
const { login, loginMondo91 } = require('./login');
const { paginaStruttura } = require('./navigazione');
const { db, lista } = require('./db');

let winMain,winSide;
let strutturaCorrente;
let villaggioCorrente;
let risorseAttuali = { legno: 'N/A', argilla: 'N/A', ferro: 'N/A' };

function initialize() {
    const windows = createWindows();
    winMain = windows.winMain;
    winSide = windows.winSide;

    winMain.webContents.once('did-finish-load', async () => {
        try {
            console.log("Inizio login...");
            await login(winMain);
            console.log("Login completato.");
            
            await loginMondo91(winMain);
            console.log("Login Mondo 91 completato.");

            // Fase 3: Cambia URL o naviga alla pagina desiderata
            const villaggio = "4477";
            const struttura = "main";
            console.log("Arrivato al cambio di pagina...");
            winMain.webContents.send('openQg', { villaggio, struttura });
            console.log("Dovrebbe essere aperto.");

        } catch (error) {
            console.error("Errore durante il flusso:", error);
        }
    });
}

app.whenReady().then(initialize);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

ipcMain.on('update-risorse', (event, risorse) => risorseAttuali = risorse);

ipcMain.on('openQg', (event, data) => {
    // if (!data) {
    //     console.error("Errore: 'openQg' ricevuto senza dati.");
    //     return;
    // }

    const { villaggio, struttura } = data;
    paginaStruttura(winMain, villaggio, struttura);
    console.log("Navigato a:", villaggio, struttura);
});