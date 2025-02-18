const { inizializzaDB, aggiungiMondo, leggiMondo, datiIniziali,aggiornaRovistamentoValore } = require('./dbDinamico');
const { calcolaTruppeNelVillaggio } = require('./unit');
const { ipcRenderer } = require('electron');

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
                            console.log("Click su uplv riuscito!");
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
            console.error("Dettagli dell'errore:", error.stack); // Mostra stack trace dell'errore
        });
    }, 3000);
}

function rovista (win){
    const truppeAttualeNelVillaggio = calcolaTruppeNelVillaggio("villaggio1");
    win.loadURL('https://it91.tribals.it/game.php?village=4477&screen=place&mode=scavenge');

    if (truppeAttualeNelVillaggio < 500) {
        rovistaPocheTruppe(win);
    }
}

function rovistaPocheTruppe(win) {
    setTimeout(() => {
        win.webContents.executeJavaScript(`
            (function() {
                const ContenitoreRovistamenti = document.querySelector('#scavenge_screen');
                const ContenitoreTruppeDaInviare = ContenitoreRovistamenti.querySelectorAll('.scavenge-screen-main-widget .candidate-squad-container .candidate-squad-widget.vis tbody tr td');
                const truppeConInput = Array.from(ContenitoreTruppeDaInviare).filter(el => 
                    el.querySelector('.unitsInput.input-nicer')
                );
                const unitData = {};

                const db = ${JSON.stringify(leggiMondo("91").villaggi.villaggio1.Truppe)};
                truppeConInput.forEach(el => {
                    let unitInput = el.querySelector('.unitsInput.input-nicer');
                    if (unitInput) {
                        let tipoUnit = unitInput.getAttribute('name')?.trim();
                        let valoreUnit;

                        switch (tipoUnit) {
                            case "spear":
                                valoreUnit = db["Lanciere"] || 0;
                                unitInput.value = valoreUnit
                                break;
                            case "sword":
                                valoreUnit = db["Spadaccino"] || 0;
                                unitInput.value = valoreUnit
                                break;
                            case "axe":
                                valoreUnit = db["Guerriero con ascia"] || 0;
                                unitInput.value = valoreUnit
                                break;
                            case "light":
                                valoreUnit = db["Cavalleria leggera"] || 0;
                                unitInput.value = valoreUnit
                                break;
                            case "heavy":
                                valoreUnit = db["Cavalleria pesante"] || 0;
                                unitInput.value = valoreUnit
                                break;
                            default:
                                console.warn("Unità sconosciuta:", tipoUnit);
                        }
                    } else {
                        console.warn("Elemento .unitsInput.input-nicer non trovato in", el);
                    }
                });
                
                console.log("Unità da inviare:", unitData);

                const rovistamenti = ContenitoreRovistamenti.querySelectorAll('.scavenge-screen-main-widget .options-container .scavenge-option.border-frame-gold-red');
                const rovistamentiValidi = Array.from(rovistamenti).filter(rovistamento => 
                    rovistamento.querySelector('.status-specific .inactive-view .action-container .btn.btn-default.free_send_button')
                );
                const rovistamentoEsatto = rovistamentiValidi[rovistamentiValidi.length - 1];
                console.log("Ultimo rovistamento trovato:", rovistamentoEsatto);
                rovistamentoEsatto.click();
            })();
        `, true).catch(error => {
            console.error("Errore nell'esecuzione del JavaScript:", error);
            console.error("Dettagli dell'errore:", error.stack); // Mostra stack trace dell'errore
        });
    }, 1000);
}

module.exports = { SbloccoRovistamento, rovista };