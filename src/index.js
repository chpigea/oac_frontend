const config = require('./config.js');
const express = require("express");
const axios = require("axios");
const getPort = require('get-port');
const path = require("path");
const serviceName = "frontend"

const app = express();
app.use(express.json());
app.set('view engine', 'twig');
app.set('views', path.join(__dirname, 'views'));

getPort.default({ 
    port: getPort.portNumbers(config.port_range.min, config.port_range.max) }
).then((newPort)=>{
    
    const healthRouter = require('./controllers/health.js');
    app.use('/health', healthRouter);


    app.get('/', (req, res) => {
        res.render('base', { title: 'Home Page', message: 'Hello from Twig!' });
    });

    app.listen(newPort, async () => {
        console.log(`${serviceName} listening on port ${newPort}`);
        try {
            await axios.post(config.url_register, {
                name: serviceName,
                host: "localhost",
                port: newPort
            });
            console.log(`Registered ${serviceName}`);
        } catch (err) {
            console.error(`Failed to register ${serviceName}: ${err.message}`);
        }
    });

})

