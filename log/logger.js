const winston = require('winston');

function timestampToDate(timestamp) {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

const logger = winston.createLogger({
	level: 'info',
	format: winston.format.combine(
		winston.format.timestamp(),
		winston.format.printf(info => {
			return `${timestampToDate(info.timestamp)} [${info.level.toUpperCase()}:] ${info.message}`;
		})
	),
	defaultMeta: {
		service: 'user-service',
	},
	transports: [
		new winston.transports.File({
			filename: __dirname + '/error.log',
			level: 'error'
		}),
		new winston.transports.File({
			filename: __dirname + '/combined.log'
		})
	]
});

module.exports = {
	logger
}