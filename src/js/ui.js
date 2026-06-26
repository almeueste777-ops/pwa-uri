// Baza de date cu locațiile exacte ale celor două gestiuni, fiecare cu temă și gradient propriu
const STRUCTURA_GESTIUNI = {
    1: {
        nume: 'MĂNĂSTIRE',
        tema: 'tema-manastire', // Design clasic, rotunjit, umbre grele
        locatii: [
            { nume: 'Hala alimente', gradient: 'from-orange-600 to-amber-700' },
            { nume: 'Produse de curățenie', gradient: 'from-teal-600 to-cyan-800' },
            { nume: 'Lăzi frigorifice', gradient: 'from-blue-700 to-indigo-900' },
            { nume: 'Container frigorific', gradient: 'from-slate-600 to-gray-800' },
            { nume: 'Depozit haine', gradient: 'from-purple-600 to-fuchsia-800' },
            { nume: 'Magazin bisericesc', gradient: 'from-yellow-600 to-amber-600 text-gray-900' },
            { nume: 'Veșmântărie', gradient: 'from-rose-700 to-pink-900' },
            { nume: 'Magazie scule', gradient: 'from-stone-600 to-stone-800' }
        ]
    },
    2: {
        nume: 'CRPV',
        tema: 'tema-crpv', // Design tech, margini ascuțite, glow
        locatii: [
            { nume: 'Magazie mică', gradient: 'from-emerald-400 to-teal-600' },
            { nume: 'Magazie Dulciuri', gradient: 'from-pink-500 to-rose-500' },
            { nume: 'Lăzi frigorifice', gradient: 'from-sky-400 to-blue-600' },
            { nume: 'Cameră de frig', gradient: 'from-cyan-400 to-cyan-700' },
            { nume: 'Medicamente', gradient: 'from-red-500 to-red-700' },
            { nume: 'Beci alimente', gradient: 'from-amber-400 to-orange-500' }
        ]
    }
};

export { STRUCTURA_GESTIUNI };

// Imagine de rezervă inline (SVG, fără apel de rețea) pentru produsele fără poză.
const IMAGINE_FALLBACK = 'data:image/svg+xml,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="150" height="150">' +
    '<rect width="150" height="150" fill="#1f2937"/>' +
    '<text x="75" y="80" font-family="sans-serif" font-size="14" fill="#9ca3af" text-anchor="middle">Fără poză</text>' +
    '</svg>'
);

export function esteUrlImagineValid(url) {
    return /^(https?:|data:image\/)/i.test(url);
}

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

    const btnInapoi = document.getElementById('btn-inapoi');
    const bodyApp = document.body;

    if (idEcran === 'ecran-gestiuni') {
        btnInapoi.classList.add('hidden');
        document.getElementById('titlu-aplicatie').innerText = 'Antigravity Gestiune';
        bodyApp.className = 'bg-gray-900 text-gray-100 font-sans'; // Reset temă
    } else {
        btnInapoi.classList.remove('hidden');
    }
}

// Generează butoanele pentru locațiile fizice în funcție de gestiunea aleasă
export function randeazaLocatii(gestiuneId) {
    const container = document.getElementById('ecran-locatii');
    const dateGestiune = STRUCTURA_GESTIUNI[gestiuneId];

    document.getElementById('titlu-aplicatie').innerText = dateGestiune.nume;

    // Aplicăm tema globală pe body pentru a schimba tot feeling-ul aplicației
    document.body.className = `bg-gray-900 text-gray-100 font-sans ${dateGestiune.tema}`;

    container.innerHTML = '';

    dateGestiune.locatii.forEach(locatie => {
        const buton = document.createElement('button');

        // Tailwind clasic + clasele dinamice de gradient + clasa de bază pentru formă
        buton.className = `card-locatie bg-gradient-to-br ${locatie.gradient} p-4 shadow-lg font-bold text-center flex items-center justify-center min-h-[110px] text-white`;

        // Ajustăm forma în funcție de temă, direct din JS
        if (dateGestiune.tema === 'tema-manastire') {
            buton.classList.add('rounded-3xl', 'border-2', 'border-white/10', 'shadow-[0_10px_20px_rgba(0,0,0,0.4)]');
        } else {
            buton.classList.add('rounded-lg', 'border-l-4', 'border-white/30', 'shadow-[0_0_15px_rgba(255,255,255,0.1)]');
        }

        buton.innerText = locatie.nume;
        buton.dataset.locatie = locatie.nume;
        buton.dataset.gestiuneId = gestiuneId;

        container.appendChild(buton);
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

    produseInstanta.forEach(produs => {
        const card = document.createElement('div');
        card.className = 'card-produs bg-gray-800 rounded-xl overflow-hidden shadow-lg border border-gray-700 flex flex-col cursor-pointer';
        card.dataset.produsId = produs.id;

        const poza = document.createElement('div');
        poza.className = 'h-32 imagine-produs-bg bg-gray-700';
        // Setat via proprietate (nu interpolat în HTML/CSS) ca să evităm injecția
        // din denumiri/URL-uri introduse de utilizator în câmpurile produsului.
        poza.style.backgroundImage = `url("${IMAGINE_FALLBACK}")`;
        if (produs.poza_url && esteUrlImagineValid(produs.poza_url)) {
            const imgTest = new Image();
            imgTest.onload = () => { poza.style.backgroundImage = `url("${produs.poza_url}")`; };
            imgTest.src = produs.poza_url;
        }

        const corp = document.createElement('div');
        corp.className = 'p-3 flex-1 flex flex-col justify-between';

        const antet = document.createElement('div');
        const titlu = document.createElement('h4');
        titlu.className = 'font-bold text-sm text-gray-100 line-clamp-2';
        titlu.textContent = produs.denumire_produs;
        const marca = document.createElement('p');
        marca.className = 'text-xs text-gray-400 mt-0.5';
        marca.textContent = produs.marca || '';
        antet.append(titlu, marca);

        const rand = document.createElement('div');
        rand.className = 'mt-2 flex justify-between items-end';
        const unitate = document.createElement('span');
        unitate.className = 'text-xs px-2 py-0.5 rounded bg-gray-700 text-gray-300';
        unitate.textContent = produs.unitate_masura;
        const stoc = document.createElement('span');
        stoc.className = 'text-sm font-bold text-blue-400';
        stoc.textContent = produs.stoc || 0;
        rand.append(unitate, stoc);

        corp.append(antet, rand);
        card.append(poza, corp);
        grid.appendChild(card);
    });

    comutaEcran('ecran-produse');
}
