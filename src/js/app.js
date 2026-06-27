// app.js - Creierul aplicației Antigravity
import { initLocalDB, getProduseCuStoc, adaugaProdus, getStoc, ajusteazaStoc, ruleazaSeedCuratenie, getInregistrareStoc, inregistreazaInventar, seteazaStoc, stergeProdus, getRegistru, salveazaRegistru, redenumesteLocatie, stergeDateLocatie, stergeDateGestiune } from '../db/local-db.js';
import { comutaEcran, randeazaLocatii, randeazaProduse, randeazaEcraneGestiuni, esteUrlImagineValid, getStructura, salveazaStructura, getNumeGestiune } from './ui.js';

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
    'Asistentă șefă': { pin: '3333', acces: { gestiuni: ['2'] } },
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

const elBtnDeschideRegistru = document.getElementById('btn-deschide-registru');
const elEcranRegistru = document.getElementById('ecran-registru');
const elRegistruLunaEticheta = document.getElementById('registru-luna-eticheta');
const elRegistruLunaPrev = document.getElementById('registru-luna-prev');
const elRegistruLunaNext = document.getElementById('registru-luna-next');
const elRegistruStocInitial = document.getElementById('registru-stoc-initial');
const elRegistruInfo = document.getElementById('registru-info');
const elCorpRegistru = document.getElementById('corp-registru');

let lunaRegistru = null;     // Date pe ziua 1 a lunii afișate
let registruStocInitial = 0;
let registruZile = {};       // { ziuaNum: { i: intrare, e: iesire } }
let registruStocFinal = 0;   // stoc rezultat la finalul lunii afișate

const elModalEditare = document.getElementById('modal-editare');
const elEditPoza = document.getElementById('edit-poza');
const elEditBtnPoza = document.getElementById('edit-btn-poza');
const elEditInputPoza = document.getElementById('edit-input-poza');
const elEditNume = document.getElementById('edit-nume');
const elEditMarca = document.getElementById('edit-marca');
const elEditUnitate = document.getElementById('edit-unitate');
const elEditCantitate = document.getElementById('edit-cantitate');
const elEditSalveaza = document.getElementById('edit-salveaza');
const elEditAnuleaza = document.getElementById('edit-anuleaza');
const elEditSterge = document.getElementById('edit-sterge');

let produsEditat = null;
let pozaEditataTemp = null; // null = poza neschimbată; string = data URL nou

const elOpIntrare = document.getElementById('op-intrare');
const elOpIesire = document.getElementById('op-iesire');
const elZonaIntroducere = document.getElementById('zona-introducere-date');
const elCampExpirare = document.getElementById('camp-expirare');
const elInputCantitate = document.getElementById('input-cantitate');
const elInputExpirare = document.getElementById('input-expirare');
const elBtnValideaza = document.getElementById('btn-valideaza-miscare');

async function rerandeazaProduse() {
    const numeGestiune = getNumeGestiune(gestiuneCurenta);
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

// --- Editare rapidă din căsuța produsului (denumire, marcă, unitate, cantitate, poză) ---

function setBackgroundPoza(el, poza_url) {
    el.style.backgroundImage = poza_url && esteUrlImagineValid(poza_url) ? `url("${poza_url}")` : '';
}

async function deschideEditare(produsId) {
    const produse = await getProduseCuStoc(gestiuneCurenta, locatieCurenta);
    const produs = produse.find(p => p.id === produsId);
    if (!produs) return;

    produsEditat = produs;
    pozaEditataTemp = null;
    elEditNume.value = produs.denumire_produs || '';
    elEditMarca.value = produs.marca || '';
    elEditUnitate.value = produs.unitate_masura || 'Buc';
    elEditCantitate.value = produs.stoc ?? 0;
    setBackgroundPoza(elEditPoza, produs.poza_url);
    elModalEditare.classList.remove('hidden');
}

function inchideEditare() {
    elModalEditare.classList.add('hidden');
    produsEditat = null;
    pozaEditataTemp = null;
}

async function incarcaPozaEditare(e) {
    const fisier = e.target.files && e.target.files[0];
    if (!fisier) return;
    try {
        pozaEditataTemp = await comprimaImagine(fisier);
        setBackgroundPoza(elEditPoza, pozaEditataTemp);
    } catch (err) {
        console.error('Eroare la încărcarea pozei:', err);
        alert('Nu am putut încărca poza. Încearcă altă imagine.');
    }
}

async function salveazaEditare() {
    if (!produsEditat) return;
    const denumire_produs = elEditNume.value.trim();
    if (!denumire_produs) {
        alert('Denumirea nu poate fi goală.');
        return;
    }
    const cantitate = parseFloat(elEditCantitate.value);
    if (isNaN(cantitate) || cantitate < 0) {
        alert('Introdu o cantitate validă.');
        return;
    }

    const { stoc, ...produsFaraStoc } = produsEditat;
    const poza_url = pozaEditataTemp !== null ? pozaEditataTemp : (produsEditat.poza_url || '');
    await adaugaProdus({
        ...produsFaraStoc,
        denumire_produs,
        marca: elEditMarca.value.trim(),
        unitate_masura: elEditUnitate.value.trim() || 'Buc',
        poza_url,
    });

    const operator = rolSelectat ? `${rolSelectat} - ${new Date().toLocaleString('ro-RO')}` : null;
    await seteazaStoc(gestiuneCurenta, locatieCurenta, produsEditat.id, cantitate, operator);

    inchideEditare();
    await rerandeazaProduse();
}

async function stergeProdusEditat() {
    if (!produsEditat) return;
    if (!confirm(`Ștergi produsul „${produsEditat.denumire_produs}”?`)) return;
    await stergeProdus(gestiuneCurenta, locatieCurenta, produsEditat.id);
    inchideEditare();
    await rerandeazaProduse();
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

    // O singură sursă de adevăr: mișcarea rapidă se scrie în registrul lunii curente
    // (ziua de azi), iar stocul rezultă din registru. Așa registrul și stocul rămas
    // nu se mai desincronizează.
    await aplicaMiscareCurentaInRegistru(tipOperatieCurenta, cantitate);

    await afiseazaDetaliiProdus(produsCurent);
    elZonaIntroducere.classList.add('hidden');
    elInputCantitate.value = '';
    elInputExpirare.value = '';
    tipOperatieCurenta = null;
}

// Aplică o mișcare rapidă (intrare/ieșire) în fila lunii curente, recalculează
// stocul final și îl scrie ca „stoc rămas” al produsului.
async function aplicaMiscareCurentaInRegistru(tip, cantitate) {
    const acum = new Date();
    const luna = lunaCheie(new Date(acum.getFullYear(), acum.getMonth(), 1));
    const inreg = await getRegistru(gestiuneCurenta, locatieCurenta, produsCurent.id, luna);
    const zile = inreg.zile || {};
    const fileGoala = !inreg.stocInitial && Object.keys(zile).length === 0;
    const stocInitial = fileGoala
        ? (await getStoc(gestiuneCurenta, locatieCurenta, produsCurent.id))
        : (Number(inreg.stocInitial) || 0);

    const zi = acum.getDate();
    if (!zile[zi]) zile[zi] = {};
    const camp = tip === 'intrare' ? 'i' : 'e';
    zile[zi][camp] = (Number(zile[zi][camp]) || 0) + cantitate;

    const zileInLuna = new Date(acum.getFullYear(), acum.getMonth() + 1, 0).getDate();
    let final = Number(stocInitial) || 0;
    for (let d = 1; d <= zileInLuna; d++) {
        const r = zile[d] || {};
        final += (Number(r.i) || 0) - (Number(r.e) || 0);
    }

    await salveazaRegistru(gestiuneCurenta, locatieCurenta, produsCurent.id, luna, Number(stocInitial) || 0, zile);
    const operator = rolSelectat ? `${rolSelectat} - ${new Date().toLocaleString('ro-RO')}` : null;
    await seteazaStoc(gestiuneCurenta, locatieCurenta, produsCurent.id, final, operator);
    if (produsCurent) produsCurent.stoc = final;
}

// --- Registru lunar (fișă de magazie) cu câmpuri fizice pe fiecare zi ---

function lunaCheie(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

async function deschideRegistru() {
    if (!produsCurent) return;
    const acum = new Date();
    lunaRegistru = new Date(acum.getFullYear(), acum.getMonth(), 1);
    await incarcaRegistru();
    comutaEcran('ecran-registru');
}

async function incarcaRegistru() {
    const luna = lunaCheie(lunaRegistru);
    const date = await getRegistru(gestiuneCurenta, locatieCurenta, produsCurent.id, luna);
    registruZile = date.zile || {};
    // Dacă fila lunii e goală, pornim stocul inițial din stocul actual al produsului,
    // ca registrul să fie de la început consistent cu stocul rămas.
    const fileGoala = !date.stocInitial && Object.keys(registruZile).length === 0;
    registruStocInitial = fileGoala ? (produsCurent.stoc || 0) : (date.stocInitial || 0);
    elRegistruStocInitial.value = registruStocInitial;

    document.getElementById('titlu-aplicatie').innerText = produsCurent.denumire_produs;
    const eticheta = lunaRegistru.toLocaleDateString('ro-RO', { month: 'long', year: 'numeric' });
    elRegistruLunaEticheta.textContent = eticheta.charAt(0).toUpperCase() + eticheta.slice(1);

    construiesteRanduriRegistru();
    recalculeazaRegistru();
}

function construiesteRanduriRegistru() {
    const an = lunaRegistru.getFullYear();
    const luna = lunaRegistru.getMonth();
    const zileInLuna = new Date(an, luna + 1, 0).getDate();
    elCorpRegistru.innerHTML = '';

    for (let zi = 1; zi <= zileInLuna; zi++) {
        const inreg = registruZile[zi] || {};
        const tr = document.createElement('tr');
        tr.className = 'border-t border-gray-300/40';
        tr.innerHTML = `
            <td class="py-1 px-2 font-semibold text-gray-600 whitespace-nowrap">${zi}</td>
            <td class="py-1 px-1"><input type="number" step="0.01" inputmode="decimal" data-zi="${zi}" data-tip="i" value="${inreg.i ?? ''}" class="inp-registru w-16 rounded-lg p-1.5 text-center text-green-600 font-semibold"></td>
            <td class="py-1 px-1"><input type="number" step="0.01" inputmode="decimal" data-zi="${zi}" data-tip="e" value="${inreg.e ?? ''}" class="inp-registru w-16 rounded-lg p-1.5 text-center text-rose-500 font-semibold"></td>
            <td class="py-1 px-2 text-right text-gray-400" data-inainte="${zi}"></td>
            <td class="py-1 px-2 text-right font-semibold text-blue-500" data-dupa="${zi}"></td>
        `;
        elCorpRegistru.appendChild(tr);
    }
}

function recalculeazaRegistru() {
    const zileInLuna = new Date(lunaRegistru.getFullYear(), lunaRegistru.getMonth() + 1, 0).getDate();
    let running = Number(registruStocInitial) || 0;
    for (let zi = 1; zi <= zileInLuna; zi++) {
        const inreg = registruZile[zi] || {};
        const i = Number(inreg.i) || 0;
        const e = Number(inreg.e) || 0;
        const inainte = running;
        const dupa = inainte + i - e;
        running = dupa;
        const celInainte = elCorpRegistru.querySelector(`[data-inainte="${zi}"]`);
        const celDupa = elCorpRegistru.querySelector(`[data-dupa="${zi}"]`);
        if (celInainte) celInainte.textContent = (i || e) ? inainte : '';
        if (celDupa) celDupa.textContent = (i || e) ? dupa : '';
    }
    registruStocFinal = running;
    elRegistruInfo.textContent = `Stoc final lună: ${running}`;
}

function esteLunaCurenta() {
    const acum = new Date();
    return lunaRegistru.getFullYear() === acum.getFullYear() && lunaRegistru.getMonth() === acum.getMonth();
}

async function salveazaRegistruCurent() {
    const luna = lunaCheie(lunaRegistru);
    await salveazaRegistru(gestiuneCurenta, locatieCurenta, produsCurent.id, luna, Number(registruStocInitial) || 0, registruZile);

    // Legăm registrul de stocul produsului: stocul final al lunii curente devine
    // „stoc rămas”. Lunile trecute nu modifică stocul curent.
    if (esteLunaCurenta()) {
        const operator = rolSelectat ? `${rolSelectat} - ${new Date().toLocaleString('ro-RO')}` : null;
        await seteazaStoc(gestiuneCurenta, locatieCurenta, produsCurent.id, registruStocFinal, operator);
        if (produsCurent) produsCurent.stoc = registruStocFinal;
    }
}

let timerSalvareRegistru = null;
function salveazaRegistruDebounce() {
    clearTimeout(timerSalvareRegistru);
    timerSalvareRegistru = setTimeout(() => salveazaRegistruCurent(), 400);
}

function onInputRegistru(e) {
    const inp = e.target.closest('.inp-registru');
    if (!inp) return;
    const zi = Number(inp.dataset.zi);
    const tip = inp.dataset.tip; // 'i' sau 'e'
    const val = inp.value === '' ? undefined : Number(inp.value);
    if (!registruZile[zi]) registruZile[zi] = {};
    if (val === undefined || isNaN(val)) {
        delete registruZile[zi][tip];
    } else {
        registruZile[zi][tip] = val;
    }
    if (Object.keys(registruZile[zi]).length === 0) delete registruZile[zi];
    recalculeazaRegistru();
    salveazaRegistruDebounce();
}

function onStocInitialRegistru() {
    registruStocInitial = elRegistruStocInitial.value === '' ? 0 : Number(elRegistruStocInitial.value) || 0;
    recalculeazaRegistru();
    salveazaRegistruDebounce();
}

async function schimbaLunaRegistru(deltaLuni) {
    lunaRegistru = new Date(lunaRegistru.getFullYear(), lunaRegistru.getMonth() + deltaLuni, 1);
    await incarcaRegistru();
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

// --- Editarea structurii (gestiuni și sectoare) direct din aplicație ---

function reincarcaGestiuni() {
    randeazaEcraneGestiuni(id => poateAccesaGestiune(accesCurent, id));
}
function reincarcaLocatii() {
    randeazaLocatii(gestiuneCurenta, locatie => poateAccesaLocatie(accesCurent, gestiuneCurenta, locatie));
}

async function editeazaGestiune(id) {
    const structura = getStructura();
    const g = structura[id];
    if (!g) return;
    const optiune = prompt(`Editează „${g.nume}”:\n• scrie un nume nou pentru redenumire\n• scrie STERGE ca să elimini gestiunea cu tot ce conține`, g.nume);
    if (optiune === null) return;
    const val = optiune.trim();
    if (!val) return;
    if (val.toUpperCase() === 'STERGE') {
        if (!confirm(`Sigur ștergi gestiunea „${g.nume}” și toate datele ei?`)) return;
        delete structura[id];
        salveazaStructura(structura);
        await stergeDateGestiune(id);
    } else {
        g.nume = val;
        salveazaStructura(structura);
    }
    reincarcaGestiuni();
}

async function adaugaGestiune() {
    const nume = (prompt('Nume gestiune nouă:') || '').trim();
    if (!nume) return;
    const structura = getStructura();
    const ids = Object.keys(structura).map(Number).filter(n => !isNaN(n));
    const idNou = String((ids.length ? Math.max(...ids) : 0) + 1);
    structura[idNou] = { nume, icon: 'generic', locatii: [] };
    salveazaStructura(structura);
    reincarcaGestiuni();
}

async function editeazaLocatie(gestiuneId, nume) {
    const structura = getStructura();
    const g = structura[gestiuneId];
    if (!g) return;
    const idx = g.locatii.findIndex(l => l.nume === nume);
    if (idx < 0) return;
    const optiune = prompt(`Editează sectorul „${nume}”:\n• scrie un nume nou pentru redenumire\n• scrie STERGE ca să-l elimini cu tot ce conține`, nume);
    if (optiune === null) return;
    const val = optiune.trim();
    if (!val) return;
    if (val.toUpperCase() === 'STERGE') {
        if (!confirm(`Sigur ștergi sectorul „${nume}” și toate produsele lui?`)) return;
        g.locatii.splice(idx, 1);
        salveazaStructura(structura);
        await stergeDateLocatie(gestiuneId, nume);
    } else if (val !== nume) {
        if (g.locatii.some(l => l.nume === val)) { alert('Există deja un sector cu acest nume.'); return; }
        g.locatii[idx].nume = val;
        salveazaStructura(structura);
        await redenumesteLocatie(gestiuneId, nume, val);
    }
    reincarcaLocatii();
}

async function adaugaLocatie(gestiuneId) {
    const nume = (prompt('Nume sector nou:') || '').trim();
    if (!nume) return;
    const structura = getStructura();
    const g = structura[gestiuneId];
    if (!g) return;
    if (g.locatii.some(l => l.nume === nume)) { alert('Există deja un sector cu acest nume.'); return; }
    g.locatii.push({ nume, icon: 'generic' });
    salveazaStructura(structura);
    reincarcaLocatii();
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
    document.getElementById('ecran-gestiuni').addEventListener('click', async (e) => {
        const btnEditG = e.target.closest('.btn-edit-gestiune');
        if (btnEditG) { e.stopPropagation(); await editeazaGestiune(btnEditG.dataset.gestiune); return; }
        if (e.target.closest('#btn-adauga-gestiune')) { await adaugaGestiune(); return; }
        const cardGestiune = e.target.closest('.card-gestiune');
        if (cardGestiune) {
            gestiuneCurenta = cardGestiune.dataset.gestiune;
            randeazaLocatii(gestiuneCurenta, locatie => poateAccesaLocatie(accesCurent, gestiuneCurenta, locatie));
        }
    });

    // 3. Click pe o Locație Fizică (ex: 'Beci alimente' sau 'Container frigorific')
    // Folosim delegare de evenimente pentru că butoanele sunt generate dinamic
    document.getElementById('ecran-locatii').addEventListener('click', async (e) => {
        const btnEditL = e.target.closest('.btn-edit-locatie');
        if (btnEditL) { e.stopPropagation(); await editeazaLocatie(btnEditL.dataset.gestiuneId, btnEditL.dataset.locatie); return; }
        const btnAddL = e.target.closest('#btn-adauga-locatie');
        if (btnAddL) { await adaugaLocatie(btnAddL.dataset.gestiuneId); return; }
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
        const btnEdit = e.target.closest('.btn-edit-card');
        if (btnEdit) {
            e.stopPropagation();
            await deschideEditare(btnEdit.dataset.produsId);
            return;
        }
        const cardProdus = e.target.closest('.card-produs');
        if (cardProdus) {
            await deschideOperatie(cardProdus.dataset.produsId);
        }
    });

    // Modal de editare rapidă (din căsuța produsului)
    elEditBtnPoza.addEventListener('click', () => { elEditInputPoza.value = ''; elEditInputPoza.click(); });
    elEditInputPoza.addEventListener('change', incarcaPozaEditare);
    elEditSalveaza.addEventListener('click', salveazaEditare);
    elEditAnuleaza.addEventListener('click', inchideEditare);
    elEditSterge.addEventListener('click', stergeProdusEditat);
    elModalEditare.addEventListener('click', (e) => { if (e.target === elModalEditare) inchideEditare(); });

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

    // Registru lunar
    elBtnDeschideRegistru.addEventListener('click', deschideRegistru);
    elRegistruLunaPrev.addEventListener('click', () => schimbaLunaRegistru(-1));
    elRegistruLunaNext.addEventListener('click', () => schimbaLunaRegistru(1));
    elRegistruStocInitial.addEventListener('input', onStocInitialRegistru);
    elCorpRegistru.addEventListener('input', onInputRegistru);

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
        } else if (ecranActiv === 'ecran-registru') {
            comutaEcran('ecran-operatie');
            if (produsCurent) afiseazaDetaliiProdus(produsCurent);
        }
    });
});
