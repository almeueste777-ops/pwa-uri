// Baza de date cu locațiile exacte ale celor două gestiuni
const STRUCTURA_GESTIUNI = {
    1: {
        nume: 'MĂNĂSTIRE',
        locatii: [
            'Hala alimente',
            'Produse de curățenie',
            'Lăzi frigorifice',
            'Container frigorific',
            'Depozit haine',
            'Magazin bisericesc',
            'Veșmântărie',
            'Magazie scule'
        ]
    },
    2: {
        nume: 'CRPV',
        locatii: [
            'Magazie mică',
            'Magazie Dulciuri',
            'Lăzi frigorifice',
            'Cameră de frig',
            'Medicamente',
            'Beci alimente'
        ]
    }
};

export { STRUCTURA_GESTIUNI };

// Navigare între ecrane
export function comutaEcran(idEcran) {
    const ecrane = ['ecran-gestiuni', 'ecran-locatii', 'ecran-produse', 'ecran-operatie'];
    ecrane.forEach(ecran => {
        const el = document.getElementById(ecran);
        if (ecran === idEcran) {
            el.classList.remove('hidden');
            el.classList.add('fade-in');
        } else {
            el.classList.add('hidden');
        }
    });

    // Control buton înapoi
    const btnInapoi = document.getElementById('btn-inapoi');
    if (idEcran === 'ecran-gestiuni') {
        btnInapoi.classList.add('hidden');
        document.getElementById('titlu-aplicatie').innerText = 'Antigravity Gestiune';
    } else {
        btnInapoi.classList.remove('hidden');
    }
}

// Generează butoanele pentru locațiile fizice în funcție de gestiunea aleasă
export function randeazaLocatii(gestiuneId) {
    const container = document.getElementById('ecran-locatii');
    const dateGestiune = STRUCTURA_GESTIUNI[gestiuneId];

    document.getElementById('titlu-aplicatie').innerText = dateGestiune.nume;
    container.innerHTML = ''; // Curăță ecranul anterior

    dateGestiune.locatii.forEach(locatie => {
        const buton = document.createElement('button');
        buton.className = 'card-locatie bg-gray-800 border border-gray-700 p-6 rounded-xl shadow-lg text-lg font-semibold text-center text-gray-200 flex items-center justify-center min-h-[100px]';
        buton.innerText = locatie;
        buton.dataset.locatie = locatie;
        buton.dataset.gestiuneId = gestiuneId;

        container.appendChild(buton);
    });

    comutaEcran('ecran-locatii');
}

// Randează produsele dintr-o anumită locație (Mockup vizual până legăm DB-ul mare)
export function randeazaProduse(gestiuneNume, locatieNume, produseInstanta = []) {
    document.getElementById('titlu-aplicatie').innerText = `${gestiuneNume} → ${locatieNume}`;
    const grid = document.getElementById('grid-produse');
    grid.innerHTML = '';

    if (produseInstanta.length === 0) {
        grid.innerHTML = `<div class="col-span-2 text-center py-8 text-gray-500 text-sm">Niciun produs adăugat în această cameră.</div>`;
        comutaEcran('ecran-produse');
        return;
    }

    produseInstanta.forEach(produs => {
        const card = document.createElement('div');
        card.className = 'card-produs bg-gray-800 rounded-xl overflow-hidden shadow-lg border border-gray-700 flex flex-col cursor-pointer';
        card.dataset.produsId = produs.id;

        // Fallback dacă nu are imagine încărcată
        const imagineStyle = produs.poza_url
            ? `background-image: url('${produs.poza_url}')`
            : `background-image: url('https://via.placeholder.com/150/1f2937/9ca3af?text=Fara+Poza')`;

        card.innerHTML = `
            <div class="h-32 imagine-produs-bg" style="${imagineStyle}"></div>
            <div class="p-3 flex-1 flex flex-col justify-between">
                <div>
                    <h4 class="font-bold text-sm text-gray-100 line-clamp-2">${produs.denumire_produs}</h4>
                    <p class="text-xs text-gray-400 mt-0.5">${produs.marca || ''}</p>
                </div>
                <div class="mt-2 flex justify-between items-end">
                    <span class="text-xs px-2 py-0.5 rounded bg-gray-700 text-gray-300">${produs.unitate_masura}</span>
                    <span class="text-sm font-bold text-blue-400">${produs.stoc || 0}</span>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });

    comutaEcran('ecran-produse');
}
