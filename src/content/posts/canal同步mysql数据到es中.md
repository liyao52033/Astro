---
title: canal同步mysql数据到es中
autoSort: 990
permalink: /pages/25d41b/
tags: ["后端","springboot","canal"]
titleTag: 原创
pubDate: 2023-08-24
description: '这是我 Astro 博客的第一篇文章。'
image:
    url: 'https://docs.astro.build/assets/rose.webp'
    alt: 'The Astro logo on a dark background with a pink glow.'
author: 华总
---

::: tip 提示

maven依赖

```yaml
<dependency>
  <groupId>com.alibaba.otter</groupId>
  <artifactId>canal.client</artifactId>
  <version>1.1.4</version>
</dependency>
```

:::

## 1、开启mysql的binlog

使用canal-server需要先准备mysql，对于自建 MySQL , 需要先开启 Binlog 写入功能，配置 binlog-format 为 ROW 模式

vi /etc/my.cnf

```bash
[mysqld]
log-bin=mysql-bin # 开启 binlog
binlog-format=ROW # 选择 ROW 模式
server_id=1 # 配置 MySQL replaction 需要定义，不要和 canal 的 slaveId 重复
```

配置完成后重启mysql，并查询是否配置生效：ON就是开启

systemctl restart mysqld

可以进入数据库再次查看下

```sql
mysql> show variables like 'log_bin';
+---------------+-------+
| Variable_name | Value |
+---------------+-------+
| log_bin | ON |
+---------------+-------+
1 row in set (0.01 sec)
 
mysql> show variables like 'binlog_format%';
+---------------+-------+
| Variable_name | Value |
+---------------+-------+
| binlog_format | ROW |
+---------------+-------+
1 row in set (0.00 sec)
```

## 2、mysql用户数据准备

 创建一个canal用户并对其进行授权

```sql
CREATE USER canal IDENTIFIED BY 'Cjz123456.';
GRANT SELECT, REPLICATION SLAVE, REPLICATION CLIENT ON *.* TO 'canal'@'%';
FLUSH PRIVILEGES;
```

创建一个测试用户数据库及表

```sql
create database canal;<br>USE canal;
CREATE TABLE product  (
  id bigint(20) NOT NULL AUTO_INCREMENT,
  title varchar(255) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL,
  sub_title varchar(255) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL,
  price decimal(10, 2) NULL DEFAULT NULL,
  pic varchar(255) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL,
  PRIMARY KEY (id) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 2 CHARACTER SET = utf8 COLLATE = utf8_general_ci ROW_FORMAT = Dynamic;
```

## 3、创建存放canal的目录　　

```bash
mkdir /usr/local/canal-server

mkdir /usr/local/canal-adpter

mkdir /usr/local/canal-admin　　
```



## 4、部署canal-server

tar -zxvf canal.deployer-1.1.6-SNAPSHOT.tar.gz -C /usr/local/canal-server

vim /usr/local/canal-server/conf/example/instance.properties

```properties
# 需要同步数据的MySQL地址
canal.instance.master.address=127.0.0.1:3306
canal.instance.master.journal.name=
canal.instance.master.position=
canal.instance.master.timestamp=
canal.instance.master.gtid=
# 用于同步数据的数据库账号
canal.instance.dbUsername=canal
# 用于同步数据的数据库密码
canal.instance.dbPassword=Cjz123456.
# 数据库连接编码
canal.instance.connectionCharset = UTF-8
# 需要订阅binlog的表过滤正则表达式
canal.instance.filter.regex=.*\\..*
```

cd /usr/local/canal-server/bin

./startup.sh

查看日志查看是否正常启动

cd /usr/local/canal-server/logs/

tail -f example/example.log

![1693897220603](https://jsd.cdn.zzko.cn/gh/liyao52033/picx-images-hosting@master/后端/1693897220603.jpg)

tail -f canal/canal.log

![1693897220587](https://jsd.cdn.zzko.cn/gh/liyao52033/picx-images-hosting@master/后端/1693897220587.jpg)

## 5、部署canal-adapter

tar -zxvf canal.adapter-1.1.6-SNAPSHOT.tar.gz -C /usr/local/canal-adpter/

cd /usr/local/canal-adpter/conf

vim application.yml

```yaml
server:
  port: 8081
spring:
  jackson:
    date-format: yyyy-MM-dd HH:mm:ss
    time-zone: GMT+8
    default-property-inclusion: non_null
 
canal.conf:
  mode: tcp # 客户端的模式，可选tcp kafka rocketMQ
  flatMessage: true # 扁平message开关, 是否以json字符串形式投递数据, 仅在kafka/rocketMQ模式下有效
  zookeeperHosts:    # 对应集群模式下的zk地址
  syncBatchSize: 1000 # 每次同步的批数量
  retries: 0 # 重试次数, -1为无限重试
  timeout: # 同步超时时间, 单位毫秒
  accessKey:
  secretKey:
  consumerProperties:
    canal.tcp.server.host: 127.0.0.1:11111 #设置canal-server的地址
    canal.tcp.zookeeper.hosts:
    canal.tcp.batch.size: 500
    canal.tcp.username:
    canal.tcp.password:
  srcDataSources:
    defaultDS:
      url: jdbc:mysql://192.168.111.129:3306/canal?useUnicode=true&charaterEncoding=utf-8&useSSL=false
      username: canal
      password: Cjz123456.
  canalAdapters:
  - instance: example # canal instance Name or mq topic name
    groups:
    - groupId: g1
      outerAdapters:
      - name: logger
      - name: es7
        hosts: http://192.168.111.129:9200 # 127.0.0.1:9200 for rest mode
        properties:
          mode: rest # or rest
          security.auth: elastic:elastic #  only used for rest mode
          cluster.name: my-es
```

修改 `canal-adapter/conf/es7/mytest_user.yml` 文件，用于配置`MySQL`中的表与`Elasticsearch`中索引的映射关系

vim es7/mytest_user.yml

```bash
dataSourceKey: defaultDS # 源数据源的key, 对应上面配置的srcDataSources中的值
destination: example  # canal的instance或者MQ的topic
groupId: g1 # 对应MQ模式下的groupId, 只会同步对应groupId的数据
esMapping:
  _index: canal_product # es 的索引名称
  _id: _id  # 将Mysql表里的id对应上es上的_id, 如果不配置该项必须配置下面的pk项_id则会由es自动分配
  sql: "SELECT
         p.id AS _id,
         p.title,
         p.sub_title,
         p.price,
         p.pic
        FROM
         product p"        # sql映射
  etlCondition: "where p.id>={}"   #etl的条件参数
  commitBatch: 3000   # 提交批大小
```

cd /usr/local/canal-adpter/bin/

./startup.sh

查看日志看是否正常启动 

cd /usr/local/canal-adpter/logs/adapter/

tail -f adapter.log

![1693897220651](https://jsd.cdn.zzko.cn/gh/liyao52033/picx-images-hosting@master/后端/1693897220651.jpg)

## 6、创建ES索引

可以直接通过Kibana页面进行创建，不难看出，索引的属性对应着就是我们表的属性(Mysql表id与es的_id做了对应，所以这里不需要设置)

```sql
PUT canal_product
{
  "mappings": {
    "properties": {
      "title": {
        "type": "text"
      },
      "sub_title": {
        "type": "text"
      },
      "pic": {
        "type": "text"
      },
      "price": {
        "type": "double"
      }
    }
  }
}
```

![1693897220657](https://jsd.cdn.zzko.cn/gh/liyao52033/picx-images-hosting@master/后端/1693897220657.jpg)

## 7、验证

canal初始化是不会全量同步数据的，所以我们需要登录mysql，插入一条数据

```sql
INSERT INTO product ( ``id``, title, sub_title, price, pic ) VALUES ( 15, ``'小米8'``, ``' 全面屏游戏智能手机 6GB+64GB'``, 1999.00, NULL );
```

创建完成后在Kibana上查看即可发现数据已经同步

```bash
GET canal_product``/_search
```

![1693897220662](https://jsd.cdn.zzko.cn/gh/liyao52033/picx-images-hosting@master/后端/1693897220662.jpg)

在elasticsearch-head上查看也是，可以看出，我们的表id变成了es的_id

![1693897220618](https://jsd.cdn.zzko.cn/gh/liyao52033/picx-images-hosting@master/后端/1693897220618.jpg)

在Mysql上修改数据看看

```sql
UPDATE product SET title=``'小米10'` `WHERE ``id``=15;
```

 可以看到我们修改的数据也进行了同步

 ![1693897220594](https://jsd.cdn.zzko.cn/gh/liyao52033/picx-images-hosting@master/后端/1693897220594.jpg)

## 8、canal-admin的安装

`tar -zxvf canal.admin-1.1.6-SNAPSHOT.tar.gz -C /usr/local/canal-admin/`

创建 `canal-admin` 需要使用的数据库`canal_manager`，创建的SQL脚本在`canal-admin包下的conf/canal_manager.sql`

`cd /usr/local/canal-admin/conf/` 

导入sql脚本

`mysql -uroot -p < canal_manager.sql`

修改配置文件`conf/application.yml`，按如下配置即可，主要是修改数据源配置和`canal-admin`的管理账号配置，注意需要用一个有读写权限的数据库账号；

vim application.yml

```yaml
server:
  port: 8089
spring:
  jackson:
    date-format: yyyy-MM-dd HH:mm:ss
    time-zone: GMT+8
 
spring.datasource:
  address: 127.0.0.1:3306
  database: canal_manager
  username: root             #数据库管理员账号
  password: Cjz123456.       #数据库管理员账号密码
  driver-class-name: com.mysql.jdbc.Driver
  url: jdbc:mysql://${spring.datasource.address}/${spring.datasource.database}?useUnicode=true&characterEncoding=UTF-8&useSSL=false
  hikari:
    maximum-pool-size: 30
    minimum-idle: 1
 
canal:
  adminUser: admin
  adminPasswd: admin
```

接下来对之前搭建的canal-server的conf/canal_local.properties文件进行配置，主要是修改canal-admin的配置　　

`cd /usr/local/canal-server/conf/`

`vim canal_local.properties`

```properties
# register ip
canal.register.ip = 192.168.111.129
 
# canal admin config
canal.admin.manager = 127.0.0.1:8089
canal.admin.port = 11110
canal.admin.user = admin
canal.admin.passwd = 4ACFE3202A5FF5CF467898FC58AAB1D615029441
# admin auto register
canal.admin.register.auto = true
canal.admin.register.cluster =
canal.admin.register.name =
```

启动canal-admin

```bash
cd /usr/local/canal-admin/bin/

./startup.sh
```

启动完好后即可访问页面，访问ip:8089，初始用户密码admin/123456

![1693897220628](https://jsd.cdn.zzko.cn/gh/liyao52033/picx-images-hosting@master/后端/1693897220628.jpg)

重启canal-server

```bash
cd /usr/local/canal-server/bin/

./restart.sh local
```

再次回到我们的canal-admin管理页面，即可看到该节点信息

![1693897220638](https://jsd.cdn.zzko.cn/gh/liyao52033/picx-images-hosting@master/后端/1693897220638.jpg)





