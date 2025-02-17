const { inizializzaDB, aggiungiMondo, leggiMondo, datiIniziali,aggiornaRovistamentoValore } = require('./dbDinamico');
const { ipcRenderer } = require('electron');

function SbloccoRovistamento (win,{ legno, argilla, ferro }, lv, nomeLv){
    url = `https://it91.tribals.it/game.php?village=4477&screen=place&mode=scavenge`;
    win.loadURL(url);
    // ipcRenderer.send('aggiornaRovistamento', "91", "villaggio1", nomeLv, true);
    win.webContents.executeJavaScript(`
        const ContenitoreRovistamenti = document.querySelector('#scavenge_screen');
        if (ContenitoreRovistamenti) {
            const rovistamenti = ContenitoreRovistamenti.querySelectorAll('.scavenge-screen-main-widget .options-container .scavenge-option.border-frame-gold-red');
            const rovistamento = rovistamenti[${lv}];
            const rovistamentoEsatto = rovistamento.querySelector('.status-specific .locked-view .action-container .btn.btn-default.unlock-button');

            if (rovistamentoEsatto) {
                rovistamentoEsatto.click();

                setTimeout(() => {
                    const uplv = document.querySelector('#popup_box_unlock-option-' + ( ${lv + 1} ) + ' .popup_box_content .scavenge-option-unlock-dialog .btn.btn-default');
                    uplv.click();
                }, 1000);
            } else {
                console.error("rovistamento " + "${nomeLv}" + " non trovato.");
            }
        } else {
            console.error("ContenitoreRovistamenti non trovato.");
        }
    `, true).catch(error => {
        console.error("Errore nell'esecuzione del JavaScript:", error);
    });
}

module.exports = { SbloccoRovistamento };