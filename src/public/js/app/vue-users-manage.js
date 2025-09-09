const {createApp} = Vue;

const elementId = 'manage-users';

document.addEventListener('DOMContentLoaded', () => {
    const el = document.getElementById(elementId);

    const app = createApp({
        delimiters: ['{%', '%}'],
        data() {
            return {
                root: el.dataset.root,
                cur_id: parseInt(el.dataset.cur_id) || 0,
                labels: {
                    role_sudo: el.dataset.role_sudo,
                    role_admin: el.dataset.role_admin,
                    role_editor: el.dataset.role_editor,
                    role_reader: el.dataset.role_reader,
                },
                users: []       
            }    
        },
        mounted() {
            this.getUsers();
        },
        methods: {
            getUsers() {
                axios.get("/backend/users/").then(response => {
                    var data = response.data;
                    if(data.success) {
                        this.users = data.data;
                    } else {
                        console.error("Failed to fetch users:", data.message);
                    }
                }).catch(error => {
                    console.log(error);
                });
            },
            roleByCode(code){
                var label = this.labels.role_reader;
                if(code == 0) label = this.labels.role_sudo;
                if(code == 1) label = this.labels.role_admin;
                if(code == 2) label = this.labels.role_editor;
                if(code == 3) label = this.labels.role_reader;
                return label;
            },
            deleteUser(userId) {
                // Here you would also make an API call to delete the user from the server
                this.users = this.users.filter(user => user.id !== userId);
            },
            editUser(userId) {
                window.location.href = `/${this.root}/users/${userId}`;
            },
            newUser() {
                window.location.href = `/${this.root}/users/0`;
            }
        }
    });
    app.mount(`#${elementId}`);
});