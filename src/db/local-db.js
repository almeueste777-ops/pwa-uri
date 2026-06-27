// local-db.js - Motorul de date offline-first al aplicației Antigravity (IndexedDB)

const DB_NAME = 'antigravity-wms-db';
const DB_VERSION = 1;
const STORE_PRODUSE = 'produse';
const STORE_STOCURI = 'stocuri';

const LEGACY_STORAGE_KEY = 'antigravity-wms-data';

let db = null;

function deschideDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = () => {
            const baza = request.result;
            if (!baza.objectStoreNames.contains(STORE_PRODUSE)) {
                baza.createObjectStore(STORE_PRODUSE, { keyPath: 'id' });
            }
            if (!baza.objectStoreNames.contains(STORE_STOCURI)) {
                baza.createObjectStore(STORE_STOCURI, { keyPath: 'cheie' });
            }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

function tranzactie(numeStore, mod) {
    return db.transaction(numeStore, mod).objectStore(numeStore);
}

function promisifica(cerere) {
    return new Promise((resolve, reject) => {
        cerere.onsuccess = () => resolve(cerere.result);
        cerere.onerror = () => reject(cerere.error);
    });
}

function normalizeazaProdus(produs) {
    // Compatibilitate cu formatul folosit într-o versiune anterioară a aplicației
    // (denumire/poza), ca datele vechi salvate de utilizatori să nu se piardă.
    return {
        id: produs.id,
        denumire_produs: produs.denumire_produs ?? produs.denumire ?? '',
        marca: produs.marca ?? '',
        unitate_masura: produs.unitate_masura ?? 'Buc',
        poza_url: produs.poza_url ?? produs.poza ?? '',
    };
}

async function migreazaDinLocalStorage() {
    const produseExistente = await promisifica(tranzactie(STORE_PRODUSE, 'readonly').count());
    if (produseExistente > 0) return;

    const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return;

    let dateVechi;
    try {
        dateVechi = JSON.parse(raw);
    } catch (e) {
        console.error('Date vechi corupte în localStorage, migrarea a fost ignorată.', e);
        return;
    }

    const storeProduse = tranzactie(STORE_PRODUSE, 'readwrite');
    (dateVechi.produse || []).forEach(produs => {
        storeProduse.put(normalizeazaProdus(produs));
    });

    const storeStocuri = tranzactie(STORE_STOCURI, 'readwrite');
    Object.entries(dateVechi.stocuri || {}).forEach(([cheie, valoare]) => {
        storeStocuri.put({ cheie, valoare });
    });

    console.log('Date migrate din localStorage în IndexedDB.');
}

export async function initLocalDB() {
    db = await deschideDB();
    await migreazaDinLocalStorage();
    return db;
}

export async function getProduse() {
    return promisifica(tranzactie(STORE_PRODUSE, 'readonly').getAll());
}

export async function adaugaProdus(produs) {
    await promisifica(tranzactie(STORE_PRODUSE, 'readwrite').put(produs));
    return produs;
}

function cheieStoc(gestiuneId, locatie, produsId) {
    return `${gestiuneId}|${locatie}|${produsId}`;
}

export async function getStoc(gestiuneId, locatie, produsId) {
    const inregistrare = await promisifica(
        tranzactie(STORE_STOCURI, 'readonly').get(cheieStoc(gestiuneId, locatie, produsId))
    );
    return inregistrare ? inregistrare.valoare : 0;
}

export async function ajusteazaStoc(gestiuneId, locatie, produsId, delta) {
    const cheie = cheieStoc(gestiuneId, locatie, produsId);
    const store = tranzactie(STORE_STOCURI, 'readwrite');
    const inregistrare = await promisifica(store.get(cheie));
    const curent = inregistrare ? inregistrare.valoare : 0;
    const nou = Math.max(0, curent + delta);
    await promisifica(tranzactie(STORE_STOCURI, 'readwrite').put({ cheie, valoare: nou }));
    return nou;
}

export async function getProduseCuStoc(gestiuneId, locatie) {
    const produse = await getProduse();
    return Promise.all(
        produse.map(async produs => ({
            ...produs,
            stoc: await getStoc(gestiuneId, locatie, produs.id),
        }))
    );
}
