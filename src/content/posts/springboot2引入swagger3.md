---
title: springboot2引入swagger3
autoSort: 998
permalink: /pages/301b87/
tags: ["后端","springboot","swagger"]
titleTag: 原创
pubDate: 2023-08-24 10:48:32
description: '这是我 Astro 博客的第一篇文章。'
image:
    url: 'https://docs.astro.build/assets/rose.webp'
    alt: 'The Astro logo on a dark background with a pink glow.'
author: 华总
---

## 1. 引入依赖

[最新版本](https://doc.xiaominfo.com/docs/quick-start#openapi3)

```xml
 <dependency>
    <groupId>com.github.xiaoymin</groupId>
    <artifactId>knife4j-openapi3-spring-boot-starter</artifactId>
    <version>最新版本</version>   
</dependency>
```

##  2. 填写yml配置文件

dev环境

```yaml
springdoc:
  swagger-ui:
    path: /swagger-ui.html
    tags-sorter: alpha
    operations-sorter: method
  api-docs:
    path: /v3/api-docs
  group-configs:
    - group: 'default'
      paths-to-match: '/**'
      packages-to-scan: com.yupi.springbootinit.controller
# knife4j的增强配置，不需要增强可以不配
knife4j:
  enable: true
  setting:
    language: zh_cn
```

prod环境

```yaml
knife4j:
  enable: true
  setting:
    custom-code: 200
  // 生产环境禁用knife4j
  production: true
```



## 3. 新建配置文件Knife4jConfig

```java
@Configuration
@Profile({"dev", "test"})
public class Knife4jConfig {
    @Bean
    public OpenAPI customOpenAPI() {
        return new OpenAPI()
            .info(new Info()
                    .title("接口文档")
                    .version("1.0")
                    .description("属性：[https://springdoc.org/index.html#properties](https://springdoc.org/index.html#properties)，常见问题：[https://springdoc.org/#faq](https://springdoc.org/#faq)")
                    .termsOfService("https://smartbear.com/terms-of-use/")
                    .contact(new Contact().name("华总, 邮箱：liyao52033@163.com, 网站：https://wx.zsxq.com/dweb2/index/group/51112524211554"))
            );

    }
}
```





