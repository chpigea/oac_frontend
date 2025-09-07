const express = require('express');
const router = express.Router();


module.exports = function(serviceName) {
    /**
     * @route   GET /users/manage: redirect to the users page with list of users
     */
    router.get('/manage', (req, res) => {
        res.render('users/manage.twig', { 
            root: serviceName, 
            title: 'User Management',
            users: [
                { id: 1, name: 'alice',     role: 'admin' },
                { id: 2, name: 'bob',       role: 'user' },
                { id: 3, name: 'charlie',   role: 'user' },
            ]
        });
    });

    /**
     * @route   GET /users/:id: redirect to the user page with user details
     */
    router.get('/:id', (req, res) => {

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




