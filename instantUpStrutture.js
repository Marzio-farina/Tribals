function UpFree(winMain, winSide) {
    return winMain.webContents.executeJavaScript(`
        (function() {
            try {
                let upFree = document.querySelector('#buildqueue .lit.nodrag .lit-item .order_feature.btn.btn-btr.btn-instant-free');
                if (!upFree) {
                    return JSON.stringify({ delay: null, message: "Elemento non trovato." });
                }
                let dataAvailableFrom = parseInt(upFree.getAttribute('data-available-from')) * 1000;
                let currentTime = Date.now();
                let delay = dataAvailableFrom - currentTime + 1000;

                if (delay > 0) {
                    setTimeout(() => {
                        let upFreeClick = document.querySelector('#buildqueue .lit.nodrag .lit-item .order_feature.btn.btn-btr.btn-instant-free');
                        if (upFreeClick) {
                            upFreeClick.click();
                            console.log("Click eseguito su upFree!");
                        } else {
                            console.log("Elemento non trovato al momento del click.");
                        }
                    }, delay);
                } else {
                    upFree.click();
                }                
                return JSON.stringify({ delay, message: "Attendo " + delay + " ms per il click." });
            } catch (err) {
                return JSON.stringify({ delay: null, message: "Errore esecuzione: " + err.message });
            }
        })();
    `).then(result => {
        try {
            if (typeof result !== "string") {
                throw new Error("Il risultato non è una stringa JSON valida");
            }
            const parsedResult = JSON.parse(result);
            let remainingDelay = Number(parsedResult.delay) || 0;

            function updateDelay() {
                if (remainingDelay > 0) {
                    remainingDelay -= 1000;
                    winSide.webContents.send('update-delay', { delay: remainingDelay });
                    setTimeout(updateDelay, 1000);
                } else {
                    winSide.webContents.send('update-delay', { delay: 0, message: "Subito disponibile" });
                }
            }
            updateDelay();

        } catch (err) {
            console.error("Errore nel parsing JSON di UpFree:", err);
            winSide.webContents.send('update-delay', { delay: null, message: "Errore esecuzione UpFree" });
        }
    }).catch(err => {
        console.error("Errore UpFree:", err);
        winSide.webContents.send('update-delay', { delay: null, message: "Errore esecuzione UpFree" });
    });
}

module.exports = { UpFree };