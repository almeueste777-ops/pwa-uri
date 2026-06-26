import { STRUCTURA_GESTIUNI, comutaEcran, randeazaLocatii, randeazaProduse, esteUrlImagineValid } from './ui.js';

const STORAGE_KEY = 'antigravity-wms-data';

function normalizeazaProdus(produs) {
    // Compatibilitate cu formatul folosit într-o versiune anterioară a aplicației
    // (denumire/poza), ca să nu pice ecranul dacă cineva are date vechi salvate.
    return {
        id: produs.id,
        denumire_produs: produs.denumire_produs ?? produs.denumire ?? '',
        marca: produs.marca ?? '',
        unitate_masura: produs.unitate_masura ?? 'Buc',
        poza_url: produs.poza_url ?? produs.poza ?? '',
    };
}

function incarcaDate() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
        try {
            const parsat = JSON.parse(raw);
            return {
                produse: Array.isArray(parsat.produse) ? parsat.produse.map(normalizeazaProdus) : [],
                stocuri: parsat.stocuri && typeof parsat.stocuri === 'object' ? parsat.stocuri : {},
            };
        } catch (e) {
            console.error('Date corupte în localStorage, se reinițializează.', e);
        }
    }
    return {
        produse: [],
        stocuri: {},
    };
}

function salveazaDate() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(date));
}

let date = incarcaDate();

const stare = {
    gestiuneId: null,
    locatie: null,
    produs: null,
    tipOperatie: null,
};

const elTitlu = document.getElementById('titlu-aplicatie');
const elBtnInapoi = document.getElementById('btn-inapoi');
const elStatusRetea = document.getElementById('status-retea');

const elEcranLocatii = document.getElementById('ecran-locatii');
const elGridProduse = document.getElementById('grid-produse');
const elCautareRapida = document.getElementById('cautare-rapida');
const elBtnAdaugaProdusNou = document.getElementById('btn-adauga-produs-nou');

const elDetaliuPoza = document.getElementById('detaliu-poza-produs');
const elDetaliuNume = document.getElementById('detaliu-nume-produs');
const elDetaliuMarca = document.getElementById('detaliu-marca-produs');
const elDetaliuStoc = document.getElementById('detaliu-stoc-actual');

const elOpIntrare = document.getElementById('op-intrare');
const elOpIesire = document.getElementById('op-iesire');
const elZonaIntroducere = document.getElementById('zona-introducere-date');
const elCampExpirare = document.getElementById('camp-expirare');
const elInputCantitate = document.getElementById('input-cantitate');
const elInputExpirare = document.getElementById('input-expirare');
const elBtnValideaza = document.getElementById('btn-valideaza-miscare');

function cheieStoc(gestiuneId, locatie, produsId) {
    return `${gestiuneId}|${locatie}|${produsId}`;
}

function obtineStoc(gestiuneId, locatie, produsId) {
    return date.stocuri[cheieStoc(gestiuneId, locatie, produsId)] || 0;
}

function ajusteazaStoc(gestiuneId, locatie, produsId, delta) {
    const cheie = cheieStoc(gestiuneId, locatie, produsId);
    const curent = date.stocuri[cheie] || 0;
    date.stocuri[cheie] = Math.max(0, curent + delta);
    salveazaDate();
}

function navigheazaLaGestiuni() {
    stare.gestiuneId = null;
    stare.locatie = null;
    stare.produs = null;
    comutaEcran('ecran-gestiuni');
}

function navigheazaLaLocatii(gestiuneId) {
    stare.gestiuneId = gestiuneId;
    stare.locatie = null;
    randeazaLocatii(gestiuneId);
}

function obtineProduseInstanta(gestiuneId, locatie) {
    return date.produse.map(produs => ({
        ...produs,
        stoc: obtineStoc(gestiuneId, locatie, produs.id),
    }));
}

function navigheazaLaProduse(gestiuneId, locatie) {
    stare.gestiuneId = gestiuneId;
    stare.locatie = locatie;
    elCautareRapida.value = '';
    randeazaProdusePeEcran();
}

function randeazaProdusePeEcran() {
    const filtru = elCautareRapida.value.trim().toLowerCase();
    const dateGestiune = STRUCTURA_GESTIUNI[stare.gestiuneId];
    const produseInstanta = obtineProduseInstanta(stare.gestiuneId, stare.locatie).filter(p =>
        !filtru || p.denumire_produs.toLowerCase().includes(filtru) || (p.marca || '').toLowerCase().includes(filtru)
    );
    randeazaProduse(dateGestiune.nume, stare.locatie, produseInstanta, Boolean(filtru));
}

function navigheazaLaOperatie(produsId) {
    const produs = date.produse.find(p => p.id === produsId);
    if (!produs) return;
    stare.produs = produsId;
    stare.tipOperatie = null;
    elTitlu.textContent = produs.denumire_produs;
    elZonaIntroducere.classList.add('hidden');
    elInputCantitate.value = '';
    elInputExpirare.value = '';
    afiseazaDetaliiProdus(produs);
    comutaEcran('ecran-operatie');
}

function afiseazaDetaliiProdus(produs) {
    elDetaliuNume.textContent = produs.denumire_produs;
    elDetaliuMarca.textContent = produs.marca || '';
    elDetaliuPoza.style.backgroundImage = produs.poza_url && esteUrlImagineValid(produs.poza_url) ? `url('${produs.poza_url}')` : '';
    const stoc = obtineStoc(stare.gestiuneId, stare.locatie, produs.id);
    elDetaliuStoc.textContent = `Stoc actual: ${stoc} ${produs.unitate_masura}`;
}

function adaugaProdusNou() {
    const denumire_produs = prompt('Denumire produs:');
    if (!denumire_produs || !denumire_produs.trim()) return;
    const marca = prompt('Marcă (opțional):') || '';
    const unitate_masura = prompt('Unitate de măsură (ex: Buc, Kg, L):', 'Buc') || 'Buc';
    let poza_url = (prompt('URL poză (opțional):') || '').trim();
    if (poza_url && !esteUrlImagineValid(poza_url)) {
        alert('URL de poză invalid (trebuie să fie http(s) sau imagine), a fost ignorat.');
        poza_url = '';
    }
    const produs = {
        id: `p${Date.now()}`,
        denumire_produs: denumire_produs.trim(),
        marca: marca.trim(),
        unitate_masura: unitate_masura.trim(),
        poza_url,
    };
    date.produse.push(produs);
    salveazaDate();
    randeazaProdusePeEcran();
}

function selecteazaOperatie(tip) {
    stare.tipOperatie = tip;
    elZonaIntroducere.classList.remove('hidden');
    elCampExpirare.classList.toggle('hidden', tip !== 'intrare');
    elInputCantitate.focus();
}

function valideazaMiscare() {
    const cantitate = parseFloat(elInputCantitate.value);
    if (!cantitate || cantitate <= 0) {
        alert('Introdu o cantitate validă.');
        return;
    }
    if (!stare.tipOperatie) {
        alert('Selectează tipul mișcării (Intrare/Ieșire).');
        return;
    }

    const delta = stare.tipOperatie === 'intrare' ? cantitate : -cantitate;
    const stocActual = obtineStoc(stare.gestiuneId, stare.locatie, stare.produs);
    if (stare.tipOperatie === 'iesire' && cantitate > stocActual) {
        alert(`Stoc insuficient. Stoc actual: ${stocActual}.`);
        return;
    }

    ajusteazaStoc(stare.gestiuneId, stare.locatie, stare.produs, delta);

    const produs = date.produse.find(p => p.id === stare.produs);
    afiseazaDetaliiProdus(produs);
    elZonaIntroducere.classList.add('hidden');
    elInputCantitate.value = '';
    elInputExpirare.value = '';
    stare.tipOperatie = null;
}

function inapoi() {
    if (!document.getElementById('ecran-operatie').classList.contains('hidden')) {
        navigheazaLaProduse(stare.gestiuneId, stare.locatie);
    } else if (!document.getElementById('ecran-produse').classList.contains('hidden')) {
        navigheazaLaLocatii(stare.gestiuneId);
    } else if (!document.getElementById('ecran-locatii').classList.contains('hidden')) {
        navigheazaLaGestiuni();
    }
}

function initializeazaStatusRetea() {
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

document.querySelectorAll('.card-gestiune').forEach(btn => {
    btn.addEventListener('click', () => navigheazaLaLocatii(btn.dataset.gestiune));
});

// Locațiile sunt generate dinamic de randeazaLocatii(), așa că butoanele lor
// nu au listener propriu — folosim delegare pe container.
elEcranLocatii.addEventListener('click', event => {
    const buton = event.target.closest('.card-locatie');
    if (!buton) return;
    navigheazaLaProduse(buton.dataset.gestiuneId, buton.dataset.locatie);
});

// Cardurile de produse sunt generate dinamic de randeazaProduse(), aceeași delegare.
elGridProduse.addEventListener('click', event => {
    const card = event.target.closest('.card-produs');
    if (!card) return;
    navigheazaLaOperatie(card.dataset.produsId);
});

elBtnInapoi.addEventListener('click', inapoi);
elCautareRapida.addEventListener('input', randeazaProdusePeEcran);
elBtnAdaugaProdusNou.addEventListener('click', adaugaProdusNou);
elOpIntrare.addEventListener('click', () => selecteazaOperatie('intrare'));
elOpIesire.addEventListener('click', () => selecteazaOperatie('iesire'));
elBtnValideaza.addEventListener('click', valideazaMiscare);

initializeazaStatusRetea();
