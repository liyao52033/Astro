---
title: Elasticsearch全文搜索
autoSort: 992
permalink: /pages/391da0/
tags: ["后端","springboot","Elasticsearch"]
titleTag: 原创
pubDate: 2023-08-24 10:48:13
description: '这是我 Astro 博客的第一篇文章。'
image:
    url: 'https://docs.astro.build/assets/rose.webp'
    alt: 'The Astro logo on a dark background with a pink glow.'
author: 华总
---

## 在 Windows 上安装 Elasticsearch 作为服务

Elasticsearch 可以作为服务安装在后台运行，或者在启动时自动启动，无需任何用户交互。`elasticsearch-service.bat`这可以通过文件夹中的脚本实现，`bin\`该脚本允许从命令行安装、删除、管理或配置服务并可能启动和停止服务。

```bash
D:\elasticsearch-7.17.9\bin>elasticsearch-service.bat

Usage: elasticsearch-service.bat install|remove|start|stop|manager [SERVICE_ID]
```

该脚本需要一个参数（要执行的命令），后跟一个指示服务 ID 的可选参数（在安装多个 Elasticsearch 服务时很有用）。

可用的命令是：

| `install` | 将 Elasticsearch 安装为服务                             |
| --------- | ------------------------------------------------------- |
| `remove`  | 删除已安装的 Elasticsearch 服务（如果启动则停止该服务） |
| `start`   | 启动 Elasticsearch 服务（如果已安装）                   |
| `stop`    | 停止 Elasticsearch 服务（如果已启动）                   |
| `manager` | 启动用于管理已安装服务的 GUI                            |



## 添加依赖

要使用 Elasticsearch，需要添加 Elasticsearch 的 Java 客户端依赖。可以在项目的 `pom.xml` 文件中添加以下依赖

```java
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-elasticsearch</artifactId>
</dependency>
```

## 配置连接信息

```java
spring:
  elasticsearch:
    uris: http://localhost:9200
    socket-timeout: "10s"
    username: "user"
    password: "secret"
```



## 创建实体类

创建一个Java类来表示您要存储在Elasticsearch中的数据。此类应该使用`@Document`注解进行注释，并且每个字段都应该使用相应的注解进行注释，以指定字段名称、数据类型和Elasticsearch中的数据类型。

```java
@Document(indexName = "post")
@Data
public class PostEsDTO implements Serializable {

    private static final String DATE_TIME_PATTERN = "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'";

    /**
     * id
     */
    @Id
    private Long id;

    /**
     * 标题
     */
    private String title;

    /**
     * 内容
     */
    private String content;

    /**
     * 创建时间
     */
    @Field(index = false, store = true, type = FieldType.Date, format = {}, pattern = DATE_TIME_PATTERN)
    private Date createTime;

    private static final long serialVersionUID = 1L;
}

```

## 创建Repository接口

创建一个Repository接口，继承自`ElasticsearchRepository`，用于在Elasticsearch中存储和检索数据。Spring Data Elasticsearch会自动根据方法名称生成查询，您也可以使用`@Query`注解来指定自定义查询。

```java
public interface PostEsDao extends ElasticsearchRepository<PostEsDTO, String> {
    List<PostEsDTO> findByUserId(Long userId);
}
```

## 使用Repository

在您的代码中，可以通过注入`MyEntityRepository`来使用它，并使用它的方法来存储和检索数据

```java
@RestController
public class MyController {

    @Resource
    private PostEsDao postEsDao;

    @PostMapping("/entities")
    public MyEntity create(@RequestBody PostEsDTO postEsDTO) {
        return postEsDao.save(entity);
    }

    @GetMapping("/entities/{id}")
    public MyEntity findById(@PathVariable String id) {
        return postEsDao.findById(id).orElse(null);
    }

    @GetMapping("/entities")
    public List<MyEntity> findByName(@RequestParam String name) {
        return postEsDao.findByName(name);
    }
}

```

以上就是使用`spring-boot-starter-data-elasticsearch`库在Spring Boot应用程序中与Elasticsearch进行交互的基本步骤。通过这种方式，您可以轻松地将Elasticsearch集成到您的应用程序中，并使用Spring Data的强大功能进行查询和操作。

## 分页

```java
@PostMapping("/list")
    public Result<Page<PostEsDTO>> findAll(@RequestBody PostEsDTO postEsDTO) {
        int current = postEsDTO.getCurrent();
        int size = postEsDTO.getSize();
        return Result.success(postEsDao.findAll(PageRequest.of(current,size))); 
    }
    // findAll(PageRequest.of(current,size))为ElasticsearchRepositorynei'zhi
```

## 高亮及搜索建议

## DSL转springboot代码





