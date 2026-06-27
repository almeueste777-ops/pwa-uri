// app.js - Creierul aplicației Antigravity
import { initLocalDB, getProduse, getProduseCuStoc, adaugaProdus, getStoc, ajusteazaStoc, ruleazaSeedCuratenie, getInregistrareStoc, inregistreazaInventar, seteazaStoc, stergeProdus, getRegistru, salveazaRegistru, redenumesteLocatie, stergeDateLocatie, stergeDateGestiune } from '../db/local-db.js';
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
const elModalEditareTitlu = document.getElementById('modal-editare-titlu');

const elModalInput = document.getElementById('modal-input');
const elModalInputTitlu = document.getElementById('modal-input-titlu');
const elModalInputCamp = document.getElementById('modal-input-camp');
const elModalInputOk = document.getElementById('modal-input-ok');
const elModalInputAnuleaza = document.getElementById('modal-input-anuleaza');
const elModalInputSterge = document.getElementById('modal-input-sterge');

let modEditare = 'edit';     // 'edit' sau 'nou'
let rezolvaModalInput = null; // callback pentru promisiunea modalului generic

const elBtnExportInventar = document.getElementById('btn-export-inventar');
const elBtnExportRegistru = document.getElementById('btn-export-registru');
const elModalExport = document.getElementById('modal-export');
const elExportTitlu = document.getElementById('export-titlu');
const elExportScopuri = document.getElementById('export-scopuri');
const elExportInchide = document.getElementById('export-inchide');
const elZonaPrint = document.getElementById('zona-print');

let exportTip = 'inventar';   // 'inventar' sau 'registru'
let exportScop = 'categorie'; // 'categorie' | 'gestiune' | 'total'

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
        await modalNotifica('Introdu un stoc existent valid.');
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
        await modalNotifica('Nu am putut încărca poza. Încearcă altă imagine.');
    }
}

async function editeazaProdusCurent() {
    if (produsCurent) await deschideEditare(produsCurent.id);
}

// --- Editare rapidă din căsuța produsului (denumire, marcă, unitate, cantitate, poză) ---

function setBackgroundPoza(el, poza_url) {
    el.style.backgroundImage = poza_url && esteUrlImagineValid(poza_url) ? `url("${poza_url}")` : '';
}

async function deschideEditare(produsId) {
    const produse = await getProduseCuStoc(gestiuneCurenta, locatieCurenta);
    const produs = produse.find(p => p.id === produsId);
    if (!produs) return;

    modEditare = 'edit';
    produsEditat = produs;
    pozaEditataTemp = null;
    elModalEditareTitlu.textContent = 'Editează produsul';
    elEditSterge.classList.remove('hidden');
    elEditNume.value = produs.denumire_produs || '';
    elEditMarca.value = produs.marca || '';
    elEditUnitate.value = produs.unitate_masura || 'Buc';
    elEditCantitate.value = produs.stoc ?? 0;
    setBackgroundPoza(elEditPoza, produs.poza_url);
    elModalEditare.classList.remove('hidden');
}

function deschideAdaugaProdus() {
    if (!gestiuneCurenta || !locatieCurenta) return;
    modEditare = 'nou';
    produsEditat = null;
    pozaEditataTemp = null;
    elModalEditareTitlu.textContent = 'Adaugă produs';
    elEditSterge.classList.add('hidden');
    elEditNume.value = '';
    elEditMarca.value = '';
    elEditUnitate.value = 'Buc';
    elEditCantitate.value = 0;
    setBackgroundPoza(elEditPoza, '');
    elModalEditare.classList.remove('hidden');
    elEditNume.focus();
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
        await modalNotifica('Nu am putut încărca poza. Încearcă altă imagine.');
    }
}

async function salveazaEditare() {
    const denumire_produs = elEditNume.value.trim();
    if (!denumire_produs) {
        elEditNume.focus();
        return;
    }
    const cantitate = parseFloat(elEditCantitate.value);
    if (isNaN(cantitate) || cantitate < 0) {
        elEditCantitate.focus();
        return;
    }
    const marca = elEditMarca.value.trim();
    const unitate_masura = elEditUnitate.value.trim() || 'Buc';

    if (modEditare === 'nou') {
        const id = `p${Date.now()}`;
        await adaugaProdus({
            id, denumire_produs, marca, unitate_masura,
            poza_url: pozaEditataTemp || '',
            gestiuneId: gestiuneCurenta,
            locatie: locatieCurenta,
        });
        const operator = rolSelectat ? `${rolSelectat} - ${new Date().toLocaleString('ro-RO')}` : null;
        await seteazaStoc(gestiuneCurenta, locatieCurenta, id, cantitate, operator);
    } else {
        if (!produsEditat) return;
        const { stoc, ...produsFaraStoc } = produsEditat;
        const poza_url = pozaEditataTemp !== null ? pozaEditataTemp : (produsEditat.poza_url || '');
        await adaugaProdus({ ...produsFaraStoc, denumire_produs, marca, unitate_masura, poza_url });
        const operator = rolSelectat ? `${rolSelectat} - ${new Date().toLocaleString('ro-RO')}` : null;
        await seteazaStoc(gestiuneCurenta, locatieCurenta, produsEditat.id, cantitate, operator);
    }

    inchideEditare();
    await rerandeazaProduse();
}

async function stergeProdusEditat() {
    if (!produsEditat) return;
    const ok = await modalConfirma(`Ștergi produsul „${produsEditat.denumire_produs}”?`);
    if (!ok) return;
    await stergeProdus(gestiuneCurenta, locatieCurenta, produsEditat.id);
    inchideEditare();
    await rerandeazaProduse();
}

// --- Modal generic de input (înlocuiește prompt-urile native) ---
// Întoarce: { actiune:'salveaza', valoare } | { actiune:'sterge' } | null
function modalInput(titlu, valoareInitiala = '', optiuni = {}) {
    return new Promise(resolve => {
        elModalInputTitlu.textContent = titlu;
        elModalInputCamp.value = valoareInitiala;
        elModalInputSterge.classList.toggle('hidden', !optiuni.permiteStergere);
        elModalInput.classList.remove('hidden');
        elModalInputCamp.focus();
        rezolvaModalInput = resolve;
    });
}

function inchideModalInput(rezultat) {
    elModalInput.classList.add('hidden');
    const r = rezolvaModalInput;
    rezolvaModalInput = null;
    if (r) r(rezultat);
}

// Notificare simplă în stilul aplicației (înlocuiește alert() nativ)
function modalNotifica(mesaj) {
    return new Promise(resolve => {
        elModalInputTitlu.textContent = mesaj;
        elModalInputCamp.classList.add('hidden');
        elModalInputSterge.classList.add('hidden');
        elModalInputAnuleaza.classList.add('hidden');
        elModalInputOk.textContent = 'OK';
        elModalInput.classList.remove('hidden');
        rezolvaModalInput = () => {
            elModalInputCamp.classList.remove('hidden');
            elModalInputAnuleaza.classList.remove('hidden');
            elModalInputOk.textContent = 'Salvează';
            resolve();
        };
    });
}

// Confirmare în stilul aplicației (înlocuiește confirm() nativ)
function modalConfirma(mesaj) {
    return new Promise(resolve => {
        elModalInputTitlu.textContent = mesaj;
        elModalInputCamp.classList.add('hidden');
        elModalInputSterge.classList.add('hidden');
        elModalInputAnuleaza.classList.remove('hidden');
        elModalInputOk.textContent = 'Da';
        elModalInputAnuleaza.textContent = 'Nu';
        elModalInput.classList.remove('hidden');
        rezolvaModalInput = (rez) => {
            // restaurăm aspectul implicit pentru următoarea folosire
            elModalInputCamp.classList.remove('hidden');
            elModalInputOk.textContent = 'Salvează';
            elModalInputAnuleaza.textContent = 'Anulează';
            resolve(rez && rez.actiune === 'salveaza');
        };
    });
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
        await modalNotifica('Introdu o cantitate validă.');
        return;
    }
    if (!tipOperatieCurenta) {
        await modalNotifica('Selectează tipul mișcării (Intrare/Ieșire).');
        return;
    }

    const stocActual = await getStoc(gestiuneCurenta, locatieCurenta, produsCurent.id);
    if (tipOperatieCurenta === 'iesire' && cantitate > stocActual) {
        await modalNotifica(`Stoc insuficient. Stoc actual: ${stocActual}.`);
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
            <td class="py-1 px-2 text-right font-semibold text-blue-500" data-stoc="${zi}"></td>
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
        running = running + i - e;
        // Stocul rămas se calculează singur și se afișează pentru fiecare zi.
        const celStoc = elCorpRegistru.querySelector(`[data-stoc="${zi}"]`);
        if (celStoc) celStoc.textContent = running;
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
    const rez = await modalInput(`Editează gestiunea`, g.nume, { permiteStergere: true });
    if (!rez) return;
    if (rez.actiune === 'sterge') {
        const ok = await modalConfirma(`Ștergi gestiunea „${g.nume}” și toate datele ei?`);
        if (!ok) return;
        delete structura[id];
        salveazaStructura(structura);
        await stergeDateGestiune(id);
    } else {
        const val = rez.valoare.trim();
        if (!val) return;
        g.nume = val;
        salveazaStructura(structura);
    }
    reincarcaGestiuni();
}

async function adaugaGestiune() {
    const rez = await modalInput('Gestiune nouă', '');
    if (!rez || rez.actiune !== 'salveaza') return;
    const nume = rez.valoare.trim();
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
    const rez = await modalInput('Editează sectorul', nume, { permiteStergere: true });
    if (!rez) return;
    if (rez.actiune === 'sterge') {
        const ok = await modalConfirma(`Ștergi sectorul „${nume}” și toate produsele lui?`);
        if (!ok) return;
        g.locatii.splice(idx, 1);
        salveazaStructura(structura);
        await stergeDateLocatie(gestiuneId, nume);
    } else {
        const val = rez.valoare.trim();
        if (!val || val === nume) return;
        if (g.locatii.some(l => l.nume === val)) { await modalConfirma('Există deja un sector cu acest nume.'); return; }
        g.locatii[idx].nume = val;
        salveazaStructura(structura);
        await redenumesteLocatie(gestiuneId, nume, val);
    }
    reincarcaLocatii();
}

async function adaugaLocatie(gestiuneId) {
    const rez = await modalInput('Sector nou', '');
    if (!rez || rez.actiune !== 'salveaza') return;
    const nume = rez.valoare.trim();
    if (!nume) return;
    const structura = getStructura();
    const g = structura[gestiuneId];
    if (!g) return;
    if (g.locatii.some(l => l.nume === nume)) { await modalConfirma('Există deja un sector cu acest nume.'); return; }
    g.locatii.push({ nume, icon: 'generic' });
    salveazaStructura(structura);
    reincarcaLocatii();
}

// --- Export inventar / registru în CSV, Excel și PDF (totul offline) ---

const ANTET_INVENTAR = ['Gestiune', 'Sector', 'Produs', 'Marcă', 'Unitate', 'Stoc rămas', 'Stoc inventar', 'Data inventar'];
const ANTET_REGISTRU = ['Data', 'Intrare', 'Ieșire', 'Stoc rămas'];

function descarcaFisier(numeFisier, continut, mime) {
    const blob = new Blob([continut], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = numeFisier;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function slug(text) {
    return String(text || 'export').toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'export';
}

function celulaCSV(v) {
    const s = String(v ?? '');
    return /[";\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}
function genereazaCSV(antet, randuri) {
    const linii = [antet.map(celulaCSV).join(';')];
    randuri.forEach(r => linii.push(r.map(celulaCSV).join(';')));
    return '\uFEFF' + linii.join('\r\n'); // BOM ca diacriticele să apară corect în Excel
}

function escHtml(v) {
    return String(v ?? '').replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
}
function genereazaTabelHTML(antet, randuri) {
    const thead = '<tr>' + antet.map(h => `<th>${escHtml(h)}</th>`).join('') + '</tr>';
    const tbody = randuri.map(r => '<tr>' + r.map(c => `<td>${escHtml(c)}</td>`).join('') + '</tr>').join('');
    return `<table border="1" cellspacing="0" cellpadding="4"><thead>${thead}</thead><tbody>${tbody}</tbody></table>`;
}
function genereazaExcel(titlu, antet, randuri) {
    return `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="UTF-8"></head><body><h2>${escHtml(titlu)}</h2>${genereazaTabelHTML(antet, randuri)}</body></html>`;
}

function tipareste(titlu, antet, randuri) {
    elZonaPrint.innerHTML = `<h1>${escHtml(titlu)}</h1>${genereazaTabelHTML(antet, randuri)}` +
        `<p style="margin-top:12px;font-size:11px;color:#555">Generat: ${escHtml(new Date().toLocaleString('ro-RO'))}</p>`;
    document.body.classList.add('mod-print');
    const curata = () => { document.body.classList.remove('mod-print'); window.removeEventListener('afterprint', curata); };
    window.addEventListener('afterprint', curata);
    setTimeout(() => window.print(), 100);
}

async function colecteazaInventar(scop) {
    const produse = await getProduse();
    const structura = getStructura();
    let lista = produse;
    if (scop === 'gestiune') lista = produse.filter(p => String(p.gestiuneId) === String(gestiuneCurenta));
    else if (scop === 'categorie') lista = produse.filter(p => String(p.gestiuneId) === String(gestiuneCurenta) && p.locatie === locatieCurenta);
    lista.sort((a, b) => (a.locatie || '').localeCompare(b.locatie || '') || (a.denumire_produs || '').localeCompare(b.denumire_produs || ''));

    const randuri = [];
    for (const p of lista) {
        const inr = await getInregistrareStoc(p.gestiuneId, p.locatie, p.id);
        const numeGest = (structura[p.gestiuneId] || {}).nume || p.gestiuneId;
        randuri.push([numeGest, p.locatie, p.denumire_produs, p.marca || '', p.unitate_masura || '', inr.valoare, inr.stocInventar ?? '', inr.dataInventar ?? '']);
    }
    return randuri;
}

async function colecteazaRegistru() {
    const luna = lunaCheie(lunaRegistru);
    const date = await getRegistru(gestiuneCurenta, locatieCurenta, produsCurent.id, luna);
    const zile = date.zile || {};
    const zileInLuna = new Date(lunaRegistru.getFullYear(), lunaRegistru.getMonth() + 1, 0).getDate();
    let running = Number(date.stocInitial) || 0;
    const randuri = [];
    for (let zi = 1; zi <= zileInLuna; zi++) {
        const r = zile[zi] || {};
        const i = Number(r.i) || 0;
        const e = Number(r.e) || 0;
        running += i - e;
        randuri.push([zi, i || '', e || '', running]);
    }
    return randuri;
}

function deschideExport(tip) {
    exportTip = tip;
    if (tip === 'registru') {
        elExportTitlu.textContent = 'Export registru';
        elExportScopuri.classList.add('hidden');
    } else {
        elExportTitlu.textContent = 'Export inventar';
        elExportScopuri.classList.remove('hidden');
        exportScop = 'categorie';
        evidentiazaScop();
    }
    elModalExport.classList.remove('hidden');
}

function inchideExport() {
    elModalExport.classList.add('hidden');
}

function evidentiazaScop() {
    document.querySelectorAll('.export-scop').forEach(b => {
        b.classList.toggle('text-blue-500', b.dataset.scop === exportScop);
        b.classList.toggle('text-gray-600', b.dataset.scop !== exportScop);
    });
}

async function executaExport(format) {
    let titlu, antet, randuri, numeBaza;
    if (exportTip === 'registru') {
        antet = ANTET_REGISTRU;
        randuri = await colecteazaRegistru();
        titlu = `Registru ${produsCurent.denumire_produs} — ${elRegistruLunaEticheta.textContent}`;
        numeBaza = `registru-${slug(produsCurent.denumire_produs)}-${lunaCheie(lunaRegistru)}`;
    } else {
        antet = ANTET_INVENTAR;
        randuri = await colecteazaInventar(exportScop);
        const undeText = exportScop === 'total' ? 'Tot inventarul'
            : exportScop === 'gestiune' ? getNumeGestiune(gestiuneCurenta)
            : `${getNumeGestiune(gestiuneCurenta)} — ${locatieCurenta}`;
        titlu = `Inventar — ${undeText}`;
        numeBaza = `inventar-${slug(undeText)}-${new Date().toISOString().slice(0, 10)}`;
    }

    if (format === 'csv') {
        descarcaFisier(numeBaza + '.csv', genereazaCSV(antet, randuri), 'text/csv;charset=utf-8');
    } else if (format === 'excel') {
        descarcaFisier(numeBaza + '.xls', genereazaExcel(titlu, antet, randuri), 'application/vnd.ms-excel');
    } else if (format === 'pdf') {
        tipareste(titlu, antet, randuri);
    }
    inchideExport();
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
    elBtnAdaugaProdusNou.addEventListener('click', deschideAdaugaProdus);

    // Modal generic de input/confirmare (înlocuiește prompt/confirm native)
    elModalInputOk.addEventListener('click', () => inchideModalInput({ actiune: 'salveaza', valoare: elModalInputCamp.value }));
    elModalInputAnuleaza.addEventListener('click', () => inchideModalInput(null));
    elModalInputSterge.addEventListener('click', () => inchideModalInput({ actiune: 'sterge' }));
    elModalInput.addEventListener('click', (e) => { if (e.target === elModalInput) inchideModalInput(null); });
    elModalInputCamp.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') inchideModalInput({ actiune: 'salveaza', valoare: elModalInputCamp.value });
    });

    // Export inventar / registru
    elBtnExportInventar.addEventListener('click', () => deschideExport('inventar'));
    elBtnExportRegistru.addEventListener('click', () => deschideExport('registru'));
    elExportInchide.addEventListener('click', inchideExport);
    elModalExport.addEventListener('click', (e) => {
        if (e.target === elModalExport) { inchideExport(); return; }
        const btnScop = e.target.closest('.export-scop');
        if (btnScop) { exportScop = btnScop.dataset.scop; evidentiazaScop(); return; }
        const btnFormat = e.target.closest('.export-format');
        if (btnFormat) executaExport(btnFormat.dataset.format);
    });

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
