const express = require('express');
const router = express.Router();
const DataModel = require('../models/DataModel');

module.exports = function(serviceName) {

    router.get('/content', (req, res) => {
        let data = new DataModel(req, {  
            root: serviceName, 
            title: "Content",
            currentPath: req.baseUrl +req.path,
        });    
        res.render('introduction/content.twig', data.toJson()); 
    });

    router.get('/purpose', (req, res) => {
        let data = new DataModel(req, {  
            root: serviceName, 
            title: "Purpose",
            currentPath: req.baseUrl +req.path,
        });    
        res.render('introduction/purpose.twig', data.toJson()); 
    });

    router.get('/partecipants', (req, res) => {
        let data = new DataModel(req, {  
            root: serviceName, 
            title: "Partecipants",
            currentPath: req.baseUrl +req.path,
        });    
        res.render('introduction/partecipants.twig', data.toJson()); 
    });

        router.get('/references', (req, res) => {
        let data = new DataModel(req, {  
            root: serviceName, 
            title: "References",
            currentPath: req.baseUrl +req.path,
        });    
        res.render('introduction/reference.twig', data.toJson()); 
    });

        router.get('/bibliography', (req, res) => {
        let data = new DataModel(req, {  
            root: serviceName, 
            title: "Bibliography",
            currentPath: req.baseUrl +req.path,
        });    
        res.render('introduction/bibliography.twig', data.toJson()); 
    });

    return router
}