const {
	exec,
	spawn
} = require('child_process');
const fs = require('fs');
const path = require("path");
const xmldom = require('xmldom');
const xmlFormatter = require('xml-formatter');
const fsExtra = require('fs-extra');
const rimraf = require('rimraf');
const ora = require("ora");
const chalk = require("chalk");
const gjs = require('./parse/gradle-to-js');
const Handlebars = require('handlebars');
require('dotenv').config();
const _ = require('lodash');
const axios = require("axios");
const {
	reject
} = require("lodash");
const {
	stderr,
	stdout
} = require('process');
const shelljs = require('shelljs');
// require('shelljs/global');
// shelljs.config.verbose = true;
const iconv = require('iconv-lite');
const unZipService = require('./utils/unzipService');
const {
	getBaseBuildConfig
} = require('./config/buildConfig');
const { output } = require('./utils/output');
const { logger } = require('../log/logger');


/**
 * 从github仓库地址提取仓库名
 * @param url 仓库地址
 * @returns {*|null}
 */
function extractRepositoryName(url) {
	// 正则表达式匹配GitHub仓库地址
	const regex = /github\.com[:\/](.*?)(\.git)?$/;
	const match = url.match(regex);

	if (match && match[1]) {
		// 提取仓库名称
		return match[1].replace(/.*\//, ''); // 移除用户名部分
	}

	return null; // 如果没有匹配到，返回null
}

function toBoolean(value) {
	if (typeof value === 'boolean') {
		return value;
	} else if (typeof value === 'string') {
		return value.toLowerCase() === 'true';
	} else {
		return Boolean(value);
	}
}

let repositoryUrl = process.env.REPOSITORY_URL ?? 'git@github.com:kviewui/uniappx-native-android.git';
let REPOSITORY_NAME = extractRepositoryName(repositoryUrl) ?? 'uniappx-native-android';
let targetDirectory = `${process.cwd()}/${REPOSITORY_NAME}`;
let _ROOT_ = `${process.cwd()}`;
let SDK_DOWNLOAD_URL = process.env.SDK_DOWNLOAD_URL ??
	'https://web-ext-storage.dcloud.net.cn/uni-app-x/sdk/Android-uni-app-x-SDK@11848-4.19-1.zip';
let SDK_UNZIP_NAME = '';
let local_pack = toBoolean(process.env.LOCAL_PACK) ?? false;

let customConsoleLog = null;
let customSetStatusMessage = null;
let hx = null;

let cloneCommand = `git clone --branch=main --single-branch --depth=1 ${repositoryUrl}`;
const pullCommand = `git pull origin main`;
// let localPackCommand = `cd ${targetDirectory} && keytool -genkey -v -keystore app/debug.keystore -storepass ${STORE_PASSWORD} -alias ${KEY_ALIAS} -keypass ${KEY_PASSWORD} -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=Android Debug,O=Android,C=US" -ext "SAN=dns:localhost,ip:127.0.0.1" && ./gradlew :app:packageDebug`;
// let localPackCommand = './gradlew :app:packageDebug';
// let autoPackCommand = `cd ${targetDirectory} && git add . && git commit -m 'feat: auto pack uniappx' && git push origin main`;
let autoPackCommand = `git add . && git commit -m 'feat: auto pack uniappx' && git push origin main`;
const root = path.resolve(__dirname, '..', '..')
let uniappProjectPath = `${root}/${process.env.UNIAPP_NAME}`;
let appAndroidPath = `${uniappProjectPath}/unpackage/resources/app-android`;
let unixAndroidPath = `${appAndroidPath}/uniappx/app-android`;
let APP_ID = '';
let errors = [];
let cloudType = 'github';
let storePath = ''

let unixBuildGradlePath = path.join(targetDirectory, '/uniappx/', 'build.gradle');
let appBuildGradlePath = path.join(targetDirectory, '/app/', 'build.gradle');
let rootBuildGradlePath = path.join(targetDirectory, '/', 'build.gradle');
let settingsBuildGradlePath = path.join(targetDirectory, '/', 'settings.gradle');

/**
 * build.gradle的配置
 */
let baseBuildGradleConfig = getBaseBuildConfig();
let appBuildGradleConfig;
let unixBuildGradleConfig;
let moduleBuildGradleConfig;
let rootBuildGradleConfig;
let baseLocalSdk;
let baseSettingsGradle;

let packConfig = null;

function initBuildConfig() {
	baseBuildGradleConfig = getBaseBuildConfig()
	appBuildGradleConfig = {
		..._.cloneDeep(baseBuildGradleConfig)
	};

	unixBuildGradleConfig = {
		..._.cloneDeep(baseBuildGradleConfig)
	};

	moduleBuildGradleConfig = {
		..._.cloneDeep(baseBuildGradleConfig)
	};

	rootBuildGradleConfig = {
		..._.cloneDeep(baseBuildGradleConfig),
		project: {
			..._.cloneDeep(baseBuildGradleConfig.project),
			dependencies: {
				default: [],
				files: []
			}
		}
	};

	/**
	 * localSdk的配置
	 */
	baseLocalSdk = {
		localSdk: ''
	}

	/**
	 * settings.gradle的配置
	 */
	baseSettingsGradle = {
		appName: 'uniapp x',
		plugins: [],
		repositories: {
			maven: []
		}
	}
	storePath = ''
}

initBuildConfig();

function initConfig() {
	REPOSITORY_NAME = extractRepositoryName(repositoryUrl);
	// targetDirectory = `${process.cwd()}/${REPOSITORY_NAME}`;
	// cloneCommand = `cd ${_ROOT_} && git clone --branch=main --single-branch --depth=1 ${repositoryUrl}`;
	// localPackCommand = `cd ${targetDirectory} && keytool -genkey -v -keystore app/debug.keystore -storepass ${STORE_PASSWORD} -alias ${KEY_ALIAS} -keypass ${KEY_PASSWORD} -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=Android Debug,O=Android,C=US" -ext "SAN=dns:localhost,ip:127.0.0.1" && ./gradlew :app:packageDebug`;
	cloneCommand = `git clone --branch=main --single-branch --depth=1 ${repositoryUrl}`;
	if (process.platform === 'darwin') {
		localPackCommand = `${targetDirectory}/gradlew :app:packageDebug`;
	} else {
		localPackCommand = `${targetDirectory}/gradlew.bat :app:packageDebug --no-daemon`;
	}
	autoPackCommand = `cd ${targetDirectory} && git add . && git commit -m 'feat: auto pack uniappx' && git push origin main`;
	appAndroidPath = `${uniappProjectPath}/unpackage/resources/app-android`;
	unixAndroidPath = `${appAndroidPath}/uniappx/app-android`;
	unixBuildGradlePath = path.join(targetDirectory, '/uniappx/', 'build.gradle');
	appBuildGradlePath = path.join(targetDirectory, '/app/', 'build.gradle');
	rootBuildGradlePath = path.join(targetDirectory, '/', 'build.gradle');
	settingsBuildGradlePath = path.join(targetDirectory, '/', 'settings.gradle');
	// appBuildGradleConfig.localPack = local_pack;

	baseBuildGradleConfig.localPack = local_pack;
	
	baseSettingsGradle.repositories.maven = [];
	baseSettingsGradle.plugins = [];

	// initBuildConfig();
	
	output.console = customConsoleLog;
	
	errors = [];
}

const uniModulesAndroidPath = (moduleName) => {
	// return `${appAndroidPath}/uni_modules/${moduleName}/utssdk/app-android`;
	return path.join(appAndroidPath, '/uni_modules/', moduleName, '/utssdk/app-android');
}

// 删除文件或文件夹
function deleteFileOrFolder(path, callback) {
	rimraf.rimraf(path).then(r => {
		callback?.();
	});
}

async function isDirectory(filePath) {
	try {
		const stats = await fs.promises.stat(filePath);
		return stats.isDirectory();
	} catch (err) {
		console.error('获取文件信息出错:', err);
		return false;
	}
}

function removeTrailingComma(str) {
	// 检查字符串是否以逗号结尾
	if (str[str.length - 1] === ',') {
		// 删除最后的逗号
		return str.slice(0, -1);
	}
	// 如果没有逗号，返回原始字符串
	return str;
}

/**
 * 查询是否有本地打包资源
 */
function checkResourcesExists() {
	return fs.existsSync(`${appAndroidPath}`);
}

/**
 * 替换应用APPID
 */
async function updateAppid(oraSpinner) {
	try {
		// 定义要查找的目录名称的前缀
		const prefix = '__UNI__';
		const metaDataName = 'DCLOUD_UNI_APPID';

		// 遍历目录
		const directories = (await fs.promises.readdir(appAndroidPath)).filter(file => file.toString().startsWith(
			prefix));

		if (directories.length === 0) {
			output.error('未发现UNI应用资源包', customConsoleLog);
			oraSpinner.fail('未发现UNI应用资源包');
			logger.error('未发现UNI应用资源包');
			return;
		}

		APP_ID = directories[0];
		// 读取 AndroidMainfest.xml 文件
		// const manifestPath = `${targetDirectory}/uniappx/src/main/AndroidManifest.xml`;
		const manifestPath = path.join(targetDirectory, '/uniappx/src/main/AndroidManifest.xml');
		const xml = await fs.promises.readFile(manifestPath, 'utf-8');

		// 解析 XML 字符串
		const doc = new xmldom.DOMParser().parseFromString(xml);

		// 获取所有具有指定 name 的 meta-data 元素
		const metaDataElements = doc.getElementsByTagName('meta-data');
		for (let i = 0; i < metaDataElements.length; i++) {
			const element = metaDataElements[i];
			const nameAttribute = element.getAttribute('android:name');

			// 检查name属性是否与指定的name匹配
			if (nameAttribute === metaDataName) {
				// 替换value值
				element.setAttribute('android:value', APP_ID);
				break;
			}
		}

		// 生成修改后的 XML 字符串
		const updatedXML = new xmldom.XMLSerializer().serializeToString(doc);
		// 写回 AndroidManifest.xml 文件
		await fs.promises.writeFile(manifestPath, xmlFormatter(updatedXML), {
			encoding: 'utf8',
		});
		output.success('查找替换应用ID完成', customConsoleLog);
		oraSpinner.succeed('查找替换应用ID完成');
		logger.info('查找替换应用ID完成');
	} catch (e) {
		output.error(e.message, customConsoleLog);
		logger.error(e.stack);
		console.error(e);
		throw e;
	}
}

async function updateTargetResources(target, dest) {
	try {
		// 判断文件是否存在
		if (fs.existsSync(target)) {
			deleteFileOrFolder(target, () => {
				fsExtra.copySync(dest, target);
				// console.log(completeText);
			})
		} else {
			fsExtra.copySync(dest, target);
			// console.log(completeText);
		}
	} catch (e) {
		output.error(e.message, customConsoleLog);
		console.error(e);
		throw e;
	}
}

async function copyAppIcon (
	hdpi,
	hdpiType = 'hdpi',
	uniIconPath = path.join(uniappProjectPath, '/unpackage/res/icons/'), 
	appIconPath = path.join(targetDirectory, '/app/src/main/res/'), 
	iconName = 'ic_launcher'
) {
	try {
		const hdpiPngPath = path.join(uniIconPath, `${hdpi}x${hdpi}.png`);
		if (fs.existsSync(hdpiPngPath)) {
			const hdpiWebpPath = path.join(appIconPath, `/mipmap-${hdpiType}/`, `${iconName}.webp`);
			if (fs.existsSync(hdpiWebpPath)) {
				fsExtra.rmSync(hdpiWebpPath);
			}
			fsExtra.copyFileSync(hdpiPngPath, path.join(appIconPath, `/mipmap-${hdpiType}/`, `${iconName}.png`));
		}
	} catch (e) {
		throw e;
	}
}

async function updateAppIcon() {
	try {
		const uniIconPath = path.join(uniappProjectPath, '/unpackage/res/icons/');
		const appIconPath = path.join(targetDirectory, '/app/src/main/res/');
		const iconName = 'ic_launcher';
		if (fs.existsSync(uniIconPath)) {
			const tips = '发现自定义图标，开始替换...'
			const spinner = ora(tips)
			output.warn(tips, customConsoleLog)
			logger.info(tips)
			const anydpiPath = path.join(appIconPath, '/mipmap-anydpi-v26/');
			if (fs.existsSync(anydpiPath)) {
				fsExtra.emptyDirSync(anydpiPath)
				fsExtra.rmdirSync(anydpiPath)
			}
			await copyAppIcon('72')
			await copyAppIcon('96', 'mdpi')
			await copyAppIcon('144', 'xhdpi')
			await copyAppIcon('192', 'xxhdpi')
			await copyAppIcon('1024', 'xxxhdpi')
			spinner.succeed()
			const completeTips = '自定义图标替换完成'
			output.success(completeTips, customConsoleLog)
			logger.info(completeTips)
		}
	} catch (e) {
		throw e;
	}
}

/**
 * 替换本地打包资源中的 `__UNI__` 发行包
 */
async function updateAppResources() {
	try {
		const target = path.join(targetDirectory, '/app/src/main/assets/apps/', APP_ID);
		fsExtra.emptydirSync(path.join(targetDirectory, '/app/src/main/assets/apps/'));
		const dest = path.join(appAndroidPath, '/', APP_ID);
		await updateTargetResources(target, dest);
		await updateAppIcon()
	} catch (error) {
		throw error;
	}
}

/**
 * 替换本地打包资源中的 `uniappx` 发行包
 */
async function updateUnixSrc(oraSpinner) {
	try {
		// 拷贝libs
		await copyUnixLibs([
			'uts-runtime-release.aar',
			'android-gif-drawable-1.2.28.aar',
			'app-common-release.aar',
			'app-runtime-release.aar',
			'breakpad-build-release.aar',
			'dcloud-layout-release.aar',
			'framework-release.aar',
			'uni-exit-release.aar',
			'uni-getAccessibilityInfo-release.aar',
			'uni-getAppAuthorizeSetting-release.aar',
			'uni-getAppBaseInfo-release.aar',
			'uni-getSystemSetting-release.aar',
			'uni-openAppAuthorizeSetting-release.aar',
			'uni-prompt-release.aar',
			'uni-storage-release.aar',
			'uni-getDeviceInfo-release.aar',
			'uni-getSystemInfo-release.aar',
			'debug-server-release.aar'
		]);
		// const unixMainDirectory = `${targetDirectory}/uniappx/src/main/java`;
		const unixMainDirectory = path.join(targetDirectory, '/uniappx/src/main/java');
		fsExtra.emptydirSync(unixMainDirectory);
		// 替换pages资源
		// await updateTargetResources(path.join(unixMainDirectory, '/', 'pages'), path.join(unixAndroidPath,
		// 	'/src/pages/index/'));
		fsExtra.copySync(path.join(unixAndroidPath, '/src/'), path.join(targetDirectory, '/uniappx/src/main/java/'));
		let msg = '替换uniappx页面资源完成';
		// output.success(msg, customConsoleLog);
		// oraSpinner.succeed(msg);
		// // 替换index.kt
		// await updateTargetResources(path.join(unixMainDirectory, '/', 'index.kt'), path.join(unixAndroidPath,
		// 	'/src/index.kt'));
		
		// msg = '替换uniappx入口kt文件完成';
		output.success(msg, customConsoleLog);
		oraSpinner.succeed(msg);
		logger.info(msg);
	} catch (e) {
		output.error(e.message, customConsoleLog);
		console.error(e);
		throw e;
	}
}

function toCamelCase(str) {
	return str.replace(/-(\w)/g, function(match, char) {
		return char.toUpperCase();
	});
}

function escapeJsonString(json) {
	// 将JSON对象转换为字符串
	let jsonString = JSON.stringify(json);

	// 替换双引号和反斜杠
	jsonString = jsonString.replace(/"/g, '\\\"').replace(/\\/g, '\\\\');

	return jsonString;
}

/**
 * 更新模块依赖
 * @param dependency
 */
function updateDependencies(dependency, type = 'app') {
	if (type === 'app') {
		if (!appBuildGradleConfig.dependencies.default.includes(dependency)) {
			appBuildGradleConfig.dependencies.default.push(dependency);
		}
	}
	if (type === 'unix') {
		if (!unixBuildGradleConfig.dependencies.default.includes(dependency)) {
			unixBuildGradleConfig.dependencies.default.push(dependency);
		}
	}
}

function updateAppDependencies(dependencies = []) {
	dependencies.map((item) => {
		updateDependencies(item);
	});
}

const dirname = (filePath) => path.join(__dirname, filePath);

// 编译模版
const templateApp = Handlebars.compile(fs.readFileSync(dirname('./app.build.gradle.hbs'), 'utf-8'));
const templateUnix = Handlebars.compile(fs.readFileSync(dirname('./uniappx.build.gradle.hbs'), 'utf-8'));
const templateModule = Handlebars.compile(fs.readFileSync(dirname('./module.build.gradle.hbs'), 'utf-8'));
const templateRoot = Handlebars.compile(fs.readFileSync(dirname('./build.gradle.hbs'), 'utf-8'));
const templateLocalSdk = Handlebars.compile(fs.readFileSync(dirname('./local.properties.hbs'), 'utf-8'));
const templateSettings = Handlebars.compile(fs.readFileSync(dirname('./settings.gradle.hbs'), 'utf-8'));

/**
 * 编译build.gradle模板
 * @param gradlePath build.gradle 文件路径
 * @param moduleType 模块类型
 */
async function compileBuildGradle(gradlePath, moduleType = 'app') {
	try {
		if (fsExtra.existsSync(gradlePath)) {
			fsExtra.rmSync(gradlePath);
		}
		let buildGradleContent = '';
		if (moduleType === 'unix') {
			buildGradleContent = templateUnix(unixBuildGradleConfig);
		} else if (moduleType === 'module') {
			buildGradleContent = templateModule(moduleBuildGradleConfig);
		} else if (moduleType === 'root') {
			buildGradleContent = templateRoot(rootBuildGradleConfig);
		} else if (moduleType === 'settings') {
			buildGradleContent = templateSettings(baseSettingsGradle);
		} else {
			buildGradleContent = templateApp(appBuildGradleConfig);
		}
		
		console.log(gradlePath);

		// 将内容写入文件
		// fs.writeFileSync(gradlePath, buildGradleContent);
		fsExtra.writeFileSync(gradlePath, buildGradleContent)
	} catch (e) {
		output.info(e.message, customConsoleLog);
		console.error(e);
		throw e;
	}
}

/**
 * 编译全局模块build.gradle模板
 */
async function compileAllBuildGradle() {
	try {
		await compileBuildGradle(unixBuildGradlePath, 'unix');
		await compileBuildGradle(rootBuildGradlePath, 'root');
		await compileBuildGradle(settingsBuildGradlePath, 'settings');
		await compileBuildGradle(appBuildGradlePath);
	} catch (e) {
		throw e;
	}
}

function matchDependiesSource(source) {
	const regex = /implementation\s*['"]([^'"]+)['"]/;

	return source.match(regex)[1];
}

/**
 * 替换本地打包资源中的 `uni_modules` 发行包
 */
async function updateUniModulesSrc() {
	try {
		// 遍历uni_modules插件
		const uniModulesPath = path.join(appAndroidPath, '/', 'uni_modules');
		if (fsExtra.existsSync(uniModulesPath)) {
			const directories = await fs.promises.readdir(uniModulesPath);
			if (directories.length > 0) {
				directories.map(async (item) => {
					if (item !== '.DS_Store' && await isDirectory(`${uniModulesAndroidPath(item)}`)) {
						// 从基础模块中创建该uts插件模块
						fsExtra.copySync(path.join(targetDirectory, '/', 'uni-modules-base'), path.join(
							targetDirectory, '/', item));
						// 拷贝模块的libs所有文件
						const libsPath = path.join(uniModulesAndroidPath(item), '/libs/');
						if (fs.existsSync(libsPath)) {
							fsExtra.copySync(libsPath, path.join(targetDirectory, '/', item, '/libs/'));
							// 同步主模块
							fsExtra.copySync(libsPath, path.join(targetDirectory, '/app/libs/'));
						}
						// 拷贝模块的assets所有文件
						const assetsPath = path.join(uniModulesAndroidPath(item), '/app/assets/');
						if (fs.existsSync(assetsPath)) {
							fsExtra.copySync(assetsPath, path.join(targetDirectory, '/', item,
								'/src/main/assets/'));
						}
						// 拷贝模块的res所有文件
						const resPath = path.join(uniModulesAndroidPath(item), '/res/');
						if (fs.existsSync(resPath)) {
							fsExtra.copySync(resPath, path.join(targetDirectory, '/', item,
								'/src/main/res/'));
						}
						// 拷贝模块的AndroidManifest.xml
						const amxPath = path.join(uniModulesAndroidPath(item), '/', 'AndroidManifest.xml');
						const targetAmxPath = path.join(targetDirectory, '/', item,
							'/src/main/AndroidManifest.xml');
						if (fs.existsSync(amxPath)) {
							fsExtra.copySync(amxPath, targetAmxPath);
						}
						// 这里需要特殊处理xml，删除package字段，并将package字段值设置到模块的build.gradle的namespace中
						const xml = await fs.promises.readFile(targetAmxPath, 'utf-8');
						// 解析 XML 字符串
						const doc = new xmldom.DOMParser().parseFromString(xml);
						// 获取所有具有指定 name 的 meta-data 元素
						const metaDataElements = doc.getElementsByTagName('manifest');
						let packageName = metaDataElements[0].getAttribute('package');
						packageName = packageName.length > 0 ? packageName :
							`uts.sdk.modules.${toCamelCase(item)}`;
						const packageNode = metaDataElements[0];
						// 删除package节点
						if (packageNode) {
							packageNode.removeAttribute('package')
						}
						// 将修改后的XML转换回字符串
						const serializer = new xmldom.XMLSerializer();
						const updatedXmlString = serializer.serializeToString(doc);
						// 写回 AndroidManifest.xml 文件
						await fs.promises.writeFile(targetAmxPath, xmlFormatter(updatedXmlString), {
							encoding: 'utf8',
						});
						// 这里是获取build.gradle文件内容并替换android节点下面的namesapce值为package
						moduleBuildGradleConfig.packageName = packageName;
						// 拷贝模块的src所有文件
						fsExtra.copySync(path.join(uniModulesAndroidPath(item), '/src/'), path.join(
							targetDirectory, '/', item, '/src/main/java/'));
						// 将该依赖追加到uniappx模块，主模块和全局settings.gradle中
						const projectContent = `:${item}`;
						if (!unixBuildGradleConfig.dependencies.project.includes(projectContent)) {
							unixBuildGradleConfig.dependencies.project.push(projectContent);
						}
						if (!appBuildGradleConfig.dependencies.project.includes(projectContent)) {
							appBuildGradleConfig.dependencies.project.push(projectContent);
						}
						if (!baseSettingsGradle.plugins.includes(projectContent)) {
							baseSettingsGradle.plugins.push(projectContent);
						}
			
						/**
						 * 根据uts插件中的config.json配置应用
						 */
						// 获取config.json文件
						const configJsonPath = path.join(uniModulesAndroidPath(item), '/', 'config.json')
						if (fsExtra.existsSync(configJsonPath)) {
							const json = await fs.promises.readFile(configJsonPath, 'utf-8');
							const jsonData = JSON.parse(json);
							// 判断是否有abis配置
							let abis = '';
							if (jsonData['abis']?.length) {
								jsonData['abis'].map(item => {
									abis += `"${item}",`
								})
								abis = removeTrailingComma(abis);
							}
							console.log(item);
							moduleBuildGradleConfig.abis = abis;
							// 设置minSdk
							if (jsonData['minSdkVersion'] > 0) {
								moduleBuildGradleConfig.minSdkVersion = parseInt(jsonData['minSdkVersion']);
							}
							// 设置依赖
							if (jsonData['dependencies']?.length) {
								jsonData['dependencies'].map((item) => {
									if (item instanceof Object && item?.source) {
										if (!moduleBuildGradleConfig.dependencies.default.includes(
												matchDependiesSource(item.source))) {
											moduleBuildGradleConfig.dependencies.default.push(
												matchDependiesSource(item.source));
										}
									} else {
										if (!moduleBuildGradleConfig.dependencies.default.includes(
												item)) {
											moduleBuildGradleConfig.dependencies.default.push(item);
										}
									}
								})
							}
							// 设置默认project
							if (jsonData['project']) {
								moduleBuildGradleConfig.project.plugins = jsonData['project']?.plugins ?? [];
								rootBuildGradleConfig.project.dependencies.default = jsonData['project']
									?.dependencies ?? [];
							}
							// 设置hooksClass信息
							if (jsonData?.hooksClass) {
								let hooksClass = `{\\"${jsonData['hooksClass']}\\"}`;
								const configContent = `"String[]", "UTSHooksClassArray", "${hooksClass}"`;
								appBuildGradleConfig.buildFeatures.buildConfig = true;
								if (!appBuildGradleConfig.defaultConfig.buildConfigField.includes(
										configContent)) {
									appBuildGradleConfig.defaultConfig.buildConfigField.push(configContent);
								}
							}
							// 设置uts组件信息
							if (jsonData?.components) {
								let components = escapeJsonString(jsonData['components']).replace(/\\\\/g,
									"\\\\\\");
								const configContent =
									`"String", "UTSRegisterComponents", "\\"${components}\\""`;
									appBuildGradleConfig.buildFeatures.buildConfig = true;
								if (!appBuildGradleConfig.defaultConfig.buildConfigField.includes(
										configContent)) {
									appBuildGradleConfig.defaultConfig.buildConfigField.push(configContent);
								}
							}
						}
						/**
						 * 编译所有的build.gradle文件
						 */
						const moduleBuildGradlePath = path.join(targetDirectory, '/', item, '/',
							'build.gradle');
			
						await compileBuildGradle(moduleBuildGradlePath, 'module');
					}
				})
			}
		}
	} catch (e) {
		output.info(e.message, customConsoleLog);
		console.log(e)
		throw e;
	}
}

// 记录下载开始的时间
let startTime = null;

/**
 * 下载压缩包
 * @param url
 * @param outputPath
 * @returns {Promise<unknown>}
 */
async function downloadZip(url, outputPath) {
	let downloadedBytes = 0;
	let startTime = 0;
	try {
		fsExtra.emptydirSync(path.join(_ROOT_, '/SDK/uniappx/'));
		customSetStatusMessage?.('开始下载uni-app x Android离线打包SDK...');
		// const downloadSDKMessage = customSetStatusMessage?.('开始下载uni-app x Android离线打包SDK...');
		// 记录下载开始的时间
		startTime = Date.now();
		if (!fs.existsSync(path.join(_ROOT_, '/SDK/uniappx/'))) {
			await fs.promises.mkdir(path.join(_ROOT_, '/SDK/uniappx/'));
		}
		if (fs.existsSync(outputPath)) {
			// await fs.promises.unlink(outputPath);
			rimraf.rimrafSync(outputPath, {
				recursive: true
			});
		}
		const writeStream = fs.createWriteStream(outputPath);

		const response = await axios({
			url: url,
			method: 'GET',
			responseType: 'stream'
			// httpsAgent: new https.Agent({ rejectUnauthorized: false })
		});
		
		let success = true;
		
		if (response.status <200 || response.status >= 300) {
			if (hx != null) {
				await hx.window.showErrorMessage('安卓离线SDK下载失败，请看控制台详情。');
				console.error(response);
				logger.error(response);
				output.error(`status: ${response.status}, statusText：${response.statusText}`, customConsoleLog);
			}
			success = false;
		}

		response.data.pipe(writeStream);

		// 监听下载进度
		const cliProgress = require('cli-progress');
		const _colors = require('ansi-colors');
		let percentCompleted = 0;
		const bar = new cliProgress.Bar({
			format: '安卓离线SDK下载进度 |' + _colors.green('{bar}') +
				'| {percentage}% || {value}/{total} Chunks || Speed: {speed}',
			barCompleteChar: '\u2588',
			barIncompleteChar: '\u2591',
			hideCursor: true
		});
		bar.start(response.headers['content-length'], 0, {
			speed: "N/A"
		});
		response.data.on('data', (chunk) => {
			downloadedBytes += chunk.length;
			percentCompleted = Math.round((downloadedBytes / response.headers['content-length']) * 100);
			// 计算下载速度
			const elapsedTime = (Date.now() - startTime) * 1000;
			const downloadSpeed = downloadedBytes / elapsedTime; // 字节/秒
			const downloadSpeedMessage = customSetStatusMessage?.(
				`安卓离线SDK下载进度 | ${percentCompleted}% || ${downloadedBytes}/${response.headers['content-length']} Chunks || Speed: ${(downloadSpeed / 8).toFixed(2)} Mb/s`
			);
			bar.update(downloadedBytes, {
				speed: `${(downloadSpeed / 8).toFixed(2)} Mb/s`,
				percentage: percentCompleted
			});
			if (percentCompleted > 100) {
				bar.stop();
				downloadSDKMessage.dispose();
				logger.info('uni-app x Android离线打包SDK下载完成');
				output.success('uni-app x Android离线打包SDK下载完成', customConsoleLog);
			}
		});

		return new Promise((resolve, reject) => {
			writeStream.on('error', () => {
				bar.stop();
				reject()
			});
			writeStream.on('finish', () => {
				bar.stop();
				resolve(success);
			});
		});
	} catch (e) {
		hx.window.showErrorMessage('安卓离线SDK下载失败，请看控制台详情。');
		output.error(`【下载安卓离线打包SDK异常】${e.message}`, customConsoleLog);
		console.log(e);
		throw e;
	}
}

async function copyAppLibs(libs) {
	try {
		if (!fs.existsSync(path.join(targetDirectory, '/app/libs/'))) {
			await fs.promises.mkdir(path.join(targetDirectory, '/app/libs/'));
		}
		await Promise.all(libs.map(async lib => {
			await fsExtra.copySync(path.join(_ROOT_, '/SDK/uniappx/libs/', SDK_UNZIP_NAME,
				'/SDK/libs/', lib), path.join(targetDirectory, '/app/libs/', lib));
		}));
	} catch (e) {
		output.info(e.message, customConsoleLog);
		console.log(e);
		throw e;
	}
}

async function copyUnixLibs(libs) {
	try {
		if (!fs.existsSync(path.join(targetDirectory, '/uniappx/libs/'))) {
			await fs.promises.mkdir(path.join(targetDirectory, '/uniappx/libs/'));
		}
		await Promise.all(libs.map(async lib => {
			await fsExtra.copySync(path.join(_ROOT_, '/SDK/uniappx/libs/', SDK_UNZIP_NAME,
				'/SDK/libs/', lib), path.join(targetDirectory, '/uniappx/libs/', lib));
		}));
	} catch (e) {
		output.info(e.message, customConsoleLog);
		console.log(e);
		throw e;
	}
}

async function copyPlugins(plugins) {
	try {
		const pathPlugins = path.join(targetDirectory, '/', 'plugins/');
		if (!fs.existsSync(pathPlugins)) {
			await fs.promises.mkdir(pathPlugins);
		}
		fsExtra.emptydirSync(pathPlugins);
		await Promise.all(plugins.map(async plugin => {
			await fsExtra.copySync(path.join(_ROOT_, '/SDK/uniappx/libs/', SDK_UNZIP_NAME,
				'/plugins/', plugin), path.join(targetDirectory, '/plugins/', plugin));
		}));
	} catch (e) {
		output.info(e.message, customConsoleLog);
		console.log(e);
		logger.warn(e.stack);
		throw e;
	}
}

/**
 * 更新内置模块
 * @returns {Promise<void>}
 */
async function updateBuildInModules() {
	try {
		// 读取uniapp x项目根目录的manifest.json
		const json = await fs.promises.readFile(path.join(appAndroidPath, APP_ID, '/www/', 'manifest.json'),
			'utf-8');
		const manifest = JSON.parse(json);
		/**
		 * 更新应用版本信息
		 */
		// 更新应用名
		const targetAmxPath = path.join(targetDirectory, '/app/src/main/res/values/', 'strings.xml');
		const xml = await fs.promises.readFile(targetAmxPath, 'utf-8');
		// 解析 XML 字符串
		const doc = new xmldom.DOMParser().parseFromString(xml);
		// 获取所有具有指定 name 的 string 元素
		const selectedElements = doc.documentElement.getElementsByTagNameNS('*', 'string');
		let appName = 'uniapp x';

		// 遍历并输出找到的节点
		for (let i = 0; i < selectedElements.length; i++) {
			const element = selectedElements[i];
			if (element.getAttribute('name') === 'app_name') {
				appName = manifest?.name ?? 'uniapp x';
				element.textContent = appName;
				baseSettingsGradle.appName = appName;
			}
		}
		// 将修改后的XML转换回字符串
		const serializer = new xmldom.XMLSerializer();
		const updatedXmlString = serializer.serializeToString(doc);
		// 写回 xml 文件
		await fs.promises.writeFile(targetAmxPath, xmlFormatter(updatedXmlString), {
			encoding: 'utf8',
		});
		// 更新版本名称
		if (manifest?.version?.name) {
			appBuildGradleConfig.versionName = manifest.version.name;
		}
		// 更新版本号
		if (manifest?.version?.code) {
			appBuildGradleConfig.versionCode = parseInt(manifest.version.code);
		}
		const projectFiles = [
			'plugins/uts-kotlin-compiler-plugin-0.0.1.jar',
			'plugins/uts-kotlin-gradle-plugin-0.0.1.jar'
		];
		projectFiles.map(item => {
			if (!rootBuildGradleConfig.project.dependencies.files.includes(item)) {
				rootBuildGradleConfig.project.dependencies.files.push(item);
			}
		});
		// 更新uniapp模块gradle配置
		if (!unixBuildGradleConfig.project.plugins.includes('io.dcloud.uts.kotlin')) {
			unixBuildGradleConfig.project.plugins.push('io.dcloud.uts.kotlin');
		}
		let mainConfig = packConfig ?? manifest?.app?.distribute?.modules;
		/**
		 * 更新内置模块信息
		 */
		if (mainConfig) {
			const modules = mainConfig;
			// uni-ad 模块
			if (modules['uni-ad']) {
				// 这里是同步本地依赖库的步骤
				await copyAppLibs([
					'uni-ad-release.aar',
					'uni-ad-splash-release.aar',
					'uniad-native-release.aar'
				]);
				const module = modules['uni-ad'];
				// 腾讯优量汇广告联盟
				if (module?.gdt) {
					// 这里是同步本地依赖库的步骤
					await copyAppLibs([
						'uniad-gdt-release.aar',
						'GDTSDK.unionNormal.aar'
					]);
				}
				// 穿山甲
				if (module?.gm) {
					// 这里是同步本地依赖库的步骤
					await copyAppLibs([
						'uniad-gromore-release.aar',
						'open_ad_sdk.aar'
					]);
				}
				// 快手
				if (module?.ks) {
					// 这里是同步本地依赖库的步骤
					await copyAppLibs([
						'uniad-ks-release.aar',
						'ks_adsdk-ad.aar'
					]);
				}
				// 百度
				if (module?.bd) {
					// 这里是同步本地依赖库的步骤
					await copyAppLibs([
						'uniad-bd-release.aar',
						'Baidu_MobAds_SDK.aar'
					]);
				}
				// sigmob
				if (module?.sgm) {
					// 这里是同步本地依赖库的步骤
					await copyAppLibs([
						'uniad-sgm-release.aar',
						'windAd.aar',
						'wind-common.aar'
					]);
				}
				// 添加联盟ID
				if (!module?.DCLOUDUnionId) {
					const error =
						'【uni-ad】请在项目manifest.json文件中的app -> distribute -> modules -> uni-ad -> 节点下添加 DCLOUDUnionId 的值，示例：DCLOUDUnionId: "xxx"。 说明：联盟ID位于：[uni-AD后台](https://uniad.dcloud.net.cn/)->首页->联盟ID';
					if (!errors.includes(error)) {
						errors.push(error);
					}
				} else {
					appBuildGradleConfig.buildFeatures.buildConfig = true;
					appBuildGradleConfig.defaultConfig.buildConfigField.push(
						`"String", "DCLOUDUnionId", "\\"\`${module?.DCLOUDUnionId ?? ''}\`\\""`
					)
				}
			}
			// uni-facialRecognitionVerify 模块
			if (modules['uni-facialRecognitionVerify']) {
				// 这里是同步本地依赖库的步骤
				await copyAppLibs([
					'APSecuritySDK-DeepSec-7.0.1.20230914.jiagu.aar',
					'Android-AliyunFaceGuard-10042.aar',
					'aliyun-base-2.3.7-20231102102722.aar',
					'aliyun-facade-2.3.7-20231102102722.aar',
					'aliyun-face-2.3.7-20231102102722.aar',
					'aliyun-faceaudio-2.3.7-20231102102722.aar',
					'aliyun-facelanguage-2.3.7-20231102102722.aar',
					'aliyun-wishverify-2.3.7-20231102102722.aar',
					'facialRecognitionVerify-support-release.aar',
					'uni-facialRecognitionVerify-release.aar'
				]);
				// 同步线上依赖
				updateAppDependencies([
					'com.squareup.okhttp3:okhttp:3.11.0',
					'com.squareup.okio:okio:1.14.0',
					'com.alibaba:fastjson:1.2.83',
					'com.aliyun.dpa:oss-android-sdk:+'
				]);
			}
			// uni-payment
			if (modules['uni-payment']) {
				const module = modules['uni-payment'];
				// 支付宝支付
				if (module?.alipay) {
					// 这里是同步本地依赖库的步骤
					await copyAppLibs([
						'uni-payment-release.aar',
						'uni-payment-alipay-release.aar'
					]);
					// 同步线上依赖
					updateAppDependencies([
						'com.alipay.sdk:alipaysdk-android:15.8.17'
					]);
				}
				if (module?.wxpay) {
					// 这里是同步本地依赖库的步骤
					await copyAppLibs([
						'uni-payment-release.aar',
						'uni-payment-wxpay-release.aar'
					]);
					// 同步线上依赖
					updateAppDependencies([
						'com.tencent.mm.opensdk:wechat-sdk-android:6.8.0'
					])
				}
			}
			// uni-push
			if (modules['uni-push']) {
				// 这里是同步本地依赖库的步骤
				await copyAppLibs([
					'uni-push-release.aar',
					'gt-lib.aar'
				]);
				// Gradle配置
				// rootBuildGradleConfig.repositories.jcenter = true;
				// rootBuildGradleConfig.repositories.google = true;
				const maven = 'https://mvn.getui.com/nexus/content/repositories/releases';
				if (!baseSettingsGradle.repositories.maven.includes(maven)) {
					baseSettingsGradle.repositories.maven.push(maven);
				}
				const module = modules['uni-push'];
				const manifestPlaceholders = appBuildGradleConfig.defaultConfig.manifestPlaceholders;
				if (!module?.GETUI_APPID) {
					const error =
						'【uni-push】请在项目manifest.json文件中的app -> distribute -> modules -> uni-push 节点下添加 GETUI_APPID 的值，示例：GETUI_APPID: "xxx"。GETUI_APPID与PUSH_APPID在[开发者中心](https://dev.dcloud.net.cn/)->uni-push->2.0->消息推送->配置管理->应用配置->AppID，请务必填写一致。参考：[uni-push2.0配置](https://uniapp.dcloud.net.cn/unipush-v2.html#%E7%AC%AC%E4%BA%8C%E6%AD%A5-%E9%85%8D%E7%BD%AE)'
					if (!errors.includes(error)) {
						errors.push(error);
					}
				} else {
					appBuildGradleConfig.defaultConfig.allowManifestPlaceholders = true;
					manifestPlaceholders.GETUI_APPID = module?.GETUI_APPID ?? '';
				}

				if (!module?.PUSH_APPID) {
					const error =
						'【uni-push】请在项目manifest.json文件中的app -> distribute -> modules -> uni-push 节点下添加 PUSH_APPID 的值，示例：PUSH_APPID: "xxx"。GETUI_APPID与PUSH_APPID在[开发者中心](https://dev.dcloud.net.cn/)->uni-push->2.0->消息推送->配置管理->应用配置->AppID，请务必填写一致。参考：[uni-push2.0配置](https://uniapp.dcloud.net.cn/unipush-v2.html#%E7%AC%AC%E4%BA%8C%E6%AD%A5-%E9%85%8D%E7%BD%AE)'
					if (!errors.includes(error)) {
						errors.push(error);
					}
				} else {
					appBuildGradleConfig.defaultConfig.allowManifestPlaceholders = true;
					manifestPlaceholders.PUSH_APPID = module?.PUSH_APPID ?? '';
				}

				if (!module?.dcloud_unipush_auto_notification) {
					const error =
						'【uni-push】请在项目manifest.json文件中的app -> distribute -> modules -> uni-push 节点下添加 dcloud_unipush_auto_notification 的值，示例：dcloud_unipush_auto_notification: true。透传时是否自动创建通知，布尔类型。'
					if (!errors.includes(error)) {
						errors.push(error);
					}
				} else {
					appBuildGradleConfig.defaultConfig.allowManifestPlaceholders = true;
					manifestPlaceholders.dcloud_unipush_auto_notification = module
						?.dcloud_unipush_auto_notification ?? false;
				}

				if (!module?.MIPUSH_APPID) {
					const error =
						'【uni-push】请在项目manifest.json文件中的app -> distribute -> modules -> uni-push 节点下添加 MIPUSH_APPID 的值，示例：MIPUSH_APPID: "xxx"。小米推送APPID。参考：[uni-push2.0配置](https://uniapp.dcloud.net.cn/unipush-v2.html#%E7%AC%AC%E4%BA%8C%E6%AD%A5-%E9%85%8D%E7%BD%AE)'
					if (!errors.includes(error)) {
						errors.push(error);
					}
				} else {
					appBuildGradleConfig.defaultConfig.allowManifestPlaceholders = true;
					manifestPlaceholders.MIPUSH_APPID = module?.MIPUSH_APPID ?? '';
				}

				if (!module?.MIPUSH_APPKEY) {
					const error =
						'【uni-push】请在项目manifest.json文件中的app -> distribute -> modules -> uni-push 节点下添加 MIPUSH_APPKEY 的值，示例：MIPUSH_APPKEY: "xxx"。小米推送APPKEY。参考：[uni-push2.0配置](https://uniapp.dcloud.net.cn/unipush-v2.html#%E7%AC%AC%E4%BA%8C%E6%AD%A5-%E9%85%8D%E7%BD%AE)'
					if (!errors.includes(error)) {
						errors.push(error);
					}
				} else {
					appBuildGradleConfig.defaultConfig.allowManifestPlaceholders = true;
					manifestPlaceholders.MIPUSH_APPKEY = module?.MIPUSH_APPKEY ?? '';
				}

				if (!module?.MEIZUPUSH_APPID) {
					const error =
						'【uni-push】请在项目manifest.json文件中的app -> distribute -> modules -> uni-push 节点下添加 MEIZUPUSH_APPID 的值，示例：MEIZUPUSH_APPID: "xxx"。魅族推送APPID。参考：[uni-push2.0配置](https://uniapp.dcloud.net.cn/unipush-v2.html#%E7%AC%AC%E4%BA%8C%E6%AD%A5-%E9%85%8D%E7%BD%AE)'
					if (!errors.includes(error)) {
						errors.push(error);
					}
				} else {
					appBuildGradleConfig.defaultConfig.allowManifestPlaceholders = true;
					manifestPlaceholders.MEIZUPUSH_APPID = module?.MEIZUPUSH_APPID ?? '';
				}

				if (!module?.MEIZUPUSH_APPKEY) {
					const error =
						'【uni-push】请在项目manifest.json文件中的app -> distribute -> modules -> uni-push 节点下添加 MEIZUPUSH_APPKEY 的值，示例：MEIZUPUSH_APPKEY: "xxx"。魅族推送APPKEY。参考：[uni-push2.0配置](https://uniapp.dcloud.net.cn/unipush-v2.html#%E7%AC%AC%E4%BA%8C%E6%AD%A5-%E9%85%8D%E7%BD%AE)'
					if (!errors.includes(error)) {
						errors.push(error);
					}
				} else {
					appBuildGradleConfig.defaultConfig.allowManifestPlaceholders = true;
					manifestPlaceholders.MEIZUPUSH_APPKEY = module?.MEIZUPUSH_APPKEY ?? '';
				}

				if (!module?.OPPOPUSH_APPKEY) {
					const error =
						'【uni-push】请在项目manifest.json文件中的app -> distribute -> modules -> uni-push 节点下添加 OPPOPUSH_APPKEY 的值，示例：OPPOPUSH_APPKEY: "xxx"。OPPO推送APPKEY。参考：[uni-push2.0配置](https://uniapp.dcloud.net.cn/unipush-v2.html#%E7%AC%AC%E4%BA%8C%E6%AD%A5-%E9%85%8D%E7%BD%AE)'
					if (!errors.includes(error)) {
						errors.push(error);
					}
				} else {
					appBuildGradleConfig.defaultConfig.allowManifestPlaceholders = true;
					manifestPlaceholders.OPPOPUSH_APPKEY = module?.OPPOPUSH_APPKEY ?? '';
				}

				if (!module?.OPPOPUSH_APPSECRET) {
					const error =
						'【uni-push】请在项目manifest.json文件中的app -> distribute -> modules -> uni-push 节点下添加 OPPOPUSH_APPSECRET 的值，示例：OPPOPUSH_APPSECRET: "xxx"。OPPO推送APPSECRET。参考：[uni-push2.0配置](https://uniapp.dcloud.net.cn/unipush-v2.html#%E7%AC%AC%E4%BA%8C%E6%AD%A5-%E9%85%8D%E7%BD%AE)'
					if (!errors.includes(error)) {
						errors.push(error);
					}
				} else {
					appBuildGradleConfig.defaultConfig.allowManifestPlaceholders = true;
					manifestPlaceholders.OPPOPUSH_APPSECRET = module?.OPPOPUSH_APPSECRET ?? '';
				}

				if (!module?.HUAWEI_APPID) {
					const error =
						'【uni-push】请在项目manifest.json文件中的app -> distribute -> modules -> uni-push 节点下添加 HUAWEI_APPID 的值，示例：HUAWEI_APPID: "xxx"。华为推送APPID。参考：[uni-push2.0配置](https://uniapp.dcloud.net.cn/unipush-v2.html#%E7%AC%AC%E4%BA%8C%E6%AD%A5-%E9%85%8D%E7%BD%AE)'
					if (!errors.includes(error)) {
						errors.push(error);
					}
				} else {
					appBuildGradleConfig.defaultConfig.allowManifestPlaceholders = true;
					manifestPlaceholders.HUAWEI_APPID = module?.HUAWEI_APPID ?? '';
				}

				if (!module?.VIVO_APPID) {
					const error =
						'【uni-push】请在项目manifest.json文件中的app -> distribute -> modules -> uni-push 节点下添加 VIVO_APPID 的值，示例：VIVO_APPID: "xxx"。VIVO推送APPID。参考：[uni-push2.0配置](https://uniapp.dcloud.net.cn/unipush-v2.html#%E7%AC%AC%E4%BA%8C%E6%AD%A5-%E9%85%8D%E7%BD%AE)'
					if (!errors.includes(error)) {
						errors.push(error);
					}
				} else {
					appBuildGradleConfig.defaultConfig.allowManifestPlaceholders = true;
					manifestPlaceholders.VIVO_APPID = module?.VIVO_APPID ?? '';
				}

				if (!module?.VIVO_APIKEY) {
					const error =
						'【uni-push】请在项目manifest.json文件中的app -> distribute -> modules -> uni-push 节点下添加 VIVO_APIKEY 的值，示例：VIVO_APIKEY: "xxx"。VIVO推送APIKEY。参考：[uni-push2.0配置](https://uniapp.dcloud.net.cn/unipush-v2.html#%E7%AC%AC%E4%BA%8C%E6%AD%A5-%E9%85%8D%E7%BD%AE)'
					if (!errors.includes(error)) {
						errors.push(error);
					}
				} else {
					appBuildGradleConfig.defaultConfig.allowManifestPlaceholders = true;
					manifestPlaceholders.VIVO_APIKEY = module?.VIVO_APIKEY ?? '';
				}

				if (!module?.HIHONOR_APPID) {
					const error =
						'【uni-push】请在项目manifest.json文件中的app -> distribute -> modules -> uni-push 节点下添加 HIHONOR_APPID 的值，示例：HIHONOR_APPID: "xxx"。荣耀推送APPID。参考：[uni-push2.0配置](https://uniapp.dcloud.net.cn/unipush-v2.html#%E7%AC%AC%E4%BA%8C%E6%AD%A5-%E9%85%8D%E7%BD%AE)'
					if (!errors.includes(error)) {
						errors.push(error);
					}
				} else {
					appBuildGradleConfig.defaultConfig.allowManifestPlaceholders = true;
					manifestPlaceholders.HIHONOR_APPID = module?.HIHONOR_APPID ?? '';
				}

				// 同步线上依赖
				updateAppDependencies([
					'com.getui:gtc:3.2.13.0',
					'com.getui:gtsdk:3.3.6.0'
				]);

				// 华为额外配置
				// rootBuildGradleConfig.project.repositories.jcenter = true;
				// rootBuildGradleConfig.project.repositories.google = true;
				const huaweiDependency = 'https://developer.huawei.com/repo/';
				if (!baseSettingsGradle.repositories.maven.includes(huaweiDependency)) {
					baseSettingsGradle.repositories.maven.push(huaweiDependency);
				}
				// const dependency = 'com.huawei.agconnect:agcp:1.6.0.300';
				const dependencies = [
					'com.android.tools.build:gradle:8.2.0',
					'com.huawei.agconnect:agcp:1.9.1.301'
				];
				dependencies.map(dependency => {
					if (!rootBuildGradleConfig.project.dependencies.default.includes(dependency)) {
						rootBuildGradleConfig.project.dependencies.default.push(dependency);
					}
				})
				// if (!rootBuildGradleConfig.repositories.maven.includes(huaweiDependency)) {
				// 	rootBuildGradleConfig.repositories.maven.push(huaweiDependency);
				// }
				const plugins = [
					'com.android.application',
					'com.huawei.agconnect'
				];
				// plugins.map(item => {
				// 	if (!appBuildGradleConfig.applyPlugins.includes(item)) {
				// 		appBuildGradleConfig.applyPlugins.push(item);
				// 	}
				// });
				// 拷贝华为推送配置文件
				const agconnectServicesJsonPath = path.join(appAndroidPath, APP_ID, '/www/static/',
					'agconnect-services.json');
				if (!fs.existsSync(agconnectServicesJsonPath)) {
					const error =
						'华为推送配置文件不存在，请登录华为的AppGallery Connect网站，找到需要集成华为推送的应用，在“项目设置 > 常规”页面的“应用”区域，点击 `agconnect-services.json` 下载配置文件。并拷贝到项目下的 `static` 目录下。';
					if (!errors.includes(error)) {
						errors.push(error);
					}
				} else {
					await fsExtra.copySync(agconnectServicesJsonPath, path.join(targetDirectory, '/',
						'agconnect-services.json'));
				}
			}
			// uni-video 模块
			if (modules['uni-video']) {
				// 这里是同步本地依赖库的步骤
				await copyAppLibs([
					'uni-video-release.aar',
					'ijkplayer.aar',
					'videoplayer.aar'
				]);
				// 同步线上依赖
				updateAppDependencies([
					'com.github.bumptech.glide:glide:4.9.0',
					'androidx.annotation:annotation:1.1.0',
					'androidx.core:core:1.1.0'
				]);
				// 组件注册
				appBuildGradleConfig.buildFeatures.buildConfig = true;
				appBuildGradleConfig.defaultConfig.buildConfigField.push(
					'"String", "UTSRegisterComponents", "\\"[{\\\\\\"name\\\\\\":\\\\\\"video\\\\\\",\\\\\\"class\\\\\\":\\\\\\"uts.sdk.modules.DCloudUniVideo.VideoComponent\\\\\\"}]\\""'
				)
			}
			// uni-verify模块
			if (modules['uni-verify']) {
				// 这里是同步本地依赖库的步骤
				await copyAppLibs([
					'uni-verify-release.aar',
					'GY-3.1.6.3-release.aar'
				]);
				// 同步线上依赖
				// baseSettingsGradle.repositories.jcenter = true;
				// baseSettingsGradle.repositories.google = true;
				const maven = 'https://mvn.getui.com/nexus/content/repositories/releases';
				if (!baseSettingsGradle.repositories.maven.includes(maven)) {
					baseSettingsGradle.repositories.maven.push(maven);
				}
				updateAppDependencies([
					'com.getui:gtc:3.2.13.0'
				]);
				const module = modules['uni-verify'];
				if (!module?.GETUI_APPID) {
					const error =
						'【uni-verify】请在项目manifest.json文件中的app -> distribute -> modules -> uni-verify 节点下添加 GETUI_APPID 的值，示例：GETUI_APPID: "xxx"。GETUI_APPID与PUSH_APPID在[开发者中心](https://dev.dcloud.net.cn/)->一键登录->基础配置->一键登录应用ID，GETUI_APPID与GY_APP_ID取值相同。'
					if (!errors.includes(error)) {
						errors.push(error);
					}
				} else {
					appBuildGradleConfig.defaultConfig.allowManifestPlaceholders = true;
					appBuildGradleConfig.defaultConfig.manifestPlaceholders.GETUI_APPID = module.GETUI_APPID;
				}

				if (!module?.GY_APP_ID) {
					const error =
						'【uni-verify】请在项目manifest.json文件中的app -> distribute -> modules -> uni-verify 节点下添加 GY_APP_ID 的值，示例：GY_APP_ID: "xxx"。GETUI_APPID与GY_APP_ID在[开发者中心](https://dev.dcloud.net.cn/)->一键登录->基础配置->一键登录应用ID，GETUI_APPID与GY_APP_ID取值相同。'
					if (!errors.includes(error)) {
						errors.push(error);
					}
				} else {
					appBuildGradleConfig.defaultConfig.allowManifestPlaceholders = true;
					appBuildGradleConfig.defaultConfig.manifestPlaceholders.GY_APP_ID = module.GY_APP_ID;
				}
			}
			// uni-createRequestPermissionListener模块
			if (modules['uni-createRequestPermissionListener']) {
				// 这里是同步本地依赖库的步骤
				await copyAppLibs([
					'uni-createRequestPermissionListener-release.aar'
				])
			}
			// uni-createWebviewContext模块
			if (modules['uni-createWebviewContext']) {
				// 这里是同步本地依赖库的步骤
				await copyAppLibs([
					'uni-createWebviewContext-release.aar'
				])
			}
			// uni-fileSystemManager模块
			if (modules['uni-fileSystemManager']) {
				// 这里是同步本地依赖库的步骤
				await copyAppLibs([
					'uni-fileSystemManager-release.aar'
				])
			}
			// uni-getLocation-system模块
			if (modules['uni-getLocationSystem']) {
				// 这里是同步本地依赖库的步骤
				await copyAppLibs([
					'uni-getLocation-system-release.aar'
				])
			}
			// uni-getNetworkType模块
			if (modules['uni-getNetworkType']) {
				// 这里是同步本地依赖库的步骤
				await copyAppLibs([
					'uni-getNetworkType-release.aar'
				])
			}
			// uni-installApk模块
			if (modules['uni-installApk']) {
				// 这里是同步本地依赖库的步骤
				await copyAppLibs([
					'uni-installApk-release.aar'
				])
			}
			// uni-network模块
			if (modules['uni-network']) {
				// 这里是同步本地依赖库的步骤
				await copyAppLibs([
					'uni-network-release.aar'
				])
				// 同步线上依赖
				updateAppDependencies([
					'com.squareup.okhttp3:okhttp:3.12.12'
				]);
			}
			// uni-websocket模块
			if (modules['uni-websocket']) {
				// 这里是同步本地依赖库的步骤
				await copyAppLibs([
					'uni-websocket-release.aar'
				])
				// 同步线上依赖
				updateAppDependencies([
					'com.squareup.okhttp3:okhttp:3.12.12'
				]);
			}
			// uni-media模块
			if (modules['uni-media']) {
				// 这里是同步本地依赖库的步骤
				await copyAppLibs([
					'uni-media-release.aar',
					'nativeobj-preview-release.aar'
				])
				// 同步线上依赖
				updateAppDependencies([
					'com.github.bumptech.glide:glide:4.9.0',
					'androidx.recyclerview:recyclerview:1.0.0',
					'androidx.appcompat:appcompat:1.0.0'
				]);
			}
			// uni-cloud-client模块
			if (modules['uni-cloudClient']) {
				// 检查依赖模块
				if (!modules['uni-media']) {
					const error = `【uni-cloudClient】该模块依赖【uni-media】模块，请在项目manifest.json文件中的app -> distribute -> modules添加【uni-media】模块，示例："uni-media": {}`
					if (!errors.includes(error)) {
						errors.push(error);
					}
				} else if (!modules['uni-network']) {
					const error = `【uni-cloudClient】该模块依赖【uni-network】模块，请在项目manifest.json文件中的app -> distribute -> modules添加【uni-network】模块，示例："uni-network": {}`
					if (!errors.includes(error)) {
						errors.push(error);
					}
				} else {
					// 这里是同步本地依赖库的步骤
					await copyAppLibs([
						'uni-cloud-client-release.aar'
					])
				}
			}
		}
		// console.log(appBuildGradleConfig)
	} catch (e) {
		output.error(e.message, customConsoleLog);
		console.error(e)
		throw e;
	}
}

let checkPass = false;

function checkLocalResources () {
	const checkResourcesExistsMessage = customSetStatusMessage?.('开始校对本地资源...');
	const checkResourcesExistsSpinner = ora('开始校对本地资源...').start();
	logger.info('开始校对本地资源...');
	if (!checkResourcesExists()) {
		let tips = `本地打包资源不存在，请选中项目然后顶部菜单点击【发行】->【原生App-本地打包】->【生成本地打包App资源】先打包本地资源，参考 ${encodeURI('https://nativesupport.dcloud.net.cn/AppDocs/importfeproject/export.html#生成本地打包-app-资源')}`;
		output.error(tips, customConsoleLog);
		logger.error(tips);
		checkResourcesExistsMessage?.dispose();
		checkResourcesExistsSpinner.fail(tips);
		checkPass = false;
		return;
	}
	const prefix = '__UNI__';
	// 遍历目录
	const directories = (fsExtra.readdirSync(appAndroidPath)).filter(file => file.toString().startsWith(
		prefix));
	
	if (directories.length === 0) {
		output.error('未发现UNI应用资源包', customConsoleLog);
		oraSpinner.fail('未发现UNI应用资源包');
		logger.error('未发现UNI应用资源包');
		return;
	}
	
	APP_ID = directories[0];
	checkResourcesExistsSpinner.succeed();
	checkResourcesExistsMessage?.dispose();
	checkPass = true;
}

/**
 * 校验SDK版本
 */
async function compileSDKVersion () {
	/**
	 * 获取编译器版本
	 */
	// 读取uniapp x项目根目录的manifest.json
	const json = fsExtra.readFileSync(path.join(appAndroidPath, APP_ID, '/www/', 'manifest.json'),
		'utf-8');
	const manifest = JSON.parse(json);
	const compilerVersion = manifest['uni-app-x']['compilerVersion'];
	/**
	 * 获取SDK版本
	 */
	const sdkSplitRes = SDK_UNZIP_NAME.split('-');
	let sdkVersion = sdkSplitRes[sdkSplitRes.length - 1];
	if (sdkVersion < 3) {
		sdkVersion = sdkSplitRes[sdkSplitRes.length - 2];
	}
	if (sdkVersion != compilerVersion) {
		// output.error(`自定义基座SDK版本【${sdkVersion}】与编译器版本【${compilerVersion}】不一致，请重新打包本地资源，参考 ${encodeURI('https://nativesupport.dcloud.net.cn/AppDocs/importfeproject/export.html#生成本地打包-app-资源')}`, customConsoleLog);
		if (hx != null) {
			checkPass = false;
			let result = await hx.window.showWarningMessage(`自定义基座SDK版本【${sdkVersion}】与编译器版本【${compilerVersion}】不一致，参考 <a href="https://nativesupport.dcloud.net.cn/AppDocs/importfeproject/export.html#生成本地打包-app-资源">${encodeURI('https://nativesupport.dcloud.net.cn/AppDocs/importfeproject/export.html#生成本地打包-app-资源')}</a>，是否继续打包？`, ['继续打包', '终止打包']);
			if (result === '继续打包') {
				output.warn(`自定义基座SDK版本【${sdkVersion}】与编译器版本【${compilerVersion}】不一致，参考 ${encodeURI('https://nativesupport.dcloud.net.cn/AppDocs/importfeproject/export.html#生成本地打包-app-资源')}`, customConsoleLog);
				checkPass = true;
			} else {
				output.error(`自定义基座SDK版本【${sdkVersion}】与编译器版本【${compilerVersion}】不一致，请重新打包本地资源，参考 ${encodeURI('https://nativesupport.dcloud.net.cn/AppDocs/importfeproject/export.html#生成本地打包-app-资源')}`, customConsoleLog);
				checkPass = false;
				return;
			}
		} else {
			output.error(`自定义基座SDK版本【${sdkVersion}】与编译器版本【${compilerVersion}】不一致，请重新打包本地资源，参考 ${encodeURI('https://nativesupport.dcloud.net.cn/AppDocs/importfeproject/export.html#生成本地打包-app-资源')}`, customConsoleLog);
		}
	}
}

async function buildUnix () {
	await copyPlugins([
		'uts-kotlin-compiler-plugin-0.0.1.jar',
		'uts-kotlin-gradle-plugin-0.0.1.jar'
	]);
	
	const updateAppidMessage = customSetStatusMessage?.('开始查找替换应用ID...');
	const updateAppidSpinner = ora('开始查找替换应用ID...').start();
	logger.info('开始查找替换应用ID...');
	await updateAppid(updateAppidSpinner);
	updateAppidMessage?.dispose();
	const updateAppResourcesMessage = customSetStatusMessage?.('开始替换应用发行资源...');
	const updateAppResourcesSpinner = ora('开始替换应用发行资源...').start();
	logger.info('开始替换应用发行资源...');
	await updateAppResources();
	updateAppResourcesMessage?.dispose();
	updateAppResourcesSpinner.succeed();
	output.success('替换应用发行资源完成', customConsoleLog);
	logger.info('替换应用发行资源完成');
	const updateUnixSrcMessage = customSetStatusMessage?.('开始替换uniappx发行资源...');
	const updateUnixSrcSpinner = ora('开始替换uniappx发行资源...').start();
	logger.info('开始替换uniappx发行资源...');
	await updateUnixSrc(updateUnixSrcSpinner);
	updateUnixSrcMessage?.dispose();
	const updateUniModulesSrcMessage = customSetStatusMessage?.('开始替换uni_modules发行资源...');
	const updateUniModulesSrcSpinner = ora('开始替换uni_modules发行资源...').start();
	logger.info('开始替换uni_modules发行资源...');
	await updateUniModulesSrc();
	updateUniModulesSrcMessage?.dispose();
	updateUniModulesSrcSpinner.succeed();
	output.success('替换uni_modules发行资源完成', customConsoleLog);
	logger.info('替换uni_modules发行资源完成');
	const updateBuildInModulesMessage = customSetStatusMessage?.('开始同步app模块配置发行资源...');
	const updateBuildInModulesSpinner = ora('开始同步app模块配置发行资源...').start();
	logger.info('开始同步app模块配置发行资源...');
	await updateBuildInModules();
	updateBuildInModulesMessage?.dispose();
	updateBuildInModulesSpinner.succeed();
	output.success('同步app模块配置发行资源完成', customConsoleLog);
	logger.info('同步app模块配置发行资源完成');
	const compileAllBuildGradleMessage = customSetStatusMessage?.('开始编译所有模块的build.gradle配置...');
	const compileAllBuildGradleSpinner = ora('开始编译所有模块的build.gradle配置...').start();
	logger.info('开始编译所有模块的build.gradle配置...');
	await compileAllBuildGradle();
	compileAllBuildGradleSpinner.succeed();
	compileAllBuildGradleMessage?.dispose();
	logger.info('编译所有模块的build.gradle配置完成');
	output.success('编译所有模块的build.gradle配置完成', customConsoleLog);
}

async function startBuild() {
	try {
		let packTime = Date.now();
		// const downloadSDKMessage = customSetStatusMessage?.('开始下载uni-app x Android离线打包SDK...');
		if (!local_pack) {
			await cloneCode();
		} else {
			await initLocalSdk();
		}
		await buildUnix()
		shelljs.cd(targetDirectory);
		if (errors.length > 0) {
			let errMsg = '项目发现以下错误，请根据指导解决后重新运行！';
			output.error(errMsg, customConsoleLog);
			ora('项目发现以下错误，请根据指导解决后重新运行！').info();
			errors.map(item => {
				ora(item).fail();
				output.error(item, customConsoleLog);
			});
			return;
		}
		if (!local_pack) {
			const keystorePath = path.join(targetDirectory, '/app/', 'debug.keystore');
			if (fsExtra.existsSync(keystorePath)) {
				fsExtra.rmSync(keystorePath);
			}
			await execCloudPack();
		} else {
			await execLocalPack();
		}
		return;
	} catch (e) {
		output.error(e.message, customConsoleLog);
		console.error(e);
		logger.error(e.stack);
	}
}

async function execCommand (command) {
	try {
		return await new Promise((resolve, reject) => {
			exec(command, {
				maxBuffer: 1024 * 1024
			}, (error, stdout, stderr) => {
				if (error) {
					reject(error);
				} else {
					resolve({
						stdout,
						stderr
					});
				}
			});
		});
	} catch (error) {
		const err = error.message;
		console.error(error);
		output.error(err, customConsoleLog);
		logger.error(error.stack);
	}
}

/**
 * 执行远程仓库提交打包
 */
async function execCloudPack(type = 'Github') {
	const tips = `开始${type}自动打包...`;
	const cloudPackSpinner = ora(tips);
	const cloudPackMessage = customSetStatusMessage?.(tips);
	const packTime = Date.now();
	try {
		const {
			stdout,
			stderr,
			error
		} = await execCommand(autoPackCommand);
		
		initBuildConfig();
		
		if (error) {
			console.log(error);
			output.info(JSON.stringify(error));
			let tips = `${type}自动提交失败，请尝试手动提交：cd ${targetDirectory} && git add . && git commit -m 'feat: autopack uniappx' && git push origin main`;
			if (process.platform === 'win32') {
				tips = `${type}自动提交失败，请尝试手动提交：cd ${targetDirectory}; git add . ; git commit -m 'feat: autopack uniappx' ; git push origin main`;
			}
			output.error(tips, customConsoleLog);
			logger.error(tips);
			cloudPackSpinner.fail(tips);
			return;
		}
		
		let msg = '提交成功，请登录自己的仓库点击 Actions 查看执行结果。';
		output.success(msg, customConsoleLog);
		cloudPackSpinner.succeed(msg);
	} catch (error) {
		const err = error.message;
		output.error(err, customConsoleLog);
		cloudPackSpinner.fail(err);
		cloudPackMessage?.dispose();
		logger.error(`【执行提交${type}打包失败】${error.stack}`);
	}
}

/**
 * 执行本地打包
 */
async function execLocalPack() {
	const tips = '开始本地自动打包...';
	const localPackSpinner = ora(tips);
	const localPackMessage = customSetStatusMessage?.(tips);
	const packTime = Date.now();
	try {
		const res = await execCommand(localPackCommand);
		// console.log(res);
		const {
			// stdout,
			stderr,
			error
		} = res;

		localPackMessage?.dispose();
		
		initBuildConfig();

		if (error) {
			console.error(error);
			output.info(JSON.stringify(error));
			let msg = `本地自动打包失败，请尝试手动执行：cd ${targetDirectory}; ./gradlew.bat :app:packageDebug --no-daemon; cp ./app/build/outputs/apk/debug/app-debug.apk ${uniappProjectPath}/unpackage/debug/android_debug.apk。执行完成后即可选择自定义基座运行。`;
			if (process.platform === 'darwin') {
				msg = `本地自动打包失败，请尝试手动执行：cd ${targetDirectory} && ./gradlew :app:packageDebug && cp ./app/build/outputs/apk/debug/app-debug.apk ${uniappProjectPath}/unpackage/debug/android_debug.apk。执行完成后即可选择自定义基座运行。`
			}
			output.error(msg, customConsoleLog);
			logger.error(msg);
			localPackSpinner.fail(msg);
			return;
		}

		const apkPath = path.join(targetDirectory, '/app/build/outputs/apk/debug/app-debug.apk');
		const targetApkPath = path.join(uniappProjectPath, '/unpackage/debug/', 'android_debug.apk');
		const countTime = Date.now() - packTime;
		if (fs.existsSync(apkPath)) {
			await fsExtra.copySync(apkPath, targetApkPath);
			const msg = `打包完成，本次打包用时：${countTime / 1000}s, apk地址：${targetApkPath}，请在 hx 里面选择自定义基座运行即可。`;
			output.warn(msg, customConsoleLog);
			localPackSpinner.succeed(msg);
			logger.info(msg);
		} else {
			output.warn(`打包完成，本次打包用时：${countTime / 1000}s`);
			localPackSpinner.succeed();
			logger.info(`打包完成，本次打包用时：${countTime / 1000}s`);
		}
		shelljs.cd(_ROOT_);
		// fsExtra.emptyDirSync(targetDirectory);
		// deleteFileOrFolder(targetDirectory, null);
	} catch (error) {
		const err = error.message;
		output.error(err, customConsoleLog);
		localPackSpinner.fail(err);
		localPackMessage?.dispose();
		logger.error(`【执行本地打包失败】${error.stack}`);
	}
}

async function initLocalSdk () {
	try {
		let content = templateLocalSdk(baseLocalSdk);
		if (process.platform === 'win32') {
			content = content.replace(/\\/g, '\\\\');
		}
		// 将内容写入文件
		await fs.writeFileSync(path.join(targetDirectory, '/', 'local.properties'), content);
	} catch (error) {
		logger.error(error.stack);
	}
}

async function cloneCode() {
	const tips = '开始克隆原始工程项目...';
	const cloneSpinner = ora(tips);
	const cloneMessage = customSetStatusMessage?.(tips);
	logger.info(tips);
	shelljs.cd(_ROOT_);
	try {
		const {
			stdout,
			stderr
		} = await execCommand(cloneCommand);

		cloneSpinner.succeed();
		cloneMessage?.dispose();
		output.success('原始工程项目克隆完成', customConsoleLog);
		logger.info('原始工程项目克隆完成');
		// await initLocalSdk();
	} catch (error) {
		cloneSpinner.fail(error);
		cloneMessage?.dispose();
		output.error(error.message, customConsoleLog);
		logger.error(`【克隆原生工程失败】${error.stack}`);
		throw error;
	}
}

async function unzipSDK (zipPath, unzipPath) {
	try {
		const unzipSDKMessage = customSetStatusMessage?.('开始解压SDK...');
		const unzipSDKSpinner = ora('开始解压SDK...').start();
		logger.info('开始解压SDK...');
		const unzipService = require('./utils/unzipService');
		SDK_UNZIP_NAME = await unZipService.unzip(zipPath, unzipPath);
		if (!SDK_UNZIP_NAME) {
			checkPass = false;
			output.error(`【解压SDK失败】请检查SDK地址【${SDK_DOWNLOAD_URL}】是否可正常访问，然后重新执行打包`, customConsoleLog);
			logger.error(`【解压SDK失败】请检查SDK地址【${SDK_DOWNLOAD_URL}】是否可正常访问，然后重新执行打包`);
			fsExtra.rmSync(zipPath);
			return;
		}
		unzipSDKSpinner.succeed();
		unzipSDKMessage?.dispose();
		output.success('解压SDK完成', customConsoleLog);
		logger.info('解压SDK完成');
		checkPass = true;
	} catch (e) {
		console.error(e);
		output.error(`【解压SDK异常】${e.message}`, customConsoleLog);
		logger.error(`【解压SDK异常】${e.stack}`);
		checkPass = false;
		throw e;
	}
}

async function start(options = {}) {
	try {
		packConfig = options;
		local_pack = options?.localPack ?? false;
		if (options?.uniappProjectPath) {
			uniappProjectPath = options.uniappProjectPath;

		}
		if (options?.sdkDownloadUrl) {
			SDK_DOWNLOAD_URL = options.sdkDownloadUrl;
		}
		if (options?.repositoryUrl) {
			repositoryUrl = options.repositoryUrl;
		}
		if (options?.root) {
			_ROOT_ = options.root;
			targetDirectory = `${_ROOT_}/${REPOSITORY_NAME}`;
		}
		if (options?.cloudType) {
			cloudType = options.cloudType;
		}
		if (options?.androidLocalSdk) {
			baseLocalSdk.localSdk = options.androidLocalSdk;
		}
		if (options?.customConsoleLog) {
			customConsoleLog = options.customConsoleLog;
		}
		if (options?.customSetStatusMessage) {
			customSetStatusMessage = options.customSetStatusMessage;
		}
		if (options?.hx) {
			hx = options.hx;
		}
		if (options?.javaHome) {
			if (process.platform === 'win32') {
				process.env.JAVA_HOME = options.javaHome.replace(/\\/g, '\\\\');
			} else {
				options.javaHome = path.join(options.javaHome, '/Contents/Home/');
				process.env.JAVA_HOME = options.javaHome;
			}
		}
		if (options?.androidPackageName) {
			appBuildGradleConfig.packageName = androidPackageName
		}
		if (options?.storePath) {
			storePath = options.storePath
		}
		if (options?.storePassword) {
			appBuildGradleConfig.keyStore.storePassword = options.storePassword
		}
		if (options?.keyAlias) {
			appBuildGradleConfig.keyStore.keyAlias = options.keyAlias
		}
		if (options?.keyPassword) {
			appBuildGradleConfig.keyStore.keyPassword = options.keyPassword
		}
		initConfig();
		checkLocalResources();
		if (!checkPass) return;
		const checkSDKSpinner = ora('开始校验SDK版本...').start();
		const checkSDKMessage = customSetStatusMessage?.('开始校验SDK版本...');
		logger.info('开始校验SDK版本...');
		SDK_UNZIP_NAME = unZipService.getFileName(SDK_DOWNLOAD_URL, false);
		const libsZIPPath = path.join(_ROOT_, '/SDK/uniappx/', `${SDK_UNZIP_NAME}.zip`);
		const libsUnzipPath = path.join(_ROOT_, '/SDK/uniappx/libs/');
		if (fsExtra.existsSync(libsZIPPath)) {
			const tips = 'uni-app x Android离线打包SDK已是最新版本，跳过更新';
			output.warn(tips, customConsoleLog);
			checkSDKMessage?.dispose();
			checkSDKSpinner.succeed(tips);
			logger.info(tips);
			await unzipSDK(libsZIPPath, libsUnzipPath);
		} else {
			const downloadSDKSpinner = ora('开始下载uni-app x Android离线打包SDK...').start();
			logger.info('开始下载uni-app x Android离线打包SDK...');
			const res = await downloadZip(SDK_DOWNLOAD_URL, libsZIPPath);
			if (!res) {
				fsExtra.rmSync(libsZIPPath);
				return;
			};
			// downloadSDKMessage?.dispose();
			output.success('uni-app x Android离线打包SDK下载完成', customConsoleLog);
			logger.info('uni-app x Android离线打包SDK下载完成');
			downloadSDKSpinner.succeed();
			await unzipSDK(libsZIPPath, libsUnzipPath);
		}
		if (!checkPass) return;
		if (hx != null) {
			if (hx.workspace.getConfiguration().get('kux-easy-pack-hxp.validateSDKVersion') == true) {
				await compileSDKVersion();
			}
		}
		if (!checkPass) return;
		shelljs.exec(`rm -rf ${targetDirectory}`);
		if (local_pack) {
			const target = path.join(_ROOT_, '/', 'uniappx-native-android-base');
			const dest = path.join(_ROOT_, '/', 'uniappx-native-android');
			fsExtra.copySync(target, dest);
			const appStorePath = path.join(dest, '/app/debug.keystore')
			if (storePath && fsExtra.existsSync(appStorePath)) {
				fsExtra.rmSync(storePath)
				fsExtra.copySync(storePath, path.join(dest, '/app/debug.keystore'))
			}
			// await fsExtra.copy(target, dest);
		}
		// if (!local_pack) {
		// 	fsExtra.emptyDirSync(targetDirectory);
		// }
		await startBuild();
	} catch (e) {
		customConsoleLog?.(e.message);
		console.error(e);
		logger.error(e.stack);
	}
}

module.exports = {
	start
}