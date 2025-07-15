onSubmit = function(type){

    axios.post("/backend/auth/authenticate", {
        type: type,
        user: (type == "login") ? 
            document.getElementById("username").value : "",
        password: (type == "login") ? 
            document.getElementById("password").value : "",
    }).then(response => {
        console.log(response.data);
    }).catch(error => {
        console.log(error);
    });

}