import { HOUSES } from './pc-houses.js';
// Datos de ejemplo — entidades del contrato (Palace, Zone, Locus, SceneObject, Item, Schedule, ReviewState)
// Plantilla «Gramática 50»: mismas 50 partes en Cuerpo 1 y Cuerpo 2 (100 elementos C1)
export const ZONES = [
  { id: 'cabeza', name: 'Cabeza · Presentes' },
  { id: 'hombros', name: 'Hombros · Perfectos' },
  { id: 'brazos', name: 'Brazos · Pasados y futuros' },
  { id: 'torso', name: 'Tronco · Modales y condicionales' },
  { id: 'piernas', name: 'Espalda · Voz, estilo y nombres' },
];
export const ZONES_C2 = [
  { id: 'cabeza', name: 'Cabeza · Adjetivos y adverbios' },
  { id: 'hombros', name: 'Hombros · Relativas' },
  { id: 'brazos', name: 'Brazos · Preposiciones y phrasal' },
  { id: 'torso', name: 'Tronco · Énfasis y estructura' },
  { id: 'piernas', name: 'Espalda · Formación y registro' },
];
export const LOCI = [
  {"id":"L1","n":1,"name":"Coronilla","zone":"cabeza","x":0.5,"y":0.02,"side":"front","dense":true,"state":"mastered","item":"Present Simple"},
  {"id":"L2","n":2,"name":"Frente","zone":"cabeza","x":0.5,"y":0.05,"side":"front","dense":true,"state":"due","item":"Present Continuous"},
  {"id":"L3","n":3,"name":"Ojos","zone":"cabeza","x":0.5,"y":0.079,"side":"front","dense":true,"state":"mastered","item":"Stative verbs"},
  {"id":"L4","n":4,"name":"Nariz","zone":"cabeza","x":0.5,"y":0.097,"side":"front","dense":true,"state":"review","item":"Presente con valor de futuro"},
  {"id":"L5","n":5,"name":"Boca","zone":"cabeza","x":0.5,"y":0.116,"side":"front","dense":true,"state":"review","item":"Questions & Negatives"},
  {"id":"L6","n":6,"name":"Mentón","zone":"cabeza","x":0.5,"y":0.135,"side":"front","dense":true,"state":"review","item":"Question tags"},
  {"id":"L7","n":7,"name":"Cuello","zone":"cabeza","x":0.5,"y":0.168,"side":"front","dense":false,"state":"review","item":"Subject / object questions"},
  {"id":"L8","n":8,"name":"Hombro derecho","zone":"hombros","x":0.27,"y":0.204,"side":"front","dense":false,"state":"due","item":"Present Perfect"},
  {"id":"L9","n":9,"name":"Hombro izquierdo","zone":"hombros","x":0.73,"y":0.204,"side":"front","dense":false,"state":"review","item":"Present Perfect Continuous"},
  {"id":"L10","n":10,"name":"Pecho derecho","zone":"hombros","x":0.4,"y":0.25,"side":"front","dense":false,"state":"review","item":"Past Perfect"},
  {"id":"L11","n":11,"name":"Pecho izquierdo","zone":"hombros","x":0.6,"y":0.25,"side":"front","dense":false,"state":"learning","item":"Past Perfect Continuous"},
  {"id":"L12","n":12,"name":"Esternón","zone":"hombros","x":0.5,"y":0.305,"side":"front","dense":false,"state":"learning","item":"Future Perfect"},
  {"id":"L13","n":13,"name":"Bíceps derecho","zone":"brazos","x":0.255,"y":0.32,"side":"front","dense":false,"state":"mastered","item":"Past Simple"},
  {"id":"L14","n":14,"name":"Bíceps izquierdo","zone":"brazos","x":0.745,"y":0.32,"side":"front","dense":false,"state":"review","item":"Past Continuous"},
  {"id":"L15","n":15,"name":"Codo derecho","zone":"brazos","x":0.225,"y":0.417,"side":"front","dense":false,"state":"review","item":"Used to / would"},
  {"id":"L16","n":16,"name":"Codo izquierdo","zone":"brazos","x":0.775,"y":0.417,"side":"front","dense":false,"state":"learning","item":"Be / get used to"},
  {"id":"L17","n":17,"name":"Antebrazo derecho","zone":"brazos","x":0.21,"y":0.49,"side":"front","dense":false,"state":"review","item":"Will vs going to"},
  {"id":"L18","n":18,"name":"Antebrazo izquierdo","zone":"brazos","x":0.79,"y":0.49,"side":"front","dense":false,"state":"learning","item":"Future Continuous"},
  {"id":"L19","n":19,"name":"Muñeca derecha","zone":"brazos","x":0.19,"y":0.56,"side":"front","dense":false,"state":"new","item":"Future in the past"},
  {"id":"L20","n":20,"name":"Muñeca izquierda","zone":"brazos","x":0.81,"y":0.56,"side":"front","dense":false,"state":"new","item":"Be about to / be due to"},
  {"id":"L21","n":21,"name":"Mano derecha","zone":"brazos","x":0.175,"y":0.608,"side":"front","dense":false,"state":"review","item":"Narrative tenses"},
  {"id":"L22","n":22,"name":"Mano izquierda","zone":"brazos","x":0.825,"y":0.608,"side":"front","dense":false,"state":"learning","item":"Time clauses (when, as soon as)"},
  {"id":"L23","n":23,"name":"Abdomen","zone":"torso","x":0.5,"y":0.375,"side":"front","dense":false,"state":"review","item":"Modales de habilidad"},
  {"id":"L24","n":24,"name":"Ombligo","zone":"torso","x":0.5,"y":0.43,"side":"front","dense":false,"state":"review","item":"Obligación: must / have to"},
  {"id":"L25","n":25,"name":"Cadera derecha","zone":"torso","x":0.34,"y":0.5,"side":"front","dense":false,"state":"learning","item":"Necesidad: needn’t / mustn’t"},
  {"id":"L26","n":26,"name":"Cadera izquierda","zone":"torso","x":0.66,"y":0.5,"side":"front","dense":false,"state":"learning","item":"Deducción en presente"},
  {"id":"L27","n":27,"name":"Muslo derecho","zone":"torso","x":0.4,"y":0.63,"side":"front","dense":false,"state":"suspended","item":"Deducción en pasado"},
  {"id":"L28","n":28,"name":"Muslo izquierdo","zone":"torso","x":0.6,"y":0.63,"side":"front","dense":false,"state":"new","item":"Crítica: should have"},
  {"id":"L29","n":29,"name":"Rodilla derecha","zone":"torso","x":0.405,"y":0.752,"side":"front","dense":false,"state":"new","item":"Permiso y peticiones"},
  {"id":"L30","n":30,"name":"Rodilla izquierda","zone":"torso","x":0.595,"y":0.752,"side":"front","dense":false,"state":"review","item":"Condicional 0 y 1"},
  {"id":"L31","n":31,"name":"Espinilla derecha","zone":"torso","x":0.41,"y":0.84,"side":"front","dense":false,"state":"review","item":"Segundo condicional"},
  {"id":"L32","n":32,"name":"Espinilla izquierda","zone":"torso","x":0.59,"y":0.84,"side":"front","dense":false,"state":"learning","item":"Tercer condicional"},
  {"id":"L33","n":33,"name":"Tobillo derecho","zone":"torso","x":0.39,"y":0.93,"side":"front","dense":false,"state":"new","item":"Mixed conditionals"},
  {"id":"L34","n":34,"name":"Tobillo izquierdo","zone":"torso","x":0.61,"y":0.93,"side":"front","dense":false,"state":"new","item":"Wish / if only"},
  {"id":"L35","n":35,"name":"Pie derecho","zone":"torso","x":0.42,"y":0.972,"side":"front","dense":false,"state":"new","item":"I’d rather / It’s time"},
  {"id":"L36","n":36,"name":"Pie izquierdo","zone":"torso","x":0.58,"y":0.972,"side":"front","dense":false,"state":"new","item":"Unless / provided that"},
  {"id":"L37","n":37,"name":"Nuca","zone":"piernas","x":0.5,"y":0.15,"side":"back","dense":false,"state":"review","item":"Passive voice"},
  {"id":"L38","n":38,"name":"Omóplato izquierdo","zone":"piernas","x":0.32,"y":0.26,"side":"back","dense":false,"state":"learning","item":"Passive reporting (It is said…)"},
  {"id":"L39","n":39,"name":"Omóplato derecho","zone":"piernas","x":0.68,"y":0.26,"side":"back","dense":false,"state":"new","item":"Causative have / get"},
  {"id":"L40","n":40,"name":"Columna alta","zone":"piernas","x":0.5,"y":0.3,"side":"back","dense":false,"state":"review","item":"Reported statements"},
  {"id":"L41","n":41,"name":"Columna media","zone":"piernas","x":0.5,"y":0.38,"side":"back","dense":false,"state":"learning","item":"Reported questions"},
  {"id":"L42","n":42,"name":"Lumbar","zone":"piernas","x":0.5,"y":0.46,"side":"back","dense":false,"state":"new","item":"Reporting verbs"},
  {"id":"L43","n":43,"name":"Nalga izquierda","zone":"piernas","x":0.42,"y":0.56,"side":"back","dense":false,"state":"new","item":"Gerund vs infinitive"},
  {"id":"L44","n":44,"name":"Nalga derecha","zone":"piernas","x":0.58,"y":0.56,"side":"back","dense":false,"state":"new","item":"-ing / to que cambian de sentido"},
  {"id":"L45","n":45,"name":"Corva izquierda","zone":"piernas","x":0.405,"y":0.75,"side":"back","dense":false,"state":"new","item":"Countable / uncountable"},
  {"id":"L46","n":46,"name":"Corva derecha","zone":"piernas","x":0.595,"y":0.75,"side":"back","dense":false,"state":"new","item":"Articles a / an / the / Ø"},
  {"id":"L47","n":47,"name":"Pantorrilla izquierda","zone":"piernas","x":0.41,"y":0.82,"side":"back","dense":false,"state":"new","item":"Quantifiers"},
  {"id":"L48","n":48,"name":"Pantorrilla derecha","zone":"piernas","x":0.59,"y":0.82,"side":"back","dense":false,"state":"new","item":"Possessives & ’s"},
  {"id":"L49","n":49,"name":"Talón izquierdo","zone":"piernas","x":0.42,"y":0.97,"side":"back","dense":false,"state":"new","item":"Pronouns & reflexives"},
  {"id":"L50","n":50,"name":"Talón derecho","zone":"piernas","x":0.58,"y":0.97,"side":"back","dense":false,"state":"new","item":"Compound nouns"}
];
export const LOCI_C2 = [
  {"id":"M1","n":1,"name":"Coronilla","zone":"cabeza","x":0.5,"y":0.02,"side":"front","dense":true,"state":"review","item":"Adjective order"},
  {"id":"M2","n":2,"name":"Frente","zone":"cabeza","x":0.5,"y":0.05,"side":"front","dense":true,"state":"review","item":"-ed / -ing adjectives"},
  {"id":"M3","n":3,"name":"Ojos","zone":"cabeza","x":0.5,"y":0.079,"side":"front","dense":true,"state":"review","item":"Comparatives & superlatives"},
  {"id":"M4","n":4,"name":"Nariz","zone":"cabeza","x":0.5,"y":0.097,"side":"front","dense":true,"state":"learning","item":"The more…, the more…"},
  {"id":"M5","n":5,"name":"Boca","zone":"cabeza","x":0.5,"y":0.116,"side":"front","dense":true,"state":"new","item":"Adverbs of degree"},
  {"id":"M6","n":6,"name":"Mentón","zone":"cabeza","x":0.5,"y":0.135,"side":"front","dense":true,"state":"new","item":"Adverb position"},
  {"id":"M7","n":7,"name":"Cuello","zone":"cabeza","x":0.5,"y":0.168,"side":"front","dense":false,"state":"new","item":"So / such / too / enough"},
  {"id":"M8","n":8,"name":"Hombro derecho","zone":"hombros","x":0.27,"y":0.204,"side":"front","dense":false,"state":"review","item":"Defining relative clauses"},
  {"id":"M9","n":9,"name":"Hombro izquierdo","zone":"hombros","x":0.73,"y":0.204,"side":"front","dense":false,"state":"learning","item":"Non-defining relative clauses"},
  {"id":"M10","n":10,"name":"Pecho derecho","zone":"hombros","x":0.4,"y":0.25,"side":"front","dense":false,"state":"new","item":"Reduced relative clauses"},
  {"id":"M11","n":11,"name":"Pecho izquierdo","zone":"hombros","x":0.6,"y":0.25,"side":"front","dense":false,"state":"new","item":"Whose / whom / prep + which"},
  {"id":"M12","n":12,"name":"Esternón","zone":"hombros","x":0.5,"y":0.305,"side":"front","dense":false,"state":"new","item":"Whatever / whoever"},
  {"id":"M13","n":13,"name":"Bíceps derecho","zone":"brazos","x":0.255,"y":0.32,"side":"front","dense":false,"state":"review","item":"Prepositions of time"},
  {"id":"M14","n":14,"name":"Bíceps izquierdo","zone":"brazos","x":0.745,"y":0.32,"side":"front","dense":false,"state":"review","item":"Prepositions of place"},
  {"id":"M15","n":15,"name":"Codo derecho","zone":"brazos","x":0.225,"y":0.417,"side":"front","dense":false,"state":"learning","item":"Adjective + preposition"},
  {"id":"M16","n":16,"name":"Codo izquierdo","zone":"brazos","x":0.775,"y":0.417,"side":"front","dense":false,"state":"new","item":"Verb + preposition"},
  {"id":"M17","n":17,"name":"Antebrazo derecho","zone":"brazos","x":0.21,"y":0.49,"side":"front","dense":false,"state":"new","item":"Phrasal verbs separables"},
  {"id":"M18","n":18,"name":"Antebrazo izquierdo","zone":"brazos","x":0.79,"y":0.49,"side":"front","dense":false,"state":"new","item":"Phrasal verbs de 3 partes"},
  {"id":"M19","n":19,"name":"Muñeca derecha","zone":"brazos","x":0.19,"y":0.56,"side":"front","dense":false,"state":"new","item":"Make vs do"},
  {"id":"M20","n":20,"name":"Muñeca izquierda","zone":"brazos","x":0.81,"y":0.56,"side":"front","dense":false,"state":"new","item":"Get: usos múltiples"},
  {"id":"M21","n":21,"name":"Mano derecha","zone":"brazos","x":0.175,"y":0.608,"side":"front","dense":false,"state":"learning","item":"Conectores de contraste"},
  {"id":"M22","n":22,"name":"Mano izquierda","zone":"brazos","x":0.825,"y":0.608,"side":"front","dense":false,"state":"new","item":"Conectores de causa y resultado"},
  {"id":"M23","n":23,"name":"Abdomen","zone":"torso","x":0.5,"y":0.375,"side":"front","dense":false,"state":"due","item":"Inversión tras adverbios negativos"},
  {"id":"M24","n":24,"name":"Ombligo","zone":"torso","x":0.5,"y":0.43,"side":"front","dense":false,"state":"learning","item":"Inversión en condicionales"},
  {"id":"M25","n":25,"name":"Cadera derecha","zone":"torso","x":0.34,"y":0.5,"side":"front","dense":false,"state":"new","item":"Cleft sentences: It"},
  {"id":"M26","n":26,"name":"Cadera izquierda","zone":"torso","x":0.66,"y":0.5,"side":"front","dense":false,"state":"new","item":"Cleft sentences: What"},
  {"id":"M27","n":27,"name":"Muslo derecho","zone":"torso","x":0.4,"y":0.63,"side":"front","dense":false,"state":"new","item":"Fronting"},
  {"id":"M28","n":28,"name":"Muslo izquierdo","zone":"torso","x":0.6,"y":0.63,"side":"front","dense":false,"state":"new","item":"Emphatic do"},
  {"id":"M29","n":29,"name":"Rodilla derecha","zone":"torso","x":0.405,"y":0.752,"side":"front","dense":false,"state":"new","item":"Ellipsis"},
  {"id":"M30","n":30,"name":"Rodilla izquierda","zone":"torso","x":0.595,"y":0.752,"side":"front","dense":false,"state":"new","item":"Substitution: so / not / one"},
  {"id":"M31","n":31,"name":"Espinilla derecha","zone":"torso","x":0.41,"y":0.84,"side":"front","dense":false,"state":"new","item":"Participle clauses"},
  {"id":"M32","n":32,"name":"Espinilla izquierda","zone":"torso","x":0.59,"y":0.84,"side":"front","dense":false,"state":"new","item":"Purpose clauses"},
  {"id":"M33","n":33,"name":"Tobillo derecho","zone":"torso","x":0.39,"y":0.93,"side":"front","dense":false,"state":"new","item":"Concesión: although / despite"},
  {"id":"M34","n":34,"name":"Tobillo izquierdo","zone":"torso","x":0.61,"y":0.93,"side":"front","dense":false,"state":"new","item":"As if / as though"},
  {"id":"M35","n":35,"name":"Pie derecho","zone":"torso","x":0.42,"y":0.972,"side":"front","dense":false,"state":"new","item":"Subjunctive"},
  {"id":"M36","n":36,"name":"Pie izquierdo","zone":"torso","x":0.58,"y":0.972,"side":"front","dense":false,"state":"new","item":"Hedging & distancing"},
  {"id":"M37","n":37,"name":"Nuca","zone":"piernas","x":0.5,"y":0.15,"side":"back","dense":false,"state":"new","item":"Prefixes"},
  {"id":"M38","n":38,"name":"Omóplato izquierdo","zone":"piernas","x":0.32,"y":0.26,"side":"back","dense":false,"state":"new","item":"Suffixes"},
  {"id":"M39","n":39,"name":"Omóplato derecho","zone":"piernas","x":0.68,"y":0.26,"side":"back","dense":false,"state":"new","item":"Noun formation"},
  {"id":"M40","n":40,"name":"Columna alta","zone":"piernas","x":0.5,"y":0.3,"side":"back","dense":false,"state":"new","item":"Compound adjectives"},
  {"id":"M41","n":41,"name":"Columna media","zone":"piernas","x":0.5,"y":0.38,"side":"back","dense":false,"state":"new","item":"Formal vs informal register"},
  {"id":"M42","n":42,"name":"Lumbar","zone":"piernas","x":0.5,"y":0.46,"side":"back","dense":false,"state":"new","item":"Discourse markers"},
  {"id":"M43","n":43,"name":"Nalga izquierda","zone":"piernas","x":0.42,"y":0.56,"side":"back","dense":false,"state":"new","item":"Indirect questions"},
  {"id":"M44","n":44,"name":"Nalga derecha","zone":"piernas","x":0.58,"y":0.56,"side":"back","dense":false,"state":"new","item":"There / it como sujeto"},
  {"id":"M45","n":45,"name":"Corva izquierda","zone":"piernas","x":0.405,"y":0.75,"side":"back","dense":false,"state":"new","item":"All / both / either"},
  {"id":"M46","n":46,"name":"Corva derecha","zone":"piernas","x":0.595,"y":0.75,"side":"back","dense":false,"state":"new","item":"Neither / nor"},
  {"id":"M47","n":47,"name":"Pantorrilla izquierda","zone":"piernas","x":0.41,"y":0.82,"side":"back","dense":false,"state":"new","item":"Question words + -ever"},
  {"id":"M48","n":48,"name":"Pantorrilla derecha","zone":"piernas","x":0.59,"y":0.82,"side":"back","dense":false,"state":"new","item":"Numbers & fractions"},
  {"id":"M49","n":49,"name":"Talón izquierdo","zone":"piernas","x":0.42,"y":0.97,"side":"back","dense":false,"state":"new","item":"Punctuation & commas"},
  {"id":"M50","n":50,"name":"Talón derecho","zone":"piernas","x":0.58,"y":0.97,"side":"back","dense":false,"state":"new","item":"Errores típicos C1"}
];
export const R10 = [10, 1440, 4320, 10080, 20160, 43200, 86400, 129600, 259200, 525600]; // minutos
export const NOW = new Date(2026, 9, 14, 19, 40);
export const PREF_HOUR = 8;
export const CARDS = [
  {
    id: 'i-pp', palace: 'c1', locusId: 'L8', deck: 'Gramática C1', template: 'Gramática C1', stage: 2,
    title: 'Present Perfect', anchor: { emoji: '🌉', text: 'Puente pasado→presente' },
    scene: [
      { e: '🌉', t: 'Puente', r: 'une pasado y presente' },
      { e: '🎩', t: 'Sombrero «HAVE/HAS»', r: 'auxiliar' },
      { e: '🏃', t: 'Corredor con dorsal', r: 'past participle' },
      { e: '🪦', t: 'Lápida «yesterday» rota', r: 'error típico', img: true },
      { e: '🧳', t: 'Maletas «gone/been»', r: 'excepción' },
    ],
    blocks: [
      { type: 'text', label: 'Regla', text: 'Conecta una acción pasada con el presente: importa el resultado o la experiencia, no el momento.' },
      { type: 'formula', text: 'S + have/has + past participle' },
      { type: 'table', label: 'Conjugación · work', cols: ['', 'Afirmativa', 'Contracción', 'Negativa', 'Interrogativa', 'Resp. corta'], rows: [
        ['I', 'I have worked', "I've worked", "I haven't worked", 'Have I worked?', 'Yes, I have.'],
        ['you/we/they', 'You have worked', "You've worked", "You haven't worked", 'Have you worked?', 'Yes, you have.'],
        ['he/she/it', 'She has worked', "She's worked", "She hasn't worked", 'Has she worked?', 'Yes, she has.'],
      ] },
      { type: 'example', en: ['I ', 'have never been', ' to Japan.'], es: ['', 'Nunca he estado', ' en Japón.'] },
      { type: 'example', en: ['She ', 'has just finished', ' the report.'], es: ['', 'Acaba de terminar', ' el informe.'] },
      { type: 'error', bad: 'I have seen him yesterday.', good: 'I saw him yesterday.', note: 'Con un tiempo terminado (yesterday, last week, in 2019) se usa Past Simple.' },
      { type: 'tip', text: 'Si puedes añadir «hasta ahora» sin cambiar el sentido, casi seguro es Present Perfect.' },
    ],
  },
  {
    id: 'i-pc', palace: 'c1', locusId: 'L2', deck: 'Gramática C1', template: 'Gramática C1', stage: 4,
    title: 'Present Continuous', anchor: { emoji: '📺', text: 'Pantalla encendida en la frente' },
    scene: [
      { e: '📺', t: 'Pantalla en directo', r: 'acción en curso' },
      { e: '🔧', t: 'Llave «BE»', r: 'am/is/are' },
      { e: '🌀', t: 'Espiral «-ing»', r: 'gerundio' },
    ],
    blocks: [
      { type: 'text', label: 'Regla', text: 'Acciones en progreso ahora o en un periodo actual, y planes ya decididos.' },
      { type: 'formula', text: 'S + am/is/are + verb-ing' },
      { type: 'example', en: ["I'm ", 'working', ' from home this week.'], es: ['', 'Estoy trabajando', ' desde casa esta semana.'] },
      { type: 'error', bad: "I'm knowing the answer.", good: 'I know the answer.', note: 'Los stative verbs (know, want, believe) no suelen ir en continuo.' },
    ],
  },
  {
    id: 'i-wonder', palace: 'f45', locusId: 'S10', deck: 'Vocabulario EN', template: 'Vocabulario', stage: 1,
    title: 'to wonder', anchor: { emoji: '👅', text: 'Lengua corta: /ʌ/ de cup' },
    scene: [
      { e: '🔮', t: 'Bola de cristal', r: 'preguntarse' },
      { e: '🌌', t: 'Cielo estrellado', r: 'asombrarse' },
    ],
    blocks: [
      { type: 'word', word: 'to wonder', ipa: '/ˈwʌn.dər/', tr: 'preguntarse · asombrarse' },
      { type: 'example', en: ['I ', 'wonder', " if she'll come."], es: ['Me ', 'pregunto', ' si vendrá.'] },
      { type: 'tip', text: 'No confundir con to wander /ˈwɒn.dər/: vagar, deambular.' },
    ],
  },
  {
    id: 'i-inv', palace: 'c2', locusId: 'M23', deck: 'Gramática C1', template: 'Gramática C1', stage: 3,
    title: 'Inversión tras adverbios negativos', anchor: { emoji: '🙃', text: 'Abdomen boca abajo' },
    scene: [
      { e: '🙃', t: 'Figura invertida', r: 'auxiliar antes del sujeto' },
      { e: '🚫', t: 'Señal «Never»', r: 'adverbio negativo al inicio' },
      { e: '🎭', t: 'Máscara de teatro', r: 'registro formal / literario' },
    ],
    blocks: [
      { type: 'text', label: 'Regla', text: 'Con un adverbio negativo o restrictivo al principio, el auxiliar va antes del sujeto, como en una pregunta.' },
      { type: 'formula', text: 'Never / Rarely / Not only + aux + S + V' },
      { type: 'example', en: ['', 'Never have I seen', ' such a mess.'], es: ['', 'Nunca he visto', ' semejante desorden.'] },
      { type: 'example', en: ['', 'Not only did she win', ', she broke the record.'], es: ['', 'No solo ganó', ', batió el récord.'] },
      { type: 'error', bad: 'Never I have seen such a mess.', good: 'Never have I seen such a mess.', note: 'Sin inversión la frase es agramatical en este registro.' },
    ],
  },
  {
    id: 'i-ship', palace: 'f45', locusId: 'S2', deck: 'Fonética EN', template: 'Libre', stage: 6, queue: false,
    title: '/iː/ vs /ɪ/ · sheep, ship', anchor: { emoji: '🐑', text: 'Oveja en la frente' },
    scene: [
      { e: '🐑', t: 'Oveja larga', r: '/iː/ larga · sheep' },
      { e: '⛵', t: 'Barco corto', r: '/ɪ/ corta · ship' },
    ],
    blocks: [
      { type: 'answer', text: '/iː/ larga · /ɪ/ corta', sub: 'sheep /ʃiːp/ · ship /ʃɪp/' },
      { type: 'text', label: 'Nota', text: 'El español solo tiene una /i/: alarga y tensa los labios en /iː/, relájalos en /ɪ/.' },
    ],
  },
];
export const FORECAST = [
  { d: 'Hoy', n: 10 }, { d: 'Jue', n: 7 }, { d: 'Vie', n: 3 }, { d: 'Sáb', n: 12 }, { d: 'Dom', n: 5 }, { d: 'Lun', n: 8 }, { d: 'Mar', n: 4 },
];
// Plantilla «Estándar 45» — orden de ruta fijo (cabeza → pies → espalda)
export const STD45_ZONES = [
  { id: 'cabeza', name: 'Cabeza · Vocales' },
  { id: 'brazos', name: 'Cuello y brazos · Diptongos y oclusivas' },
  { id: 'torso', name: 'Tronco · Oclusivas y africadas' },
  { id: 'piernas', name: 'Piernas y pies · Fricativas y nasales' },
  { id: 'hombros', name: 'Parte posterior · Aproximantes y acento' },
];
const PH = ['/iː/ · sheep','/ɪ/ · ship','/ʊ/ · book','/uː/ · food','/e/ · bed','/ə/ · about','/ɜː/ · bird','/ɔː/ · door','/æ/ · cat','/ʌ/ · cup','/ɑː/ · car','/ɒ/ · hot',
 '/eɪ/ · day','/aɪ/ · my','/ɔɪ/ · boy','/əʊ/ · go','/aʊ/ · now','/ɪə/ · near','/eə/ · hair','/ʊə/ · tour','/p/ · pen','/b/ · bad','/t/ · tea','/d/ · dog','/k/ · cat',
 '/g/ · go','/tʃ/ · chair','/dʒ/ · jam','/f/ · fish','/v/ · van','/θ/ · think','/ð/ · this','/s/ · sun','/z/ · zoo','/ʃ/ · she','/ʒ/ · vision','/h/ · hat','/m/ · man','/n/ · no',
 '/ŋ/ · sing','/l/ · leg','/r/ · red','/w/ · wet','/j/ · yes','Acento y ritmo · ˈ ˌ'];
const PHS = n => n === 10 ? 'due' : n === 8 ? 'mastered' : n <= 9 ? 'review' : n <= 15 ? 'learning' : 'new';
const S = (n, name, zone, x, y, side = 'front', dense = false) => ({ id: 'S' + n, n, name, zone, x, y, side, dense, state: PHS(n), item: PH[n - 1] });
export const STD45 = [
  S(1, 'Pelo / Cabello', 'cabeza', .5, .016, 'front', true), S(2, 'Frente', 'cabeza', .5, .043, 'front', true), S(3, 'Cejas', 'cabeza', .44, .06, 'front', true),
  S(4, 'Pestañas', 'cabeza', .56, .07, 'front', true), S(5, 'Ojos', 'cabeza', .44, .078, 'front', true), S(6, 'Nariz', 'cabeza', .5, .092, 'front', true),
  S(7, 'Bigote', 'cabeza', .5, .105, 'front', true), S(8, 'Labios', 'cabeza', .5, .116, 'front', true), S(9, 'Dientes', 'cabeza', .45, .121, 'front', true),
  S(10, 'Lengua', 'cabeza', .55, .121, 'front', true), S(11, 'Garganta', 'cabeza', .5, .146, 'front', true), S(12, 'Mentón', 'cabeza', .5, .132, 'front', true),
  S(13, 'Mejillas', 'cabeza', .41, .1, 'front', true), S(14, 'Sien', 'cabeza', .4, .058, 'front', true), S(15, 'Orejas', 'cabeza', .6, .086, 'front', true),
  S(16, 'Cuello / Tráquea', 'brazos', .47, .172), S(17, 'Hombros', 'brazos', .27, .205), S(18, 'Axila', 'brazos', .32, .285),
  S(19, 'Bíceps', 'brazos', .225, .33), S(20, 'Codo', 'brazos', .19, .415), S(21, 'Antebrazo', 'brazos', .175, .49),
  S(22, 'Muñeca', 'brazos', .155, .56), S(23, 'Nudillos', 'brazos', .14, .6), S(24, 'Uñas', 'brazos', .155, .628), S(25, 'Palma de la mano', 'brazos', .83, .6),
  S(26, 'Pecho', 'torso', .4, .255), S(27, 'Costillas', 'torso', .62, .33), S(28, 'Ombligo', 'torso', .5, .43), S(29, 'Barriga / Abdomen', 'torso', .41, .4), S(30, 'Genitales', 'torso', .5, .535),
  S(31, 'Muslo', 'piernas', .4, .63), S(32, 'Rodilla', 'piernas', .405, .752), S(33, 'Tibia / Espinilla / Canilla', 'piernas', .41, .83), S(34, 'Tobillo', 'piernas', .39, .925),
  S(35, 'Empeine', 'piernas', .42, .955), S(36, 'Dedo pequeño del pie / Meñique', 'piernas', .35, .978), S(37, 'Planta del pie', 'piernas', .44, .99, 'back'),
  S(38, 'Talón', 'piernas', .37, .955, 'back'), S(39, 'Pantorrilla', 'piernas', .4, .82, 'back'),
  S(40, 'Nalgas', 'hombros', .42, .57, 'back'), S(41, 'Cadera', 'hombros', .665, .5), S(42, 'Cintura', 'hombros', .67, .43, 'back'),
  S(43, 'Columna', 'hombros', .5, .34, 'back'), S(44, 'Espalda', 'hombros', .36, .26, 'back'), S(45, 'Nuca', 'hombros', .5, .15, 'back'),
];
// Estilos de cuerpo personalizables (Palace.style)
export const BODIES = [
  { id: 'c1', name: 'Cuerpo 1 · Verbal + Nominal', base: 'Gramática C1', points: 50, style: { hair: 'short', hairColor: 'oklch(0.62 0.06 60)', line: 'fine', skin: 'arena', facial: 'stache', accent: 'cabeza', detail: 'full' } },
  { id: 'c2', name: 'Cuerpo 2 · Oración + Discurso', base: 'Gramática C1', points: 50, style: { hair: 'long', hairColor: 'oklch(0.45 0.05 40)', line: 'fine', skin: 'canela', glasses: true, accent: 'torso', detail: 'full', draw: 'lapiz' } },
  { id: 'f45', name: 'Fonética · Estándar 45', base: 'Estándar 45', points: 45, style: { hair: 'curly', hairColor: 'oklch(0.70 0.08 300)', line: 'bold', skin: 'plano', accent: 'hombros', detail: 'med', draw: 'neon' } },
];

export const PALACES = [
  { id: 'c1', name: 'Cuerpo 1 · Verbal + Nominal', short: 'C1', template: 'Gramática 50', loci: LOCI, zones: ZONES, style: BODIES[0].style },
  { id: 'c2', name: 'Cuerpo 2 · Oración + Discurso', short: 'C2', template: 'Gramática 50', loci: LOCI_C2, zones: ZONES_C2, style: BODIES[1].style },
  { id: 'f45', name: 'Fonética · Estándar 45', short: 'F45', template: 'Estándar 45', loci: STD45, zones: STD45_ZONES, style: BODIES[2].style },
];
export const findLocus = id => PALACES.flatMap(p => p.loci).find(l => l.id === id);
export const palaceOf = id => PALACES.find(p => p.id === id);

// Palacios sin cuerpo: plano de casa (kind 'plan') e imagen propia (kind 'image')
export const HOUSE_ROOMS = [
  { plan: 'casa-1', label: 'Terraza', x: 0, y: 0, w: 80, h: 80, zone: 'piernas', lx: 5, ly: 77 }, { plan: 'casa-1', label: 'Baño', x: 0, y: 80, w: 80, h: 120, zone: 'hombros', lx: 6, ly: 195 },
  { plan: 'casa-1', label: 'Entrada', x: 0, y: 200, w: 80, h: 100, zone: 'cabeza', lx: 24, ly: 252 }, { plan: 'casa-1', label: 'Dormitorio', x: 80, y: 0, w: 170, h: 150, zone: 'hombros', lx: 104, ly: 144 },
  { plan: 'casa-1', label: 'Estudio', x: 250, y: 0, w: 150, h: 150, zone: 'piernas', lx: 256, ly: 145 }, { plan: 'casa-1', label: 'Salón', x: 80, y: 150, w: 170, h: 150, zone: 'brazos', lx: 198, ly: 291 },
  { plan: 'casa-1', label: 'Cocina', x: 250, y: 150, w: 150, h: 150, zone: 'torso', lx: 256, ly: 168 },
];
export const HOUSE_ZONES = [
  { id: 'cabeza', name: 'Entrada' }, { id: 'brazos', name: 'Salón' }, { id: 'torso', name: 'Cocina' },
  { id: 'hombros', name: 'Zona de noche · baño y dormitorio' }, { id: 'piernas', name: 'Estudio y terraza' },
];
const H = (n, name, zone, x, y, item, state = 'new') => ({ id: 'H' + n, n, name, zone, x, y, side: 'front', state, item });
export const HOUSE = [
  H(1, 'Puerta', 'cabeza', .1, .98, 'come in', 'review'), H(2, 'Perchero', 'cabeza', .03, .783, 'hang up', 'review'), H(3, 'Espejo', 'cabeza', .1075, .687, 'look at', 'learning'),
  H(4, 'Sofá', 'brazos', .375, .92, 'sit down', 'review'), H(5, 'Televisión', 'brazos', .4, .527, 'turn on', 'due'), H(6, 'Lámpara', 'brazos', .245, .567, 'switch off', 'learning'), H(7, 'Estantería', 'brazos', .61, .637, 'put away'),
  H(8, 'Nevera', 'torso', .96, .553, 'run out of'), H(9, 'Fogones', 'torso', .965, .72, 'heat up'), H(10, 'Fregadero', 'torso', .7975, .96, 'wash up'), H(11, 'Mesa', 'torso', .7625, .717, 'clear up'),
  H(12, 'Lavabo', 'hombros', .156, .307, 'brush up on'), H(13, 'Ducha', 'hombros', .055, .34, 'freshen up'), H(14, 'Cama', 'hombros', .4125, .2, 'lie down'), H(15, 'Armario', 'hombros', .229, .353, 'try on'),
  H(16, 'Mesilla', 'hombros', .521, .048, 'set off (alarma)'), H(17, 'Ventana', 'hombros', .295, .012, 'look out'),
  H(18, 'Escritorio', 'piernas', .945, .35, 'get down to'), H(19, 'Ordenador', 'piernas', .956, .23, 'log in'), H(20, 'Librería', 'piernas', .745, .033, 'look up'),
  H(21, 'Maceta', 'piernas', .04, .053, 'grow up'), H(22, 'Tendedero', 'piernas', .1375, .15, 'hang out'),
];
export const ROUTE_ZONES = [{ id: 'cabeza', name: 'Barrio' }, { id: 'torso', name: 'Centro' }, { id: 'brazos', name: 'Trabajo' }];
const RT = (n, name, zone, x, y, item) => ({ id: 'R' + n, n, name, zone, x, y, side: 'front', state: 'new', item });
export const ROUTE = [
  RT(1, 'Portal', 'cabeza', .08, .82, 'however'), RT(2, 'Panadería', 'cabeza', .22, .62, 'moreover'), RT(3, 'Parada de bus', 'cabeza', .36, .78, 'therefore'),
  RT(4, 'Semáforo', 'torso', .5, .55, 'whereas'), RT(5, 'Parque', 'torso', .62, .3, 'nonetheless'), RT(6, 'Puente', 'torso', .74, .5, 'thus'),
  RT(7, 'Kiosco', 'brazos', .84, .25, 'meanwhile'), RT(8, 'Oficina', 'brazos', .93, .12, 'consequently'),
];
PALACES.push(
  { id: 'casa', name: 'Mi casa · Phrasal verbs', short: 'Casa', template: 'Plano de casa', kind: 'plan', aspect: 4 / 3, rooms: HOUSE_ROOMS, loci: HOUSE, zones: HOUSE_ZONES, style: { accent: 'brazos', line: 'fine' } },
  { id: 'ruta', name: 'Ruta al trabajo · Conectores', short: 'Ruta', template: 'Imagen propia', kind: 'image', aspect: 3 / 2, imageId: 'palace-ruta', loci: ROUTE, zones: ROUTE_ZONES, style: { accent: 'torso', line: 'fine' } },
);

PALACES.push(...HOUSES);
export { HOUSES };
