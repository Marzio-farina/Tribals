const { inizializzaDB, aggiungiMondo, leggiMondo, datiIniziali,aggiornaRovistamentoValore } = require('./dbDinamico');
const { calcolaTruppeNelVillaggio, calcoloUnitNelVillaggio } = require('./unit');
const { ipcRenderer, ipcMain } = require('electron');

let intervallo = 30000;
let fineIntervallo;

async function avviaRovistamento(win) {
    ipcMain.removeAllListeners('millisecondi-calcolati');
    ipcMain.on('millisecondi-calcolati', (event, millisecondi) => {
        intervallo = millisecondi;        
    });
    await aggiornaIntervallo(win);
    win.webContents.on('did-finish-load', () => {
        win.webContents.executeJavaScript(`
            window.addEventListener('message', (event) => {
                if (event.data.type === 'millisecondi-calcolati') {
                    if (window.ipc) {
                        window.ipc.send('millisecondi-calcolati', event.data.millisecondi);
                    } else {
                        console.error("window.ipc non è definito!");
                    }
                }
            });
        `);
    });        

    async function aggiornaIntervallo(win) {
        try {
            intervallo = await rovista(win) + 7000;
            fineIntervallo = new Date(intervallo + Date.now());
        } catch (error) {
            console.error("Errore durante l'aggiornamento dell'intervallo:", error);
            intervallo = 30000;
        }
        setTimeout(async () => {
            try {
                await aggiornaIntervallo(win);
            } catch (error) {
                console.error("Errore nell'aggiornamento dell'intervallo:", error);
            }
        }, intervallo);
    }
}

function SbloccoRovistamento (win, lv, nomeLv){
    url = `https://it91.tribals.it/game.php?village=4477&screen=place&mode=scavenge`;
    win.loadURL(url);
    setTimeout(() => {
        win.webContents.executeJavaScript(`
            (function() {
                const ContenitoreRovistamenti = document.querySelector('#scavenge_screen');
                
                if (!ContenitoreRovistamenti) {
                    console.error("ContenitoreRovistamenti non trovato.");
                    return;
                }
                
                const rovistamenti = ContenitoreRovistamenti.querySelectorAll('.scavenge-screen-main-widget .options-container .scavenge-option.border-frame-gold-red');
                const rovistamento = rovistamenti[${lv}];

                if (!rovistamento) {
                    console.error("Rovistamento di indice " + ${lv} + " non trovato.");
                    return;
                }

                const rovistamentoEsatto = rovistamento.querySelector('.status-specific .locked-view .action-container .btn.btn-default.unlock-button');

                if (rovistamentoEsatto) {
                    rovistamentoEsatto.click();
                    setTimeout(() => {
                        const uplv = document.querySelector('#popup_box_unlock-option-' + (${lv + 1}) + ' .popup_box_content .scavenge-option-unlock-dialog .btn.btn-default');
                        if (uplv) {
                            uplv.click();
                        } else {
                            console.error("Bottone uplv non trovato.");
                        }
                    }, 2000);
                } else {
                    console.error("rovistamento " + "${nomeLv}" + " non trovato.");
                }
            })();
        `, true).catch(error => {
            console.error("Errore nell'esecuzione del JavaScript:", error);
            console.error("Dettagli dell'errore:", error.stack);
        });
    }, 3000);
}

async function rovista(win) {
    try {
        const urlOverview = 'https://it91.tribals.it/game.php?screen=overview&intro';
        const urlAttuale = await win.webContents.executeJavaScript("window.location.href");

        if (!urlAttuale.includes("screen=overview&intro")) {
            await new Promise((resolve, reject) => {
                win.loadURL(urlOverview);
                win.webContents.once('did-finish-load', resolve);
                setTimeout(() => reject(new Error("Timeout nel caricamento della pagina overview")), 15000);
            });
        }
        await calcoloUnitNelVillaggio(win, "91", "villaggio1");

        const truppeAttualeNelVillaggio = await calcolaTruppeNelVillaggio("villaggio1");

        if (truppeAttualeNelVillaggio < 500 && truppeAttualeNelVillaggio > 10) {
            return new Promise((resolve, reject) => {
                const url = 'https://it91.tribals.it/game.php?village=4477&screen=place&mode=scavenge';
                win.loadURL(url);
                win.webContents.once('did-finish-load', async () => {
                    try {
                        resolve(await rovistaPocheTruppe(win));
                    } catch (error) {
                        console.error("Errore durante il rovistamento:", error);
                        reject(error);
                    }
                });
                setTimeout(() => {
                    reject(new Error("Timeout nel caricamento della pagina"));
                }, 15000);
            });
        } else {
            return 60000;
        }
    } catch (error) {
        console.error("Errore nel calcolo delle truppe:", error);
        return 30000;
    }
}

async function rovistaPocheTruppe(win) {
    return new Promise((resolve, reject) => {
        ipcMain.once('millisecondi-calcolati', (event, millisecondi) => {
            resolve(millisecondi);
        });

        win.webContents.executeJavaScript(`
            (async function() {
                const ContenitoreRovistamenti = document.querySelector('#scavenge_screen');
                if (!ContenitoreRovistamenti) {
                    console.error("ContenitoreRovistamenti non trovato.");
                    return;
                }
                
                const ContenitoreTruppeDaInviare = ContenitoreRovistamenti.querySelectorAll('.scavenge-screen-main-widget .candidate-squad-container .candidate-squad-widget.vis tbody tr td');
                if (!ContenitoreTruppeDaInviare) {
                    console.error("ContenitoreTruppeDaInviare non trovato.");
                    return;
                }
                
                const truppeConInput = Array.from(ContenitoreTruppeDaInviare).filter(el => 
                    el.querySelector('.unitsInput.input-nicer')
                );

                if (!truppeConInput) {
                    console.error("truppeConInput non trovato.");
                    return;
                }

                truppeConInput.forEach(el => {
                    let unitInput = el.querySelector('.unitsInput.input-nicer');
                    let linkUnit = el.querySelector('.units-entry-all.squad-village-required');
                    if (unitInput) {
                        let tipoUnit = unitInput.getAttribute('name')?.trim();

                        if (!linkUnit.disabled && linkUnit.offsetParent !== null) {
                            switch (tipoUnit) {
                                case "spear":
                                case "sword":
                                case "axe":
                                case "light":
                                case "heavy":
                                    const event = new MouseEvent('click', {
                                        bubbles: true,
                                        cancelable: true,
                                        view: window
                                    });
                                    linkUnit.dispatchEvent(event);
                                    break;
                                case "knight":
                                    break;
                                default:
                                    console.warn("Unità sconosciuta:", tipoUnit);
                            }
                        } else {
                            console.warn("Bottone non cliccabile o nascosto per:", tipoUnit);
                        }
                    }
                });

                let rovistamenti = ContenitoreRovistamenti.querySelectorAll('.scavenge-screen-main-widget .options-container .scavenge-option.border-frame-gold-red');
                
                if (rovistamenti.length === 0) {
                    console.warn("Nessun rovistamento trovato.");
                    return;
                }
                const rovistamentiValidi = Array.from(rovistamenti).filter(rovistamento => 
                    rovistamento.querySelector('.status-specific .inactive-view .action-container .btn.btn-default.free_send_button')
                );
                if (rovistamentiValidi.length > 0) {
                    const rovistamentoEsatto = rovistamentiValidi[rovistamentiValidi.length - 1];
                    const startRovistamento = rovistamentoEsatto.querySelector('.status-specific .inactive-view .action-container .btn.btn-default.free_send_button');
                    setTimeout(() => {
                        if (startRovistamento.offsetParent !== null) {
                            startRovistamento.click();
                        } else {
                            console.warn("Elemento non visibile o cliccabile.");
                        }
                    }, 2000);
                } else {
                    console.warn("Nessun rovistamento valido trovato.");
                }
                
                setTimeout(() => {
                    rovistamenti = ContenitoreRovistamenti.querySelectorAll('.scavenge-screen-main-widget .options-container .scavenge-option.border-frame-gold-red');
                    const rovistamentoInCorso2 = Array.from(rovistamenti).filter(rovistamento => 
                        rovistamento.querySelector('.status-specific .active-view')
                    );
                    
                    if (rovistamentoInCorso2.length > 0) {
                        rovistamentoInCorso2.forEach((rovistamento) => {
                            const countdownElement = rovistamento.querySelector('ul li:last-child .return-countdown');
                            if (countdownElement) {
                                const timeRovistamento = countdownElement.textContent;
                                if (timeRovistamento) {
                                    const [ore, minuti, secondi] = timeRovistamento.split(':').map(Number);                                      
                                    const millisecondi = (ore * 3600 + minuti * 60 + secondi) * 1000;
                                    window.postMessage({ type: 'millisecondi-calcolati', millisecondi: millisecondi }, '*');
                                    if (window.ipc) {
                                        window.ipc.send('millisecondi-calcolati', millisecondi);
                                    } else {
                                        console.error("window.ipc non è definito!");
                                    }
                                }
                            } else {
                                console.warn("Tempo rovistamento non trovato.");
                            }
                        });
                    } else {
                        console.warn("Rovistamento in corso non trovato.");
                    }
                }, 6000);
            })();
        `).catch(error => {
            console.error("Errore nell'esecuzione del JavaScript:", error);
            reject(30000);
        });
    });
}

module.exports = { SbloccoRovistamento, rovista, avviaRovistamento };