// Pictograme SVG minimaliste pentru fiecare entitate (stil neumorfic, fără culori țipătoare)
const iconShapes = {
    manastire: `<svg class="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 3v4m-2-2h4"></path></svg>`,
    crpv: `<svg class="w-8 h-8 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>`,
    frig: `<svg class="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 3v18m0-18l-3 3m3-3l3 3m-3 15l-3-3m3 3l3-3M3 12h18m-18 0l3-3m-3 3l3 3m15-3l-3-3m3 3l-3 3M7.5 7.5l9 9m-9 0l9-9"></path></svg>`,
    alimente: `<svg class="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>`,
    medicamente: `<svg class="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg>`,
    generic: `<svg class="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z"></path></svg>`
};

// Structura implicită a gestiunilor. Pictogramele sunt referite prin cheie (text),
// ca structura să poată fi salvată/editată de utilizator în localStorage.
const DEFAULT_STRUCTURA = {
    1: {
        nume: 'MĂNĂSTIRE',
        icon: 'manastire',
        locatii: [
            { nume: 'Hala alimente', icon: 'alimente' },
            { nume: 'Produse de curățenie', icon: 'generic' },
            { nume: 'Lăzi frigorifice', icon: 'frig' },
            { nume: 'Container frigorific', icon: 'frig' },
            { nume: 'Depozit haine', icon: 'generic' },
            { nume: 'Magazin bisericesc', icon: 'generic' },
            { nume: 'Veșmântărie', icon: 'generic' },
            { nume: 'Magazie scule', icon: 'generic' }
        ]
    },
    2: {
        nume: 'CRPV',
        icon: 'crpv',
        locatii: [
            { nume: 'Magazie mică', icon: 'generic' },
            { nume: 'Magazie Dulciuri', icon: 'alimente' },
            { nume: 'Lăzi frigorifice', icon: 'frig' },
            { nume: 'Cameră de frig', icon: 'frig' },
            { nume: 'Medicamente', icon: 'medicamente' },
            { nume: 'Beci alimente', icon: 'alimente' }
        ]
    }
};

const STRUCTURA_KEY = 'antigravity-structura-v1';

function iconPentru(cheie) {
    return iconShapes[cheie] || iconShapes.generic;
}

// Structura editabilă, persistată în localStorage. La prima rulare pornește din implicit.
export function getStructura() {
    const raw = localStorage.getItem(STRUCTURA_KEY);
    if (raw) {
        try { return JSON.parse(raw); } catch (e) { /* cade pe implicit */ }
    }
    const clona = JSON.parse(JSON.stringify(DEFAULT_STRUCTURA));
    localStorage.setItem(STRUCTURA_KEY, JSON.stringify(clona));
    return clona;
}

export function salveazaStructura(structura) {
    localStorage.setItem(STRUCTURA_KEY, JSON.stringify(structura));
}

export function getNumeGestiune(gestiuneId) {
    const g = getStructura()[gestiuneId];
    return g ? g.nume : '';
}

// Imagine de rezervă inline (SVG, fără apel de rețea) pentru produsele fără poză.
const IMAGINE_FALLBACK = 'data:image/svg+xml,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="150" height="150">' +
    '<rect width="150" height="150" fill="#e0e5ec"/>' +
    '<text x="75" y="80" font-family="sans-serif" font-size="14" fill="#a3b1c6" text-anchor="middle">Fără poză</text>' +
    '</svg>'
);

export function esteUrlImagineValid(url) {
    return /^(https?:|data:image\/)/i.test(url);
}

// Navigare între ecrane, cu animație elastică de glisare
export function comutaEcran(idEcran) {
    const ecrane = ['ecran-login', 'ecran-gestiuni', 'ecran-locatii', 'ecran-produse', 'ecran-operatie', 'ecran-registru'];
    ecrane.forEach(ecran => {
        const el = document.getElementById(ecran);
        if (ecran === idEcran) {
            el.classList.remove('hidden');
            el.classList.remove('slide-up-fade');
            void el.offsetWidth; // forțează reflow pentru a reporni animația
            el.classList.add('slide-up-fade');
        } else {
            el.classList.add('hidden');
        }
    });

    const btnInapoi = document.getElementById('btn-inapoi');
    if (idEcran === 'ecran-gestiuni') {
        btnInapoi.classList.add('hidden');
        document.getElementById('titlu-aplicatie').innerText = 'Selectează Gestiunea';
    } else {
        btnInapoi.classList.remove('hidden');
    }
}

// Generează butoanele mari neumorfice pentru cele două gestiuni
export function randeazaEcraneGestiuni(poateAccesaGestiune = () => true) {
    const container = document.getElementById('ecran-gestiuni');
    if (!container) return;
    container.innerHTML = '';

    const structura = getStructura();
    Object.keys(structura).forEach(id => {
        if (!poateAccesaGestiune(String(id))) return;
        const gestiune = structura[id];
        const card = document.createElement('div');
        card.className = 'card-gestiune neu-card p-6 flex items-center justify-between cursor-pointer relative';
        card.dataset.gestiune = id;

        card.innerHTML = `
            <button class="btn-edit-gestiune neu-btn-circular w-8 h-8 flex items-center justify-center text-gray-400 absolute top-2 right-2" title="Editează gestiunea" data-gestiune="${id}">
                <svg class="w-4 h-4 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
            </button>
            <div class="flex items-center space-x-5">
                <div class="neu-icon-badge w-16 h-16">${iconPentru(gestiune.icon)}</div>
                <span class="text-2xl font-bold tracking-wide">${gestiune.nume}</span>
            </div>
            <div class="neu-btn-circular w-10 h-10 flex items-center justify-center text-gray-400">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
            </div>
        `;

        container.appendChild(card);
    });

    const btnAdauga = document.createElement('button');
    btnAdauga.id = 'btn-adauga-gestiune';
    btnAdauga.className = 'neu-card text-gray-500 py-4 font-semibold transition sm:col-span-2';
    btnAdauga.textContent = '+ Adaugă Gestiune';
    container.appendChild(btnAdauga);
}

// Generează butoanele pentru locațiile fizice în funcție de gestiunea aleasă
export function randeazaLocatii(gestiuneId, poateAccesaLocatie = () => true) {
    const container = document.getElementById('ecran-locatii');
    const dateGestiune = getStructura()[gestiuneId];
    if (!dateGestiune) return;

    document.getElementById('titlu-aplicatie').innerText = dateGestiune.nume;
    container.innerHTML = '';

    dateGestiune.locatii.filter(l => poateAccesaLocatie(l.nume)).forEach((locatie, index) => {
        const card = document.createElement('div');
        card.style.animationDelay = `${index * 0.05}s`;
        card.className = 'card-locatie neu-card p-4 flex items-center cursor-pointer slide-up-fade relative';
        card.dataset.locatie = locatie.nume;
        card.dataset.gestiuneId = gestiuneId;

        card.innerHTML = `
            <div class="neu-icon-badge w-12 h-12 mr-4 flex-shrink-0">${iconPentru(locatie.icon)}</div>
            <div class="flex-1">
                <h3 class="text-lg font-bold">${locatie.nume}</h3>
            </div>
            <button class="btn-edit-locatie neu-btn-circular w-8 h-8 flex items-center justify-center text-gray-400 flex-shrink-0" title="Editează sectorul" data-locatie="${locatie.nume}" data-gestiune-id="${gestiuneId}">
                <svg class="w-4 h-4 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
            </button>
        `;

        container.appendChild(card);
    });

    const btnAdauga = document.createElement('button');
    btnAdauga.id = 'btn-adauga-locatie';
    btnAdauga.className = 'neu-card text-gray-500 py-4 font-semibold transition sm:col-span-2 lg:col-span-3 xl:col-span-4';
    btnAdauga.dataset.gestiuneId = gestiuneId;
    btnAdauga.textContent = '+ Adaugă Sector';
    container.appendChild(btnAdauga);

    comutaEcran('ecran-locatii');
}

// Randează produsele dintr-o anumită locație
export function randeazaProduse(gestiuneNume, locatieNume, produseInstanta = [], cautareActiva = false) {
    document.getElementById('titlu-aplicatie').innerText = `${gestiuneNume} → ${locatieNume}`;
    const grid = document.getElementById('grid-produse');
    grid.innerHTML = '';

    if (produseInstanta.length === 0) {
        const mesaj = cautareActiva
            ? 'Niciun produs nu corespunde căutării.'
            : 'Niciun produs aici.<br>E timpul să adaugi ceva.';
        grid.innerHTML = `<div class="col-span-2 text-center py-10 text-gray-400 font-medium">${mesaj}</div>`;
        comutaEcran('ecran-produse');
        return;
    }

    produseInstanta.forEach((produs, index) => {
        const card = document.createElement('div');
        card.style.animationDelay = `${index * 0.04}s`;
        card.className = 'card-produs neu-card p-3 flex flex-col items-center text-center cursor-pointer slide-up-fade relative';
        card.dataset.produsId = produs.id;

        // Buton de editare pe fiecare căsuță (denumire, marcă, cantitate, poză)
        const btnEdit = document.createElement('button');
        btnEdit.className = 'btn-edit-card neu-btn-circular w-8 h-8 flex items-center justify-center text-blue-500 absolute top-1.5 right-1.5 z-10';
        btnEdit.title = 'Editează produsul';
        btnEdit.dataset.produsId = produs.id;
        btnEdit.innerHTML = '<svg class="w-4 h-4 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>';

        const poza = document.createElement('div');
        poza.className = 'w-16 h-16 neu-icon-badge mb-3 imagine-produs-bg';
        // Setat via proprietate (nu interpolat în HTML/CSS) ca să evităm injecția
        // din denumiri/URL-uri introduse de utilizator în câmpurile produsului.
        poza.style.backgroundImage = `url("${IMAGINE_FALLBACK}")`;
        if (produs.poza_url && esteUrlImagineValid(produs.poza_url)) {
            const imgTest = new Image();
            imgTest.onload = () => { poza.style.backgroundImage = `url("${produs.poza_url}")`; };
            imgTest.src = produs.poza_url;
        }

        const titlu = document.createElement('h4');
        titlu.className = 'font-bold text-sm text-gray-700 line-clamp-2';
        titlu.textContent = produs.denumire_produs;
        const marca = document.createElement('p');
        marca.className = 'text-xs text-gray-500 mt-0.5';
        marca.textContent = produs.marca || '';

        const rand = document.createElement('div');
        rand.className = 'mt-3 flex items-center justify-center gap-2';
        const unitate = document.createElement('span');
        unitate.className = 'text-xs px-2 py-0.5 rounded-full neu-icon-badge text-gray-500';
        unitate.textContent = produs.unitate_masura;
        const stoc = document.createElement('span');
        stoc.className = 'text-sm font-bold text-blue-500';
        stoc.textContent = produs.stoc || 0;
        rand.append(unitate, stoc);

        card.append(btnEdit, poza, titlu, marca, rand);
        grid.appendChild(card);
    });

    comutaEcran('ecran-produse');
}
