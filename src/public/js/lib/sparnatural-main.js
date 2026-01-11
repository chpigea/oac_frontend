//
// Place any custom JS here
//

// reference to the sparnatural webcomponent
const sparnatural = document.querySelector("spar-natural");

/* =========================
   VIEW MODE (radio buttons)
========================= */

let viewMode = "direct";

document.querySelectorAll('input[name="viewMode"]').forEach(radio => {
  radio.addEventListener("change", e => {
    viewMode = e.target.value;
	sparnatural.enablePlayBtn();
    console.log("View mode:", viewMode);
  });
});

/* =========================
   INDAGINE RESOLVERS MAP
========================= */

const INDAGINE_RESOLVERS = {
  "crm:E39_Actor": {
    property: "crm:P14_carried_out_by"
  },
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
  }
};

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

yasqe.on("queryResponse", function (_yasqe, response, duration) {
  yasr.setResponse(response, duration);

	if (viewMode === "indagine") {
		resolvedIndagini.clear();
		const sparqlResponse = normalizeSparqlResponse(response);
		if (sparqlResponse) {
			resolveIndagini(sparqlResponse);
		}
	}


  sparnatural.enablePlayBtn();
});

/* =========================
   RESOLVER PIPELINE
========================= */

function resolveIndagini(response) {
  const uris = extractUrisFromResponse(response);

  console.log("URIs trovate:", uris);

  uris.forEach(uri => {
    resolveIndagineFromUri(uri);
  });
}

function resolveIndagineFromUri(uri) {
  const typeQuery = `
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>

SELECT DISTINCT ?type
WHERE {
  <${uri}> rdf:type ?type .
}
LIMIT 10
`;

  fetchSparql(typeQuery).then(data => {
    const types = data.results.bindings
	.map(b => normalizeRdfType(b.type.value))
	.filter(Boolean);

	console.log("Tipi normalizzati:", types);

	types.forEach(t => {
	const resolver = INDAGINE_RESOLVERS[t];
	if (!resolver) return;

	const q = buildResolverQuery(uri, resolver.property);
	fetchIndagini(q);
	});

  });
}

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
