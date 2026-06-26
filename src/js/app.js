const STORAGE_KEY = 'antigravity-wms-data';

const GESTIUNI = {
    '1': 'MĂNĂSTIRE',
    '2': 'CRPV',
};

function incarcaDate() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
        try {
            return JSON.parse(raw);
        } catch (e) {
            console.error('Date corupte în localStorage, se reinițializează.', e);
        }
    }
    return {
        locatii: {
            '1': ['Depozit Principal', 'Bucătărie', 'Cămară'],
            '2': ['Depozit Principal', 'Magazie', 'Frigider'],
        },
        produse: [],
        stocuri: {},
    };
}

function salveazaDate() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(date));
}

let date = incarcaDate();

const stare = {
    gestiune: null,
    locatie: null,
    produs: null,
    tipOperatie: null,
};

const elTitlu = document.getElementById('titlu-aplicatie');
const elBtnInapoi = document.getElementById('btn-inapoi');
const elStatusRetea = document.getElementById('status-retea');

const ecrane = {
    gestiuni: document.getElementById('ecran-gestiuni'),
    locatii: document.getElementById('ecran-locatii'),
    produse: document.getElementById('ecran-produse'),
    operatie: document.getElementById('ecran-operatie'),
};

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

function cheieStoc(gestiune, locatie, produsId) {
    return `${gestiune}|${locatie}|${produsId}`;
}

function obtineStoc(gestiune, locatie, produsId) {
    return date.stocuri[cheieStoc(gestiune, locatie, produsId)] || 0;
}

function ajusteazaStoc(gestiune, locatie, produsId, delta) {
    const cheie = cheieStoc(gestiune, locatie, produsId);
    const curent = date.stocuri[cheie] || 0;
    date.stocuri[cheie] = Math.max(0, curent + delta);
    salveazaDate();
}

function afiseazaEcran(nume) {
    Object.values(ecrane).forEach(el => el.classList.add('hidden'));
    ecrane[nume].classList.remove('hidden');
    elBtnInapoi.classList.toggle('hidden', nume === 'gestiuni');
}

function navigheazaLaGestiuni() {
    stare.gestiune = null;
    stare.locatie = null;
    stare.produs = null;
    elTitlu.textContent = 'Antigravity Gestiune';
    afiseazaEcran('gestiuni');
}

function navigheazaLaLocatii(gestiuneId) {
    stare.gestiune = gestiuneId;
    stare.locatie = null;
    elTitlu.textContent = GESTIUNI[gestiuneId] || 'Locații';
    randeazaLocatii();
    afiseazaEcran('locatii');
}

function navigheazaLaProduse(locatie) {
    stare.locatie = locatie;
    elTitlu.textContent = locatie;
    elCautareRapida.value = '';
    randeazaProduse();
    afiseazaEcran('produse');
}

function navigheazaLaOperatie(produsId) {
    const produs = date.produse.find(p => p.id === produsId);
    if (!produs) return;
    stare.produs = produsId;
    stare.tipOperatie = null;
    elTitlu.textContent = produs.denumire;
    elZonaIntroducere.classList.add('hidden');
    elInputCantitate.value = '';
    elInputExpirare.value = '';
    afiseazaDetaliiProdus(produs);
    afiseazaEcran('operatie');
}

function afiseazaDetaliiProdus(produs) {
    elDetaliuNume.textContent = produs.denumire;
    elDetaliuMarca.textContent = produs.marca || '';
    elDetaliuPoza.style.backgroundImage = produs.poza ? `url('${produs.poza}')` : '';
    const stoc = obtineStoc(stare.gestiune, stare.locatie, produs.id);
    elDetaliuStoc.textContent = `Stoc actual: ${stoc} Buc`;
}

function randeazaLocatii() {
    const locatii = date.locatii[stare.gestiune] || [];
    ecrane.locatii.innerHTML = '';
    locatii.forEach(locatie => {
        const btn = document.createElement('button');
        btn.className = 'card-locatie bg-gray-800 border border-gray-700 p-6 rounded-2xl shadow-lg font-semibold text-lg active:scale-95 transition transform hover:border-blue-500';
        btn.textContent = locatie;
        btn.addEventListener('click', () => navigheazaLaProduse(locatie));
        ecrane.locatii.appendChild(btn);
    });

    const btnAdauga = document.createElement('button');
    btnAdauga.className = 'border-2 border-dashed border-gray-700 text-gray-400 p-6 rounded-2xl font-semibold hover:border-gray-500 hover:text-gray-200 transition col-span-2';
    btnAdauga.textContent = '+ Adaugă Locație';
    btnAdauga.addEventListener('click', () => {
        const nume = prompt('Numele noii locații:');
        if (nume && nume.trim()) {
            date.locatii[stare.gestiune] = date.locatii[stare.gestiune] || [];
            date.locatii[stare.gestiune].push(nume.trim());
            salveazaDate();
            randeazaLocatii();
        }
    });
    ecrane.locatii.appendChild(btnAdauga);
}

function randeazaProduse() {
    const filtru = elCautareRapida.value.trim().toLowerCase();
    elGridProduse.innerHTML = '';
    const produseFiltrate = date.produse.filter(p =>
        !filtru || p.denumire.toLowerCase().includes(filtru) || (p.marca || '').toLowerCase().includes(filtru)
    );

    produseFiltrate.forEach(produs => {
        const stoc = obtineStoc(stare.gestiune, stare.locatie, produs.id);
        const card = document.createElement('button');
        card.className = 'card-produs bg-gray-800 border border-gray-700 rounded-xl p-3 text-left shadow-md active:scale-95 transition transform hover:border-blue-500';
        card.innerHTML = `
            <div class="w-full h-20 bg-gray-700 rounded-lg mb-2 bg-cover bg-center" style="background-image: ${produs.poza ? `url('${produs.poza}')` : 'none'}"></div>
            <p class="font-semibold text-sm truncate">${produs.denumire}</p>
            <p class="text-xs text-gray-400 truncate">${produs.marca || ''}</p>
            <p class="text-xs text-blue-400 font-semibold mt-1">${stoc} Buc</p>
        `;
        card.addEventListener('click', () => navigheazaLaOperatie(produs.id));
        elGridProduse.appendChild(card);
    });
}

function adaugaProdusNou() {
    const denumire = prompt('Denumire produs:');
    if (!denumire || !denumire.trim()) return;
    const marca = prompt('Marcă (opțional):') || '';
    const poza = prompt('URL poză (opțional):') || '';
    const produs = {
        id: `p${Date.now()}`,
        denumire: denumire.trim(),
        marca: marca.trim(),
        poza: poza.trim(),
    };
    date.produse.push(produs);
    salveazaDate();
    randeazaProduse();
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
    const stocActual = obtineStoc(stare.gestiune, stare.locatie, stare.produs);
    if (stare.tipOperatie === 'iesire' && cantitate > stocActual) {
        alert(`Stoc insuficient. Stoc actual: ${stocActual} Buc.`);
        return;
    }

    ajusteazaStoc(stare.gestiune, stare.locatie, stare.produs, delta);

    const produs = date.produse.find(p => p.id === stare.produs);
    afiseazaDetaliiProdus(produs);
    elZonaIntroducere.classList.add('hidden');
    elInputCantitate.value = '';
    elInputExpirare.value = '';
    stare.tipOperatie = null;
}

function inapoi() {
    if (!ecrane.operatie.classList.contains('hidden')) {
        navigheazaLaProduse(stare.locatie);
    } else if (!ecrane.produse.classList.contains('hidden')) {
        navigheazaLaLocatii(stare.gestiune);
    } else if (!ecrane.locatii.classList.contains('hidden')) {
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

elBtnInapoi.addEventListener('click', inapoi);
elCautareRapida.addEventListener('input', randeazaProduse);
elBtnAdaugaProdusNou.addEventListener('click', adaugaProdusNou);
elOpIntrare.addEventListener('click', () => selecteazaOperatie('intrare'));
elOpIesire.addEventListener('click', () => selecteazaOperatie('iesire'));
elBtnValideaza.addEventListener('click', valideazaMiscare);

initializeazaStatusRetea();
