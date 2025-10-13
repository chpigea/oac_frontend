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
            title: 'User Management',
            currentPath:  req.baseUrl +req.path,
        });    
        res.render('users/manage.twig', data.toJson()); 
    });

    /**
     * @route   GET /users/:id: redirect to the user page with user details
     */
    router.get('/:id', (req, res) => {
        let data = new DataModel(req, {  
            root: serviceName, 
            title: 'User Edit',
            id: req.params.id,
            currentPath:  req.baseUrl +req.path,
        });    
        res.render('users/edit.twig', data.toJson());    
    });

    /**
     * @route   POST /users/:id: update or create an user
     */
    router.post('/:id', (req, res) => {

    });

    /**
     * @route   DELETE /users/:id: delete an user
     */
    router.delete('/:id', (req, res) => {

    });

    router.get('/reset_password/:id/:token', (req, res) => {
        let data = new DataModel(req, {  
            root: serviceName, 
            title: 'Reset password',
            user: {
                id: req.params.id,
                token: req.params.token
            }
        });    
        res.render('users/reset_password.twig', data.toJson()); 
    });

    return router
}




