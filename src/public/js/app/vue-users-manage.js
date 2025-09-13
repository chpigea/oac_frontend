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
                cur_role: parseInt(el.dataset.cur_role),
                labels: {
                    role_sudo: el.dataset.role_sudo,
                    role_admin: el.dataset.role_admin,
                    role_editor: el.dataset.role_editor,
                    role_reader: el.dataset.role_reader,
                    confirm_delete: el.dataset.confirm_delete
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
                        this.users = data.data.filter(u => u.role != 0 || this.cur_role == 0);
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
                if(!confirm(this.labels.confirm_delete)) return;
                axios.delete("/backend/users/" + userId).then(response => {
                    var data = response.data;
                    if(data.success) {
                        this.users = this.users.filter(user => user.id !== userId);
                    } else {
                        console.error("Failed to fetch user:", data.message);
                    }
                }).catch(error => {
                    console.log(error);
                });
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