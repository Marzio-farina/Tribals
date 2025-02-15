const { app, BrowserWindow, ipcMain } = require('electron');
const createWindows = require('./windows');
const { login, loginMondo91 } = require('./login');
const { risorse } = require('./risorse');
const { upStruttureRisorse } = require('./upStrutture');
const { UpFree } = require('./instantUpStrutture');
const { costiStruttura, getCostiStruttura, lista, resouceID} = require('./db');

let winMain,winSide;
let risorseAttuali = { legno: 'N/A', argilla: 'N/A', ferro: 'N/A' };

function initialize() {
    const windows = createWindows();
    winMain = windows.winMain;
    winSide = windows.winSide;

    // winMain.webContents.openDevTools();
    // winSide.webContents.openDevTools();
    winMain.webContents.once('did-finish-load', async () => {
        setTimeout(async () => {
            try {
                await login(winMain);
                await loginMondo91(winMain);
                await waitForGameLoad(winMain);
                const villaggio = "4477";
                const struttura = "main";
                const url = `https://it91.tribals.it/game.php?village=${villaggio}&screen=${struttura}`;
                winMain.loadURL(url);
                await UpFree(winMain, winSide, url);
                setInterval(() => fetchResources(winMain), 5000);
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

async function fetchResources(winMain) {
    try {
        const { legno, argilla, ferro } = await risorse(winMain);
        risorseAttuali = { legno, argilla, ferro };
        winMain.webContents.send('update-risorse', risorseAttuali);
    } catch (error) {
        console.error('Errore nel recupero delle risorse:', error);
    }
}

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
        const livelliStrutture = await winMain.webContents.executeJavaScript(`
            (function() {
                try {
                    const url = window.location.href;
                    let struttureInCorso = JSON.parse(sessionStorage.getItem('struttureInCorso')) || {}; 
                    let struttureInCoda = JSON.parse(sessionStorage.getItem('struttureInCoda')) || {};

                    if (url.includes('main')) {
                        struttureInCorso = {};
                        struttureInCoda = {};
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
                            if (!struttureInCoda[nomeStruttura]) {
                                struttureInCoda[nomeStruttura] = [];
                            }
                            struttureInCoda[nomeStruttura].push(parseInt(livelloElemento, 10));
                        });

                        let buildQueueContainer = document.querySelector('#buildqueue');
                        
                        if (!buildQueueContainer) {
                            console.error("Errore: #buildqueue non trovato nella pagina.");
                            sessionStorage.setItem('struttureInCoda', JSON.stringify(struttureInCoda));
                            sessionStorage.setItem('struttureInCorso', JSON.stringify(struttureInCorso));
                            return { struttureInCorso, struttureInCoda };
                        }
                        
                        let buildQueueRows = buildQueueContainer.querySelectorAll('tbody > tr:not(:first-child)'); // Esclude il primo tr
                        
                        buildQueueRows.forEach(row => {
                            let primoTd = row.querySelector('td:nth-child(1)');
                            let textNodes = Array.from(primoTd.childNodes)
                                .filter(node => node.nodeType === Node.TEXT_NODE)
                                .map(node => node.textContent.trim());
                            let nomeStrutturaInCorso = textNodes[1] || "";
                            let livelloStrutturaInCorso = textNodes[2] || "N/A";

                            if (livelloStrutturaInCorso.includes("Livello")) {
                                livelloStrutturaInCorso = livelloStrutturaInCorso.split(" ")[1];
                            }

                            if (nomeStrutturaInCorso) {
                                if (!struttureInCorso[nomeStrutturaInCorso]) {
                                    struttureInCorso[nomeStrutturaInCorso] = [];
                                }
                                struttureInCorso[nomeStrutturaInCorso].push(parseInt(livelloStrutturaInCorso, 10));
                            }
                        });
                        sessionStorage.setItem('struttureInCoda', JSON.stringify(struttureInCoda));
                        sessionStorage.setItem('struttureInCorso', JSON.stringify(struttureInCorso));
                    } else if (url.includes('overview&intro')) {
                        let container = document.querySelector('#show_summary .widget_content .visual.day');
                        
                        if (container) {
                            container.querySelectorAll('.visual-label.tooltip-delayed').forEach(item => {
                                let nomeStruttura = item.getAttribute('data-title')?.trim() || 'N/A';
                                let livelloElemento = item.querySelector('a')?.textContent?.trim() || 'N/A';
                                if (!struttureInCoda[nomeStruttura]) {
                                    struttureInCoda[nomeStruttura] = [];
                                }
                                struttureInCoda[nomeStruttura].push(parseInt(livelloElemento, 10));
                            });
                        };
                        sessionStorage.setItem('struttureInCoda', JSON.stringify(struttureInCoda));
                    };
                    return { struttureInCorso, struttureInCoda };
                } catch (err) {
                    console.error('Errore nello script di recupero:', err);
                    return {struttureInCorso, struttureInCoda};
                }
            })();
        `);

        let struttureInCorsoFinali = Object.entries(livelliStrutture.struttureInCorso).flatMap(([nome, livelli]) => 
            livelli.map(livello => ({ nome, livello }))
        );
    
        let struttureInCodaFiltrate = [];
        if (lista && lista.struttura) {
            struttureInCodaFiltrate = lista.struttura.filter(({ nome, livello }) => {
                const livelloAttuale = parseInt(livelliStrutture.struttureInCoda[nome] || "0", 10);
                return livello > livelloAttuale;
            });
        }
    
        let struttureInCodaFinali = struttureInCodaFiltrate.filter(struttura => 
            !struttureInCorsoFinali.some(str => str.nome === struttura.nome && str.livello === struttura.livello)
        );

        if (struttureInCorsoFinali.length === 0 && struttureInCodaFinali.length > 0) {
            let primaStruttura = struttureInCodaFinali[0];
            let { nome, livello } = primaStruttura;

            if (risorseAttuali.legno >= costiStruttura[nome][livello - 1].legno &&
                risorseAttuali.argilla >= costiStruttura[nome][livello - 1].argilla &&
                risorseAttuali.ferro >= costiStruttura[nome][livello - 1].ferro) {
                
                upStruttureRisorse(winMain, risorseAttuali, resouceID[primaStruttura.nome]);

                struttureInCodaFinali = struttureInCodaFinali.slice(1);
            } else {
                console.log(`Risorse insufficienti per avviare ${nome} livello ${livello}.`);
            }
        }
        return { struttureInCorso: struttureInCorsoFinali, struttureInCoda: struttureInCodaFinali };
    } catch (error) {
        console.error("Errore nel recupero dei livelli delle strutture:", error);
        return { struttureInCorso: [], struttureInCoda: [] };
    }
});