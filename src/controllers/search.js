const express = require('express');
const router = express.Router();
const DataModel = require('../models/DataModel');

module.exports = function(serviceName) {

    router.get('/fast', (req, res) => {
        let data = new DataModel(req, {  
            root: serviceName, 
            title: 'Fast Search',
            currentPath:  req.baseUrl +req.path,
        });    
        res.render('search/fast.twig', data.toJson()); 
    });

    router.get('/advanced', (req, res) => {
        let data = new DataModel(req, {  
            root: serviceName, 
            title: 'Advanced Search',
            currentPath:  req.baseUrl +req.path,
        });    
        res.render('search/advanced.twig', data.toJson()); 
    });

    return router
}