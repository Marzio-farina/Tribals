function executeAfterLoad(winMain, script) {
    winMain.webContents.once('did-frame-finish-load', () => {
        winMain.webContents.executeJavaScript(script);
    });
}

module.exports = { executeAfterLoad };