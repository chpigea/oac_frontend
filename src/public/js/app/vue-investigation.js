const {createApp} = Vue;

const appId = 'investigation-app';
const searchId = 'investigation-search';
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

function generateUUID() {
    if (crypto.randomUUID) {
        return crypto.randomUUID();
    }
    // Fallback per HTTP o browser vecchi
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

const CLIENT_UUID = generateUUID();

const KEEP_LOCK_EVERY = 45*1000;

document.addEventListener('DOMContentLoaded', () => {

    // App separata per l'autocomplete

    const elSearch = document.getElementById(searchId);

    if (elSearch && typeof __AUTO_COMPLETE_COMPONENT__ !== 'undefined') {
    //if (typeof __AUTO_COMPLETE_COMPONENT__ !== 'undefined') {
        try {
            const elSearch = document.getElementById(searchId);
            const searchApp = createApp({
                template: `
                    <div style="display: flex; gap: 10px; align-items: center; margin-bottom: 20px;">
                        <autocomplete-search v-if="!inEdit"
                            search-url="/backend/ontology/form/search"
                            :min-chars="3"
                            :placeholder="labels.search"
                            @select="handleAutocompleteSelect"
                        />
                        <button v-if="existingInstance != null && !inEdit && cur_role != 3" :title="labels.edit"
                            @click="editInstance()" type="button" class="btn btn-info">
                            <i class="fa-solid fa-pen-to-square"></i>
                        </button>
                        <button v-if="!inEdit && cur_role != 3" :title="labels.new"
                            @click="newInstance()" type="button" class="btn btn-success">
                            <i class="fa-solid fa-plus"></i>
                        </button>
                        <button v-if="inEdit" :title="labels.stop_edit"
                            @click="stopEdit()" type="button" class="btn btn-success">
                            <i class="fa-solid fa-circle-stop" style="color:red;"></i>
                        </button>
                    </div>
                `,
                data() {
                    return {
                        cur_role: parseInt(elSearch.dataset.cur_role),
                        existingInstance: null, 
                        inEdit:false, 
                        labels:{
                            edit: elSearch.dataset.label_edit,
                            new: elSearch.dataset.label_new,
                            stop_edit: elSearch.dataset.label_stop_edit,
                            search: elSearch.dataset.label_search + "...",
                            edit_from_other_user: elSearch.dataset.label_edit_from_other_user
                        }  
                    }
                },
                methods: {
                    handleAutocompleteSelect(value) {
                        this.existingInstance = value;
                        this.inEdit = false;
                        window.dispatchEvent(
                            new CustomEvent('select-item', { 
                                detail: {
                                    id: this.existingInstance.id,
                                    uuid: this.existingInstance.uuid
                                } 
                            })
                        );
                    },
                    editInstance(){
                        setTimeout((async function(){
                            var response = await fetch(
                                '/backend/ontology/form/lock/' + this.existingInstance.id + "/" + CLIENT_UUID 
                            ).then(resp => resp.json());
                            if(response.success){
                                this.inEdit = true;
                                window.dispatchEvent(
                                    new CustomEvent('edit-item', { 
                                        detail: {
                                            id: this.existingInstance.id,
                                            uuid: this.existingInstance.uuid
                                        } 
                                    })
                                );
                            }else{
                                alert(this.labels.edit_from_other_user);
                            }
                        }).bind(this))
                    },
                    newInstance(){
                        this.inEdit = true;
                        window.dispatchEvent(
                            new CustomEvent('new-item')
                        );
                    },
                    stopEdit(){
                        setTimeout((async function(){
                            this.inEdit = false;
                            this.existingInstance = null; 
                            window.dispatchEvent(
                                new CustomEvent('edit-stop')
                            );
                        }).bind(this))
                    }
                }
            });
            searchApp.component('autocomplete-search', __AUTO_COMPLETE_COMPONENT__);
            searchApp.mount('#investigation-search');
            console.log('Search app mounted successfully');
        } catch (error) {
            console.error('Error mounting search app:', error);
        }
    } /*else {
        console.error('__AUTO_COMPLETE_COMPONENT__ not defined');
    }*/

    const el = document.getElementById(appId);

    if (!el) {
        console.warn('[vue-investigation] #investigation-app not found, skipping mount');
        return;
    }
    const showForm = (el.dataset.showForm === 'true');

    const app = createApp({
        delimiters: ['{@', '@}'],
        data() {
            return {
                cur_role: parseInt(el.dataset.cur_role),
                uuid: el.dataset.uuid || null,
                form: null,
                form_id: null,
                form_keep_lock_timer: null,
                form_keep_locking: false,
                inEditing: false,
                inEditingViewer: false,
                isVisible: false,
                enabled: el.dataset.editing == "true",
                serializedForm: "",
                validForm: false,
                saving: false,
                lastUpdateTs: 0,
                lastSaveTs: 0,
                isNew: true,
                labels: {
                    save_ok: el.dataset.label_save_ok,
                    save_err: el.dataset.label_save_err
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
            console.log("UUID da dataset:", this.uuid);
            if (showForm && this.uuid == null) {
                this.resetShaclForm(null, true);
            }
            else
                if (showForm && this.uuid) {
                    this.isVisible = true;
                    this.inEditing = true;
                    this.inEditingViewer = false;
                    this.resetShaclForm(this.uuid, true); // ❌ uuid non definito
                }

            this.initShaclForm();
            setInterval(this.autoSave.bind(this), 30*1000);
            // Ascolta eventi dall'autocomplete
            var _this = this;
            window.addEventListener('select-item', (event) => {
                var detail = event.detail;
                var id = detail.id;
                var uuid = detail.uuid;
                _this.form_id = id;
                console.log('select-item...', uuid);
                _this.enabled = false;
                _this.isVisible = true;
                _this.inEditing = false;
                _this.resetShaclForm(uuid, false);
                
            });
            window.addEventListener('edit-item', (event) => {
                var detail = event.detail;
                var id = detail.id;
                var uuid = detail.uuid;
                _this.form_id = id;
                console.log('edit-item...', uuid);
                _this.enabled = true;
                _this.isVisible = true;
                _this.inEditing = true;
                _this.resetShaclForm(uuid, true);
                _this.form_keep_lock_timer = setInterval(_this.keepLock.bind(_this), KEEP_LOCK_EVERY)
            });
            window.addEventListener('new-item', (event) => {
                console.log('new-item...');
                _this.enabled = true;
                _this.isVisible = true;
                _this.inEditing = true;
                _this.resetShaclForm(null, true);
                _this.form_id = null;
            });
            window.addEventListener('edit-stop', async (event) => {
                console.log('edit-stop...');
                if(_this.form_id){
                    await fetch(
                        '/backend/ontology/form/unlock/' + _this.form_id + "/" + CLIENT_UUID 
                    ).then(resp => resp.json());
                }
                _this.enabled = false;
                _this.isVisible = false;
                _this.inEditing = false;
                _this.form_id = null;
                //_this.resetShaclForm(null, true);
                clearInterval(_this.form_keep_lock_timer);
                window.location.reload();
                
            });

            window.addEventListener('beforeunload', () => {
                if(this.form_id){
                    var url = '/backend/ontology/form/unlock/' + this.form_id + "/" + CLIENT_UUID;
                    navigator.sendBeacon(url);
                }
            });

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
            keepLock(){
                if(this.form_id && !this.form_keep_locking){
                    this.form_keep_locking = true;
                    setTimeout((async function(){
                        var url = '/backend/ontology/form/lock-keep/' + this.form_id + "/" + CLIENT_UUID;
                        await fetch(url);
                        this.form_keep_locking = false;
                    }).bind(this))
                }
            },
            onSelect(){

            },
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
            resetShaclForm(uuid, edit) {
                const oldForm = document.querySelector("shacl-form");
                const parent = document.getElementById("shacl-container");

                if (oldForm) oldForm.remove();
                if (!parent) {
                    setTimeout(() => {
                    this.resetShaclForm(uuid, edit);
                    }, 150);
                    return;
                }

                const newForm = document.createElement("shacl-form");
                newForm.id = "shacl-form";
                newForm.dataset.collapse = "open";
                newForm.dataset.valuesNamespace = "indagine:";
                newForm.dataset.shapesUrl = "/backend/ontology/schema/editing";
                newForm.dataset.generateNodeShapeReference = "";

                if (!edit) {
                    newForm.dataset.view = "";
                }

                newForm.dataset.shapeSubject =
                    "http://example.org/shapes/E7Activity01Shape";

                // ✅ QUESTO È IL PEZZO MANCANTE
                if (uuid) {
                    const rnd = Date.now();
                    newForm.dataset.valuesUrl =
                    "/backend/ontology/form/" + uuid + "?rnd=" + rnd;
                    newForm.dataset.valuesSubject =
                    "http://indagine/" + uuid;
                }

                parent.appendChild(newForm);

                this.form = null;
                this.initShaclForm(uuid);
                },
            initShaclForm(uuid) {
                var _this = this;
                setTimeout(async ()=>{
                    _this.form = document.querySelector("shacl-form");

                    if(!_this.form){
                        setTimeout(_this.initShaclForm.bind(_this), 150);
                        return;
                    }

                    if(!_this.isVisible){
                        _this.form.style.display = 'none';
                    }else{
                        _this.form.style.display = '';
                    }

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
                                if(_this.inEditing)
                                    _this.inputIdentifizier();
                                else
                                    _this.makeAttachmentClickable();
                                _this.validForm = true;
                                if(_this.inEditing)
                                    _this.serializedForm = _this.form.serialize();
                                else{
                                    setTimeout(async function(){
                                        var rnd = (new Date()).getTime();
                                        const response = await fetch("/backend/ontology/form/" + uuid + "?rnd=" + rnd)    
                                        _this.serializedForm = await response.text();
                                    });        
                                }
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
            getAttachmentElements(root = document){
                var selector = 'a[href*="/backend/fuseki/attachment/"]'
                const results = [...root.querySelectorAll(selector)];
                // Cerca in tutti gli shadow root
                const allElements = root.querySelectorAll('*');
                for (const el of allElements) {
                    if (el.shadowRoot) {
                        results.push(...this.getAttachmentElements(el.shadowRoot));
                    }
                }
                return results;
            },
            makeAttachmentClickable(){
                var links = this.getAttachmentElements();
                console.log(links)
                for(var i=0; i<links.length; i++){
                    var link = links[i];
                    var url = link.href;
                    link.removeAttribute('href');  // Rimuovi href
                    link.style.pointerEvents='auto';
                    link.style.cursor = 'pointer'; 
                    link.style.textDecoration = 'underline';
                    link.style.color = 'darkblue';
                    link.addEventListener('click', function(event) {
                        event.preventDefault();
                        event.stopPropagation();
                        event.stopImmediatePropagation();
                        window.open(url, '_blank');
                    }, true);  // true = capture phase
                }
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
                            if(rokitInput.value === "")
                                rokitInput.style.opacity = "0.0";
                            rokitInput.style.pointerEvents = "none";
                            
                            // Aggiungo bottone IMG per upload 
                            let next = label.nextElementSibling;
                            let imgClass = "search-identifier-icon";
                            if (!(next && next.tagName === "IMG" 
                                && next.classList.contains(imgClass))) {
                                // creo immagine
                                const img = document.createElement("img");
                                img._mode = "UPLOAD";
                                img.src = "/frontend/images/upload.png";
                                if(rokitInput.value !== ""){
                                    img._mode = "DOWNLOAD";
                                    img.src = "/frontend/images/download.png";
                                }
                                img.style.width = "24px"; img.style.height = "24px";
                                img.style["margin-left"] = "5px"; img.style["margin-right"] = "5px";
                                img.style.cursor = "pointer";
                                img.classList.add(imgClass);
                                
                                console.log(rokitInput);
                                
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
                    var _uuid = generateUUID();
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
                var _this = this;
                this.lastSaveTs = (new Date()).getTime();
                automatic = automatic || false;
                this.saving = true;
                var request = axios.post("/backend/ontology/form/save", {
                    turtle: this.serializedForm,
                    uuid: this.uuid
                });
                request.then(async response => {
                    var obj = response.data;
                    console.log(obj);
                    if(!automatic){
                        if(obj.success){
                            alert(_this.labels.save_ok);
                            if(_this.isNew && obj.data){
                                _this.form_id = obj.data;
                                await fetch('/backend/ontology/form/lock/' + obj.data + "/" + CLIENT_UUID)
                                _this.form_keep_lock_timer = setInterval(_this.keepLock.bind(_this), KEEP_LOCK_EVERY)
                            }
                        }else
                            alert(_this.labels.save_err + ": " + obj.message);
                    }
                    _this.saving = false;
                }).catch(error => {
                    _this.saving = false;
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
            },
            stopEdit() {
                console.log('STOP EDIT (viewer)');
                window.dispatchEvent(new CustomEvent('edit-stop'));
            },
            async startEdit() {
    try {
      // entra subito in editing → UI aggiornata
      this.inEditingViewer = true;
      this.enabled   = true;

      // cerco l'indagine tramite uuid
      const res = await fetch('/backend/ontology/form/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: this.uuid, limit: 1 })
      });

      const response = await res.json();
      if (!response.success || !response.data?.length) {
        alert("Indagine non trovata");
        this.inEditing = false;
        this.enabled = false;
        return;
      }

      const item = response.data[0];

      // lock
      const lockResp = await fetch(
        `/backend/ontology/form/lock/${item.id}/${CLIENT_UUID}`
      ).then(r => r.json());

      if (!lockResp.success) {
        alert("Indagine in modifica da un altro utente");
        this.inEditing = false;
        this.enabled = false;
        return;
      }

      // entra ufficialmente in editing
      window.dispatchEvent(new CustomEvent('edit-item', {
        detail: { id: item.id, uuid: item.uuid }
      }));

    } catch (e) {
      console.error(e);
      alert("Errore durante l'attivazione della modifica");
      this.inEditing = false;
      this.enabled = false;
    }
  }
        }
    });

    // Configura Vue per ignorare i custom elements (Web Components)
    app.config.compilerOptions.isCustomElement = (tag) => {
        return tag.startsWith('shacl-') || tag === 'shacl-form';
    };

    app.mount(`#${appId}`);

});
