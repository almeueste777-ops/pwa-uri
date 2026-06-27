// app.js - Creierul aplicației Antigravity
import { initLocalDB, getProduseCuStoc, adaugaProdus, getStoc, ajusteazaStoc, ruleazaSeedCuratenie, getInregistrareStoc, inregistreazaInventar } from '../db/local-db.js';
import { comutaEcran, randeazaLocatii, randeazaProduse, randeazaEcraneGestiuni, esteUrlImagineValid, STRUCTURA_GESTIUNI } from './ui.js';

let dbInstance = null;
let gestiuneCurenta = null;
let locatieCurenta = null;
let produsCurent = null;
let tipOperatieCurenta = null;
let rolSelectat = null;

const PIN_ROLURI = { Magazioner: '1234', Gestionar: '9999' };
const USER_SESSION_KEY = 'antigravity-utilizator-curent';

const elEcranLogin = document.getElementById('ecran-login');
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

async function schimbaPozaProdusCurent() {
    if (!produsCurent) return;
    let poza_url = (prompt('URL poză (http(s) sau imagine):', produsCurent.poza_url || '') || '').trim();
    if (poza_url && !esteUrlImagineValid(poza_url)) {
        alert('URL de poză invalid (trebuie să fie http(s) sau imagine), a fost ignorat.');
        return;
    }

    const { stoc, ...produsFaraStoc } = produsCurent;
    produsCurent = await adaugaProdus({ ...produsFaraStoc, poza_url });
    produsCurent.stoc = stoc;
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

function selecteazaRolLogin(rol) {
    rolSelectat = rol;
    elInputPinLogin.classList.remove('hidden');
    elBtnConfirmaLogin.classList.remove('hidden');
    elEroareLogin.classList.add('hidden');
    elInputPinLogin.value = '';
    elInputPinLogin.focus();
}

function confirmaLogin() {
    if (!rolSelectat) return;
    if (elInputPinLogin.value !== PIN_ROLURI[rolSelectat]) {
        elEroareLogin.classList.remove('hidden');
        return;
    }
    const utilizator = { rol: rolSelectat };
    sessionStorage.setItem(USER_SESSION_KEY, JSON.stringify(utilizator));
    afiseazaUtilizatorCurent(utilizator);
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
    const denumire_produs = prompt('Denumire produs:');
    if (!denumire_produs || !denumire_produs.trim()) return;
    const marca = prompt('Marcă (opțional):') || '';
    const unitate_masura = prompt('Unitate de măsură (ex: Buc, Kg, L):', 'Buc') || 'Buc';

    let poza_url = (prompt('URL poză (opțional):') || '').trim();
    if (poza_url && !esteUrlImagineValid(poza_url)) {
        alert('URL de poză invalid (trebuie să fie http(s) sau imagine), a fost ignorat.');
        poza_url = '';
    }

    await adaugaProdus({
        id: `p${Date.now()}`,
        denumire_produs: denumire_produs.trim(),
        marca: marca.trim(),
        unitate_masura: unitate_masura.trim(),
        poza_url,
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

    // 1b. Verificăm dacă există deja o sesiune activă (rol ales în acest tab), ca utilizatorul
    // să nu fie pus să introducă PIN-ul la fiecare reîncărcare de pagină.
    const utilizatorSalvat = sessionStorage.getItem(USER_SESSION_KEY);
    if (utilizatorSalvat) {
        const utilizator = JSON.parse(utilizatorSalvat);
        rolSelectat = utilizator.rol;
        afiseazaUtilizatorCurent(utilizator);
        comutaEcran('ecran-gestiuni');
    } else {
        comutaEcran('ecran-login');
    }

    elEcranLogin.addEventListener('click', (e) => {
        const cardRol = e.target.closest('.card-rol');
        if (cardRol) selecteazaRolLogin(cardRol.dataset.rol);
    });
    elBtnConfirmaLogin.addEventListener('click', confirmaLogin);

    // 2. Desenăm cardurile de gestiune (CRPV / Mănăstire) și legăm click-urile prin delegare,
    // pentru că butoanele sunt generate dinamic în ui.js
    randeazaEcraneGestiuni();
    document.getElementById('ecran-gestiuni').addEventListener('click', (e) => {
        const cardGestiune = e.target.closest('.card-gestiune');
        if (cardGestiune) {
            gestiuneCurenta = cardGestiune.dataset.gestiune;
            randeazaLocatii(gestiuneCurenta);
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
            randeazaLocatii(gestiuneCurenta);
        } else if (ecranActiv === 'ecran-operatie') {
            produsCurent = null;
            elCautareRapida.value = '';
            rerandeazaProduse();
        }
    });
});
