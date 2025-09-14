const {createApp} = Vue;

const elementId = 'edit-user';

document.addEventListener('DOMContentLoaded', () => {
    const el = document.getElementById(elementId);

    const app = createApp({
        delimiters: ['{%', '%}'],
        data() {
            return {
                root: el.dataset.root,
                cur_id: parseInt(el.dataset.cur_id),
                cur_role: parseInt(el.dataset.cur_role),
                labels: {
                    role_sudo: el.dataset.role_sudo,
                    role_admin: el.dataset.role_admin,
                    role_editor: el.dataset.role_editor,
                    role_reader: el.dataset.role_reader,
                    save_ok: el.dataset.save_ok
                },
                user: {
                    id: parseInt(el.dataset.user_id) || 0,
                    name: "",
                    surname: "",
                    username: "",
                    email: "",
                    mobile: "",
                    password: "",
                    confirm_password: "",
                    role: 2
                }     
            }    
        },
        mounted() {
            this.getUser();
        },
        computed:{
            validator(){
                let name = this.user.name.length > 0;
                let surname = this.user.surname.length > 0;
                let username = this.user.username.length > 0;
                let email = this.user.email.length > 0 && this.user.email.includes("@");
                let password = this.user.password.length >= 6 || (this.user.id > 0 && this.user.password.length == 0);
                let confirm_password = this.user.password == this.user.confirm_password;
                return {
                    name: name,
                    surname: surname,
                    username: username,
                    email: email,
                    password: password,
                    confirm_password: confirm_password
                }
            },
            validForm(){
                return this.validator.name && this.validator.surname && this.validator.username && this.validator.email && this.validator.password && this.validator.confirm_password;
            }
        },
        methods: {
            getUser() {
                if(this.user.id == 0) return;
                axios.get("/backend/users/" + this.user.id).then(response => {
                    var data = response.data;
                    if(data.success) {
                        this.user = data.data;
                        this.user.password = "";
                        this.user.confirm_password = "";
                    } else {
                        console.error("Failed to fetch user:", data.message);
                    }
                }).catch(error => {
                    console.log(error);
                });
            },
            save() {
                if(!this.validForm) return;
                let payload = {
                    id: this.user.id,
                    name: this.user.name,
                    surname: this.user.surname,
                    username: this.user.username,
                    email: this.user.email,
                    mobile: this.user.mobile,
                    role: this.user.role
                };
                if(this.user.password.length > 0)
                    payload["password"] = this.user.password;
                let request;
                if(this.user.id == 0) {
                    delete payload["id"];
                    request = axios.post("/backend/users", payload);
                } else {
                    request = axios.put("/backend/users/" + this.user.id, payload);
                }
                request.then(response => {
                    var data = response.data;
                    if(data.success) {
                        alert(this.labels.save_ok);
                        if(document.referrer)
                            window.location.href = document.referrer;
                        else
                            window.history.back();
                    } else {
                        alert(data.message);
                    }
                }).catch(error => {
                    alert(error);
                });
            },
            cancel() {
                if(document.referrer)
                    window.location.href = document.referrer;
                else
                    window.history.back();
            }
        }
    });
    app.mount(`#${elementId}`);
});