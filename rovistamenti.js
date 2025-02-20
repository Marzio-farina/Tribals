const { inizializzaDB, aggiungiMondo, leggiMondo, datiIniziali,aggiornaRovistamentoValore } = require('./dbDinamico');
const { calcolaTruppeNelVillaggio } = require('./unit');
const { ipcRenderer, ipcMain } = require('electron');

let intervallo = 30000;

async function avviaRovistamento(win) {

    ipcMain.removeAllListeners('millisecondi-calcolati');
    ipcMain.on('millisecondi-calcolati', (event, millisecondi) => {
        console.log("Ricevuti millisecondi:", millisecondi);
        intervallo = millisecondi;
    });
    await aggiornaIntervallo(win);
    win.webContents.on('did-finish-load', () => {
        win.webContents.executeJavaScript(`
            window.addEventListener('message', (event) => {
                if (event.data.type === 'millisecondi-calcolati') {
                    console.log("Millisecondi ricevuti:", event.data.millisecondi);
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
            intervallo = await rovista(win) + 3000;
            console.log("Nuovo intervallo impostato:", intervallo);
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

async function rovista (win){
    const truppeAttualeNelVillaggio = await calcolaTruppeNelVillaggio("villaggio1");
    // win.loadURL('https://it91.tribals.it/game.php?village=4477&screen=place&mode=scavenge');
    console.log("truppeAttualeNelVillaggio :", truppeAttualeNelVillaggio);

    if (truppeAttualeNelVillaggio < 500 && truppeAttualeNelVillaggio > 10) {
        console.log("Funzione rovista chiamata");
        return await rovistaPocheTruppe(win);
    } else {
        return 30000;
    }
}

async function rovistaPocheTruppe(win) {
    console.log("Funzione rovistaPocheTruppe chiamata");
    return new Promise((resolve, reject) => {
        ipcMain.once('millisecondi-calcolati', (event, millisecondi) => {
            console.log("Ricevuti millisecondi:", millisecondi);
            resolve(millisecondi);
        });

        win.webContents.executeJavaScript(`
            (async function() {
                console.log("Funzione rovistaPocheTruppe all'inizio della promise chiamata");
                const ContenitoreRovistamenti = document.querySelector('#scavenge_screen');
                console.log("Contenitore Rovistamenti:", ContenitoreRovistamenti);
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
                        console.log("Unità trovata:", tipoUnit);

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
                                    console.log("Unità knight trovata, ma non viene selezionata");
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

                    console.log("rovistamentoInCorso2:", rovistamentoInCorso2);
                    
                    if (rovistamentoInCorso2.length > 0) {
                        rovistamentoInCorso2.forEach((rovistamento) => {
                            // const ultimoRovistamento = rovistamentoInCorso2[rovistamentoInCorso2.length - 1];
                            const countdownElement = rovistamento.querySelector('ul li:last-child .return-countdown');
                            console.log("countdownElement : ", countdownElement);
                            if (countdownElement) {
                                const timeRovistamento = countdownElement.textContent;
                                console.log("Tempo rovistamento:", timeRovistamento);
                                if (timeRovistamento) {
                                    const [ore, minuti, secondi] = timeRovistamento.split(':').map(Number);                                      
                                    const millisecondi = (ore * 3600 + minuti * 60 + secondi) * 1000;
                                    console.log("Millis calcolati:", millisecondi);
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