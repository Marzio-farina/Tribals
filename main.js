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
        setTimeout(async () => {
            try {
                console.log("Inizio login...");
                await login(winMain);
                console.log("Login completato.");
                
                await loginMondo91(winMain);
                console.log("Login Mondo 91 completato.");
                
                console.log("Attendo il caricamento completo del gioco...");
                await waitForGameLoad(winMain);
                console.log("Gioco completamente caricato!");

                const villaggio = "4477";
                const struttura = "main";
                console.log("Arrivato al cambio di pagina...");
                console.log("Dati da inviare a renderer per openQg:", { villaggio, struttura });  // Log dei dati prima dell'invio
                winMain.webContents.send('openQg', { villaggio, struttura });
                console.log("Evento openQg inviato con i dati:", { villaggio, struttura });  // Log dopo l'invio
                
            } catch (error) {
                console.error("Errore durante il flusso:", error);
            }
        }, 3000);
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

function waitForGameLoad(winMain) {
    return new Promise((resolve, reject) => {
        let attempts = 0;
        let maxAttempts = 20;

        let interval = setInterval(async () => {
            try {
                let gameLoaded = await winMain.webContents.executeJavaScript(`
                    !!document.querySelector('#menu_row2') // Modifica con un ID visibile dopo il login
                `);

                if (gameLoaded) {
                    clearInterval(interval);
                    resolve();
                } else {
                    attempts++;
                    if (attempts >= maxAttempts) {
                        clearInterval(interval);
                        reject('Il gioco non si è caricato in tempo.');
                    }
                }
            } catch (error) {
                clearInterval(interval);
                reject(error);
            }
        }, 1000);
    });
}

ipcMain.on('update-risorse', (event, risorse) => risorseAttuali = risorse);

ipcMain.on('openQg', (event, data) => {
    console.log("DEBUG: Messaggio 'openQg' ricevuto:", data);

    if (!data || !data.villaggio || !data.struttura) {
        console.error("❌ Errore: Dati mancanti per cambiare pagina.");
        return;
    }

    console.log(`DEBUG: Cambio a -> Villaggio: ${data.villaggio}, Struttura: ${data.struttura}`);
    
    winMain.webContents.send('openQg', { villaggio, struttura });
});