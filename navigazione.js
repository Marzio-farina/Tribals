function paginaStruttura(winMain, villaggio, struttura) {
    if (!winMain || !villaggio || !struttura) {
        console.error("Errore: Parametri non validi in paginaStruttura.");
        return;
    }

    const url = `https://game.tribalwars.it/game.php?village=${villaggio}&screen=${struttura}`;
    
    console.log(`Cambio URL a: ${url}`);
    winMain.webContents.executeJavaScript(`
        window.location.href = "${url}";
    `).catch(err => console.error("Errore durante il cambio pagina:", err));
}

module.exports = { paginaStruttura };