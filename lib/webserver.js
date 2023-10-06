

const express = require('express');
const bodyParser = require('body-parser');

module.exports.instance = (configure, logger) => {
    const webApp = express();
    webApp.use(bodyParser.urlencoded({extended: true}));
	webApp.use(bodyParser.json());

	webApp.use(configure.storage.path, express.static(configure.storage.dir));

    const register = {
        resource : (url, path) => {
            url = configure.plugin.path +'/'+ url;
            logger.info("---- dispatch resource request : " + url + ',' + path);
            webApp.use(url, express.static(path));
        },
    
        get : (url, callback) => {
            url = configure.plugin.path +'/'+ url;
            logger.info("---- dispatch get request : " + url);
            webApp.get(url, callback);
        },
    
        put : (url, callback) => {
            url = configure.plugin.path +'/'+ url;
            logger.info("---- dispatch put request : " + url);
            webApp.put(url, callback);
        },
    
        post : (url, callback) => {
            url = configure.plugin.path +'/'+ url;
            logger.info("---- dispatch post request : " + url);
            webApp.post(url, callback);
        },
    
        delete : (url, callback) => {
            url = configure.plugin.path +'/'+ url;
            logger.info("---- dispatch delete request : " + url);
            webApp.delete(url, callback);
        }
    }

    return {
        '_' : {express : webApp},
        start : () => {webApp.listen(configure.port, () => logger.info('Web App Server Listening on port 3000'));},
        register : () => register
    };
};
