function upStruttureRisorse(win, { legno, argilla, ferro }, resourceId) {
    return win.webContents.executeJavaScript(`
        (function() {
            let legnoNecessario = document.querySelector('#${resourceId} td.cost_wood')?.getAttribute('data-cost') || 'N/A';
            let argillaNecessaria = document.querySelector('#${resourceId} td.cost_stone')?.getAttribute('data-cost') || 'N/A';
            let ferroNecessario = document.querySelector('#${resourceId} td.cost_iron')?.getAttribute('data-cost') || 'N/A';

            return { legnoNecessario, argillaNecessaria, ferroNecessario };
        })();
    `).then((resourceNecessario) => {
        if (
            parseInt(legno) >= parseInt(resourceNecessario.legnoNecessario) &&
            parseInt(argilla) >= parseInt(resourceNecessario.argillaNecessaria) &&
            parseInt(ferro) >= parseInt(resourceNecessario.ferroNecessario)
        ) {
            return win.webContents.executeJavaScript(`
                (function() {
                    let link = document.querySelector('#${resourceId} td.build_options a.btn.btn-build.current-quest.quest-arrow-target');
                    if (link) {
                        link.click();
                    } else {
                        link = document.querySelector('#${resourceId} td.build_options a.btn.btn-build');
                        if (link) {
                            link.click();
                        }
                    }
                    let message = document.querySelector('#confirmation-box div.confirmation-box-content-pane div.confirmation-box-content div.confirmation-buttons div.btn.evt-cancel-btn.btn-confirm-no');
                    if (message) {
                        message.click();
                    }
                })();
            `);
        } else {
            console.log('Non abbastanza risorse per l\'upgrade!');
        }
    }).catch((error) => {
        console.error('Errore nel recupero delle risorse:', error);
    });
}

module.exports = { upStruttureRisorse };