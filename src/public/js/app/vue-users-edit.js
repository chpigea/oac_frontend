const {createApp} = Vue;

const elementId = 'edit-user';

document.addEventListener('DOMContentLoaded', () => {
    const el = document.getElementById(elementId);

    const app = createApp({
        delimiters: ['{%', '%}'],
        data() {
            return {
                root: el.dataset.root,
                labels: {
                    role_sudo: el.dataset.role_sudo,
                    role_admin: el.dataset.role_admin,
                    role_editor: el.dataset.role_editor,
                    role_reader: el.dataset.role_reader,
                },
                user: {
                    name: "",
                    surname: "",
                    username: "",
                    email: "",
                    password: "",
                    confirm_password: "",
                    role: 2
                }       
            }    
        },
        mounted() {
            this.getUser();
        },
        methods: {
            getUser() {
                /*
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
                */
            },
            save() {
                // Here you would also make an API call to save the user to the server
            },
            cancel() {
                window.history.back();
            }
        }
    });
    app.mount(`#${elementId}`);
});