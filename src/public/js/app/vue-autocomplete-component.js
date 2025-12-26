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

    mounted() {
        // Inietta gli stili CSS se non già presenti
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
                        outline: none;
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
            if(this.query.length>0){
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
            // Usa setTimeout per permettere al mousedown di completarsi prima del blur
            setTimeout(() => {
                this.close();
            }, 150);
        },

        labelOfItem(item){
            return '[' + item.id + ']: ' + item.label;
        }

  },

  template: `
    <div class="autocomplete">
      <input
        type="text"
        :placeholder="placeholder"
        v-model="query"
        @input="onInput"
        @keydown.down.prevent="move(1)"
        @keydown.up.prevent="move(-1)"
        @keydown.enter.prevent="onEnter"
        @keydown.esc="close"
        @blur="onBlur"
      />

      <ul v-if="open && results.length" class="dropdown">
        <li
          v-for="(item, i) in results"
          :key="i"
          :class="{ active: i === activeIndex }"
          @mousedown.prevent="select(i)"
        >
          <span style="font-weight:bold; padding-right:10px; border-right:solid 1px gray;">
            <i class="fa-solid fa-file-invoice"></i>
            {{ item.id }}
          </span>  
          <span style="margin-left:10px;color:gray;">
            <i class="fa-solid fa-tag"></i>
            {{ item.label }}
          </span>  
          
        </li>
      </ul>
    </div>
  `

}