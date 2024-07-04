const { logger } = require("./logger");

logger.info('这是一条测试日志');

logger.warn('这是一条警告日志');

logger.error('这是一条错误日志');

try {
	const a = new Test();
} catch (e) {
	logger.error(e.stack);
}