const express = require('express');
const router = express.Router();
const DataModel = require('../models/DataModel');

module.exports = function(serviceName) {
    /**
     * @route   GET /users/manage: redirect to the users page with list of users
     */
    router.get('/new', (req, res) => {
        let data = new DataModel(req, {  
            root: serviceName, 
            title: 'Ivestigation Creation',
            currentPath:  req.baseUrl +req.path,
        });    
        res.render('investigation/new.twig', data.toJson()); 
    });

    return router
}




