onSubmit = function(type){
    var url = "/backend/auth/authenticate";
    axios.post(url, {
        type: type,
        user: (type == "login") ? 
            document.getElementById("username").value : "",
        password: (type == "login") ? 
            document.getElementById("password").value : "",
    }).then(response => {
        window.location = "/frontend/v2/introduction";
    }).catch(error => {
        console.log(error);
    });
}
