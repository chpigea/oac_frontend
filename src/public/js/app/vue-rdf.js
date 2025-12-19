const { createApp, ref } = Vue;

const appId = 'rdf-viewer-app';

const classColors = {
    'E55_Type': 'rgba(0,255,0,0.70)',
    'E7_Activity': 'rgba(174, 93, 56, 0.5)',
    'E42_Identifier': 'rgba(0,0,255,0.5)',
};

const splitName = function(name){
    name = name.split("/").pop();
    name = name.split(":").pop();
    name = name.split("#").pop();
    return name;
}

const LoadingStatus = {
    TODO: "todo",
    PROGRESS: "progress",
    DONE: "done"
}

document.addEventListener('DOMContentLoaded', function() {
    const el = document.getElementById(appId);

    // Definisci il componente TreeNode
    const TreeNode = {
        template: `
            <div class="tree-node"
                :style="{ 'padding-left': depth * 0 + 'px' }"
            >
            <div class="node-label" @click="toggleExpand" :style="styleNode(node)">
                <span v-if="(node.predicates && node.predicates.length > 0) || (node.children && node.children.length > 0)">
                {{ expanded ? '▼' : '▶' }}
                </span>
                <i v-if="node.loadStatus == 'todo'" 
                    class="fa-brands fa-searchengin"
                    style="cursor:pointer;"
                    @click="loadNode(node)"
                ></i>
                <img v-else-if="node.loadStatus == 'progress'" 
                    src="/frontend/images/loading_icon.gif"
                    style="width:32px; height:32px;"
                >
                <i v-else style="margin-left:10px;"></i>
                {{ node.label + ' ' + classesLabelFor(node) }}
            </div>
            <div v-if="expanded">
                <template v-if="node.predicates && node.predicates.length > 0">
                    <div v-for="(predicate, index) in node.predicates" :key="index" 
                        style="margin-left:20px;">
                        <div>
                            {{ predicate.label }}
                        </div>
                        <tree-node v-for="(child, index) in predicate.children"
                            :key="index"
                            :node="child"
                            :depth="depth + 1"
                        ></tree-node>
                    </div> 
                </template>
                <template v-else>
                    <tree-node v-for="(child, index) in node.children"
                        :key="index"
                        :node="child"
                        :depth="depth + 1"
                    ></tree-node>
                </template>                               
            </div>
            </div>`,
        props: {
            node: {
                type: Object,
                required: true
            },
            depth: {
                type: Number,
                default: 0
            }
        },
        data() {
            return {
                expanded: true
            };
        },
        methods: {
            loadNode(node){
                //this.$emit('load-node', node);
                let event = new Event('load-node');
                event.node = node;
                el.dispatchEvent(event);
            },
            styleNode(node) {
                var color = '#bbccdd';
                if (node.classes && node.classes.length > 0) {
                    for(var i=0; i<node.classes.length; i++){
                        var clazz = node.classes[i];
                        if(classColors.hasOwnProperty(clazz)){
                            color = classColors[clazz];
                            break;
                        }
                    }
                }
                return {
                    'background-color': `${color}`
                };
            },
            classesLabelFor(node){
                var label = "";
                if(node.classes && node.classes.length > 0){
                    var int_label = "";
                    for(var i=0; i<node.classes.length; i++){
                        var part = splitName(node.classes[i]);
                        if(i>0) int_label += ",";
                        int_label += part; 
                    }
                    if(int_label.trim()!=""){
                        label = "[" + int_label + "]";
                    }
                }
                return label;
            },
            toggleExpand() {
                if ((this.node.predicates && this.node.predicates.length > 0) || 
                    (this.node.children && this.node.children.length > 0)) {
                    this.expanded = !this.expanded;
                }
            }
        }
    };

    // Definisci il componente TreeView
    const TreeView = {
        template: `
            <div class="tree-view">
                <tree-node
                    v-for="(node, index) in treeData"
                    :key="index"
                    :node="node"
                    :depth="0"
                ></tree-node>
            </div>
        `,
        props: {
            treeData: {
                type: Array,
                required: true
            }
        },
        components: {
            TreeNode
        }
    };

    // Crea l'applicazione Vue
    const app = Vue.createApp({
        data() {
            return {
                rootIri: el.dataset.root_iri,
                treeData: []
            };
        },
        mounted() {
            this.loadRoot();
            el.addEventListener("load-node", (function(event) {
                this.loadNodeData(event.node);
            }).bind(this));
        },
        methods:{
            loadRoot(){
                var _this = this;
                var url = "/backend/fuseki/rdf/rootResource?iri=" + this.rootIri;
                fetch(url)
                .then(response => response.json())
                .then(r => {
                    if(r.success){
                        var data = r.data;
                        var classes = data.classes.split(",");
                        for(var i=0; i<classes.length; i++){
                            classes[i] = splitName(classes[i]);
                        }
                        _this.treeData = [{
                            label: data.label.split("/").pop(),
                            iri: decodeURIComponent(_this.rootIri),
                            classes: classes,
                            loadStatus: LoadingStatus.TODO,
                            predicates:[]
                        }];
                    }else{
                        alert('Error:', r.message);
                    }
                })
                .catch(error => {
                    console.log(error);
                    //alert('Errore durante il caricamento dei dati radice:', error);
                });
            },
            loadNodeData(node){
                var _this = this;
                node.predicates=[];    
                var url = "/backend/fuseki/rdf/resourceOf?iri=" + encodeURIComponent(node.iri);
                console.log(url)
                node.loadStatus = LoadingStatus.PROGRESS;
                fetch(url).then(response => response.json()).then(r => {
                    if(r.success){
                        var data = r.data;
                        var prev_predicate = null;
                        var index_predicate = -1;
                        for(var i=0; data.length; i++){
                            var predicate = splitName(data[i].predicate);
                            if(predicate != prev_predicate){
                                node.predicates.push({
                                   label: predicate,
                                   children: []         
                                });
                                prev_predicate = predicate;
                                index_predicate++;
                            }
                            var classes = data[i].object.classes.split(",");
                            for(var j=0; j<classes.length; j++){
                                classes[j] = splitName(classes[j]);
                            }
                            node.predicates[index_predicate].children.push({
                                label: splitName(data[i].object.label),
                                iri: "<" + data[i].object.iri + ">",
                                classes: classes,
                                loadStatus: LoadingStatus.TODO
                            });
                        }
                    }else{
                        alert('Error:', r.message);
                    }
                    node.loadStatus = LoadingStatus.DONE;
                }).catch(error => {
                    node.loadStatus = LoadingStatus.DONE;
                });
            }
        }
    });

    // Registra il componente TreeView globalmente
    app.component('tree-view', TreeView);
    app.component('tree-node', TreeNode);

    // Monta l'applicazione
    app.mount(`#${appId}`);

});