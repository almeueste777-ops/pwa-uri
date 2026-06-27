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

// Resetare unică a datelor locale: în versiunea veche produsele nu erau legate
// de o locație anume, așa că apăreau în toate sectoarele. Curățăm o singură dată
// și lăsăm seed-ul să repopuleze corect, cu locație.
const SCHEMA_RESET_FLAG = 'antigravity-schema-v2';

async function reseteazaSchemaV2() {
    if (localStorage.getItem(SCHEMA_RESET_FLAG)) return;
    await promisifica(tranzactie(STORE_PRODUSE, 'readwrite').clear());
    await promisifica(tranzactie(STORE_STOCURI, 'readwrite').clear());
    localStorage.removeItem(SEED_CURATENIE_FLAG);
    localStorage.setItem(SCHEMA_RESET_FLAG, '1');
}

export async function initLocalDB() {
    db = await deschideDB();
    await migreazaDinLocalStorage();
    await reseteazaSchemaV2();
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

export async function getInregistrareStoc(gestiuneId, locatie, produsId) {
    const inregistrare = await promisifica(
        tranzactie(STORE_STOCURI, 'readonly').get(cheieStoc(gestiuneId, locatie, produsId))
    );
    return {
        valoare: inregistrare ? inregistrare.valoare : 0,
        stocInventar: inregistrare ? inregistrare.stocInventar ?? null : null,
        dataInventar: inregistrare ? inregistrare.dataInventar ?? null : null,
        ultimaOperatiune: inregistrare ? inregistrare.ultimaOperatiune ?? null : null,
    };
}

export async function ajusteazaStoc(gestiuneId, locatie, produsId, delta, ultimaOperatiune = null) {
    const cheie = cheieStoc(gestiuneId, locatie, produsId);
    const store = tranzactie(STORE_STOCURI, 'readwrite');
    const inregistrare = await promisifica(store.get(cheie));
    const curent = inregistrare ? inregistrare.valoare : 0;
    const nou = Math.max(0, curent + delta);
    await promisifica(tranzactie(STORE_STOCURI, 'readwrite').put({ ...inregistrare, cheie, valoare: nou, ultimaOperatiune }));
    return nou;
}

export async function seteazaStoc(gestiuneId, locatie, produsId, valoare, ultimaOperatiune = null) {
    const cheie = cheieStoc(gestiuneId, locatie, produsId);
    const store = tranzactie(STORE_STOCURI, 'readwrite');
    const inregistrare = await promisifica(store.get(cheie));
    const nou = Math.max(0, valoare);
    await promisifica(tranzactie(STORE_STOCURI, 'readwrite').put({ ...inregistrare, cheie, valoare: nou, ultimaOperatiune }));
    return nou;
}

export async function stergeProdus(gestiuneId, locatie, produsId) {
    await promisifica(tranzactie(STORE_PRODUSE, 'readwrite').delete(produsId));
    await promisifica(tranzactie(STORE_STOCURI, 'readwrite').delete(cheieStoc(gestiuneId, locatie, produsId)));
}

export async function inregistreazaInventar(gestiuneId, locatie, produsId, stocConstatat, dataInventar) {
    const cheie = cheieStoc(gestiuneId, locatie, produsId);
    const store = tranzactie(STORE_STOCURI, 'readwrite');
    const inregistrare = await promisifica(store.get(cheie));
    const nou = {
        ...inregistrare,
        cheie,
        valoare: stocConstatat,
        stocInventar: stocConstatat,
        dataInventar,
    };
    await promisifica(tranzactie(STORE_STOCURI, 'readwrite').put(nou));
    return nou;
}

const SEED_CURATENIE_FLAG = 'antigravity-seed-curatenie-v1';

const SEED_CURATENIE = [
    { denumire_produs: 'Detergent Vase 1 litru', marca: 'Dual Power', stoc: 248 },
    { denumire_produs: 'Gel de duș 1 litru', marca: 'Malizia', stoc: 205 },
    { denumire_produs: 'Șampon 600 ml', marca: 'Wash&Go', stoc: 66 },
    { denumire_produs: 'Șampon 360 ml', marca: 'Wash&Go', stoc: 60 },
    { denumire_produs: 'Bricuri de bărbierit', marca: 'Gillette', stoc: 58 },
    { denumire_produs: 'Spumă de bărbierit 200 ml', marca: 'Gillette', stoc: 44 },
    { denumire_produs: 'Mănuși L', marca: 'Nitrylex Basic', stoc: 3 },
    { denumire_produs: 'Mănuși M', marca: 'Nitrylex', stoc: 116 },
    { denumire_produs: 'Mănuși M', marca: 'Nutouch', stoc: 12 },
    { denumire_produs: 'Mănuși S', marca: 'Nitrylex', stoc: 35 },
    { denumire_produs: 'Mănuși S', marca: 'Nutouch', stoc: 50 },
    { denumire_produs: 'Șervețele umede', marca: 'Cien', stoc: 62 },
    { denumire_produs: 'Săpun lichid 1000 ml', marca: 'Dermomed', stoc: 18 },
    { denumire_produs: 'Periuțe de dinți', marca: 'Colgate', stoc: 12 },
    { denumire_produs: 'Găleți', marca: 'Metro', stoc: 45 },
    { denumire_produs: 'Mopuri', marca: 'Metro', stoc: 29 },
    { denumire_produs: 'Soluție curățat cuptoare', marca: 'SanoForte', stoc: 136 },
    { denumire_produs: 'Soluție WC', marca: 'Domestos', stoc: 190 },
    { denumire_produs: 'Clor 2 litri', marca: 'Candeggina', stoc: 96 },
    { denumire_produs: 'Soluție geamuri 580 ml', marca: 'Quasar', stoc: 41 },
    { denumire_produs: 'Detergent lichid 250 ml', marca: 'Ariel', stoc: 7 },
    { denumire_produs: 'Detergent praf', marca: 'Torre', stoc: 150 },
    { denumire_produs: 'Mop', marca: 'Metro', stoc: 12 },
    { denumire_produs: 'Fărașe', marca: 'Metro', stoc: 24 },
    { denumire_produs: 'Maturi', marca: '', stoc: 18 },
    { denumire_produs: 'Prosoape de hârtie', marca: 'Paris', stoc: 32 },
    { denumire_produs: 'Soluție de degresat', marca: 'CIF', stoc: 42 },
    { denumire_produs: 'Cloramină', marca: 'Biclosol', stoc: 30 },
    { denumire_produs: 'Spirt', marca: 'Mona', stoc: 44 },
    { denumire_produs: 'Detergent pentru pardoseli', marca: 'Promax', stoc: 12 },
    { denumire_produs: 'Hârtie igienică', marca: 'Pariss', stoc: 691 },
    { denumire_produs: 'Pamperși', marca: 'Senny', stoc: 775 },
    { denumire_produs: 'Saci de gunoi', marca: 'Snick', stoc: 16 },
];

export async function ruleazaSeedCuratenie(gestiuneId, locatie) {
    if (localStorage.getItem(SEED_CURATENIE_FLAG)) return;

    for (let i = 0; i < SEED_CURATENIE.length; i++) {
        const { denumire_produs, marca, stoc } = SEED_CURATENIE[i];
        const produs = await adaugaProdus({
            id: `seed-curatenie-${i}`,
            denumire_produs,
            marca,
            unitate_masura: 'Buc',
            poza_url: '',
            gestiuneId: String(gestiuneId),
            locatie,
        });
        await ajusteazaStoc(gestiuneId, locatie, produs.id, stoc);
    }

    localStorage.setItem(SEED_CURATENIE_FLAG, '1');
}

export async function getProduseCuStoc(gestiuneId, locatie) {
    const produse = await getProduse();
    // Doar produsele care aparțin exact acestei locații (gestiune + sector),
    // ca să nu mai apară produsele de curățenie în toate sectoarele.
    const aleLocatiei = produse.filter(
        p => String(p.gestiuneId) === String(gestiuneId) && p.locatie === locatie
    );
    return Promise.all(
        aleLocatiei.map(async produs => ({
            ...produs,
            stoc: await getStoc(gestiuneId, locatie, produs.id),
        }))
    );
}
