
const fs = require('fs').promises;

module.exports = {
		readdir 	: fs.readdir,
		stat 		: fs.stat,
		readFile 	: fs.readFile,
		writeFile	: fs.writeFile,
		appendFile	: fs.appendFile,
		remove 		: fs.remove,
		mkdirs 		: fs.mkdirs,
		copy 		: fs.copy,
		access		: fs.access,
		rename		: fs.rename,
		
		exist : async (path) => {
			return fs.stat(path)
				.then( (stats, error) => error ? false : true)
				.catch((e) => false)
		}
};