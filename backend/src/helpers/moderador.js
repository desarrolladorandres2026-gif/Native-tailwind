// ─────────────────────────────────────────────────────────────────────────────
// Moderador de contenido inapropiado
// ─────────────────────────────────────────────────────────────────────────────

const PALABRAS_OFENSIVAS = [
    'chupamelacola','mierda','puta','puto','hijueputa','hijueputo','malparido','malparida',
    'gonorrea','marica','idiota','imbécil','imbecil','estúpido','estupido',
    'pendejo','pendeja','coño','verga','culo','perra','perro',
    'maricón','maricon','cabrón','cabron','joder','hostia','gilipollas',
    'follar','chinga','chingada','culero','culera','pinche','mamón','mamon','hp',
    'sapa','sapo','gordo','gorda','carechimba','caremondá','caremonda',
    'chimba','chimbo','penes','vagina','pelado marica','hpta','hijpta',
    'mk','mka','marik','marika','mar1ca','mar!ca','hptas','maricones','tetranutras','tetranutra',
    'mmda', 'mamada', 'culie', 'qliar', 'culiar', 'culiando', 'culion', 'culeo', 'actos sexuales', 'caca','sexo',
    'sapas','porno','pornografía','xvideos','porn hub','pornhub','mlp','tragaleche','culean',
    'soplamonda','pichaslargas','culear','culito','mia khalifa','polla','zunga','sunga','soplapicha',
    'consolador','mal parido','malparido','malparidos','becerro','mrd','qulo','kulo','teta','chocho',
    'pendejos','cacorro','veneco','veneca','venequito','beneco','chocha','cachon','cachondo',
    'cachocontento','carepicha','monda','cuca','picha','cabezaepicha','pta','catrehijuepta','vrg','vrgs',
    'semen','cervical','qlo','arrecha','zemen','arrecho','vergones','vergotas','verguitas','brga',
    'qk','pipi','polno','polnito','escroto','mierdoso','cmen','smen','gnorrea','gnrrea','conchesumadre',
    'sidoso','leproso','marico','mariko','cacorra','kakorra','vergon','kcorro','pichurria','pichurrioso','mamabicho',
    'culion','pirobo','masturbarse','masturbar','pne','gnrriento','estupida','tontin','webon',
    'weon','aguevado','paraco','guerrillero','onlyfans','brazzers','xxx','mamaburra','mamapolla','homosexual',
    'mariquita','stupida','stupido','culito','hentai','hentay','gore','mtar',
    'despellejar','prepucio','clitoris','glande','squirt','degollar','cabezón','violar','dildo','pto','eyacular','bizcocho',
    'testiculos','culiando','hdp','pichon', 'penetracion', 'penetrar', 'penetrante', 'penetro', 'penetra', 'repenetrable', 'vajina',
    'cuquita', 'qkita', 'cucota', 'qkta', 'nepe', 'japa', 'prostituta', 'xunga', 'seno',
    'jueputa','jueputas','juepuerca','juepuercas',
    'catrehijueputa','catrehijueputas','catrehijuepuerca',
    'hijuelagranputa','hijueputazo',
    'malparicion','malpario',
    'cagada','cagado','cagon','cagona',
    'gonorreas','gonorreoso','gonorreosa',
    'culiparado','culiparada',
    'culiflojo','culifloja',
    'culicagado','culicagada',
    'culigorrion','culigorriona',
    'casposo','casposa',
    'guaricha','guarichas',
    'guisa','guisas','guisaso','guisasa',
    'culipronta','culiprontas',
    'lacra','lacras',
    'sapo hijueputa','sapa hijueputa',
    'pirobo hijueputa','piroba hijueputa',
    'cacorro hijueputa',
    'malparido hijueputa',
    'gonorrea hijueputa',
    'desgraciado','desgraciada','desgraciados','desgraciadas',
    'lambón','lambon','lambona','lambones',
    'chupamedias','chupamedia',
    'perrazas','perraza',
    'putazo','putazos',
    'hijuepuercas','hijuepuerco','hijuepuerca',
    'perra malparida','perro malparido',
    'perra hijueputa','perro hijueputa',
    'zorra malparida',
    'come mierda','comemierda','comemierdas',
    'come verga','comeverga','comevergas',
    'come culo','comeculo',
    'nacido por el chiquito','nacida por el chiquito',
    'parido por el chiquito','parida por el chiquito',
    'salido por el chiquito','salida por el chiquito',
    'mongoloide','mongolo','mongola',
    'mogólico','mogolico','mogolica',
    'retrasado mental','retrasada mental',
    'sindrome de down',
    'encefalograma plano',
    'cerebro de mosquito',
    'guevon','guevona','guevas',
    'costeño gonorrea',
    'paisa hijueputa',
    'rolo hijueputa',
    'caquero','caquera',
    'tierrero','tierrera',
    'ñero','ñera','ñeros','ñeras',
    'ñeroñero',
    'gamín','gamin','gamines',
    'sapo malparido','sapo hijueputa',
    'perra cuentera','perro cuentero',
    'vieja perra','viejo perro',
    'vieja puta','viejo puto',
    'vieja gonorrea','viejo gonorrea',
    'hp malparido','hp hijueputa',
    'cara de culo','cara de pinga','cara de verga',
    'cara de malparido','cara de malparida',
    'hijo de puta','hija de puta',
    'hijo de la gran puta','hija de la gran puta',
    'hijodeputa','hijadelagranputa','hijodelagranputa',
    'se la mamo','se la mama','mamela',
    'mamela bien','mamelo bien',
    'vayase a la mierda','vete a la mierda','váyase a la verga',
    'metasela','metesela',
    'que se meta','metelo',
    'pirobaso','pirobaza',
    'gonorreazo','gonorreaza',
    'pircuche','pircucho',
    'p3rra','p3rro','put4','put0','m4lp4rid0','m4lp4rid4',
    'hjp','hjpt','cul0','cul00',
    'p3nd3jo','p3ndejo',
    'v3rga','v3rg4',
    'g0norrea','g0norre4',
    'h1jueputa',
    'no mames','no mamar','wey pendejo','guey','putazo','chingar','chingón','chingon',
    'chingadera','chingao','verguiza','culiada','culiad0','culiar','mms','cabron',
    'boludo','boluda','pelotudo','pelotuda','forro','concha','conchudo',
    'la puta madre','ortiva','mogólico','mogolico',
    'subnormal','capullo','cojones','me cago en','me cago','zorra','pringado','gilipollas',
    'huevón','huevon','weona','aweonao','aweonado',
    'ctm','conchatumadre','concha tu madre',
    'pajero','pajera','maraco','culiao','culiada',
    'fuck','fucking','shit','bullshit','ass','asshole','bitch','bastard',
    'damn','crap','dick','cock','pussy','whore','slut','motherfucker',
    'mf','stfu','gtfo','son of a bitch','sob','dumbass','jackass',
    'nigger','nigga','faggot','retard','tranny','cunt',
    'f*ck','f**k','sh1t','b1tch','4ss','a55','d1ck','c0ck',
    'p*ta','p*t*','m13rda','m1erda','put4','put0','cul0','cvl0',
];

const PALABRAS_BOUNDARY_ESTRICTO = [
    'cp','suicidar','suicidio','matar',
    'porn','mrk','mk','mrd',
];

const PALABRAS_SUBSTRING = [
    'pene',
];

const SAFE_WORDS = [
    'desempene', 'desempenes', 'desempenen', 'desempenar', 'desempeno',
    'penelope',
    'piano', 'soberano', 'hermano', 'mano', 'verano', 'temprano', 'pantano', 'fulano', 'enano',
    'apnea', 'repentino', 'coseno',
];

// ─────────────────────────────────────────────────────────────────────────────
// Leet map y utilidades de normalización
// ─────────────────────────────────────────────────────────────────────────────

const LEET_MAP = {
    '4': 'a', '@': 'a', 'á': 'a', 'à': 'a', 'ä': 'a',
    '3': 'e', '€': 'e', 'é': 'e', 'è': 'e',
    '1': 'i', '!': 'i', 'í': 'i', 'ì': 'i', 'ï': 'i',
    '0': 'o', 'ó': 'o', 'ò': 'o', 'ö': 'o',
    '$': 's', '5': 's',
    '7': 't',
    '+': 't',
    '(': 'c',
    'ñ': 'n',
    'ü': 'u', 'ú': 'u', 'ù': 'u',
};

const SEP = `[\\s.,\\-_"'!¡¿?]*`;

function normalizarTexto(texto) {
    return texto
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '');
}

function normalizarLeet(texto) {
    return texto.split('').map(c => LEET_MAP[c] ?? c).join('');
}

function colapsarRepetidas(texto) {
    return texto.replace(/(.)\1{2,}/g, '$1$1');
}

function limpiarTexto(texto) {
    return texto.replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function procesarTexto(texto) {
    let t = normalizarTexto(texto);
    t = normalizarLeet(t);
    t = colapsarRepetidas(t);
    t = limpiarTexto(t);
    return t;
}

function escaparRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Construye patrón regex para una palabra normalizada.
// Cada letra puede repetirse, con separadores opcionales entre letras.
function buildWordPattern(wordNorm) {
    const clean = wordNorm.replace(/\s+/g, '');
    if (!clean) return null;
    return clean.split('').map(c => `${escaparRegex(c)}+`).join(SEP);
}

// ─────────────────────────────────────────────────────────────────────────────
// Precompilación de regexes al cargar el módulo
// ─────────────────────────────────────────────────────────────────────────────
const _compiled = (() => {
    const ofensivas = [];
    for (const p of PALABRAS_OFENSIVAS) {
        const norm = procesarTexto(p);
        const pat = buildWordPattern(norm);
        if (pat) ofensivas.push(new RegExp(pat));
    }

    const boundary = [];
    for (const p of PALABRAS_BOUNDARY_ESTRICTO) {
        const norm = procesarTexto(p).replace(/\s+/g, '');
        if (norm) boundary.push(new RegExp(`\\b${escaparRegex(norm)}+\\b`));
    }

    const substring  = PALABRAS_SUBSTRING.map(p => procesarTexto(p).replace(/\s+/g, '')).filter(Boolean);
    const safeWords  = SAFE_WORDS.map(w => procesarTexto(w).replace(/\s+/g, '')).filter(Boolean);

    return { ofensivas, boundary, substring, safeWords };
})();

// ─────────────────────────────────────────────────────────────────────────────
// API pública
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Retorna true si el texto contiene alguna palabra ofensiva.
 */
function contienePalabraOfensiva(texto) {
    if (!texto || typeof texto !== 'string') return false;
    const procesado = procesarTexto(texto);

    for (const re of _compiled.ofensivas) {
        if (re.test(procesado)) return true;
    }

    for (const re of _compiled.boundary) {
        if (re.test(procesado)) return true;
    }

    const sinEspacios = procesado.replace(/\s+/g, '');
    const tieneSafeWord = _compiled.safeWords.some(sw => sinEspacios.includes(sw));
    if (!tieneSafeWord) {
        for (const sub of _compiled.substring) {
            if (sinEspacios.includes(sub)) return true;
        }
    }

    return false;
}

module.exports = { contienePalabraOfensiva };
