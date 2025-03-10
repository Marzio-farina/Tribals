const { inizializzaDB, scriviDB, leggiMondo } = require('./dbDinamico');

async function calcoloUnitNelVillaggio(win, mondoId, villaggioId) {
    return win.webContents.executeJavaScript(`
        (async function() {
            const contenitoreUnit = document.querySelector('#unit_overview_table');
            if (!contenitoreUnit) {
                console.error("Tabella delle unità non trovata.");
                return {};
            }
            const sottoContenitoreUnit = contenitoreUnit.querySelectorAll('tbody .all_unit');
            let unitData = {
                "Lanciere": 0,
                "Spadaccino": 0,
                "Esploratore": 0,
                "Guerriero con ascia": 0,
                "Cavalleria leggera": 0,
                "Cavalleria pesante": 0,
                "Paladino": 0
            };

            sottoContenitoreUnit.forEach(el => {
                let numeroUnit = parseInt(el.querySelector('td strong')?.textContent?.trim());
                let tipoUnit = el.querySelector('td strong').getAttribute('data-count')?.trim()

                switch (tipoUnit) {
                    case "spear":
                        unitData["Lanciere"] = numeroUnit;
                        break;
                    case "sword":
                        unitData["Spadaccino"] = numeroUnit;
                        break;
                    case "spy":
                        unitData["Esploratore"] = numeroUnit;
                        break;
                    case "axe":
                        unitData["Guerriero con ascia"] = numeroUnit;
                        break;
                    case "light":
                        unitData["Cavalleria leggera"] = numeroUnit;
                        break;
                    case "heavy":
                        unitData["Cavalleria pesante"] = numeroUnit;
                        break;
                    case "knight":
                        unitData["Paladino"] = numeroUnit;
                        break;
                    default:
                        console.warn("Unità sconosciuta:", tipoUnit);
                        return;
                }
            });
            return unitData;
        })();
    `).then(async unitData => {
        if (!unitData) return;
        const db = inizializzaDB();
        if (db.Mondi && db.Mondi[mondoId] &&
            db.Mondi[mondoId].villaggi && db.Mondi[mondoId].villaggi[villaggioId] &&
            db.Mondi[mondoId].villaggi[villaggioId].Truppe) {

            Object.keys(unitData).forEach(unit => {
                db.Mondi[mondoId].villaggi[villaggioId].Truppe[unit] = unitData[unit];
            });
            scriviDB(db);
        } else {
            console.error("Errore: Struttura del database non trovata per il mondo/villaggio specificato.");
        }
    }).catch(error => {
        console.error("Errore nell'estrazione delle unità:", error);
    });
}

function calcolaTruppeNelVillaggio(villaggioId) {
    const mondo = leggiMondo("91");
    const villaggio = mondo.villaggi[villaggioId];
    const truppeDaEscludere = ["Esploratore", "Arieti", "Catapulte", "Paladino", "Nobile"];
    let totaleTruppe = 0;
    
    for (const truppa in villaggio.Truppe) {
        if (!truppeDaEscludere.includes(truppa)) {
            totaleTruppe += villaggio.Truppe[truppa];
        }
    }
    return totaleTruppe;
}

async function reclutamentoUnit(win) {
    console.log("prova");    
}

module.exports = { calcoloUnitNelVillaggio, calcolaTruppeNelVillaggio, reclutamentoUnit };