const {createApp} = Vue;

const elementId = 'vocabolary-view';

const OAC_VOCABOLARIES = [
    {name: "Condizioni ambientali", key: "condizioni-ambientali"},
    {name: "Contesto", key: "contesto"},
    {name: "Degrado", key: "degrado"},
    {name: "Quesiti Diagnostici", key: "quesito-diagnostico"}
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
                @prefix crm:  <http://www.cidoc-crm.org/cidoc-crm/> .
                @prefix owl:  <http://www.w3.org/2002/07/owl#> .
                @prefix dcterms: <http://purl.org/dc/terms/> .

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