// TreeSelectWidget.js
class TreeSelectWidget {
    constructor(containerId, values) {
        this.container = document.getElementById(containerId);
        this.values = values; // struttura ad albero
        this.selectedValues = [];
        this.render();
    }

    render() {
        this.container.innerHTML = '';
        this.values.forEach(node => {
            const label = document.createElement('div');
            label.textContent = node.label;
            this.container.appendChild(label);

            if (node.children) {
                const ul = document.createElement('ul');
                node.children.forEach(child => {
                    const li = document.createElement('li');
                    const checkbox = document.createElement('input');
                    checkbox.type = 'checkbox';
                    checkbox.value = child;
                    checkbox.addEventListener('change', e => {
                        if (e.target.checked) this.selectedValues.push(e.target.value);
                        else this.selectedValues = this.selectedValues.filter(v => v !== e.target.value);
                    });
                    li.appendChild(checkbox);
                    li.appendChild(document.createTextNode(child));
                    ul.appendChild(li);
                });
                this.container.appendChild(ul);
            }
        });
    }

    getValue() {
        return this.selectedValues; // array dei valori selezionati
    }
}

window.TreeSelectWidget = TreeSelectWidget;