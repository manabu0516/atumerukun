#!/usr/bin/env node
process.env.TZ = "Asia/Tokyo";

const baseDir = process.argv.length >= 3 ? process.argv[2] : process.cwd();
const moduleDir = baseDir;

const libraly = (() => {
    return {
        fileSystem  : require("./lib/filesystem"),
        scheduler   : require("./lib/scheduler"),
        cron        : require("./lib/cron"),
        httpclient  : require("./lib/httpclient"),
        webserver   : require("./lib/webserver"),
        database    : require("./lib/database"),
        log         : require("./lib/logger")
    };
})();

const logger = libraly.log.instance("SYSTEM");

logger.info("application loading now");
logger.info("    -baseDir : " + baseDir);
logger.info("    -moduleDir :" + moduleDir);

const initializer = async () => {
    const configurePath = baseDir + "/configure.json";

    if(await libraly.fileSystem.exist(configurePath) === false) {
        await libraly.fileSystem.writeFile(configurePath, JSON.stringify({
            "webserver" : {"port" : 3000,"upload" : "upload"},
            "database" : {
                "type" : "mysql",
                "configure" : {"host": "localhost","port" : 3306,"user": "node","password" : "password","dbname" : "node"}
            },
        }));
    }

    const configure = await libraly.fileSystem.readFile(configurePath, 'utf8')
		.then(text => JSON.parse(text));

    const webApp = libraly.webserver.instance({
        storage : {path:'/storage', dir:baseDir + '/storage'},
        plugin     : {path:'/plugin'},
        port    : configure.webserver.port
    }, logger);

    const pluginPaths = await libraly.fileSystem.readdir(moduleDir+"/modules/plugins");
	const plugins = [];

    const application = require("./application").instance(configure, webApp, libraly, logger);

    for(var i=0; i<pluginPaths.length; i++) {
        const pluginData = {
            name    : pluginPaths[i],
            dir     : moduleDir +"/modules/plugins/"+ pluginPaths[i]
        };

        logger.info("initialize plugin : " + pluginData.name);
        pluginData.context = await require(pluginData.dir + "/index.js")({
            logger      : libraly.log.instance(pluginData.name),
            baseDir     : baseDir,
            configure   : configure,
            libraly     : libraly,
            dir         : pluginData.dir,
            installer   : application.createInstaller(pluginData.name, pluginData.dir),
            database    : application.transactionDBQuery,
            event       : async (name, context) =>  application.raiseEvent(pluginData.name + '.' + name, context)
        });

        plugins.push(pluginData);
    }

    plugins.forEach(application.registPlugin);
    
    await application.raiseEvent("system.initialized", plugins);
    await application.listenServer(configure.webserver.port);

    const pooling = libraly.scheduler.instance(application.createTaskProcess(), logger);

    logger.info("application start");
    logger.info("    application stop -> request to http://localhost:3000/system/shutdown");

    process.on("exit", function() {
		application.raiseEvent("system.exit");
	});

    webApp._.express.get('/system/shutdown', (req, res) => {
		pooling.stop();
		res.send("ok");
	});

    webApp._.express.get('/system/plugins', (req, res) => {
		res.json({status:200, data : plugins});
	});
    
    await pooling.start();
};

process.on("SIGINT", function () {
	process.exit(0);
});

initializer()
	.then(() => logger.info("application end"))
	.then(() => process.exit());
