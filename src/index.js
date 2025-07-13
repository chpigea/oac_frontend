const config = require('./config.js');
const express = require("express");
const axios = require("axios");
const getPort = require('get-port');
const path = require("path");
const i18n = require('i18n');


i18n.configure({
  locales: ['en', 'it'],
  defaultLocale: 'it',
  directory: path.join(__dirname, 'locales'),
  queryParameter: 'lang',
  autoReload: true,
  objectNotation: true,
  updateFiles: false, // don't auto-create keys
  api: {
    '__': 't'
  }
});

const serviceName = "frontend"

const app = express();
let newPort = null

app.use(i18n.init);
app.use(`/${serviceName}`, express.static(path.join(__dirname, 'public')));
app.use(express.json());

app.set('view engine', 'twig');
app.set('views', path.join(__dirname, 'views'));

app.use((req, res, next) => {
  res.locals.t = req.t;
  next();
});

const register = async function(){
    try {
        console.log(`Registering ${serviceName}...`);
        await axios.post(config.url_register, {
            name: serviceName,
            host: "localhost",
            port: newPort
        });
        console.log(`Registered ${serviceName}`);
    } catch (err) {
        console.error(`Failed to register ${serviceName}: ${err.message}`);
        setTimeout(register, 10*1000)
    }
}

getPort.default({ 
    port: getPort.portNumbers(config.port_range.min, config.port_range.max) }
).then((port)=>{
    newPort = port

    // Defining routers
    const healthRouter = require('./controllers/health.js');
    app.use(`/${serviceName}/health`, healthRouter);


    app.get(`/${serviceName}`, (req, res) => {
        res.render('login', { root: serviceName, title: 'Home Page', message: 'Hello from Twig!' });
    });

    // Start listing on the specified port
    app.listen(port, async () => {
        console.log(`${serviceName} listening on port ${port}`);
        await register()
    });

})

