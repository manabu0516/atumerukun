class DatabseWrapper {
	constructor(configure, logger) {
        this.context = {};
		this.configure = configure;
        this.logger = logger;
	};

    initialize(invoker) {
        return invoker(this.context, this.configure, this.logger);
    };
	
	async selectQuery(sql, parameter) {
        return await this.context['selectQuery'].apply(this, [sql, parameter]);
	};
	
	async deleteQuery(sql, parameter) {
        return await this.context['deleteQuery'].apply(this, [sql, parameter]);
	};
	
	async insertQuery(sql, parameter) {
        return await this.context['insertQuery'].apply(this, [sql, parameter]);
	};
	
	async updateQuery(sql, parameter) {
        return await this.context['updateQuery'].apply(this, [sql, parameter]);
	};

    async run(query) {
		return await this.context['run'].apply(this, [query]);
	};

    async beginTran() {
        return await this.context['beginTran'].apply(this, []);
    };

    async commit() {
        return await this.context['commit'].apply(this, []);
    };

    async rollback(error) {
        return await this.context['rollback'].apply(this, [error]);
    };
}

const dbWrapper = {};
dbWrapper.mysql = (context, configure, logger) => {
    const mysql      = require('mysql2');
    const connection = mysql.createConnection({
        host     : configure.host,
        user     : configure.user,
        password : configure.password,
        database: configure.dbname,
        port: configure.port,
    });
    connection.connect();

    const query = (sql, parameter) => {
        return new Promise((resolve, reject) => {
			connection.query(sql, parameter, (err, result) => {
				if (err) {
					reject(err);
				} else {
					resolve(result);
				}
			});
		});
    };

    context['beginTran'] = async () => {
        return new Promise((resolve, reject) => {
            connection.beginTransaction(err => err ? reject(err) : resolve());
        });
    };
    context['commit'] = async () => {
        return new Promise((resolve, reject) => {
            connection.commit(err => err ? reject(err) : resolve());
        });
    };
    context['rollback'] = async (error) => {
        return new Promise((resolve, reject) => {
            connection.rollback( () => reject(error));
        });
    };

    context['selectQuery'] = async (sql, parameter) => {
        const result = await query(sql, parameter);
        return result;
    };
    context['deleteQuery'] = async (sql, parameter) => {
        const result = await query(sql, parameter);
        return {};
    }
    context['insertQuery'] = async (sql, parameter) => {
        const result = await query(sql, parameter);
        return result.insertId;
    };
    context['updateQuery'] = async (sql, parameter) => {
        const result = await query(sql, parameter);
        return {};
    };

    context['run'] = async (query) => {
        connection.query(query);
    };

    connection.on("trace", (sql) => {
		logger.info('db query : ' + sql);
	});

    return 'type:mysql, ' + configure.host + ':' + configure.port + '/' + configure.dbname + '@' + configure.user;
};

dbWrapper.sqlite3 = (context, configure, logger) => {
    const sqlite3 = require('sqlite3');
    const file = configure.dbfile;
	const db = new sqlite3.Database(file);

    const all = (sql, parameter) => {
        return new Promise((resolve, reject) => {
			db.all(sql, parameter, (err, result) => {
				if (err) {
					reject(err);
				} else {
					resolve(result);
				}
			});
		});
    };
    const run = (sql, parameter) => {
        return new Promise((resolve, reject) => {
			db.run(sql, parameter, function(err){
				if (err) {
					reject(err);
				} else {
					resolve(this.lastID);
				}
			});
		});
    };

    context['beginTran'] = async () => {};
    context['commit'] = async () => {};
    context['rollback'] = async (error) => {throw error};

    context['selectQuery'] = async (sql, parameter) => {
        const result = await all(sql, parameter);
        return result;
    };
    context['deleteQuery'] = async (sql, parameter) => {
        const result = await all(sql, parameter);
        return {};
    }
    context['insertQuery'] = async (sql, parameter) => {
        const insertId = await run(sql, parameter);
        return insertId;
    };
    context['updateQuery'] = async (sql, parameter) => {
        const insertId = await run(sql, parameter);
        return {};
    };

    context['run'] = async (query) => {
        db.run(query);
    };

    db.on("trace", (sql) => {
		logger.info('db query : ' + sql);
	});

    return 'type:sqlite3,'+configure.dbfile;
};

module.exports.createDatabase = (type, configure, logger, callback) => {
    const wrapper = new DatabseWrapper(configure, logger);
    const text = wrapper.initialize(dbWrapper[type]);
    callback(text);
    return wrapper;
};