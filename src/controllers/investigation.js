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
            uuid,
            mode: 'edit'
        });    
        res.render('investigation/form.twig', data.toJson()); 
    }

    router.get('/form', (req, res) => {
        renderForm(req, res, '');
    });

    router.get('/form/:uuid', (req, res) => {
        renderForm(req, res, req.params.uuid);
    });

    router.get('/view/:uuid', (req, res) => {
        const { uuid } = req.params;

        let data = new DataModel(req, {
            root: serviceName,
            title: 'Indagine viewer',
            uuid,

            // 👇 NASCONDE MENU E SIDEBAR
            activeMenu: null,
            activeSidebar: null,
            activeSidebarItem: null
        });

        res.render('investigation/view.twig', data.toJson());
    });

    return router
}




