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

        alert(options.labels.reset_success);
        window.location = "/frontend/";
        /*
        var url = "/backend/auth/password_recovery";
        axios.post(url, {
            user: document.getElementById("username").value
        }).then(response => {
            alert(options.labels.email_sent);
            window.location = "/frontend/";
        }).catch(error => {
            console.log(error);
        });
        */
    }

}
