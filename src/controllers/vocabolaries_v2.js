const express = require('express');
const router = express.Router();
const DataModel = require('../models/DataModel');

module.exports = function(serviceName) {
    /**
     * @route   GET /users/manage: redirect to the users page with list of users
     */
    router.get('/manage', (req, res) => {
        let data = new DataModel(req, {  
            root: serviceName, 
            title: 'Vocabolaries Management',
            activeMenu: 'admin',
            activeSidebar: 'admin',
            activeSidebarItem: 'vocabolaries',
            currentPath:  req.baseUrl +req.path,
        });    
        res.render('v2/vocabolaries/edit.twig', data.toJson()); 
    });

    return router
}




