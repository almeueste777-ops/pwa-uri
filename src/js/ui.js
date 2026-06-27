// Pictograme SVG minimaliste pentru fiecare entitate (stil neumorfic, fără culori țipătoare)
const iconShapes = {
    manastire: `<svg class="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 3v4m-2-2h4"></path></svg>`,
    crpv: `<svg class="w-8 h-8 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>`,
    frig: `<svg class="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 3v18m0-18l-3 3m3-3l3 3m-3 15l-3-3m3 3l3-3M3 12h18m-18 0l3-3m-3 3l3 3m15-3l-3-3m3 3l-3 3M7.5 7.5l9 9m-9 0l9-9"></path></svg>`,
    alimente: `<svg class="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>`,
    medicamente: `<svg class="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg>`,
    generic: `<svg class="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z"></path></svg>`
};

// Baza de date cu locațiile exacte ale celor două gestiuni, fiecare cu pictogramă proprie
const STRUCTURA_GESTIUNI = {
    1: {
        nume: 'MĂNĂSTIRE',
        icon: iconShapes.manastire,
        locatii: [
            { nume: 'Hala alimente', icon: iconShapes.alimente },
            { nume: 'Produse de curățenie', icon: iconShapes.generic },
            { nume: 'Lăzi frigorifice', icon: iconShapes.frig },
            { nume: 'Container frigorific', icon: iconShapes.frig },
            { nume: 'Depozit haine', icon: iconShapes.generic },
            { nume: 'Magazin bisericesc', icon: iconShapes.generic },
            { nume: 'Veșmântărie', icon: iconShapes.generic },
            { nume: 'Magazie scule', icon: iconShapes.generic }
        ]
    },
    2: {
        nume: 'CRPV',
        icon: iconShapes.crpv,
        locatii: [
            { nume: 'Magazie mică', icon: iconShapes.generic },
            { nume: 'Magazie Dulciuri', icon: iconShapes.alimente },
            { nume: 'Lăzi frigorifice', icon: iconShapes.frig },
            { nume: 'Cameră de frig', icon: iconShapes.frig },
            { nume: 'Medicamente', icon: iconShapes.medicamente },
            { nume: 'Beci alimente', icon: iconShapes.alimente }
        ]
    }
};

export { STRUCTURA_GESTIUNI };

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
    const ecrane = ['ecran-login', 'ecran-gestiuni', 'ecran-locatii', 'ecran-produse', 'ecran-operatie'];
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

    [1, 2].forEach(id => {
        if (!poateAccesaGestiune(String(id))) return;
        const gestiune = STRUCTURA_GESTIUNI[id];
        const card = document.createElement('div');
        card.className = 'card-gestiune neu-card p-6 flex items-center justify-between cursor-pointer';
        card.dataset.gestiune = id;

        card.innerHTML = `
            <div class="flex items-center space-x-5">
                <div class="neu-icon-badge w-16 h-16">${gestiune.icon}</div>
                <span class="text-2xl font-bold tracking-wide">${gestiune.nume}</span>
            </div>
            <div class="neu-btn-circular w-10 h-10 flex items-center justify-center text-gray-400">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
            </div>
        `;

        container.appendChild(card);
    });
}

// Generează butoanele pentru locațiile fizice în funcție de gestiunea aleasă
export function randeazaLocatii(gestiuneId, poateAccesaLocatie = () => true) {
    const container = document.getElementById('ecran-locatii');
    const dateGestiune = STRUCTURA_GESTIUNI[gestiuneId];

    document.getElementById('titlu-aplicatie').innerText = dateGestiune.nume;
    container.innerHTML = '';

    dateGestiune.locatii.filter(l => poateAccesaLocatie(l.nume)).forEach((locatie, index) => {
        const card = document.createElement('div');
        card.style.animationDelay = `${index * 0.05}s`;
        card.className = 'card-locatie neu-card p-4 flex items-center cursor-pointer slide-up-fade';
        card.dataset.locatie = locatie.nume;
        card.dataset.gestiuneId = gestiuneId;

        card.innerHTML = `
            <div class="neu-icon-badge w-12 h-12 mr-4 flex-shrink-0">${locatie.icon}</div>
            <div class="flex-1">
                <h3 class="text-lg font-bold">${locatie.nume}</h3>
            </div>
        `;

        container.appendChild(card);
    });

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
        card.className = 'card-produs neu-card p-3 flex flex-col items-center text-center cursor-pointer slide-up-fade';
        card.dataset.produsId = produs.id;

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

        card.append(poza, titlu, marca, rand);
        grid.appendChild(card);
    });

    comutaEcran('ecran-produse');
}
