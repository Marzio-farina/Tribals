const { app, BrowserWindow, ipcMain } = require('electron');
const createWindows = require('./windows');
const { login, loginMondo91 } = require('./login');
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
                await login(winMain);
                await loginMondo91(winMain);
                await waitForGameLoad(winMain);

                const villaggio = "4477";
                const struttura = "main";
                winMain.webContents.send('openQg', { villaggio, struttura });
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

ipcMain.on('openQg', (event, data) => {
    if (!data) {
            console.error("Errore: ricevuto 'openQg' senza dati validi.");
            return;
        }
    const { villaggio, struttura } = data;
    const url = `https://it91.tribals.it/game.php?village=${villaggio}&screen=${struttura}`;
    if (winMain) {
        console.log("Navigando verso:", url);
        winMain.loadURL(url);
    } else {
        console.error("Errore: winMain non è definito.");
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

ipcMain.handle("get-strutture", async (event) => {
    
    if (!lista || !lista.struttura) {
        console.error("Errore: db o db.lista è undefined!");
        return { struttureInCorso: {}, struttureInCoda: {} };
    }

    // Lancia il controllo a intervalli regolari
    // let livelliStrutture = { struttureInCorso: {}, struttureInCoda: {} };

    // Funzione che controlla la presenza dell'elemento
    try {
        const livelliStrutture = await winMain.webContents.executeJavaScript(`
            (function() {
                try {
                    const url = window.location.href;
                    let struttureInCorso = {};
                    let struttureInCoda = {};

                    if (url.includes('main')) {
                        let container = document.querySelector('#buildings');
                        
                        if (!container) {
                            console.error('Elemento #buildings non trovato.');
                            return { struttureInCorso, struttureInCoda };
                        }

                        let rows = container.querySelectorAll('tbody > tr');
                        
                        rows.forEach(row => {
                            let nomeStruttura = row.querySelector('td:nth-child(1) a:nth-of-type(2)')?.textContent?.trim();
                            if (!nomeStruttura) return;
                            let livelloElemento = row.querySelector('td:nth-child(1) span')?.textContent?.trim() || 'N/A';
                            if (livelloElemento.includes("Livello")) {
                                livelloElemento = livelloElemento.split(" ")[1]; // Estrae il numero del livello
                            }
                            struttureInCoda[nomeStruttura] = livelloElemento;
                        });

                        let buildQueueContainer = document.querySelector('#buildqueue');
                        let buildQueueRows = buildQueueContainer.querySelectorAll('tbody > tr:not(:first-child)'); // Esclude il primo tr
                        
                        buildQueueRows.forEach(row => {
                            let primoTd = row.querySelector('td:nth-child(1)');
                            let textNodes = Array.from(primoTd.childNodes).filter(node => node.nodeType === Node.TEXT_NODE).map(node => node.textContent.trim());
                            let nomeStrutturaInCorso = textNodes[1] || "";
                            let livelloStrutturaInCorso = textNodes[2] || "N/A";

                            if (livelloStrutturaInCorso.includes("Livello")) {
                                livelloStrutturaInCorso = livelloStrutturaInCorso.split(" ")[1];
                            }

                            if (nomeStrutturaInCorso.trim()) {
                                struttureInCorso[nomeStrutturaInCorso] = livelloStrutturaInCorso;
                            }
                        });
                    } else {
                        let container = document.querySelector('#show_summary .widget_content .visual.day');
                        if (!container) {
                            console.error('Container non trovato:', '#show_summary .widget_content .visual.day');
                            return {};
                        }
                        container.querySelectorAll('.visual-label.tooltip-delayed').forEach(item => {
                            let nomeStruttura = item.getAttribute('data-title')?.trim() || 'N/A';
                            let livelloElemento = item.querySelector('a')?.textContent?.trim() || 'N/A';
                            struttureInCoda[nomeStruttura] = livelloElemento;
                        });
                    }                    
                    // console.log('Strutture in coda:', struttureInCoda); // Log aggiunto per visualizzare struttureInCoda
                    return { struttureInCorso, struttureInCoda };
                } catch (err) {
                    console.error('Errore nello script di recupero:', err);
                    return {struttureInCorso: {}, struttureInCoda: {}};
                }
            })();
        `);
        // **CONVERSIONE STRUTTURE IN CORSO IN ARRAY**
    const struttureInCorso = Object.entries(livelliStrutture.struttureInCorso)
    .filter(([nome]) => nome.trim() !== '') // Rimuove chiavi vuote
    .map(([nome, livello]) => ({
        nome,
        livello: parseInt(livello, 10) || 'N/A'
    }));

    const struttureInCodaFiltrate = [];
    lista.struttura.forEach(({ nome, livello }) => {
        const livelloAttuale = parseInt(livelliStrutture.struttureInCoda[nome] || "0", 10);
        if (livello > livelloAttuale) {
            struttureInCodaFiltrate.push({ nome, livello });
        }
    });

    const struttureInCodaFinali = [];
    struttureInCodaFiltrate.forEach(struttura => {
        let isAlreadyInCorso = struttureInCorso.some(str => str.nome === struttura.nome && str.livello === struttura.livello);
        if (!isAlreadyInCorso) {
            struttureInCodaFinali.push(struttura);
        }
    });

    console.log("Strutture in corso: " + JSON.stringify(struttureInCorso, null, 2) + 
                " Strutture in coda: " + JSON.stringify(struttureInCodaFinali, null, 2));

    return { struttureInCorso, struttureInCoda: struttureInCodaFinali };

    } catch (error) {
    console.error("Errore nel recupero dei livelli delle strutture:", error);
    return { struttureInCorso: [], struttureInCoda: [] };
    }
});