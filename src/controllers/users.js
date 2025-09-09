const express = require('express');
const router = express.Router();


module.exports = function(serviceName) {
    /**
     * @route   GET /users/manage: redirect to the users page with list of users
     */
    router.get('/manage', (req, res) => {
        let user = req.user;
        res.render('users/manage.twig', { 
            root: serviceName, 
            title: 'User Management',
            cur_id: user.id || 0
        });
    });

    /**
     * @route   GET /users/:id: redirect to the user page with user details
     */
    router.get('/:id', (req, res) => {
        let user = req.user;
        res.render('users/edit.twig', { 
            root: serviceName, 
            title: 'User Edit',
            id: req.params.id,
            cur_id: user.id || 0
        });
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

    return router
}




