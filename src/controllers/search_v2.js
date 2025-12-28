const express = require('express');
const router = express.Router();
const DataModel = require('../models/DataModel');

module.exports = function(serviceName) {

    router.get('/fast/:what', (req, res) => {
        let data = new DataModel(req, {  
            root: serviceName, 
            title: 'Fast Search',
            activeMenu: 'search',
            activeSidebar: 'search',
            activeSidebarItem: 'fast',
            fastType: req.params.what,
            currentPath:  req.baseUrl +req.path,
            schema: 'fast_' + req.params.what
        });    
        res.render('v2/search/advanced.twig', data.toJson()); 
    });

    router.get('/advanced', (req, res) => {
        let data = new DataModel(req, {  
            root: serviceName, 
            title: 'Advanced Search',
            activeMenu: 'search',
            activeSidebar: 'search',
            activeSidebarItem: 'advanced',
            currentPath:  req.baseUrl +req.path,
            schema: 'advanced'
        });    
        res.render('v2/search/advanced.twig', data.toJson()); 
    });

    return router
}
