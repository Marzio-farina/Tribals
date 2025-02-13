function risorse(win) {
    return win.webContents.executeJavaScript(`
        (async function() {
            try {
                let legno = document.querySelector('#wood')?.innerText.trim() || 'N/A';
                let argilla = document.querySelector('#stone')?.innerText.trim() || 'N/A';
                let ferro = document.querySelector('#iron')?.innerText.trim() || 'N/A';

                return { legno, argilla, ferro };
            } catch (error) {
                console.error('Errore nel recupero delle risorse:', error);
                return { legno: 'Errore', argilla: 'Errore', ferro: 'Errore' };
            }
        })();
    `);
}

module.exports = { risorse };