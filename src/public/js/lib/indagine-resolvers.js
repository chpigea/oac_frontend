// =============================================================
// indagine-resolvers.js
// Resolver semantici: da qualsiasi oggetto del dominio → Indagine
// =============================================================
// NOTA:
// - Questo file è PURA configurazione semantica
// - Nessuna logica applicativa
// - Ogni resolver usa pattern ROBUSTI (no URI fissi)
// - L'Indagine è riconosciuta tramite:
//     ?indagine crm:P2_has_type ?t .
//     ?t indagine:tipo_indagine ?x .
// =============================================================

window.INDAGINE_RESOLVERS = {

  // ===========================================================
  // ATTORI
  // ===========================================================
  "crm:E39_Actor": [

    // Attore direttamente sull'indagine
    {
      description: "Attore diretto dell'indagine",
      query: uri => `
PREFIX crm: <http://www.cidoc-crm.org/cidoc-crm/>
PREFIX indagine: <http://indagine/>

SELECT DISTINCT ?indagine
WHERE {
  ?indagine crm:P14_carried_out_by <${uri}> ;
            crm:P2_has_type ?t .
  ?t indagine:tipo_indagine ?x .
}
`
    },

    // Attore dell'attività diagnostica
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
  ?t indagine:tipo_indagine ?x .
}
`
    }
  ],

  // ===========================================================
  // ATTIVITÀ DIAGNOSTICA (E7 non Indagine)
  // ===========================================================
  "crm:E7_Activity": [
    {
      description: "Attività diagnostica → Indagine",
      query: uri => `
PREFIX crm: <http://www.cidoc-crm.org/cidoc-crm/>
PREFIX indagine: <http://indagine/>

SELECT DISTINCT ?indagine
WHERE {
  ?indagine crm:P134_continued <${uri}> ;
            crm:P2_has_type ?t .
  ?t indagine:tipo_indagine ?x .
}
`
    }
  ],

  // ===========================================================
  // CAMPIONI
  // ===========================================================
  "crmsci:S13_Sample": [
    {
      description: "Campione → Diagnostica → Indagine",
      query: uri => `
PREFIX crm: <http://www.cidoc-crm.org/cidoc-crm/>
PREFIX indagine: <http://indagine/>

SELECT DISTINCT ?indagine
WHERE {
  ?diagnostica crm:P46_is_composed_of <${uri}> .

  ?indagine crm:P134_continued ?diagnostica ;
            crm:P2_has_type ?t .
  ?t indagine:tipo_indagine ?x .
}
`
    }
  ],

  // ===========================================================
  // LUOGHI
  // ===========================================================
  "crm:E53_Place": [
    {
      description: "Luogo → Diagnostica → Indagine",
      query: uri => `
PREFIX crm: <http://www.cidoc-crm.org/cidoc-crm/>
PREFIX indagine: <http://indagine/>

SELECT DISTINCT ?indagine
WHERE {
  ?diagnostica crm:P7_took_place_at <${uri}> .

  ?indagine crm:P134_continued ?diagnostica ;
            crm:P2_has_type ?t .
  ?t indagine:tipo_indagine ?x .
}
`
    }
  ],

  // ===========================================================
  // TECNICHE / PROCEDURE
  // ===========================================================
  "crm:E29_Design_or_Procedure": [
    {
      description: "Tecnica → Diagnostica → Indagine",
      query: uri => `
PREFIX crm: <http://www.cidoc-crm.org/cidoc-crm/>
PREFIX indagine: <http://indagine/>

SELECT DISTINCT ?indagine
WHERE {
  ?diagnostica crm:P33_used_specific_technique <${uri}> .

  ?indagine crm:P134_continued ?diagnostica ;
            crm:P2_has_type ?t .
  ?t indagine:tipo_indagine ?x .
}
`
    }
  ],

  // ===========================================================
  // TEMPO (TIME-SPAN)
  // ===========================================================
  "crmsci:E52_Time-span": [
    {
      description: "Tempo → Diagnostica → Indagine",
      query: uri => `
PREFIX crm: <http://www.cidoc-crm.org/cidoc-crm/>
PREFIX crmsci: <http://www.cidoc-crm.org/extensions/crmsci/>
PREFIX indagine: <http://indagine/>

SELECT DISTINCT ?indagine
WHERE {
  ?diagnostica crm:P160_has_temporal_projection <${uri}> .

  ?indagine crm:P134_continued ?diagnostica ;
            crm:P2_has_type ?t .
  ?t indagine:tipo_indagine ?x .
}
`
    }
  ],

  // ===========================================================
  // IDENTIFICATORI / DOCUMENTI
  // ===========================================================
  "crm:E42_Identifier": [
    {
      description: "Identificatore → Indagine",
      query: uri => `
PREFIX crm: <http://www.cidoc-crm.org/cidoc-crm/>
PREFIX indagine: <http://indagine/>

SELECT DISTINCT ?indagine
WHERE {
  ?indagine crm:P48_has_preferred_identifier <${uri}> ;
            crm:P2_has_type ?t .
  ?t indagine:tipo_indagine ?x .
}
`
    }
  ]
};

// =============================================================
// FINE FILE
// =============================================================