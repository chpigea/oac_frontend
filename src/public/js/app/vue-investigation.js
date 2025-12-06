const {createApp} = Vue;

const appId = 'investigation-app';
const shaclId = 'shacl-form';
const templateIRIToExcludeFromSearch = [
    "http://diagnostica/indagine/$UUID$"
];

document.addEventListener('DOMContentLoaded', () => {
    const el = document.getElementById(appId);

    const app = createApp({
        delimiters: ['{@', '@}'],
        data() {
            return {
                cur_role: parseInt(el.dataset.cur_role),
                uuid: parseInt(el.dataset.uuid) || null,
                form: null,
                enabled: el.dataset.editing == "true",
                serializedForm: "",
                validForm: false,
                labels: {
                
                },
                search: {
                    offset: 0,
                    limit: 10,
                    prefix: "",
                    results: [],
                    end: false,
                    input: null,
                    selected: null
                }
            }    
        },
        mounted() {
            this.initShaclForm();
            this.load();
        },
        computed:{
            outputStyle(){
                var style = {
                    "color": "red",
                    "font-weight": "bold",
                    "max-height": "400px",
                    "overflow-y": "auto",
                    "white-space": "pre-wrap"
                }
                if(this.validForm)
                    style["color"] = "green";
                return style;
            }
        },
        methods: {
            download(outFormat){
                this.openPostInNewTab("/backend/ontology/convert/ttl/" + outFormat, {
                    file: this.serializedForm
                });    
            },
            openPostInNewTab(url, params) {
                const form = document.createElement("form");
                form.method = "POST";
                form.action = url;
                form.target = "_blank";
                for (const key in params) {
                    if (params.hasOwnProperty(key)) {
                        const input = document.createElement("input");
                        input.type = "hidden";
                        input.name = key;
                        input.value = params[key];
                        form.appendChild(input);
                    }
                }
                document.body.appendChild(form);
                form.submit();
                form.remove();
            },
            initShaclForm() {
                var _this = this;
                this.form = document.querySelector("shacl-form");
                const output = document.getElementById("shacl-output")
                this.form.addEventListener('change', event => {
                    // check if form data validates according to the SHACL shapes
                    _this.validForm = event.detail?.valid;
                    _this.serializedForm = _this.form.serialize();
                });
                this.form.addEventListener("ready", () => {
                    var intervalId = setInterval(() => {
                        if(_this.form.shadowRoot){
                            clearInterval(intervalId);
                            _this.inputIdentifizier();
                            if(!_this.enabled)
                                _this.disableInteractions(_this.form);
                        }
                    }, 100);
                });
            },
            searchByPrefixStart(rokitInput, prefix){
                this.search.offset = 0;
                this.search.prefix = prefix;
                this.search.results = [];
                this.search.end = false;
                this.search.input = rokitInput;
                this.search.selected = null;
                if(prefix) this.searchByPrefix();
            },
            confirmSelection(){
                if(this.search.selected && this.search.selected.instance)
                    this.search.input.value = this.search.selected.instance;
                this.searchByPrefixStart(null, null);
            },
            searchByPrefix(){
                if(this.search.end) return;
                var _this = this;
                var request = axios.post("/backend/fuseki/search/by-prefix", {
                    limit: this.search.limit, 
                    offset: this.search.offset, 
                    prefix: this.search.prefix
                });
                request.then(response => {
                    var data = response.data;
                    if(data.success){
                        _this.search.results = _this.search.results.concat(data.data);
                        _this.search.offset += data.data.length;
                        if(data.data.length < _this.search.limit){
                            _this.search.end = true;
                        }
                    }
                }).catch(error => {
                    console.log(error);
                });
            },
            monitorChanges(root, callback) {
                const observer = new MutationObserver(mutations => {
                    mutations.forEach(mutation => {
                        callback(mutation);
                    });
                });
                observer.observe(root, {
                    childList: true,       // nuove aggiunte / rimozioni di nodi
                    subtree: true         // osserva rischiosamente tutto l’albero
                    //attributes: true,      // monitora cambi di attributi
                    //characterData: true    // monitora testo interno dei nodi
                });
                return observer;
            },
            inputIdentifizier(){
                const form = this.form;
                const _this = this;

                const disableIDField = () => {
                    const shadow = form.shadowRoot;
                    if (!shadow) return false;  
                    
                    // Trova la label "ID"
                    const labels = Array.from(shadow.querySelectorAll("label"))
                        .filter(l => l.textContent.trim() === "ID");

                    if (labels.length == 0) return false;
                    for(var i=0; i<labels.length; i++){
                        const label = labels[i];
                        if (!label) continue;
                        // Container della property
                        const container = label.closest(".property-instance");
                        if (!container) return false;
                        
                        // Disabilita rokit-input
                        const rokitInput = container.querySelector("rokit-input");
                        if (rokitInput) {
                            if(rokitInput.value == ""){
                                rokitInput.value = _this.generateIRI(rokitInput.placeholder);
                            }
                            rokitInput.setAttribute("disabled", "true");
                            rokitInput.style.opacity   = "0.6";
                            rokitInput.style.pointerEvents = "none";
                           
                            var escludeSearchButton = templateIRIToExcludeFromSearch.includes(rokitInput.placeholder);

                            if(_this.enabled && !escludeSearchButton){
                                // Aggiungo bottone IMG per la ricerca 
                                let next = label.nextElementSibling;
                                let imgClass = "search-identifier-icon";
                                if (!(next && next.tagName === "IMG" 
                                    && next.classList.contains(imgClass))) {
                                    // creo immagine
                                    const img = document.createElement("img");
                                    img.src = "/frontend/images/search.png";
                                    img.style.width = "24px"; img.style.height = "24px";
                                    img.style["margin-left"] = "5px"; img.style["margin-right"] = "5px";
                                    img.style.cursor = "pointer";
                                    img.classList.add(imgClass);
                                    img.onclick = function(){
                                        var prefix = rokitInput.placeholder.replace("$uuid$", "").replace("$UUID$", "");   
                                        //prefix = "http://diagnostica/vocabularies/quesito-diagnostico/";
                                        _this.searchByPrefixStart(rokitInput, prefix);
                                    }
                                    // inserisco subito dopo la label
                                    label.insertAdjacentElement("afterend", img); 
                                }
                            }
                        }
                        // SHACL NODE superiore che contiene TUTTO il blocco ID
                        const shaclNode = container.closest("shacl-node");
                        // Rimuovi TUTTI i remove-button
                        if (shaclNode) {
                            shaclNode.querySelectorAll("div.remove-button-wrapper").forEach(el => {
                                el.style.display = "none";
                            });
                            shaclNode.querySelectorAll("rokit-button.remove-button").forEach(btn => {
                                btn.style.display = "none";
                            });
                            // Rimuovi TUTTI gli add-button all'interno del nodo ID
                            shaclNode.querySelectorAll("rokit-select.add-button").forEach(btn => {
                                btn.style.display = "none";
                            });
                        }
                    }
                    return true;
                };

                const observer = this.monitorChanges(form.shadowRoot, (mutation) => {
                    disableIDField();
                });
                
                disableIDField();
            },
            disableInteractions(root) {
                root.style.pointerEvents = 'none';
                
                const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);

                while (walker.nextNode()) {
                    const el = walker.currentNode;

                    // Blocca click e interazioni mouse
                    el.style.pointerEvents = 'none';

                    // Blocca editing su input / textarea / select
                    if (el instanceof HTMLInputElement || 
                        el instanceof HTMLTextAreaElement || 
                        el instanceof HTMLSelectElement ||
                        el instanceof HTMLButtonElement) {
                        el.disabled = true;
                    }

                    // Blocca contenteditable
                    if (el.isContentEditable) {
                        el.contentEditable = "false";
                    }

                    // Ricorsione dentro Shadow DOM (se presente)
                    if (el.shadowRoot) {
                        disableInteractions(el.shadowRoot);
                    }
                }
            },
            generateIRI(template, uuid){
                var _uuid = uuid || crypto.randomUUID();
                return template.replace("$uuid$", _uuid).replace("$UUID$", _uuid);        
            },
            load() {
                
            },
            save() {
                
            },
            reset() {
                window.location.reload();
            }
        }
    });
    app.mount(`#${appId}`);
});