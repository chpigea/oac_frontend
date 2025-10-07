function passwordrecoveryInit(options={}){

    window.onSubmit = function(){
        var url = "/backend/auth/password_recovery";
        axios.post(url, {
            user: document.getElementById("username").value
        }).then(response => {
            alert(options.labels.email_sent);
            window.location = "/frontend/";
        }).catch(error => {
            console.log(error);
        });
    }

    window.onSubmitReset = function(){    
        var pwd1 = document.getElementById("password").value
        var pwd2 = document.getElementById("re_password").value
        if(pwd1 !== pwd2){
            alert(options.labels.different_password);
            return;
        }
        if(pwd1.length < 6){
            alert(options.labels.invalid_password);
            return;            
        }
        var url = "/backend/users/reset-password";
        axios.post(url, {
            user: {
                id: options.user,
                token: options.token,
                password: pwd1
            }
        }).then(response => {
            alert(options.labels.reset_success);
            window.location = "/frontend/";
        }).catch(error => {
            alert(error);
        });
    }

}
