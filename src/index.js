const config = require('./config.js');
const express = require("express");
const axios = require("axios");
const getPort = require('get-port');
const cookieParser = require('cookie-parser');
const path = require("path");
const i18n = require('i18n');
const jwtLibFactory = require('@igea/oac_jwt_helpers')
const serviceName = "frontend"
const DataModel = require('./models/DataModel');
const jwtLib = jwtLibFactory({
    secret: process.env.JWT_SECRET || config.jwt_secret,
    excludePaths: [
        `/${serviceName}/`,
        `/${serviceName}/health`
    ],
    signOptions: { expiresIn: '15m' },
    redirectTo: `/${serviceName}/`
});

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

const app = express();
let newPort = null

app.use(i18n.init);
app.use(`/${serviceName}`, express.static(path.join(__dirname, 'public')));
app.use(cookieParser());
app.use(express.json());
app.use(jwtLib.middleware); 

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
    // ---------------------------------------------------------------------
    // Defining routers
    const healthRouter = require('./controllers/health.js');
    app.use(`/${serviceName}/health`, healthRouter);

    const usersRouter = require('./controllers/users.js')(serviceName);
    app.use(`/${serviceName}/users`, usersRouter);
    // ---------------------------------------------------------------------
    app.get(`/${serviceName}`, (req, res) => {
        res.render('login', { root: serviceName, title: 'Login' });
    });
    app.get(`/${serviceName}/home`, (req, res) => {
        let data = new DataModel(req, {  
            root: serviceName, 
            title: 'Home',
        });  
        res.render('home', data.toJson());
    });
    // ---------------------------------------------------------------------
    // Start listing on the specified port
    app.listen(port, async () => {
        console.log(`${serviceName} listening on port ${port}`);
        await register()
    });
    // ---------------------------------------------------------------------
})

