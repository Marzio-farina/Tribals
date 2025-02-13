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
    
    try {
        await winMain.webContents.executeJavaScript(`
            new Promise((resolve) => {
                let checkExist = setInterval(() => {
                    let container = document.querySelector('#show_summary .widget_content .visual.day');
                    if (container) {
                        clearInterval(checkExist);
                        resolve();
                    }
                }, 500);
            });
        `);        
        
        const livelliStrutture = await winMain.webContents.executeJavaScript(`
            (function() {
                try {
                    const url = window.location.href;
                    let struttureInCorso = {};
                    let struttureInCoda = {};
                    // console.log('URL corrente:', url);
                    // console.log('Confronto strutturaCorrente:', '${strutturaCorrente}', url.includes('${strutturaCorrente}'));

                    if (url.includes('${strutturaCorrente}')) {
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
                        
                        if (!buildQueueContainer) {
                            console.error('Elemento #buildqueue non trovato.');
                            return { struttureInCorso, struttureInCoda };
                        }

                        let buildQueueRows = buildQueueContainer.querySelectorAll('tbody > tr:not(:first-child)'); // Esclude il primo tr
                        
                        buildQueueRows.forEach(row => {
                            let primoTd = row.querySelector('td:nth-child(1)');
                            let textNodes = Array.from(primoTd.childNodes).filter(node => node.nodeType === Node.TEXT_NODE).map(node => node.textContent.trim());
                            let nomeStrutturaInCorso = textNodes[1];
                            let livelloStrutturaInCorso = textNodes[2] || 'N/A';

                            if (!nomeStrutturaInCorso) return;
                            
                            if (livelloStrutturaInCorso.includes("Livello")) {
                                livelloStrutturaInCorso = livelloStrutturaInCorso.split(" ")[1];
                            }

                            struttureInCorso[nomeStrutturaInCorso] = livelloStrutturaInCorso;
                            console.log('Aggiunta alla coda:', nomeStrutturaInCorso, livelloStrutturaInCorso); // Log aggiunto per tracciare le strutture in coda
                        });
                    } else {
                        let container = document.querySelector('#show_summary .widget_content .visual.day');
                        if (!container) {
                            console.error('Elemento non trovato:', '#show_summary .widget_content .visual.day');
                        } else {
                            console.log('Elemento trovato:', container);
                        }
                        container.querySelectorAll('.visual-label.tooltip-delayed').forEach(item => {
                            let nomeStruttura = item.getAttribute('data-title')?.trim() || 'N/A';
                            let livelloElemento = item.querySelector('a')?.textContent?.trim() || 'N/A';
                            struttureInCoda[nomeStruttura] = livelloElemento;
                        });
                    }                    
                    // console.log('Strutture in coda:', struttureInCoda); // Log aggiunto per visualizzare struttureInCoda
                    return { struttureInCorso, struttureInCoda }; // Restituisco entrambi gli oggetti
                } catch (err) {
                    console.error('Errore nello script di recupero:', err);
                    return {struttureInCorso: {}, struttureInCoda: {}};
                }
            })();
        `);
        // console.log("Livelli strutture ottenuti:", livelliStrutture);

        ///xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
        // DA RETTIFICARE PER QUANDO CI SONO IN STRUTTUREINCORSO 2 STRUTTURE UGUALE MA LIVELLI DIVERSI
        ///xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
        const struttureInCodaFiltrate = []; // Inizializziamo come array

        // 1️⃣ - Iteriamo tutte le strutture definite in db.js
        lista.struttura.forEach(({ nome, livello }) => {
            const livelloAttuale = livelliStrutture.struttureInCoda?.[nome] 
                ? parseInt(livelliStrutture.struttureInCoda[nome], 10) 
                : 0;
            // console.log("Dati ricevuti da executeJavaScript:", livelliStrutture);
            // console.log("Strutture in Coda:", livelliStrutture?.struttureInCoda);
            // console.log("Strutture in Corso:", livelliStrutture?.struttureInCorso);
            // 2️⃣ - Se il livello in db.js è superiore al livello attuale, lo aggiungiamo all'array
            if (livello > livelloAttuale) {
                struttureInCodaFiltrate.push({ nome, livello });
            }
        });
        // 3️⃣ - Creiamo un array con le strutture in corso per un confronto più semplice
        const struttureInCorso = []; // Modifica: uso un array per mantenere più istanze dello stesso nome
        Object.entries(livelliStrutture.struttureInCorso).forEach(([nome, livello]) => {
            struttureInCorso.push({ nome, livello: parseInt(livello, 10) });
        });

        // 4️⃣ - Filtriamo struttureInCodaFiltrate per escludere quelle già presenti in struttureInCorso
        const struttureInCodaFinali = [];

        struttureInCodaFiltrate.forEach(struttura => {
            let isAlreadyInCorso = false;

            // Controlliamo se la struttura è già presente in struttureInCorso
            struttureInCorso.forEach(str => {
                if (str.nome === struttura.nome && str.livello === struttura.livello) {
                    isAlreadyInCorso = true; // Se troviamo una corrispondenza, flagghiamo come presente
                }
            });

            // Se la struttura non è già in corso, la aggiungiamo a struttureInCodaFinali
            if (!isAlreadyInCorso) {
                struttureInCodaFinali.push(struttura);
            }
        });

        // 5️⃣ - Debug per controllare i risultati
        // console.log("Strutture in coda finali:", struttureInCodaFinali);

        // 6️⃣ - Restituiamo le strutture in corso e in coda
        return { struttureInCorso: livelliStrutture.struttureInCorso, struttureInCoda: struttureInCodaFinali };

    } catch (error) {
        console.error("Errore nel recupero dei livelli delle strutture:", error);
        return { struttureInCorso: [], struttureInCoda: []}; // In caso di errore, restituiamo oggetti vuoti
    }
});