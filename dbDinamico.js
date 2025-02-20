const path = require('path');
const fs = require('fs');
const dbPath = path.join(__dirname, 'database.json');

const datiIniziali = {
    "Mondi": {
        "91": {
            "villaggi": {
                "villaggio1": {
                    "Rovistamento": {
                        "Razziatore svogliato": false,
                        "Trasportatori Umili": false,
                        "Rovistamento astuto": false,
                        "Ottimi Raccoglitori": false
                    },
                    "Truppe": {
                        "Lanciere": 0,
                        "Spadaccino": 0,
                        "Guerriero con ascia": 0,
                        "Arciere": 0,
                        "Esploratore": 0,
                        "Cavalleria leggera": 0,
                        "Arciere a Cavallo": 0,
                        "Cavalleria pesante": 0,
                        "Arieti": 0,
                        "Catapulte": 0,
                        "Paladino": 0,
                        "Nobile": 0,
                    },
                }
            }
        }
    }
};

function leggiDB() {
    try {
        if (!fs.existsSync(dbPath)) {
            fs.writeFileSync(dbPath, JSON.stringify(datiIniziali, null, 2));
        }
        const data = fs.readFileSync(dbPath, 'utf-8');
        return JSON.parse(data) || {};
    } catch (err) {
        console.error('Errore nella lettura del DB:', err);
        return {};
    }
}

function scriviDB(dati) {
    try {
        fs.writeFileSync(dbPath, JSON.stringify(dati, null, 2));
    } catch (err) {
        console.error('Errore nella scrittura del DB:', err);
    }
}

// Funzione per inizializzare o ottenere il DB
function inizializzaDB() {
    return leggiDB();
}

// Funzione per aggiungere un mondo nel DB
function aggiungiMondo(id, dati) {
    const db = inizializzaDB();
    db[id] = dati;
    scriviDB(db);
}

// Funzione per leggere un mondo dal DB
function leggiMondo(id) {
    const db = inizializzaDB();
    if (!db.Mondi || !db.Mondi[id]) {
        console.error(`Errore: Il mondo ${id} non esiste nel database.`);
        return null;
    }
    return db.Mondi[id];
}

module.exports = { inizializzaDB, aggiungiMondo, leggiMondo, datiIniziali, scriviDB };