const path = require('path');
const fs = require('fs');

// Percorso del file del database
const dbPath = path.join(__dirname, 'database.json');

// Struttura iniziale dei dati
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
                    }
                }
            }
        }
    }
};

// Funzione per leggere il file JSON
function leggiDB() {
    try {
        if (!fs.existsSync(dbPath)) {
            fs.writeFileSync(dbPath, JSON.stringify(datiIniziali, null, 2)); // Inizializza il file se non esiste
        }
        const data = fs.readFileSync(dbPath, 'utf-8');
        return JSON.parse(data) || {};
    } catch (err) {
        console.error('Errore nella lettura del DB:', err);
        return {};
    }
}

// Funzione per scrivere nel file JSON
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
    return db[id] || null;
}

module.exports = { inizializzaDB, aggiungiMondo, leggiMondo, datiIniziali };