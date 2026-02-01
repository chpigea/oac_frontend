
//
// Place any custom JS here
//

// reference to the sparnatural webcomponent
const sparnatural = document.querySelector("spar-natural");
// 🔥 RESET risultati YASR (evita risultati "fantasma" da localStorage)
Object.keys(localStorage)
  .filter(k => k.startsWith("yasr"))
  .forEach(k => localStorage.removeItem(k));

/* =========================
   VIEW MODE (radio buttons)
========================= */

let viewMode = "direct";

// cache risultati
let directResults = null;        // risposta SPARQL originale
let indaginiResults = null;      // risposta SPARQL costruita



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

  directResults = normalized;
  yasr.setResponse(directResults, duration);

  // SEMPRE Postgres
  resolveIndaginiPostgres(normalized, runId);
});



/* =========================
   RESOLVER POSTGRESQL
========================= */



function updateView() {
  if (viewMode === "direct") {
    yasr.setResponse(directResults ?? emptyResponse("Nessun risultato"));
  } else if (viewMode === "indagine") {
    yasr.setResponse(indaginiResults ?? emptyResponse("Calcolo in corso..."));
  }
}




async function resolveIndaginiPostgres(response, runId) {
  const tokens = extractSearchTokens(response);

  if (!tokens.length) {
    indaginiResults = emptyResponse("Nessuna indagine collegata");
    return;
  }

  try {
    const res = await fetch('/backend/ontology/form/searchindagini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tokens
      })
    });

    const data = await res.json();

    if (!data.success || !data.data.length) {
      indaginiResults = emptyResponse("Nessuna indagine collegata");
      return;
    }

    
    const bindings = data.data.map(row => ({
      Indagine: {
          type: "uri",
          value: "http://indagine/" + row.uuid
        },
        Indagine_label: {
          type: "literal",
          value: row.label || row.uuid
        }
    }));

    indaginiResults = {
      head: { vars: ["Indagine"] },
      results: { bindings }
    };

    if (viewMode === "indagine" && runId === currentRunId) {
      yasr.setResponse(indaginiResults);
    }

  } catch (e) {
    console.error(e);
    indaginiResults = emptyResponse("Errore risoluzione indagini");
  }
}

function extractSearchTokens(response) {
  const vars = response.head?.vars || [];
  const results = response.results?.bindings || [];
  const tokens = new Set();

  results.forEach(row => {
    vars.forEach(v => {
      const cell = row[v];
      if (!cell) return;

      if (cell.type === "uri") {
        tokens.add(cell.value);
        // aggiungi anche uuid puro
        const uuid = cell.value.split('/').pop();
        if (uuid) tokens.add(uuid);
      }

      if (cell.type === "literal") {
        tokens.add(cell.value);
      }
    });
  });

  return [...tokens];
}


/* =========================
   SPARQL HELPERS
========================= */

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
