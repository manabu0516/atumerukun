module.exports.instance = (configure, webApp, libraly, logger) => {
    const application = {};
    const context = {
        plugins: [], events : {}, tasks : {}, func : {}
    };

    application.createInstaller = (prefix, baseDir) => {

        const installer = {};

        installer.func = (name, invoker) => {
            const fname = prefix + '.' + name;
            context.func[fname] = invoker;
        };

        installer.event = (name, callback) => {
            const ename = name;
            if(context.events[ename] === undefined) {
                context.events[ename] = [];
            }
            context.events[ename].push(callback);
        };

        installer.task = (name, resolver) => {
            context.tasks[name] = resolver;
        };

        webInst = webApp.register();
        installer.web = (type, path, parameter) => {
            switch (type.toLowerCase()) {
                case 'resource' :
                    const dir = baseDir +'/'+ parameter['path'];
                    webInst.resource(prefix + '/' + path, dir);
                    logger.info("regist web resouce : " + type + ',' + prefix + '/' + path);
                    break;
                case 'get'      :
                    webInst.get(prefix + '/' + path, parameter['callback']);
                    logger.info("regist web resouce : " + type + ',' + prefix + '/' + path);
                    break;
                case 'put'      :
                    webInst.put(prefix + '/' + path, parameter['callback']);
                    logger.info("regist web resouce : " + type + ',' + prefix + '/' + path);
                    break;
                case 'post'     :
                    webInst.post(prefix + '/' + path, parameter['callback']);
                    logger.info("regist web resouce : " + type + ',' + prefix + '/' + path);
                    break;
                case 'delete'   :
                    webInst.delete(prefix + '/' + path, parameter['callback']);
                    logger.info("regist web resouce : " + type + ',' + prefix + '/' + path);
                    break;
            }
            
        };

        return installer;
    };

    application.registPlugin = (plugin) => {
        context.plugins.push(plugin);
    };

    application.callFunc = async (name, parameter) => {
        const invoker = context.func[name];
        return invoker != undefined ? invoker.apply({}, parameter) : null;
    };

    application.raiseEvent = async (name, parameter) => {
        logger.info("raise event - start : " + name);

        const callbacks = context.events[name] ? context.events[name] : [];
        for(var i=0; i<callbacks.length; i++) {
            await callbacks[i].apply({}, [name,parameter]);
        }

        logger.info("raise event - end : " + name);
    };

    application.listenServer = (port) => {
        webApp.start();
    };

    application.createTaskProcess = () => {
        return libraly.scheduler.createTaskResolver(async () => {
            const collection = [];

            const keys = Object.keys(context.tasks);
            for (let i = 0; i < keys.length; i++) {
                const key = keys[i];
                const tasks = await context.tasks[key]((name, schedule, invoker) => {
                    const tname = prefix + '.' + name;
                    const cron = libraly.cron(schedule);
                    const task = libraly.scheduler.createTask(tname, (now) => cron.match(now), invoker);
                    return task;
                });

                tasks.forEach(t => collection.push(t));
            }

            return collection;
        });
    };

    const database = libraly.database.createDatabase(configure.database.type, configure.database.configure, logger, (text) => {
        logger.info('Databse conntected. :' + text);
    });
    application.transactionDBQuery = async (invoker) => {
        try {
            await database.beginTran();
            const result = await invoker(database);
            await database.commit();
            return result;
        } catch(e) {
            await database.rollback(e);
        }
    };

    return application;
};
