const {createApp} = Vue;

const appId = 'investigation-app';
const shaclId = 'shacl-form';

const templateIRIOfIndagine = "http://indagine/$SEQ1$";
const templateIRIToExcludeFromSearch = [
    templateIRIOfIndagine
];

const sequenceValues = ["$UUID$", 
    "$SEQ1$", "$SEQ2$", "$SEQ3$",
    "$SEQ4$", "$SEQ5$", "$SEQ6$",
    "$SEQ7$", "$SEQ8$", "$SEQ9$"
];  

const uploadValues = ["$UPLOAD$"];
                    
document.addEventListener('DOMContentLoaded', () => {
    const el = document.getElementById(appId);

    const app = createApp({
        delimiters: ['{@', '@}'],
        data() {
            return {
                cur_role: parseInt(el.dataset.cur_role),
                uuid: el.dataset.uuid || null,
                form: null,
                enabled: el.dataset.editing == "true",
                serializedForm: "",
                validForm: false,
                saving: false,
                lastUpdateTs: 0,
                lastSaveTs: 0,
                isNew: true,
                labels: {},
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
            setInterval(this.autoSave.bind(this), 30*1000);
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
            autoSave(){
                // Form must be valid and change time after the last save time
                if(this.lastUpdateTs > this.lastSaveTs && this.validForm){
                    // A new "indagine" must have to be saved manually 
                    // from the user the first time
                    if(this.isNew && this.lastSaveTs==0)
                        return;
                    this.save(true);
                }
            },
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
                setTimeout(async ()=>{
                    _this.form = document.querySelector("shacl-form");
                    const output = document.getElementById("shacl-output")
                    
                    //await _this.load(this.uuid);

                    _this.form.addEventListener('change', event => {
                        // check if form data validates according to the SHACL shapes
                        _this.validForm = event.detail?.valid;
                        _this.serializedForm = _this.form.serialize();
                        _this.lastUpdateTs = (new Date()).getTime();
                    });
                    
                    _this.form.addEventListener("ready", () => {
                        var intervalId = setInterval(() => {
                            if(_this.form.shadowRoot){
                                clearInterval(intervalId);
                                _this.inputIdentifizier();
                                if(!_this.enabled)
                                    _this.disableInteractions(_this.form);
                            }
                        }, 100);
                    });
                    
                })
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
                var data = {
                    limit: this.search.limit, 
                    offset: this.search.offset, 
                    prefix: this.search.prefix
                }
                var request = axios.post("/backend/fuseki/search/by-prefix", data);
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
                    
                    const rokitSequenceList = Array.from(shadow.querySelectorAll("rokit-input"))
                        .filter(l => sequenceValues.some(v =>
                            (l.placeholder || '').toLowerCase().includes(v.toLowerCase())
                        ));
                    
                    const rokitUploadList = Array.from(shadow.querySelectorAll("rokit-input"))
                        .filter(l => uploadValues.some(v =>
                            (l.placeholder || '').toLowerCase().includes(v.toLowerCase())
                        ));    

                    if (rokitSequenceList.length + rokitUploadList.length == 0) 
                        return false;
                    
                    // Uploads
                    for(var i=0; i<rokitUploadList.length; i++){
                        const rokitInput = rokitUploadList[i];
                        const container = rokitInput.closest(".property-instance");
                        const label = container.querySelector("label");
                        if (rokitInput) {
                            rokitInput.setAttribute("disabled", "true");
                            rokitInput.style.opacity = "0.0";
                            rokitInput.style.pointerEvents = "none";
                            
                            // Aggiungo bottone IMG per upload 
                            let next = label.nextElementSibling;
                            let imgClass = "search-identifier-icon";
                            if (!(next && next.tagName === "IMG" 
                                && next.classList.contains(imgClass))) {
                                // creo immagine
                                const img = document.createElement("img");
                                img.src = "/frontend/images/upload.png";
                                img.style.width = "24px"; img.style.height = "24px";
                                img.style["margin-left"] = "5px"; img.style["margin-right"] = "5px";
                                img.style.cursor = "pointer";
                                img.classList.add(imgClass);
                                img._mode = "UPLOAD";
                                if(rokitInput.value !== "")
                                    img._mode = "DOWNLOAD";
                                img.onclick = function(){
                                    if(img._mode == "DOWNLOAD"){
                                        window.open(rokitInput.value,"_BLANK");
                                        return;
                                    }  
                                    // Crea un input file nascosto
                                    const fileInput = document.createElement("input");
                                    fileInput.type = "file";
                                    fileInput.style.display = "none";
                                    document.body.appendChild(fileInput);
                                    fileInput.onchange = async function() {
                                        const file = fileInput.files[0];
                                        if (!file) return;
                                        const formData = new FormData();
                                        formData.append("file", file);
                                        try {
                                            const response = await axios.post("/backend/fuseki/attachment", formData, {
                                                headers: { "Content-Type": "multipart/form-data" }
                                            });
                                            console.log(response.data);
                                            if(response.data.success){
                                                rokitInput.style.opacity = "0.6";
                                                rokitInput.value = response.data.data;
                                                img._mode = "DOWNLOAD";
                                                img.src = "/frontend/images/download.png";
                                            }
                                        } catch (error) {
                                            console.error(error);
                                        }
                                        document.body.removeChild(fileInput);
                                    };
                                    fileInput.click();
                                }
                                // inserisco subito dopo la label
                                label.insertAdjacentElement("afterend", img); 
                            }
                        }
                    }
                    // Sequences    
                    for(var i=0; i<rokitSequenceList.length; i++){
                        const rokitInput = rokitSequenceList[i];
                        const container = rokitInput.closest(".property-instance");
                        const label = container.querySelector("label");

                        if (rokitInput) {
                            var isIndagineIdField = templateIRIOfIndagine === rokitInput.placeholder;
                            if(rokitInput.value == ""){
                                rokitInput.value = _this.generateIRI(rokitInput, isIndagineIdField);
                            }
                            
                            rokitInput.setAttribute("disabled", "true");
                            rokitInput.style.opacity   = "0.6";
                            rokitInput.style.pointerEvents = "none";
                           
                            var escludeSearchButton = templateIRIToExcludeFromSearch.includes(rokitInput.placeholder);
                            escludeSearchButton = true; //FORCED to true (we need to understand if the serach button will require specific placeholders: $SEARCH1$)
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
                                        var prefix = rokitInput.placeholder;   
                                        sequenceValues.forEach(seqVal => {
                                            var searchStr = seqVal;
                                            var searchStrUpp = seqVal.toUpperCase();
                                            prefix = prefix.replace(searchStr, "").replace(searchStrUpp, "");
                                        });       
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
            generateIRI(input, isIndagne){
                var template = input.placeholder;
                setTimeout((async function(){
                    var _uuid = crypto.randomUUID();
                    template = template.replace("$uuid$", _uuid).replace("$UUID$", _uuid);
                    for(var i=1; i<=9; i++){
                        var seq = "seq" + i; 
                        var searchStr = "$" + seq + "$";
                        var searchStrUpp = searchStr.toUpperCase();
                        if(template.toLowerCase().includes(searchStr)){ 
                            var response = await fetch('/backend/ontology/counter/' + seq ).then(resp => resp.json());
                            if(response.success && response.data){
                                var counter = response.data;
                                template = template.replace(searchStr, counter).replace(searchStrUpp, counter);
                            }
                        }  
                    }
                    input.value = template;
                    if(isIndagne){
                        this.uuid = input.value.split("/").pop();
                    }
                }).bind(this));
            },
            async load(uuid) {
                if(uuid){
                    const dataTTL = await fetch("/backend/ontology/form/" + uuid).then(resp => resp.text())
                    this.form.dataset['values'] = dataTTL;
                }
            },

            async load_(uuid, callback){
                this.form.setClassInstanceProvider((clazz) => { 
                    if (clazz === 'http://example.org/Material') {
                        return `
                        <http://example.org/steel> a <http://example.org/Material>; <http://www.w3.org/2000/01/rdf-schema#label> "Steel".
                        <http://example.org/wood> a <http://example.org/Material>; <http://www.w3.org/2000/01/rdf-schema#label> "Wood".
                        <http://example.org/alloy> a <http://example.org/Material>; <http://www.w3.org/2000/01/rdf-schema#label> "Alloy".
                        <http://example.org/plaster> a <http://example.org/Material>; <http://www.w3.org/2000/01/rdf-schema#label> "Plaster".
                        `
                    }
                });
                const shapesTTL = await fetch("https://ulb-darmstadt.github.io/shacl-form/complex-example.ttl").then(resp => resp.text())
                const dataTTL = await fetch("https://ulb-darmstadt.github.io/shacl-form/complex-example-data.ttl").then(resp => resp.text())
                this.form.dataset['shapes'] = shapesTTL
                this.form.dataset['values'] = dataTTL
                callback()
            },

            save(automatic) {
                if(this.saving) return;
                this.lastSaveTs = (new Date()).getTime();
                automatic = automatic || false;
                this.saving = true;
                var request = axios.post("/backend/ontology/form/save", {
                    turtle: this.serializedForm,
                    uuid: this.uuid
                });
                request.then(response => {
                    var obj = response.data;
                    if(!automatic){
                        if(obj.success)
                            alert("Saved: OK");
                        else
                            alert("Error: " + obj.message);
                    }
                    this.saving = false;
                }).catch(error => {
                    this.saving = false;
                    console.log(error);
                });
            },
            validate() {
                var request = axios.post("/backend/ontology/validate", {
                    turtle: this.serializedForm
                });
                request.then(response => {
                    var obj = response.data;
                    var data = obj.data
                    console.log(data.conforms);
                    console.log(data.details);
                }).catch(error => {
                    console.log(error);
                });
            },
            reset() {
                window.location.reload();
            }
        }
    });
    app.mount(`#${appId}`);
});