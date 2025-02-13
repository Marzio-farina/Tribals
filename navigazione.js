function paginaStruttura(winMain, villaggio, struttura) {
    if (!winMain || !villaggio || !struttura) {
        console.error("Errore: Parametri non validi in paginaStruttura.");
        return;
    }

    const url = `https://it91.tribals.it/game.php?village=${villaggio}&screen=${struttura}`;

    console.log(`DEBUG: Cambio pagina tra 2 secondi -> ${url}`);

    setTimeout(() => {
        winMain.webContents.executeJavaScript(`
            console.log("DEBUG: Cambio URL a -> ${url}");
            window.location.href = "${url}";
        `).then(() => {
            console.log("DEBUG: Cambio URL eseguito con successo.");
        }).catch(err => {
            console.error("Errore durante il cambio pagina:", err);
        });
    }, 2000);
}

module.exports = { paginaStruttura };