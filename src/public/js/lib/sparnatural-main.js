
//
// Place any custom JS here
//

// reference to the sparnatural webcomponent
const sparnatural = document.querySelector("spar-natural");

/* =========================
   VIEW MODE (radio buttons)
========================= */

let viewMode = "direct";

// cache risultati
let directResults = null;        // risposta SPARQL originale
let indaginiResults = null;      // risposta SPARQL costruita

let lastLiteralPredicate = null;


// per evitare race condition
let currentRunId = 0;

const emptyResponse = function(message) {
  return {
    head: { vars: [] },
    results: { bindings: [] },
    message: message
  };
}

document.querySelectorAll('input[name="viewMode"]').forEach(radio => {
  radio.addEventListener("change", e => {
    viewMode = e.target.value;
    updateView();
    sparnatural.enablePlayBtn();
    console.log("View mode:", viewMode);
  });
});

const INDAGINE_RESOLVERS =  window.INDAGINE_RESOLVERS;

/* =========================
   INDAGINE RESOLVERS MAP
========================= */
/*
const INDAGINE_RESOLVERS = {
"crm:E39_Actor": [

    // =====================================================
    // CASO 1: Attore direttamente collegato all'Indagine
    // =====================================================
    {
      description: "Attore diretto dell'indagine",
      query: uri => `
PREFIX crm: <http://www.cidoc-crm.org/cidoc-crm/>
PREFIX indagine: <http://indagine/>

SELECT DISTINCT ?indagine
WHERE {
  ?indagine crm:P14_carried_out_by <${uri}> ;
            crm:P2_has_type ?t .

  # riconoscimento Indagine (pattern robusto)
  ?t indagine:tipo_indagine ?x .
}
`
    },

    // =====================================================
    // CASO 2: Attore dell'attività diagnostica
    // =====================================================
    {
      description: "Attore dell'attività diagnostica",
      query: uri => `
PREFIX crm: <http://www.cidoc-crm.org/cidoc-crm/>
PREFIX indagine: <http://indagine/>

SELECT DISTINCT ?indagine
WHERE {
  ?diagnostica crm:P14_carried_out_by <${uri}> .

  ?indagine crm:P134_continued ?diagnostica ;
            crm:P2_has_type ?t .

  # riconoscimento Indagine (pattern robusto)
  ?t indagine:tipo_indagine ?x .
}
`
    }

  ],
  "crm:E42_Identifier": {
    property: "crm:P48_has_preferred_identifier"
  },
  "crm:E55_Type": {
    property: "crm:P2_has_type"
  },
  "base:I12_Adopted_Belief": {
    property: "crm:P17_was_motivated_by"
  },
  "j.0:S13_Sample": {
    property: "crm:P16_used_specific_object"
  },
  // 🆕 ATTIVITÀ DIAGNOSTICA
  "crm:E7_Activity": {
    property: "crm:P134_continued"
  }
};*/

/* =========================
   YASQE INIT
========================= */

const yasqe = new Yasqe(document.getElementById("yasqe"), {
  requestConfig: {
    endpoint: sparnatural.getAttribute("endpoint"),
    method: "GET",
    header: {}
  },
  copyEndpointOnNewTab: false
});

/* =========================
   YASR INIT
========================= */

Yasr.registerPlugin("TableX", SparnaturalYasguiPlugins.TableX);
Yasr.registerPlugin("Grid", SparnaturalYasguiPlugins.GridPlugin);
delete Yasr.plugins['table'];

const yasr = new Yasr(document.getElementById("yasr"), {
  pluginOrder: ["TableX", "Grid", "response"],
  defaultPlugin: "TableX"
});

yasr.plugins["TableX"].config.uriHrefAdapter = function (uri) {

  // modalità "indagine": link diretto al form SHACL
  if (viewMode === "indagine" && uri.startsWith("http://indagine/")) {
    const id = uri.split("/").pop();
    return `/frontend/investigation/view/${id}`;
  }

  // modalità "direct": comportamento attuale
  if (viewMode === "direct" && uri.startsWith("http://indagine/")) {
    return "/frontend/v2/rdf/view?iri=" + encodeURIComponent("<" + uri + ">");
  }

  // fallback
  return uri;
};


/* =========================
   QUERY RESPONSE HANDLER
========================= */

async function filterIndaginiOnly(response) {
  const uris = extractUrisFromResponse(response);
  if (!uris.length) return response;

  const values = uris.map(u => `(<${u}>)`).join(" ");

  const query = `
PREFIX crm: <http://www.cidoc-crm.org/cidoc-crm/>
PREFIX indagine: <http://indagine/>

SELECT DISTINCT ?indagine WHERE {
  VALUES (?indagine) { ${values} }

  ?indagine crm:P2_has_type ?t .
  ?t indagine:tipo_indagine ?x .
}
`;

  const data = await fetchSparql(query);
  const valid = new Set(
    data.results.bindings.map(b => b.indagine.value)
  );

  return {
    head: response.head,
    results: {
      bindings: response.results.bindings.filter(row =>
        Object.values(row).some(
          v => v.type === "uri" && valid.has(v.value)
        )
      )
    }
  };
}


yasqe.on("queryResponse", async function (_yasqe, response, duration) {
  const runId = ++currentRunId;

  const normalized = normalizeSparqlResponse(response);
  sparnatural.enablePlayBtn();

  if (!normalized) {
    directResults = null;
    indaginiResults = null;
    yasr.setResponse(emptyResponse("Risposta SPARQL non valida"), duration);
    return;
  }

  // 👉 capiamo UNA VOLTA SOLA che tipo di ricerca è
  const isIndagine = await isIndagineSearch(normalized);

  // risposta base
  let workingResults = normalized;

  // 👉 filtro SOLO SE ricerca Indagini
  if (isIndagine) {
    workingResults = await filterIndaginiOnly(normalized);
  }

  // aggiorno cache
  directResults = workingResults;

  // mostro direct
  yasr.setResponse(directResults, duration);

  // ---------------------------
  // VISTA INDAGINE
  // ---------------------------
  if (isIndagine) {
    indaginiResults = workingResults;

    if (viewMode === "indagine") {
      yasr.setResponse(indaginiResults);
    }
    return;
  }

  // ---------------------------
  // RISOLUZIONE DA ALTRI OGGETTI
  // ---------------------------
  const uris = extractUrisFromResponse(workingResults);

  if (uris.length > 0) {
    resolveIndagini(workingResults, runId);
  } else {
    resolveIndaginiFromLiteral(workingResults, runId);
  }
});



/*
yasqe.on("queryResponse", async function (_yasqe, response, duration) {
  const runId = ++currentRunId;

  const normalized = normalizeSparqlResponse(response);
  sparnatural.enablePlayBtn();

  if (!normalized) {
    directResults = null;
    indaginiResults = null;
    yasr.setResponse(emptyResponse("Risposta SPARQL non valida"), duration);
    return;
  }

  // salva risultati diretti
  directResults = normalized;

  // ✅ se è ricerca semplice INDAGINI, filtra SEMPRE
if (await isIndagineSearch(normalized)) {
  directResults = await filterIndaginiOnly(directResults);
}

  // mostra subito i diretti
  yasr.setResponse(directResults, duration);

  // calcola DERIVATE (in background)
  // CASO SPECIALE: ricerca INDAGINE
  if (await isIndagineSearch(normalized)) {

  // Tabella B = stessa risposta della A
    indaginiResults = normalized;

    if (viewMode === "indagine") {
      yasr.setResponse(indaginiResults);
    }

  } else {
    const uris = extractUrisFromResponse(normalized);

    if (uris.length > 0) {
      resolveIndagini(normalized, runId);
    } else {
      resolveIndaginiFromLiteral(normalized, runId);
    }
  }


});*/


/* =========================
   RESOLVER PIPELINE
========================= */

async function isIndagineSearch(response) {
  const uris = extractUrisFromResponse(response);
  if (!uris.length) return false;

  // sicurezza: tutte sotto namespace indagine
  if (!uris.every(u => u.startsWith("http://indagine/"))) {
    return false;
  }

  // controllo RDF type
  return await areAllIndaginiRoot(uris);
}

function updateView() {
  if (viewMode === "direct") {
    yasr.setResponse(directResults ?? emptyResponse("Nessun risultato"));
  } else if (viewMode === "indagine") {
    yasr.setResponse(indaginiResults ?? emptyResponse("Calcolo in corso..."));
  }
}

async function areAllIndaginiRoot(uris) {
  const values = uris.map(u => `(<${u}>)`).join(" ");

  const query = `
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX crm: <http://www.cidoc-crm.org/cidoc-crm/>
PREFIX indagine: <http://indagine/>

SELECT DISTINCT ?x WHERE {
  VALUES (?x) { ${values} }

  ?x rdf:type crm:E7_Activity ;
     crm:P2_has_type ?t .

  # 🔑 vero discriminante Indagine
  ?t indagine:tipo_indagine ?any .
}
`;

  const data = await fetchSparql(query);
  const bindings = data?.results?.bindings || [];

  // devono tornare TUTTE
  return bindings.length === uris.length;
}


/*
async function areAllIndaginiRoot(uris) {
  const values = uris.map(u => `(<${u}>)`).join(" ");

  const query = `
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX crm: <http://www.cidoc-crm.org/cidoc-crm/>

SELECT ?x ?type WHERE {
  VALUES (?x) { ${values} }

  ?x rdf:type crm:E7_Activity .

  # root = non deve essere continuazione di un'altra activity
  FILTER NOT EXISTS {
    ?parent crm:P134_continued ?x .
  }
}
`;

  const data = await fetchSparql(query);
  const bindings = data?.results?.bindings || [];

  // devono tornare TUTTE
  return bindings.length === uris.length;
}
*/


function resolveIndagini(response, runId) {
  const uris = extractUrisFromResponse(response);

  if (!uris.length) {
    indaginiResults = emptyResponse("Nessuna indagine collegata");
    return;
  }

  resolvedIndagini.clear();

  let pending = 0;

  uris.forEach(uri => {
    pending++;
    resolveIndagineFromUri(uri, runId, () => {
      pending--;
      if (pending === 0 && runId === currentRunId) {
        buildIndaginiResponse();
      }
    });
  });
}


function buildIndaginiResponse() {
  const bindings = Array.from(resolvedIndagini).map(uri => ({
    indagine: { type: "uri", value: uri }
  }));

  indaginiResults = bindings.length
    ? {
        head: { vars: ["indagine"] },
        results: { bindings }
      }
    : emptyResponse("Nessuna indagine collegata");

  // se l’utente è già in vista “indagine”, aggiorna subito
  if (viewMode === "indagine") {
    yasr.setResponse(indaginiResults);
  }
}

function resolveIndagineFromUri(uri, runId, done) {

  const typeQuery = `
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
SELECT DISTINCT ?type WHERE {
  <${uri}> rdf:type ?type .
}
`;

  fetchSparql(typeQuery).then(data => {

    const types = data.results.bindings
      .map(b => normalizeRdfType(b.type.value))
      .filter(Boolean);

    let innerPending = 0;

    types.forEach(t => {
      const resolvers = INDAGINE_RESOLVERS[t];
      if (!resolvers) return;

      resolvers.forEach(resolver => {
        innerPending++;

        const q = resolver.query(uri);

        fetchSparql(q).then(r => {
          r.results?.bindings?.forEach(b => {
            if (b.indagine?.type === "uri") {
              resolvedIndagini.add(b.indagine.value);
            }
          });
        }).finally(() => {
          innerPending--;
          if (innerPending === 0) done();
        });
      });
    });

    if (types.length === 0) done();
  });
}


/*
function resolveIndagineFromUri(uri, runId, done) {
  const typeQuery = `
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
SELECT DISTINCT ?type WHERE {
  <${uri}> rdf:type ?type .
}
`;

  fetchSparql(typeQuery).then(data => {
    const types = data.results.bindings
      .map(b => normalizeRdfType(b.type.value))
      .filter(Boolean);

    let innerPending = 0;

    types.forEach(t => {
      const resolver = INDAGINE_RESOLVERS[t];
      if (!resolver) return;

      innerPending++;
      const q = buildResolverQuery(uri, resolver.property);

      fetchSparql(q).then(r => {
        r.results?.bindings?.forEach(b => {
          if (b.indagine?.type === "uri") {
            resolvedIndagini.add(b.indagine.value);
          }
        });
      }).finally(() => {
        innerPending--;
        if (innerPending === 0) done();
      });
    });

    if (types.length === 0) done();
  });
}
*/

let resolvedIndagini = new Set();

function fetchIndagini(query) {
  fetchSparql(query).then(data => {
    const bindings = data.results?.bindings || [];

    bindings.forEach(b => {
      if (b.indagine?.type === "uri") {
        resolvedIndagini.add(b.indagine.value);
      }
    });

    // quando finiamo di risolvere, aggiorniamo la UI
    renderIndaginiResults();
  });
}

function renderIndaginiResults() {
  const bindings = Array.from(resolvedIndagini).map(uri => ({
    indagine: {
      type: "uri",
      value: uri
    }
  }));

  const fakeResponse = {
    head: {
      vars: ["indagine"]
    },
    results: {
      bindings
    }
  };

  console.log("SPARQL response (indagini):", fakeResponse);

  yasr.setResponse(fakeResponse);
}


/* =========================
   SPARQL HELPERS
========================= */

function resolveIndaginiFromLiteral(response, runId) {

  resolvedIndagini.clear();

  const vars = response.head.vars;
  const rows = response.results.bindings;

  if (!rows.length) {
    indaginiResults = emptyResponse("Nessuna indagine collegata");
    return;
  }

  // prendiamo il PRIMO literal (caso più comune)
  let literal = null;

  outer:
  for (const row of rows) {
    for (const v of vars) {
      if (row[v]?.type === "literal") {
        literal = row[v];
        break outer;
      }
    }
  }

  if (!literal) {
    indaginiResults = emptyResponse("Nessun valore utilizzabile");
    return;
  }

  const value = literal.value;
  const datatype = literal.datatype || "";

  console.log("Literal search:", value, datatype);

  // scegliamo la query in base al tipo
  let query = null;

  // -------------------------------
  // STRINGA
  // -------------------------------
  if (
    datatype === "http://www.w3.org/2001/XMLSchema#string" ||
    datatype === "" // spesso rdfs:label arriva senza datatype
  ) {
    query = buildIndagineFromStringQuery(value);
  }

  // -------------------------------
  // NUMERO
  // -------------------------------
  else if (
    datatype === "http://www.w3.org/2001/XMLSchema#integer" ||
    datatype === "http://www.w3.org/2001/XMLSchema#decimal" ||
    datatype === "http://www.w3.org/2001/XMLSchema#float"
  ) {
    query = buildIndagineFromNumberQuery(value);
  }

  // -------------------------------
  // DATA
  // -------------------------------
  else if (
    datatype === "http://www.w3.org/2001/XMLSchema#date" ||
    datatype === "http://www.w3.org/2001/XMLSchema#dateTime"
  ) {
    query = buildIndagineFromDateQuery(value, datatype);
  }

  if (!query) {
    indaginiResults = emptyResponse("Tipo di valore non supportato");
    return;
  }

  fetchSparql(query).then(data => {
    data.results?.bindings?.forEach(b => {
      if (b.indagine?.type === "uri") {
        resolvedIndagini.add(b.indagine.value);
      }
    });

    if (runId === currentRunId) {
      buildIndaginiResponse();
    }
  });
}


function buildIndagineFromStringQuery(value) {
  return `
PREFIX crm: <http://www.cidoc-crm.org/cidoc-crm/>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX indagine: <http://indagine/>

SELECT DISTINCT ?indagine
WHERE {
  ?indagine crm:P2_has_type indagine:E55TypeIndagine ;
            rdfs:label ?label .

  FILTER (
    CONTAINS(
      LCASE(STR(?label)),
      LCASE("${escapeSparqlString(value)}")
    )
  )
}
`;
}


function buildIndagineFromNumberQuery(value) {

  if (!lastLiteralPredicate) return null;

  return `
PREFIX crm: <http://www.cidoc-crm.org/cidoc-crm/>
PREFIX indagine: <http://indagine/>

SELECT DISTINCT ?indagine
WHERE {
  ?indagine crm:P2_has_type indagine:E55TypeIndagine ;
            ${lastLiteralPredicate} ?v .

  FILTER (?v = ${value})
}
`;
}



function buildIndagineFromDateQuery(value, datatype) {
  const dt = datatype.endsWith("dateTime")
    ? `"${value}"^^xsd:dateTime`
    : `"${value}"^^xsd:date`;

  return `
PREFIX crm: <http://www.cidoc-crm.org/cidoc-crm/>
PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
PREFIX indagine: <http://indagine/>

SELECT DISTINCT ?indagine
WHERE {
  ?indagine crm:P2_has_type indagine:E55TypeIndagine ;
            crm:P4_has_time-span ?ts .

  ?ts crm:P82a_begin_of_the_begin ${dt} .
}
`;
}


function escapeSparqlString(str) {
  return str.replace(/["\\]/g, "\\$&");
}



function fetchSparql(query) {
  const url =
    sparnatural.getAttribute("endpoint") +
    "?query=" + encodeURIComponent(query);

  return fetch(url).then(r => r.json());
}

function extractUrisFromResponse(response) {
  const vars = response.head.vars;
  const results = response.results.bindings;
  const uris = [];

  results.forEach(row => {
    vars.forEach(v => {
      if (row[v]?.type === "uri") {
        uris.push(row[v].value);
      }
    });
  });

  return [...new Set(uris)];
}


function normalizeSparqlResponse(response) {
  if (response?.head && response?.results) {
    return response; // già ok
  }

  if (typeof response?.text === "string") {
    try {
      return JSON.parse(response.text);
    } catch (e) {
      console.error("Errore parsing SPARQL JSON", response.text);
    }
  }

  console.warn("Formato response SPARQL non riconosciuto", response);
  return null;
}

function normalizeRdfType(uri) {
  if (!uri) return null;

  // CIDOC CRM
  if (uri.startsWith("http://www.cidoc-crm.org/cidoc-crm/")) {
    return "crm:" + uri.split("/").pop();
  }

  // CRMsci / j.0
  if (uri.startsWith("http://www.cidoc-crm.org/extensions/crmsci/")) {
    return "j.0:" + uri.split("/").pop();
  }

  // base CPM / CRMinf (adatta se necessario)
  if (uri.startsWith("http://ontome.net/ns/cpm/")) {
    return "base:" + uri.split("/").pop();
  }

  // fallback: ultimo frammento
  return uri.split("/").pop();
}

function extractLiteralPredicate(queryJson) {
  if (!queryJson?.where) return null;

  for (const w of queryJson.where) {
    if (w.value && typeof w.value === "string") {
      return w.property; // es. "indagine:costo"
    }
  }

  return null;
}


/* =========================
   SPARQL QUERY BUILDER
========================= */

function buildResolverQuery(uri, property) {
  return `
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX crm: <http://www.cidoc-crm.org/cidoc-crm/>

SELECT DISTINCT ?indagine
WHERE {
  ?indagine rdf:type crm:E7_Activity ;
            ${property} <${uri}> .
}
`;
}

/* =========================
   SPARNATURAL EVENTS
========================= */

sparnatural.addEventListener("init", (event) => {
  for (const plugin in yasr.plugins) {
    if (yasr.plugins[plugin].notifyConfiguration) {
      yasr.plugins[plugin].notifyConfiguration(event.detail.config);
    }
  }
});

sparnatural.addEventListener("queryUpdated", (event) => {
  const queryString = sparnatural.expandSparql(event.detail.queryString);
 
  const q = event.detail.queryJson;
  lastLiteralPredicate = extractLiteralPredicate(q);

  yasqe.setValue(queryString);
  console.log("Sparnatural JSON query:");
  console.dir(event.detail.queryJson);
});

sparnatural.addEventListener("submit", () => {
  sparnatural.disablePlayBtn();
  yasqe.query();
});

sparnatural.addEventListener("reset", () => {
  yasqe.setValue("");
});

/* =========================
   TOGGLE SPARQL EDITOR
========================= */

document.getElementById('sparql-toggle').onclick = function () {
  const el = document.getElementById('yasqe');
  el.style.display = el.style.display === 'none' ? 'block' : 'none';
  yasqe.refresh();
  return false;
};
