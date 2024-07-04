const { exec, execFileSync, spawn } = require('child_process');
const fs = require('fs');
const ora = require('ora');
const chalk = require('chalk');
const path = require('path');

/**
 * 执行子进程命令
 * @param command
 * @returns {*}
 */
function execChildProcess(command) {
    return exec(command, {
        stdio: 'inherit', // 使子进程的标准输出和错误输出重定向到父进程的标准输出和错误输出
    })
}

function onChildProcess(command) {
    command.on('exit', (code) => {
        if (code !== 0) {
            console.error(`failed with exit code`, code);
        } else {

        }
    })

    command.stdout.on('data', (data) => {
        console.log(data.toString());
    })

    command.stderr.on('data', (data) => {
        console.log(data.toString());
    })
}

/**
 * 检测 JDK 版本
 * @returns {Promise<unknown>}
 */
function checkJDKVersion() {
    return new Promise((resolve, reject) => {
        const childProcess = execChildProcess('java --version');
        childProcess.on('exit', (code) => {
            if (code !== 0) {
                reject('JDK not installed');
            }
        })
        childProcess.stdout.on('data', (data) => {
            // console.log(data);
            resolve(data);
        })
        childProcess.stderr.on('data', (data) => {
            reject(data.toString());
        })
        // exec('java -version', (error, stdout, stderr) => {
        //     if (error) {
        //         reject('JDK not installed');
        //         return;
        //     }
        //     const versionLine = stderr.split('\n')[0];
        //     const version = versionLine.match(/version "(.*)"/)[1];
        //     if (version.startsWith('1.8')) {
        //         resolve('JDK 8 is installed');
        //     } else {
        //         reject(`Invalid JDK version: ${version}`);
        //     }
        // });
    });
}

/**
 * 检测 Gradle 版本
 * @returns {Promise<unknown>}
 */
function checkGradleVersion() {
    return new Promise((resolve, reject) => {
        exec('gradle -version', (error, stdout, stderr) => {
            if (error) {
                reject('Gradle not installed');
                return;
            }
            const versionLine = stdout.split('\n')[1];
            const version = versionLine.match(/Gradle (.*)/)[1];
            // 这里可以添加对Gradle版本的具体要求
            resolve(`Gradle ${version} is installed`);
        });
    });
}

/**
 * 检测 Android SDK
 * @returns {Promise<unknown>}
 */
function checkAndroidSDK() {
    return new Promise((resolve, reject) => {
        const androidHome = process.env.ANDROID_HOME;
        if (!androidHome || !fs.existsSync(androidHome)) {
            reject('ANDROID_HOME environment variable is not set or path does not exist');
            return;
        }
        resolve('Android SDK found');
    });
}

/**
 * 检测环境变量
 * @returns {Promise<Awaited<string>>|Promise<never>}
 */
function checkEnvironmentVariables() {
    if (!process.env.JAVA_HOME) {
        return Promise.reject('JAVA_HOME environment variable is not set');
    }
    if (!process.env.ANDROID_HOME) {
        return Promise.reject('ANDROID_HOME environment variable is not set');
    }
    return Promise.resolve('Environment variables are set');
}

/**
 * 获取 JDK 版本
 * @returns {Promise<unknown>}
 */
function getJDKVersion() {
    return new Promise((resolve, reject) => {
        exec('java -version', (error, stdout, stderr) => {
            if (error) {
                reject('JDK not installed');
                return;
            }
            const versionLine = stderr.split('\n')[0];
            const version = versionLine.match(/version "(.*)"/)[1];
            resolve(version);
        });
    });
}

/**
 * 获取 Gradle 版本
 * @returns {Promise<unknown>}
 */
function getGradleVersion() {
    // return new Promise((resolve, reject) => {
    //     exec('gradle -version', (error, stdout, stderr) => {
    //         if (error) {
    //             reject('Gradle not installed');
    //             return;
    //         }
    //         const versionLine = stdout.split('\n')[1];
    //         const version = versionLine.match(/Gradle (.*)/)[1];
    //         resolve(version);
    //     });
    // });
    return new Promise((resolve, reject) => {
        // 常见的Gradle安装路径目录
        const commonGradleDirs = [
            '/usr/local/bin',
            '/usr/bin',
            '/opt/gradle',
            // 在Windows上，可能需要添加更多的路径，例如：
            'C:\\Program Files\\Gradle',
            // 添加其他可能的路径目录
        ];

        // 搜索所有常见的目录，找到所有的gradle可执行文件
        let gradlePaths = [];
        commonGradleDirs.forEach(dir => {
            if (fs.existsSync(dir)) {
                // 读取目录内容
                fs.readdirSync(dir).forEach(file => {
                    // 检查文件名是否以gradle开头（忽略大小写）
                    if (file.toLowerCase().startsWith('gradle')) {
                        const gradlePath = path.join(dir, file);
                        // 检查是否是目录
                        if (fs.statSync(gradlePath).isDirectory()) {
                            // 如果是目录，则递归搜索 bin/gradle
                            const binGradlePath = path.join(gradlePath, 'bin', 'gradle');
                            if (fs.existsSync(binGradlePath)) {
                                gradlePaths.push(binGradlePath);
                            }
                        } else {
                            // 直接将gradle路径添加到数组中
                            gradlePaths.push(gradlePath);
                        }
                    }
                });
            }
        });

        // 如果没有找到gradle可执行文件，则拒绝承诺
        if (gradlePaths.length === 0) {
            reject('Gradle not found in common directories');
            return;
        }

        // 假设最后一个找到的gradle是最新版本
        const gradlePath = gradlePaths[gradlePaths.length - 1];
        // let childProcess = execChildProcess(`${gradlePath} -version`);
        const gradle = spawn(gradlePath, ['-version']);
        gradle.on('exit', (code) => {
            if (code !== 0) {
                reject('Gradle failed to set execute permissions for Gradle');
            }
        })
        let output = '';
        gradle.stdout.on('data', (chunk) => {
            output += chunk.toString();
        })

        gradle.stderr.on('data', (chunk) => {
            reject(chunk);
        })

        gradle.on('close', (code) => {
            console.log(`子进程退出，退出码 ${code}`);
            const lines = output.split('\n');
            let gradleInfo = {};
            let versionLine = lines.find(line => line.startsWith('Gradle'));
            if (versionLine) {
                // 进一步提取版本号
                const version = versionLine.substring(versionLine.indexOf(' ') + 1);
                gradleInfo['Gradle version'] = version;
            }
            let buildTime = lines.find(line => line.startsWith('Build time'));
            if (buildTime) {
                gradleInfo['Build time'] = buildTime;
            }
            let revision = lines.find(line => line.startsWith('Revision'));
            if (revision) {
                gradleInfo['Revision'] = revision;
            }
            let kotlin = lines.find(line => line.startsWith('Kotlin'));
            if (kotlin) {
                gradleInfo['Kotlin'] = kotlin;
            }
            let groovy = lines.find(line => line.startsWith('Groovy'));
            if (groovy) {
                gradleInfo['Groovy'] = groovy;
            }
            let ant = lines.find(line => line.startsWith('Ant'));
            if (ant) {
                gradleInfo['Ant'] = ant;
            }
            let jvm = lines.find(line => line.startsWith('Jvm'));
            if (jvm) {
                gradleInfo['Jvm'] = jvm;
            }
            let os = lines.find(line => line.startsWith('Os'));
            if (os) {
                gradleInfo['OS'] = `${os.split(',').join(',')}`;
            }
            resolve(gradleInfo);
        })
    });
}

/**
 * 获取 Android SDK 版本
 * @returns {Promise<unknown>}
 */
function getAndroidSDKVersion() {
    return new Promise((resolve, reject) => {
        const androidHome = process.env.ANDROID_HOME;
        if (!androidHome || !fs.existsSync(androidHome)) {
            reject('ANDROID_HOME environment variable is not set or path does not exist');
            return;
        }
        // 这里可以添加代码来获取具体的Android SDK版本信息
        resolve('Android SDK found');
    });
}

/**
 * 获取环境变量
 * @returns {{JAVA_HOME: string, ANDROID_HOME: *}}
 */
function getEnvironmentVariables() {
    return {
        JAVA_HOME: process.env.JAVA_HOME,
        ANDROID_HOME: process.env.ANDROID_HOME
    };
}

/**
 * 执行所有检查并收集错误信息
 * @returns {Promise<unknown>}
 */

function performChecks() {
    return new Promise((resolve, reject) => {
        let errors = [];
        let checks = [
            checkJDKVersion(),
            // checkGradleVersion(),
            checkAndroidSDK(),
            checkEnvironmentVariables()
        ];

        Promise.all(checks.map(p => p.catch(e => e))).then(results => {
            results.forEach((result, index) => {
                if (result instanceof Error) {
                    errors.push(result.message);
                }
            });

            if (errors.length > 0) {
                reject(errors);
            } else {
                resolve('All checks passed');
            }
        });
    });
}

/**
 * 收集环境信息
 * @returns {{environmentVariables: {JAVA_HOME: string, ANDROID_HOME: *}, jdkVersion: Promise<*>, androidSDK: Promise<*>, gradleVersion: Promise<*>}}
 */
async function collectEnvironmentInfo() {
    return {
        jdkVersion: await checkJDKVersion(),
        gradleVersion: await getGradleVersion(),
        // androidSDK: await getAndroidSDKVersion(),
        environmentVariables: getEnvironmentVariables()
    };
}

// 执行检查并输出结果
performChecks().then(async () => {
    return collectEnvironmentInfo();
}).then(environmentInfo => {
    console.log(chalk.green('Environment checks passed. Current environment info:'));
    console.log(chalk.cyan(JSON.stringify(environmentInfo, null, 2)));
}).catch(errors => {
    console.log(errors)
    console.error(chalk.red('Environment checks failed with the following errors:'));
    errors.forEach(error => {
        console.error(chalk.red(`- ${error}`));
    });
});
