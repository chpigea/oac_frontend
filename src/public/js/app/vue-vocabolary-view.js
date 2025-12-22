const {createApp} = Vue;

const elementId = 'vocabolary-view';

const OAC_VOCABOLARIES = [
    { "name": "Condizioni ambientali", "key": "condizioni-ambientali", "class": "crm:E55_Type" },
    { "name": "Contesto", "key": "contesto", "class": "crm:E55_Type" },
    { "name": "Degrado", "key": "degrado", "class": "basecpm:CP42_Material_Decay" },
    { "name": "Descrizione del campione", "key": "descrizione-del-campione", "class": "crm:E55_Type" },
    { "name": "Competenza", "key": "competenza", "class": "crm:E39_Actor" },
    { "name": "Elemento costruttivo", "key": "elemento-costruttivo", "class": "crm:E55_Type" },
    { "name": "Fase di analisi", "key": "fase-di-analisi", "class": "crm:E55_Type" },
    { "name": "Quesito diagnostico", "key": "quesito-diagnostico", "class": "crm:E55_Type" },
    { "name": "Inquadramento cronologico", "key": "inquadramento-cronologico", "class": "crm:E55_Type" },
    { "name": "Luogo di analisi", "key": "luogo-di-analisi", "class": "crm:E55_Type" },
    { "name": "Materiale", "key": "materiale", "class": "crm:E55_Type" },
    { "name": "Medium", "key": "medium", "class": "crm:E55_Type" },
    { "name": "Modalità di indagine", "key": "modalita-di-indagine", "class": "crm:E55_Type" },
    { "name": "Unità di misura", "key": "unita-di-misura", "class": "crm:E58_Measurement_Unit" },
    { "name": "Output", "key": "output", "class": "crm:E55_Type" },
    { "name": "Preparazione campione", "key": "preparazione-campione", "class": "crm:E55_Type" },
    { "name": "Processo di campionamento", "key": "processo-di-campionamento", "class": "crm:E29_Design_or_Procedure" },
    { "name": "Strumentazione", "key": "strumentazione", "class": "crm:E55_Type" },
    { "name": "Tafonomia e stato di conservazione", "key": "tafonomia-e-stato-di-conservazione", "class": "crm:E55_Type" },
    { "name": "Tecnica diagnostica", "key": "tecnica-diagnostica", "class": "crm:E55_Type" },
    { "name": "Tipo campione", "key": "tipo-campione", "class": "crm:E55_Type" },
    { "name": "Tipo indagine", "key": "tipo-indagine", "class": "crm:E55_Type" },
    { "name": "Tipologia inquadramento cronologico", "key": "tipologia-inquadramento-cronologico", "class": "base:I2_Belief" },
    { "name": "Input", "key": "input", "class": "crm:E55_Type" },
    { "name": "Dissesti strutturali", "key": "dissesti-strutturali", "class": "basecpm:CP43_Structural_Damage" },
    { "name": "Natura oggetto", "key": "natura-oggetto", "class": "crm:E55_Type" }
];  

OAC_VOCABOLARIES.sort((a, b) => {
  const nameA = a.name.toUpperCase(); 
  const nameB = b.name.toUpperCase(); 
  if (nameA < nameB)
    return -1; // A viene prima di B
  if (nameA > nameB)
    return 1; // B viene prima di A
  return 0; // i nomi sono uguali
});

document.addEventListener('DOMContentLoaded', () => {
    const el = document.getElementById(elementId);

    const app = createApp({
        delimiters: ['{@', '@}'],
        data() {
            return {
                root: el.dataset.root,
                messages: {
                    terms: el.dataset.lang_terms    
                },
                vocabolary: null,
                vocabolaries: OAC_VOCABOLARIES,
                exposed: {
                    protocol: "http",
                    host: "127.0.0.1",
                    port: "9000"                                
                },
                shapes: `@prefix sh:   <http://www.w3.org/ns/shacl#> .
                @prefix ex:   <http://example.org/shapes/> .
                @prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
                @prefix xsd:  <http://www.w3.org/2001/XMLSchema#> .
                @prefix owl:  <http://www.w3.org/2002/07/owl#> .
                @prefix dcterms: <http://purl.org/dc/terms/> .
                @prefix crm:  <http://www.cidoc-crm.org/cidoc-crm/> .
                @prefix basecpm: <http://ontome.net/ns/cpm/> .
                @prefix base: <http://www.ics.forth.gr/isl/CRMinf/> .

                ex:Vocab_Shape
                a sh:NodeShape ;
                sh:targetClass __CLASS__ ;
                sh:property [
                    sh:class        owl:Class ;
                    sh:path         crm:P127_has_broader_term ;
                    owl:imports <OAC_EXPOSED_PROTOCOL://OAC_EXPOSED_HOST:OAC_EXPOSED_PORT/backend/fuseki/get-vocabolary-terms/__KEY__> ;
                    sh:name "__NAME__" ;
                    sh:minCount 0 ; 
                    sh:maxCount 1 ;
                ] .
                `
            }    
        },
        mounted() { 
            this.getExposedConfig();
        },
        computed:{ 
            selectedShapes(){
               var _class = this.vocabolary.class || "crm:E55_Type"
               return this.shapes
                .replace("OAC_EXPOSED_PROTOCOL", this.exposed.protocol)
                .replace("OAC_EXPOSED_HOST", this.exposed.host)
                .replace("OAC_EXPOSED_PORT", this.exposed.port)
                .replace("__NAME__", this.messages.terms + ":")
                .replace("__CLASS__", _class)
                .replace("__KEY__", this.vocabolary.key); 
            }
        },
        methods: {
            getExposedConfig(){
                var url = `/backend/auth/exposed_config`; 
                var _this = this;   
                axios.get(url).then(response => {
                    var data = response.data;
                    if(data.success)
                        _this.exposed = data.data;
                }).catch(error => {
                    console.log(error);
                });
            }
        }
    });
    
    app.mount(`#${elementId}`);

});