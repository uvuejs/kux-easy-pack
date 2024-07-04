const fs = require('fs');
const Handlebars = require('handlebars');
const path = require('path');

const dirname = (filePath) => path.join(__dirname, filePath);

// 编译模版
const template = Handlebars.compile(fs.readFileSync(dirname('./app.build.gradle.hbs'), 'utf-8'));

// 定义数据
const data = {
    dependencies: {
        default: [
            'com.example:library:1.0.0',
            'org.example:another-library:2.0.0',
        ],
        project: [
            ':kux-plus-device'
        ]
    },
    abis: '"aaa", "bbbb"',
    packageName: 'hahahah',
    minSdkVersion: 21,
    defaultConfig: {
        buildConfigField: [
            '"String", "UTSRegisterComponents", "\\"[{\\\\\\"name\\\\\\":\\\\\\"zl-text\\\\\\",\\\\\\"class\\\\\\":\\\\\\"uts.sdk.modules.zlText.ZlTextComponent\\\\\\"}]\\""'
        ]
    }
};

// 生成 build.gradle 文件
const buildGradleContent = template(data);

// 将内容写入文件
fs.writeFileSync(dirname('app.build.gradle'), buildGradleContent);
