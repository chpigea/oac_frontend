__AUTO_COMPLETE_COMPONENT__ = {

    name: 'AutocompleteSearch',

    props: {
        searchUrl: {
            type: String,
            required: true
        },
        minChars: {
            type: Number,
            default: 2
        },
        debounceMs: {
            type: Number,
            default: 250
        },
        placeholder: {
            type: String,
            default: 'Search...'
        },
        maxResults: {
            type: Number,
            default: 5
        },
        inputId: {
            type: String,
            default: 'autocomplete-search-input'
        },
        label: {
            type: String,
            default: ''
        }
    },

    emits: ['select'],

    data() {
        return {
            query: '',
            results: [],
            open: false,
            activeIndex: -1,
            timer: null
        }
    },

    computed: {
        inputLabel() {
            return this.label || this.placeholder || 'Search';
        },
        listboxId() {
            return this.inputId + '-results';
        }
    },

    mounted() {
        this.injectStyle();
    },

    methods: {
        injectStyle(){
            if (!document.getElementById('autocomplete-styles')) {
                const style = document.createElement('style');
                style.id = 'autocomplete-styles';
                style.textContent = `
                    .autocomplete {
                        position: relative;
                        min-width: 500px;
                    }

                    .autocomplete input {
                        width: 100%;
                        padding: 8px 12px;
                        border: 1px solid #ccc;
                        border-radius: 4px;
                        font-size: 14px;
                    }

                    .autocomplete input:focus {
                        outline: 3px solid #000;
                        outline-offset: 2px;
                        border-color: #4CAF50;
                    }

                    .autocomplete .dropdown {
                        position: absolute;
                        top: 100%;
                        left: 0;
                        right: 0;
                        margin: 4px 0 0 0;
                        padding: 0;
                        list-style: none;
                        background: white;
                        border: 1px solid #ccc;
                        border-radius: 4px;
                        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                        max-height: 200px;
                        overflow-y: auto;
                        z-index: 1000;
                    }

                    .autocomplete .dropdown li {
                        padding: 8px 12px;
                        cursor: pointer;
                        transition: background-color 0.2s;
                    }

                    .autocomplete .dropdown li:hover,
                    .autocomplete .dropdown li.active {
                        background-color: #f0f0f0;
                    }
                `;
                document.head.appendChild(style);
            }
        },

        onInput() {
            clearTimeout(this.timer);
            if (this.query.length < this.minChars) {
                this.close();
                return;
            }
            this.timer = setTimeout(this.fetchResults, this.debounceMs);
        },

        async fetchResults() {
            try {
                const res = await fetch(this.searchUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        query: this.query,
                        limit: this.maxResults
                    })
                });
                if (!res.ok) throw new Error('Request failed');
                let response = await res.json();
                if(response.success){
                    this.results = response.data;
                    this.open = true;
                }else{
                    this.results = [];
                }
                this.activeIndex = -1;
            } catch (e) {
                console.error(e);
                this.close();
            }
        },

        select(index) {
            if (index < 0 || index >= this.results.length) return;
            const item = this.results[index];
            this.query = this.labelOfItem(item);
            this.$emit('select', item);
            this.close();
        },

        onEnter() {
            if(this.query.length > 0){
                this.timer = setTimeout(this.fetchResults);
            }
        },

        move(step) {
            if (!this.open) return;
            const len = this.results.length;
            this.activeIndex = (this.activeIndex + step + len) % len;
        },

        close() {
            this.open = false;
            this.results = [];
            this.activeIndex = -1;
        },

        onBlur() {
            setTimeout(() => {
                this.close();
            }, 150);
        },

        labelOfItem(item){
            return '[' + item.id + ']: ' + item.label;
        }
    },

    template: `
        <div class="autocomplete" role="search">
            <label :for="inputId" class="visually-hidden">
                {{ inputLabel }}
            </label>

            <input
                :id="inputId"
                type="text"
                :placeholder="placeholder"
                :aria-label="inputLabel"
                :aria-controls="listboxId"
                :aria-expanded="open ? 'true' : 'false'"
                aria-autocomplete="list"
                autocomplete="off"
                v-model="query"
                @input="onInput"
                @keydown.down.prevent="move(1)"
                @keydown.up.prevent="move(-1)"
                @keydown.enter.prevent="onEnter"
                @keydown.esc="close"
                @blur="onBlur"
            />

            <ul v-if="open && results.length"
                :id="listboxId"
                class="dropdown"
                role="listbox">
                <li
                    v-for="(item, i) in results"
                    :key="i"
                    :class="{ active: i === activeIndex }"
                    role="option"
                    :aria-selected="i === activeIndex ? 'true' : 'false'"
                    @mousedown.prevent="select(i)"
                >
                    <span class="autocomplete-result-id">
                        <i class="fa-solid fa-file-invoice" aria-hidden="true"></i>
                        {{ item.id }}
                    </span>
                    <span class="autocomplete-result-label">
                        <i class="fa-solid fa-tag" aria-hidden="true"></i>
                        {{ item.label }}
                    </span>
                </li>
            </ul>
        </div>
    `
}