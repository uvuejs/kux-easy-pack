const fs = require('fs');
const fsExtra = require('fs-extra');
const unzipper = require('unzipper');
const url = require('url');

async function unzip(source, destination) {
    try {
        // 检查目录是否存在，如果存在就先删除
        // if (await fsExtra.pathExists(destination)) {
        //     await fsExtra.remove(destination);
        // }
        // 创建一个可读流从源ZIP文件
        const readStream = fs.createReadStream(source);

        // 创建一个可写流到目标解压目录
        // const writeStream = fs.createWriteStream(destination);
        let unzipFolderName = '';

        // 使用unzipper连接可读流和可写流，并开始解压过程
        return await new Promise((resolve, reject) => {
            readStream
                .pipe(unzipper.Parse())
                .on('entry', (entry) => {
                    const outputPath = `${destination}/${entry.path}`;
                    if (entry.type === 'Directory') {
                        fs.mkdirSync(outputPath, { recursive: true });
                        entry.autodrain();
                    } else {
                        entry.pipe(fs.createWriteStream(outputPath));
                    }

                    // 捕获解压生成的目录名
                    if (entry.path.endsWith('/') && !unzipFolderName) {
                        unzipFolderName = entry.path.slice(0, -1);
                    }
                })
                .on('finish', () => {
                    resolve(unzipFolderName);
                })
                .on('error', (err) => {
                    console.error('Unzip error:', err);
                    reject(err);
                });
        });
    } catch (err) {
        console.error('Unzip error:', err);
		return false;
    }
}

function getFileName (path, withExtension = true) {
	const parsedUrl = url.parse(path);
	
	const pathname = parsedUrl.pathname;
	
	const filenameWithExtension = pathname.match(/\/([^\/]+)$/)[1];
	
	if (withExtension) {
		return filenameWithExtension;
	}
	
	const lastDotIndex = filenameWithExtension.lastIndexOf('.');
	
	const filename = lastDotIndex !== -1 ? filenameWithExtension.slice(0, lastDotIndex) : filenameWithExtension;
	
	return filename ?? '';
}

module.exports = {
    unzip,
	getFileName
};
