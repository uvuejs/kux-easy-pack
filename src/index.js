const { start } = require("./pack");
require('dotenv').config();

async function init () {
	await start({
		allowClone: true,
		localPack: process.env.LOCAL_PACK ?? false,
		androidLocalSdk: process.env.ADNROID_SDK
	});
}

init();