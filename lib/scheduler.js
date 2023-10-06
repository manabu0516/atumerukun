class TaskResolver {
	constructor(tasks) {
		this.tasks = tasks;
	};

	async getTasks() {
		if(Array.isArray(this.tasks) === true) {
			return this.tasks;
		}

		if(typeof this.tasks == 'function') {
			return await this.tasks();
		}
	};
};

class Task {
	constructor(name, checker, invoker) {
		this.name = name;
		this.checker = checker;
		this.invoker = invoker;
	};
	
	is(now) {
		return this.checker(now);
	};
	
	async invoke() {
		await this.invoker();
	};
	
	name() {
		return this.name;
	};
};

const pool = async (context) => {
	const now = new Date();
	context.scheduler.logger.info("pooling start, [" + now + "]");
	
	if(context.scheduler.status === "stopping") {
		logger.info("scheduler is stop operation handled.");
		
		context.scheduler.status = "stopped";
		context.resolve(context.scheduler);
		return;
	}
	
	const taskResolver = context.scheduler.resolver;
	const tasks = await taskResolver.getTasks();
	
	for (var i = 0; i < tasks.length; i++) {
		var t = tasks[i];	
		
		context.scheduler.logger.info("handle task. name : " + t.name + ", id:");
		
		if(t.is(now) === false) {
			context.scheduler.logger.info("skip task, unmatch schedule. name : " + t.name);
		} else {
			context.scheduler.logger.info("kick task, name : " + t.name);
			t.invoke();
		}
		
	}
	
	setTimeout(pool, 1000 * 60, context);
	context.scheduler.logger.info("pooling end");
};

class Scheduler {
	constructor(resolver, logger) {
		this.status = "stopped";
		this.resolver = resolver;
        this.logger = logger;
	};
	
	start() {
		if(this.status !== "stopped") {
			logger.warn("start faild, status is : " + this.status);
			return;
		}
		
		this.status = "starting";
		
		return new Promise((resolve, reject) => {
			this.status = "started";
			const milliseconds = new Date().getMilliseconds();
			const seconds = 60 - new Date().getSeconds();
			
			const delay = (seconds * 1000) - milliseconds;
			this.logger.info("started scheduler. first pool is " +delay+ "[msec] delay."); 
			setTimeout(pool, delay, {
				resolve : resolve,
				reject : reject,
				scheduler : this
			});
		});
	};
	
	stop() {
		if(this.status === "stopped" || this.status === "stopping") {
			this.logger.warn("stop faild, status is : " + this.status);
			return;
		}
		
		this.logger.info("scheduler is stopping now");
		this.status = "stopping";
	}
};

module.exports.instance = (resolver, logger) => {
	return new Scheduler(resolver, logger);
};

module.exports.createTaskResolver = (tasks) => {
	return new TaskResolver(tasks);
};

module.exports.createTask = (tname, checker, invoker) => {
	return new Task(tname, checker, invoker);
};
