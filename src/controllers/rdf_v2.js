const express = require('express');
const router = express.Router();
const DataModel = require('../models/DataModel');

module.exports = function(serviceName) {

    router.get('/view', (req, res) => {

        let data = new DataModel(req, {  
            root: serviceName, 
            title: 'RDF viewer',
            iri: req.query.iri
        });    
        res.render('v2/rdf/view.twig', data.toJson()); 
    });

    return router
}