// app.js - Creierul aplicației Antigravity
import { initLocalDB, getProduseCuStoc, adaugaProdus, getStoc, ajusteazaStoc, ruleazaSeedCuratenie, getInregistrareStoc, inregistreazaInventar } from '../db/local-db.js';
import { comutaEcran, randeazaLocatii, randeazaProduse, randeazaEcraneGestiuni, esteUrlImagineValid, STRUCTURA_GESTIUNI } from './ui.js';

let dbInstance = null;
let gestiuneCurenta = null;
let locatieCurenta = null;
let produsCurent = null;
let tipOperatieCurenta = null;
let rolSelectat = null;
let accesCurent = null;

// Rolurile aplicației: fiecare are un PIN și un domeniu de acces.
// acces = 'total' (vede tot) sau { gestiuni: [...ids], locatii: [{gestiune, locatie}] }.
// CRPV are id '2', Mănăstire id '1'.
const ROLURI = {
    'Stareț':         { pin: '0000', acces: 'total' },
    'Econom':         { pin: '1111', acces: 'total' },
    'Director':       { pin: '5555', acces: 'total' },
    'Manager':        { pin: '6666', acces: { gestiuni: ['2'] } },
    'Magazioner':     { pin: '2222', acces: 'total' },
    'Asistentă șefă': { pin: '3333', acces: { locatii: [{ gestiune: '2', locatie: 'Medicamente' }] } },
    'Asistentă':      { pin: '4444', acces: { locatii: [{ gestiune: '2', locatie: 'Medicamente' }] } },
};

const USER_SESSION_KEY = 'antigravity-utilizator-curent';

function poateAccesaGestiune(acces, gestiuneId) {
    if (acces === 'total') return true;
    if (!acces) return false;
    gestiuneId = String(gestiuneId);
    if ((acces.gestiuni || []).includes(gestiuneId)) return true;
    if ((acces.locatii || []).some(l => String(l.gestiune) === gestiuneId)) return true;
    return false;
}

function poateAccesaLocatie(acces, gestiuneId, locatie) {
    if (acces === 'total') return true;
    if (!acces) return false;
    gestiuneId = String(gestiuneId);
    if ((acces.gestiuni || []).includes(gestiuneId)) return true;
    if ((acces.locatii || []).some(l => String(l.gestiune) === gestiuneId && l.locatie === locatie)) return true;
    return false;
}

const elEcranLogin = document.getElementById('ecran-login');
const elListaRoluri = document.getElementById('lista-roluri');
const elInputPinLogin = document.getElementById('input-pin-login');
const elBtnConfirmaLogin = document.getElementById('btn-confirma-login');
const elEroareLogin = document.getElementById('eroare-login');
const elUtilizatorCurent = document.getElementById('utilizator-curent');

const elCautareRapida = document.getElementById('cautare-rapida');
const elBtnAdaugaProdusNou = document.getElementById('btn-adauga-produs-nou');

const elDetaliuPoza = document.getElementById('detaliu-poza-produs');
const elDetaliuNume = document.getElementById('detaliu-nume-produs');
const elDetaliuMarca = document.getElementById('detaliu-marca-produs');
const elDetaliuStoc = document.getElementById('detaliu-stoc-actual');
const elDetaliuInventarInfo = document.getElementById('detaliu-inventar-info');
const elDetaliuUltimaOperatiune = document.getElementById('detaliu-ultima-operatiune');
const elInputStocInventar = document.getElementById('input-stoc-inventar');
const elInputDataInventar = document.getElementById('input-data-inventar');
const elBtnSalveazaInventar = document.getElementById('btn-salveaza-inventar');

const elBtnSchimbaPoza = document.getElementById('btn-schimba-poza');
const elInputPozaFisier = document.getElementById('input-poza-fisier');
const elBtnEditeazaProdus = document.getElementById('btn-editeaza-produs');

const elOpIntrare = document.getElementById('op-intrare');
const elOpIesire = document.getElementById('op-iesire');
const elZonaIntroducere = document.getElementById('zona-introducere-date');
const elCampExpirare = document.getElementById('camp-expirare');
const elInputCantitate = document.getElementById('input-cantitate');
const elInputExpirare = document.getElementById('input-expirare');
const elBtnValideaza = document.getElementById('btn-valideaza-miscare');

async function rerandeazaProduse() {
    const numeGestiune = STRUCTURA_GESTIUNI[gestiuneCurenta].nume;
    const filtru = elCautareRapida.value.trim().toLowerCase();

    const produseInstanta = (await getProduseCuStoc(gestiuneCurenta, locatieCurenta)).filter(p =>
        !filtru || p.denumire_produs.toLowerCase().includes(filtru) || (p.marca || '').toLowerCase().includes(filtru)
    );

    randeazaProduse(numeGestiune, locatieCurenta, produseInstanta, Boolean(filtru));
}

async function afiseazaDetaliiProdus(produs) {
    elDetaliuNume.textContent = produs.denumire_produs;
    elDetaliuMarca.textContent = produs.marca || '';
    elDetaliuPoza.style.backgroundImage = produs.poza_url && esteUrlImagineValid(produs.poza_url)
        ? `url('${produs.poza_url}')`
        : '';
    const inregistrare = await getInregistrareStoc(gestiuneCurenta, locatieCurenta, produs.id);
    elDetaliuStoc.textContent = `Stoc rămas: ${inregistrare.valoare} ${produs.unitate_masura}`;
    elDetaliuInventarInfo.textContent = inregistrare.dataInventar
        ? `Stoc existent la inventar: ${inregistrare.stocInventar} (${inregistrare.dataInventar})`
        : 'Niciun inventar înregistrat încă.';
    elDetaliuUltimaOperatiune.textContent = inregistrare.ultimaOperatiune
        ? `Ultima mișcare: ${inregistrare.ultimaOperatiune}`
        : '';
}

async function salveazaInventarProdusCurent() {
    if (!produsCurent) return;
    const stocConstatat = parseFloat(elInputStocInventar.value);
    if (isNaN(stocConstatat) || stocConstatat < 0) {
        alert('Introdu un stoc existent valid.');
        return;
    }
    const dataInventar = elInputDataInventar.value || new Date().toISOString().slice(0, 10);

    await inregistreazaInventar(gestiuneCurenta, locatieCurenta, produsCurent.id, stocConstatat, dataInventar);
    await afiseazaDetaliiProdus(produsCurent);
    elInputStocInventar.value = '';
    elInputDataInventar.value = '';
}

async function deschideOperatie(produsId) {
    const produse = await getProduseCuStoc(gestiuneCurenta, locatieCurenta);
    const produs = produse.find(p => p.id === produsId);
    if (!produs) return;

    produsCurent = produs;
    tipOperatieCurenta = null;
    document.getElementById('titlu-aplicatie').innerText = produs.denumire_produs;
    elZonaIntroducere.classList.add('hidden');
    elInputCantitate.value = '';
    elInputExpirare.value = '';
    await afiseazaDetaliiProdus(produs);
    comutaEcran('ecran-operatie');
}

// Deschide selectorul de fișiere / camera telefonului pentru poza produsului.
function schimbaPozaProdusCurent() {
    if (!produsCurent) return;
    elInputPozaFisier.value = '';
    elInputPozaFisier.click();
}

// Redimensionează poza (max 800px) și o transformă în data URL JPEG, ca să nu
// umple memoria locală cu imagini uriașe direct de la cameră.
function comprimaImagine(fisier, maxLatura = 800) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const img = new Image();
            img.onload = () => {
                let { width, height } = img;
                if (width > height && width > maxLatura) {
                    height = Math.round(height * maxLatura / width);
                    width = maxLatura;
                } else if (height >= width && height > maxLatura) {
                    width = Math.round(width * maxLatura / height);
                    height = maxLatura;
                }
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                canvas.getContext('2d').drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', 0.8));
            };
            img.onerror = reject;
            img.src = reader.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(fisier);
    });
}

async function incarcaPozaSelectata(e) {
    const fisier = e.target.files && e.target.files[0];
    if (!fisier || !produsCurent) return;
    try {
        const poza_url = await comprimaImagine(fisier);
        const { stoc, ...produsFaraStoc } = produsCurent;
        produsCurent = await adaugaProdus({ ...produsFaraStoc, poza_url });
        produsCurent.stoc = stoc;
        await afiseazaDetaliiProdus(produsCurent);
    } catch (err) {
        console.error('Eroare la încărcarea pozei:', err);
        alert('Nu am putut încărca poza. Încearcă altă imagine.');
    }
}

async function editeazaProdusCurent() {
    if (!produsCurent) return;
    const denumire_produs = (prompt('Denumire produs:', produsCurent.denumire_produs) || '').trim();
    if (!denumire_produs) return;
    const marca = (prompt('Marcă (opțional):', produsCurent.marca || '') || '').trim();
    const unitate_masura = (prompt('Unitate de măsură:', produsCurent.unitate_masura || 'Buc') || 'Buc').trim();

    const { stoc, ...produsFaraStoc } = produsCurent;
    produsCurent = await adaugaProdus({ ...produsFaraStoc, denumire_produs, marca, unitate_masura });
    produsCurent.stoc = stoc;
    document.getElementById('titlu-aplicatie').innerText = produsCurent.denumire_produs;
    await afiseazaDetaliiProdus(produsCurent);
}

function selecteazaOperatie(tip) {
    tipOperatieCurenta = tip;
    elZonaIntroducere.classList.remove('hidden');
    elCampExpirare.classList.toggle('hidden', tip !== 'intrare');
    elInputCantitate.focus();
}

async function valideazaMiscare() {
    const cantitate = parseFloat(elInputCantitate.value);
    if (!cantitate || cantitate <= 0) {
        alert('Introdu o cantitate validă.');
        return;
    }
    if (!tipOperatieCurenta) {
        alert('Selectează tipul mișcării (Intrare/Ieșire).');
        return;
    }

    const stocActual = await getStoc(gestiuneCurenta, locatieCurenta, produsCurent.id);
    if (tipOperatieCurenta === 'iesire' && cantitate > stocActual) {
        alert(`Stoc insuficient. Stoc actual: ${stocActual}.`);
        return;
    }

    const delta = tipOperatieCurenta === 'intrare' ? cantitate : -cantitate;
    const operator = rolSelectat ? `${rolSelectat} - ${new Date().toLocaleString('ro-RO')}` : null;
    await ajusteazaStoc(gestiuneCurenta, locatieCurenta, produsCurent.id, delta, operator);

    await afiseazaDetaliiProdus(produsCurent);
    elZonaIntroducere.classList.add('hidden');
    elInputCantitate.value = '';
    elInputExpirare.value = '';
    tipOperatieCurenta = null;
}

function afiseazaUtilizatorCurent(utilizator) {
    elUtilizatorCurent.textContent = `${utilizator.rol}`;
    elUtilizatorCurent.classList.remove('hidden');
}

function randeazaRoluri() {
    elListaRoluri.innerHTML = '';
    Object.keys(ROLURI).forEach(rol => {
        const btn = document.createElement('button');
        btn.className = 'card-rol neu-card py-4 font-bold text-gray-600 transition';
        btn.dataset.rol = rol;
        btn.textContent = rol;
        elListaRoluri.appendChild(btn);
    });
}

function selecteazaRolLogin(rol) {
    rolSelectat = rol;
    elInputPinLogin.classList.remove('hidden');
    elBtnConfirmaLogin.classList.remove('hidden');
    elEroareLogin.classList.add('hidden');
    elInputPinLogin.value = '';
    elInputPinLogin.focus();
    document.querySelectorAll('#lista-roluri .card-rol').forEach(b => {
        b.classList.toggle('text-blue-500', b.dataset.rol === rol);
    });
}

function aplicaAcces(utilizator) {
    rolSelectat = utilizator.rol;
    accesCurent = (ROLURI[utilizator.rol] || {}).acces ?? null;
    afiseazaUtilizatorCurent(utilizator);
    randeazaEcraneGestiuni(id => poateAccesaGestiune(accesCurent, id));
}

function confirmaLogin() {
    if (!rolSelectat) return;
    const config = ROLURI[rolSelectat];
    if (!config || elInputPinLogin.value !== config.pin) {
        elEroareLogin.classList.remove('hidden');
        return;
    }
    const utilizator = { rol: rolSelectat };
    sessionStorage.setItem(USER_SESSION_KEY, JSON.stringify(utilizator));
    aplicaAcces(utilizator);
    comutaEcran('ecran-gestiuni');
}

function initializeazaStatusRetea() {
    const elStatusRetea = document.getElementById('status-retea');
    const actualizeaza = () => {
        const online = navigator.onLine;
        elStatusRetea.classList.toggle('bg-green-500', online);
        elStatusRetea.classList.toggle('bg-red-500', !online);
        elStatusRetea.title = online ? 'Online' : 'Offline';
    };
    window.addEventListener('online', actualizeaza);
    window.addEventListener('offline', actualizeaza);
    actualizeaza();
}

async function adaugaProdusNou() {
    if (!gestiuneCurenta || !locatieCurenta) return;
    const denumire_produs = prompt('Denumire produs:');
    if (!denumire_produs || !denumire_produs.trim()) return;
    const marca = prompt('Marcă (opțional):') || '';
    const unitate_masura = prompt('Unitate de măsură (ex: Buc, Kg, L):', 'Buc') || 'Buc';

    await adaugaProdus({
        id: `p${Date.now()}`,
        denumire_produs: denumire_produs.trim(),
        marca: marca.trim(),
        unitate_masura: unitate_masura.trim(),
        poza_url: '',
        gestiuneId: gestiuneCurenta,
        locatie: locatieCurenta,
    });

    await rerandeazaProduse();
}

document.addEventListener('DOMContentLoaded', async () => {
    initializeazaStatusRetea();

    try {
        // 1. Pornim motorul bazei de date interne (Offline-First)
        dbInstance = await initLocalDB();
        await ruleazaSeedCuratenie('1', 'Produse de curățenie');
        console.log('Sistem Antigravity activat. Baza de date locală funcționează perfect.');
    } catch (error) {
        console.error('Eroare la aprinderea motorului local:', error);
    }

    // 1b. Generăm butoanele de rol și verificăm dacă există deja o sesiune activă
    // (rol ales în acest tab), ca utilizatorul să nu reintroducă PIN-ul la fiecare refresh.
    randeazaRoluri();
    const utilizatorSalvat = sessionStorage.getItem(USER_SESSION_KEY);
    if (utilizatorSalvat) {
        aplicaAcces(JSON.parse(utilizatorSalvat));
        comutaEcran('ecran-gestiuni');
    } else {
        comutaEcran('ecran-login');
    }

    elEcranLogin.addEventListener('click', (e) => {
        const cardRol = e.target.closest('.card-rol');
        if (cardRol) selecteazaRolLogin(cardRol.dataset.rol);
    });
    elBtnConfirmaLogin.addEventListener('click', confirmaLogin);
    elInputPinLogin.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') confirmaLogin();
    });

    // 2. Click pe o gestiune (butoanele se generează în aplicaAcces, filtrate pe acces)
    document.getElementById('ecran-gestiuni').addEventListener('click', (e) => {
        const cardGestiune = e.target.closest('.card-gestiune');
        if (cardGestiune) {
            gestiuneCurenta = cardGestiune.dataset.gestiune;
            randeazaLocatii(gestiuneCurenta, locatie => poateAccesaLocatie(accesCurent, gestiuneCurenta, locatie));
        }
    });

    // 3. Click pe o Locație Fizică (ex: 'Beci alimente' sau 'Container frigorific')
    // Folosim delegare de evenimente pentru că butoanele sunt generate dinamic
    document.getElementById('ecran-locatii').addEventListener('click', async (e) => {
        const butonLocatie = e.target.closest('.card-locatie');
        if (butonLocatie) {
            locatieCurenta = butonLocatie.dataset.locatie;
            elCautareRapida.value = '';
            await rerandeazaProduse();
        }
    });

    // 3b. Click pe un Produs -> ecranul de operație (Intrare/Ieșire)
    // Aceeași delegare de evenimente, cardurile de produs sunt generate dinamic
    document.getElementById('grid-produse').addEventListener('click', async (e) => {
        const cardProdus = e.target.closest('.card-produs');
        if (cardProdus) {
            await deschideOperatie(cardProdus.dataset.produsId);
        }
    });

    // 3c. Căutare rapidă + adăugare produs nou în ghid
    elCautareRapida.addEventListener('input', rerandeazaProduse);
    elBtnAdaugaProdusNou.addEventListener('click', adaugaProdusNou);

    // 3d. Operația de intrare/ieșire stoc
    elBtnSchimbaPoza.addEventListener('click', schimbaPozaProdusCurent);
    elInputPozaFisier.addEventListener('change', incarcaPozaSelectata);
    elBtnEditeazaProdus.addEventListener('click', editeazaProdusCurent);
    elOpIntrare.addEventListener('click', () => selecteazaOperatie('intrare'));
    elOpIesire.addEventListener('click', () => selecteazaOperatie('iesire'));
    elBtnValideaza.addEventListener('click', valideazaMiscare);
    elBtnSalveazaInventar.addEventListener('click', salveazaInventarProdusCurent);

    // 4. Logica butonului "Înapoi" - Navigare fluidă, fără refresh
    document.getElementById('btn-inapoi').addEventListener('click', () => {
        const ecranActiv = document.querySelector('section:not(.hidden)').id;

        if (ecranActiv === 'ecran-locatii') {
            comutaEcran('ecran-gestiuni');
            gestiuneCurenta = null;
        } else if (ecranActiv === 'ecran-produse') {
            locatieCurenta = null;
            randeazaLocatii(gestiuneCurenta, locatie => poateAccesaLocatie(accesCurent, gestiuneCurenta, locatie));
        } else if (ecranActiv === 'ecran-operatie') {
            produsCurent = null;
            elCautareRapida.value = '';
            rerandeazaProduse();
        }
    });
});
