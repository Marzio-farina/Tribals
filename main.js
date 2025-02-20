const { app, BrowserWindow, ipcMain } = require('electron');
const createWindows = require('./windows');
const { login, loginMondo91 } = require('./login');
const { risorse } = require('./risorse');
const { upStruttureRisorse } = require('./upStrutture');
const { SbloccoRovistamento, rovista, avviaRovistamento } = require('./rovistamenti');
const { UpFree } = require('./instantUpStrutture');
const path = require('path');
const { costiStruttura, getCostiStruttura, lista, resouceID } = require('./db');
const { inizializzaDB, aggiungiMondo, leggiMondo, datiIniziali, scriviDB } = require('./dbDinamico');
const { calcoloUnitNelVillaggio, calcolaTruppeNelVillaggio } = require('./unit');

let winMain, winSide, winRovisto;
let risorseAttuali = { legno: 'N/A', argilla: 'N/A', ferro: 'N/A' };
let url;
let ultimoStruttureInCorso = {};
let rovistamentiEseguiti = {};

function initialize() {
    const windows = createWindows();
    winMain = windows.winMain;
    winSide = windows.winSide;
    winRovisto = windows.winRovisto;
    winMain.webContents.once('did-finish-load', async () => {
        setTimeout(async () => {
            try {
                await login(winMain);
                await loginMondo91(winMain);
                await waitForGameLoad(winMain);
                await calcoloUnitNelVillaggio(winMain,"91","villaggio1");
                const villaggio = "4477";
                const struttura = "main";
                url = `https://it91.tribals.it/game.php?village=${villaggio}&screen=${struttura}`;
                winMain.loadURL(url);
                await UpFree(winMain, winSide, url);
                setInterval(() => fetchResources(winMain), 2000);
                setTimeout(() => {
                    winRovisto.loadURL('https://it91.tribals.it/game.php?village=4477&screen=place&mode=scavenge');
                }, 15000);
                await avviaRovistamento(winRovisto);
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
                        if (Object.keys(struttureInCorso).length === 0) {
                            sessionStorage.setItem('struttureInCoda', JSON.stringify(struttureInCoda));
                            sessionStorage.setItem('struttureInCorso', JSON.stringify({}));
                            return { struttureInCorso: {}, struttureInCoda };
                        }
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

            if (risorseAttuali.legno != 'N/A' && risorseAttuali.argilla != 'N/A' && risorseAttuali.ferro != 'N/A') {
                if (risorseAttuali.legno >= costiStruttura[nome][livello - 1].legno &&
                    risorseAttuali.argilla >= costiStruttura[nome][livello - 1].argilla &&
                    risorseAttuali.ferro >= costiStruttura[nome][livello - 1].ferro) {
                    
                    winMain.loadURL(url);
                    winMain.webContents.once('did-finish-load', () => {
                        upStruttureRisorse(winMain, risorseAttuali, resouceID[primaStruttura.nome]);
                        struttureInCodaFinali = struttureInCodaFinali.slice(1);
                    });
                } else {
                    console.log(`Risorse insufficienti per avviare ${nome} livello ${livello}.`);
                };
            };
        };

        if (JSON.stringify(struttureInCorsoFinali) !== JSON.stringify(ultimoStruttureInCorso)) {
            ultimoStruttureInCorso = struttureInCorsoFinali;
            winMain.webContents.send('update-strutture-in-corso', struttureInCorsoFinali);
        };
        
        if (!struttureInCodaFinali.some(({ nome, livello }) => nome === "Raduno" && livello === 1)) {
            if (leggiMondo("91").villaggi["villaggio1"].Rovistamento["Razziatore svogliato"] === false) {
                verificaERichiamaRovistamento("Razziatore svogliato", 0, { legno: 25, argilla: 30, ferro: 25 }, 10, struttureInCodaFinali);
            }
            if (leggiMondo("91").villaggi["villaggio1"].Rovistamento["Trasportatori Umili"] === false) {
                verificaERichiamaRovistamento("Trasportatori Umili", 1, { legno: 250, argilla: 300, ferro: 250 }, 15, struttureInCodaFinali);
            }
            if (leggiMondo("91").villaggi["villaggio1"].Rovistamento["Rovistamento astuto"] === false) {
                verificaERichiamaRovistamento("Rovistamento astuto", 2, { legno: 1000, argilla: 1200, ferro: 1000 }, 20, struttureInCodaFinali);
            }
            if (leggiMondo("91").villaggi["villaggio1"].Rovistamento["Ottimi Raccoglitori"] === false) {
                verificaERichiamaRovistamento("Ottimi Raccoglitori", 3, { legno: 10000, argilla: 12000, ferro: 10000 }, 23, struttureInCodaFinali);
            }
        };        
        return { struttureInCorso: struttureInCorsoFinali, struttureInCoda: struttureInCodaFinali };
    } catch (error) {
        console.error("Errore nel recupero dei livelli delle strutture:", error);
        return { struttureInCorso: [], struttureInCoda: [] };
    }
});

function aggiornaRovistamento(mondoId, villaggioId, rovistamentoId) {
    const db = inizializzaDB();

    if (db.Mondi && db.Mondi[mondoId] &&
        db.Mondi[mondoId].villaggi && db.Mondi[mondoId].villaggi[villaggioId] &&
        db.Mondi[mondoId].villaggi[villaggioId].Rovistamento &&
        db.Mondi[mondoId].villaggi[villaggioId].Rovistamento.hasOwnProperty(rovistamentoId)) {

        if (db.Mondi[mondoId].villaggi[villaggioId].Rovistamento[rovistamentoId] === true) {
            console.log(`"${rovistamentoId}" è già stato aggiornato, nessuna modifica necessaria.`);
            return;
        }
        
        db.Mondi[mondoId].villaggi[villaggioId].Rovistamento[rovistamentoId] = true;
        scriviDB(db);
        console.log(`Il valore di "${rovistamentoId}" è stato aggiornato a true!`);
    } else {
        console.error("Errore: Dati non trovati nel database.");
    }
}

function verificaERichiamaRovistamento(nomeRovistamento, indice, requisiti, livelloMinimo, struttureInCodaFinali) {
    if (risorseAttuali.legno > requisiti.legno && risorseAttuali.argilla > requisiti.argilla && risorseAttuali.ferro > requisiti.ferro) {
        console.log("nomeRovistamento :" + nomeRovistamento + " , indice :" + indice + " , requisiti :" + requisiti + " , livelloMinimo :" + livelloMinimo);
        
        if (rovistamentiEseguiti[nomeRovistamento]) {
            console.log(`"${nomeRovistamento}" è già stato eseguito, non richiamare di nuovo.`);
            return;
        }

        leggiMondo("91").villaggi["villaggio1"].Rovistamento[nomeRovistamento] === true;
        let upRovistamento = struttureInCodaFinali.filter(el => el.nome === "Taglialegna").every(el => el.livello >= livelloMinimo);

        if (!upRovistamento) {
            console.log("Sono qui");
            rovistamentiEseguiti[nomeRovistamento] = true;
            setTimeout(() => {
                SbloccoRovistamento(winRovisto, indice, nomeRovistamento);
                aggiornaRovistamento("91", "villaggio1", nomeRovistamento);
            }, 10000);
        } else {
            console.log("Le strutture sono pronte, ma il rovistamento è già stato eseguito.");
        }
    }
}