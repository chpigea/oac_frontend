const express = require('express');
const router = express.Router();
const DataModel = require('../models/DataModel');

module.exports = function(serviceName) {
    /**
     * @route   GET /investigation/form/:uuid? redirect to the investigation form
     */

    const renderForm = function(req, res, uuid){
        let data = new DataModel(req, {  
            root: serviceName, 
            title: 'Investigation Creation',
            currentPath:  req.baseUrl +req.path,
            uuid
        });    
        res.render('investigation/form.twig', data.toJson()); 
    }

    router.get('/form', (req, res) => {
        renderForm(req, res, '');
    });

    router.get('/form/:uuid', (req, res) => {
        renderForm(req, res, req.params.uuid);
    });

    return router
}




