# kux-easy-pack
一个用来给 `uniapp/x` 打包自定义调试基座的插件，为了大幅度简化离线打包流程，让更多开发者们享受到离线打包自定义基座的丝滑体验。

## 插件特色
+ 自动化合并本地打包资源
+ 支持 `Github Actions` 自动打包
+ 支持离线自动打包
+ 自动生成自定义调试基座到项目中
+ 人性化打包错误输出
+ 人性化打包进度输出
+ 支持自动更新SDK
+ 支持自动同步本地模块
+ ...

## 安装运行
下载插件项目到 `uniapp/x` 项目同级位置， 然后本地执行：

+ 修改根目录下的 `.env.template` 为 `.env` 文件，设置自己的环境变量信息。示例如下：

    ```dotenv
    UNIAPP_NAME=kux-plus
    REPOSITORY_URL=git@github.com:kviewui/uniappx-native-android.git
    SDK_DOWNLOAD_URL=https://web-ext-storage.dcloud.net.cn/uni-app-x/sdk/Android-uni-app-x-SDK@11848-4.19.zip
    LOCAL_PACK=true
    STORE_PASSWORD=adminadmindebug
    KEY_ALILAS=androiddebugkey
    KEY_PASSWORD=adminadmindebug
    ```

    ### 环境变量说明
    | 变量名                 | 说明
    |---------------------| ---
    | UNIAPP_NAME         | `uniapp/x` 项目名，示例：kux-plus
    | REPOSITORY_URL      | 原生工程仓库地址，请 `fork` [uniappx-native-android](https://github.com/kviewui/uniappx-native-android) 项目到自己的 github 仓库。然后填写自己 `fork` 后的仓库地址。
    | SDK_DOWNLOAD_URL    | 离线SDK下载地址，参考：[SDK下载](https://doc.dcloud.net.cn/uni-app-x/native/download/android.html)
    | LOCAL_PACK          | 是否本地打包，选择 `false` 时将自动提交 github 打包。选择云端打包时需要参考 [云端密钥配置](#github_store)
    | STORE_PASSWORD `可选` | 签名密钥密码，可选，默认为 `adminadmindebug`
    | KEY_ALILAS `可选`     | 签名密钥别名，可选，默认为 `androiddebugkey`
    | KEY_PASSWORD `可选` | 签名密钥密码，可选，默认为 `adminadmindebug`

+ 本地运行

    ```shell
    # 安装依赖
    npm install
    # 执行构建流程
    npm run start
    ```

## 打包配置说明

<a id="github_store"></a>
### 云端密钥配置
选择 `Github 云端打包` 时，需要先配置参考密钥信息，配置地址：

`https://github.com/{账户名}/uniappx-native-android/settings/secrets/actions`

需要将上面的仓库名替换为自己的，比如仓库名为 `bob`，完整地址即为：`https://github.com/bob/uniappx-native-android/settings/secrets/actions` <br/>
然后在 `Repository secrets` 板块点击 `New repository secret` 创建自己的密钥，名称必须为 `KEYSTORE_PASSWORD`。然后把配置好的密钥值填写到 `.env` 环境变量的 `STORE_PASSWORD` 和 `KEY_PASSWORD` 即可。

### 项目模块配置
项目内置模块可以参考 [modules](https://doc.dcloud.net.cn/uni-app-x/collocation/manifest-modules.html#utsmodules)，在比如 `uni-ad`、`uni-push` 等模块时需要获取这些模块需要的 `appId` 等信息，所以提供了在项目 `manifest.json` 配置方式。具体字段说明参考如下：

#### 应用版本信息
应用版本信息字段全部在 `manifest.json` 跟节点设置。

| 字段名 | 说明
| --- | ---
| name | 应用名称，会自动替换原生工程的 `app_name`，默认为 `uniapp x`
| versionName | 版本名称，默认为 `1.0.0`
| versionCode | 版本号，默认为 `100`

#### 内置模块信息
内置模块信息字段在 `manifest.json` 中 `app -> distribute -> modules` 节点下设置。

| 字段名 | 说明
| --- | ---
| uni-ad | [uni-ad](https://doc.dcloud.net.cn/uni-app-x/collocation/manifest-modules.html#uni-ad) 模块信息，对象形式。
| - gdt | `uni-ad` 模块的 `gdt` 节点，腾讯优量汇广告联盟配置内容。对象形式，如：`"dgt":{}`
| - gm | `uni-ad` 模块的 `gm` 节点，穿山甲配置内容。对象形式，如：`"gm":{}`
| - ks | `uni-ad` 模块的 `ks` 节点，快手配置内容。对象形式，如：`"ks":{}`
| - bd | `uni-ad` 模块的 `bd` 节点，百度配置内容。对象形式，如：`"bd":{}`
| - sigmob | `uni-ad` 模块的 `sigmob` 节点，sigmob配置内容。对象形式，如：`"sigmob":{}`
| - DCLOUDUnionId | `uni-ad` 模块的 `DCLOUDUnionId` 节点，联盟ID值，示例：DCLOUDUnionId: "xxx"。联盟ID位于：[uni-AD后台](https://uniad.dcloud.net.cn/)->首页->联盟ID
| uni-facialRecognitionVerify | `uni-facialRecognitionVerify` 模块信息，对象形式。如：`"uni-facialRecognitionVerify":{}`
| uni-payment | [uni-payment](https://doc.dcloud.net.cn/uni-app-x/collocation/manifest-modules.html#uni-payment) 模块信息，对象形式。
| - alipay | [uni-payment](https://doc.dcloud.net.cn/uni-app-x/collocation/manifest-modules.html#uni-payment) 模块的 `alipay` 节点。对象形式，如：`"alipay":{}`
| - wxpay | [uni-payment](https://doc.dcloud.net.cn/uni-app-x/collocation/manifest-modules.html#uni-payment) 模块的 `wxpay` 节点。对象形式，如：`"wxpay":{}`
| uni-push | `uni-push` 模块信息，对象形式。
| - GETUI_APPID | `uni-push` 模块的 `GETUI_APPID` 节点，示例：`"GETUI_APPID":"xxx"`。参考：[uni-push2.0配置](https://uniapp.dcloud.net.cn/unipush-v2.html#%E7%AC%AC%E4%BA%8C%E6%AD%A5-%E9%85%8D%E7%BD%AE)
| - PUSH_APPID | `uni-push` 模块的 `PUSH_APPID` 节点，为示例：`"PUSH_APPID":"xxx"`。参考：[uni-push2.0配置](https://uniapp.dcloud.net.cn/unipush-v2.html#%E7%AC%AC%E4%BA%8C%E6%AD%A5-%E9%85%8D%E7%BD%AE)
| - dcloud_unipush_auto_notification | `uni-push` 模块的 `dcloud_unipush_auto_notification` 节点，示例：`"dcloud_unipush_auto_notification":true`。透传时是否自动创建通知，布尔类型。
| - MIPUSH_APPID | `uni-push` 模块的 `MIPUSH_APPID` 节点，示例：`"MIPUSH_APPID":"xxx"`。参考：[uni-push2.0配置](https://uniapp.dcloud.net.cn/unipush-v2.html#%E7%AC%AC%E4%BA%8C%E6%AD%A5-%E9%85%8D%E7%BD%AE)
| - MIPUSH_APPKEY | `uni-push` 模块的 `MIPUSH_APPKEY` 节点，示例：`"MIPUSH_APPKEY":"xxx"`。参考：[uni-push2.0配置](https://uniapp.dcloud.net.cn/unipush-v2.html#%E7%AC%AC%E4%BA%8C%E6%AD%A5-%E9%85%8D%E7%BD%AE)
| - MEIZUPUSH_APPID | `uni-push` 模块的 `MEIZUPUSH_APPID` 节点，示例：`"MEIZUPUSH_APPID":"xxx"`。参考：[uni-push2.0配置](https://uniapp.dcloud.net.cn/unipush-v2.html#%E7%AC%AC%E4%BA%8C%E6%AD%A5-%E9%85%8D%E7%BD%AE)
| - MEIZUPUSH_APPKEY | `uni-push` 模块的 `MEIZUPUSH_APPKEY` 节点，示例：`"MEIZUPUSH_APPKEY":"xxx"`。参考：[uni-push2.0配置](https://uniapp.dcloud.net.cn/unipush-v2.html#%E7%AC%AC%E4%BA%8C%E6%AD%A5-%E9%85%8D%E7%BD%AE)
| - OPPOPUSH_APPKEY | `uni-push` 模块的 `OPPOPUSH_APPKEY` 节点，示例：`"OPPOPUSH_APPKEY":"xxx"`。参考：[uni-push2.0配置](https://uniapp.dcloud.net.cn/unipush-v2.html#%E7%AC%AC%E4%BA%8C%E6%AD%A5-%E9%85%8D%E7%BD%AE)
| - OPPOPUSH_APPSECRET | `uni-push` 模块的 `OPPOPUSH_APPSECRET` 节点，示例：`"OPPOPUSH_APPSECRET":"xxx"`。参考：[uni-push2.0配置](https://uniapp.dcloud.net.cn/unipush-v2.html#%E7%AC%AC%E4%BA%8C%E6%AD%A5-%E9%85%8D%E7%BD%AE)
| - HUAWEI_APPID | `uni-push` 模块的 `HUAWEI_APPID` 节点，示例：`"HUAWEI_APPID":"xxx"`。参考：[uni-push2.0配置](https://uniapp.dcloud.net.cn/unipush-v2.html#%E7%AC%AC%E4%BA%8C%E6%AD%A5-%E9%85%8D%E7%BD%AE)
| - VIVO_APPID | `uni-push` 模块的 `VIVO_APPID` 节点，示例：`"VIVO_APPID":"xxx"`。参考：[uni-push2.0配置](https://uniapp.dcloud.net.cn/unipush-v2.html#%E7%AC%AC%E4%BA%8C%E6%AD%A5-%E9%85%8D%E7%BD%AE)
| - VIVO_APIKEY | `uni-push` 模块的 `VIVO_APIKEY` 节点，示例：`"VIVO_APIKEY":"xxx"`。参考：[uni-push2.0配置](https://uniapp.dcloud.net.cn/unipush-v2.html#%E7%AC%AC%E4%BA%8C%E6%AD%A5-%E9%85%8D%E7%BD%AE)
| - HIHONOR_APPID | `uni-push` 模块的 `HIHONOR_APPID` 节点，示例：`"HIHONOR_APPID":"xxx"`。参考：[uni-push2.0配置](https://uniapp.dcloud.net.cn/unipush-v2.html#%E7%AC%AC%E4%BA%8C%E6%AD%A5-%E9%85%8D%E7%BD%AE)
| uni-video | `uni-video` 模块信息，对象形式。如：`"uni-video":{}`
| uni-verify | `uni-verify` 模块信息，对象形式。如：`"uni-verify":{}`
| - GETUI_APPID | `uni-verify` 的 `GETUI_APPID` 节点，示例：`"GETUI_APPID":"xxx"`。`GETUI_APPID`与`GY_APP_ID`在[开发者中心](https://dev.dcloud.net.cn/)->一键登录->基础配置->一键登录应用ID，GETUI_APPID与GY_APP_ID取值相同。
| - GY_APP_ID | `uni-verify` 的 `GY_APP_ID` 节点，示例：`"GY_APP_ID":"xxx"`。`GETUI_APPID`与`GY_APP_ID`在[开发者中心](https://dev.dcloud.net.cn/)->一键登录->基础配置->一键登录应用ID，GETUI_APPID与GY_APP_ID取值相同。

### 命令行说明

#### start
执行构建流程，执行示例：

```shell
npm run start
```

#### doctor
诊断本地构建环境配置，执行示例：

```shell
npm run doctor
```