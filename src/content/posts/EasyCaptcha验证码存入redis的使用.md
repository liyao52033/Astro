---
title: EasyCaptcha验证码存入redis的使用
autoSort: 996
permalink: /pages/f0631c/
tags: ["后端","springboot","EasyCaptcha验证码"]
pubDate: 2023-08-24
description: '这是我 Astro 博客的第一篇文章。'
image:
    url: 'https://docs.astro.build/assets/rose.webp'
    alt: 'The Astro logo on a dark background with a pink glow.'
author: 华总
---

## 1. 引入Maven依赖

```xml
<!-- EasyCaptcha -->
<dependency>
  <groupId>com.github.whvcse</groupId>
  <artifactId>easy-captcha</artifactId>
  <version>1.6.2</version>
</dependency>

 <!-- redis -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-redis</artifactId>
</dependency>
<dependency>
    <groupId>org.springframework.session</groupId>
    <artifactId>spring-session-data-redis</artifactId>
</dependency>
```



## 2. yml配置

```yaml
# 验证码配置
easy-captcha:
  # 验证码类型: arithmetic-算术
  type: arithmetic
  # 验证码有效时间(单位：秒)
  ttl: 300
  
# Redis 配置
spring
   redis:
    database: 1
    host: localhost
    port: 6379
    timeout: 5000
    password: 123456
    lettuce:
      pool:
        # 连接池最大连接数 默认8 ，负数表示没有限制
        max-active: 8
        # 连接池最大阻塞等待时间（使用负值表示没有限制） 默认-1
        max-wait: -1
        # 连接池中的最大空闲连接 默认8
        max-idle: 8
        # 连接池中的最小空闲连接 默认0
        min-idle: 0
```



## 3. 验证码类型枚举

```java
public enum CaptchaTypeEnum {

    /**
     * 算数
     */
    ARITHMETIC,
    /**
     * 中文
     */
    CHINESE,
    /**
     * 中文闪图
     */
    CHINESE_GIF,
    /**
     * 闪图
     */
    GIF,
    SPEC
}

```



## 4.  配置类

### 4.1 Captcha配置类

```java
@ConfigurationProperties(prefix = "easy-captcha")
@Configuration
@Data
public class CaptchaConfig {

    /**
     * 验证码类型
     */
    private CaptchaTypeEnum type = CaptchaTypeEnum.ARITHMETIC;


    /**
     * 验证码缓存过期时间(单位:秒)
     */
    private long ttl = 300L;

    /**
     * 验证码内容长度
     */
    private int length = 4;
    /**
     * 验证码宽度
     */
    private int width = 120;
    /**
     * 验证码高度
     */
    private int height = 36;


    /**
     * 验证码字体
     */
    private String fontName = "Verdana";

    /**
     * 字体风格
     */
    private Integer fontStyle = Font.PLAIN;

    /**
     * 字体大小
     */
    private int fontSize = 20;


}
```

### 4.2 redis配置类

```java
@Configuration
@EnableCaching //开启注解
public class RedisConfig extends CachingConfigurerSupport {
    /**
     * retemplate相关配置
     * 序列化配置，如果没有配置序列化的话可能会出现往redis存了值，但是获取不到
     */
    @Bean
    public RedisTemplate<String, Object> redisTemplate(RedisConnectionFactory factory) {
        RedisTemplate<String, Object> template = new RedisTemplate<>();
        template.setConnectionFactory(factory);
        Jackson2JsonRedisSerializer jacksonSeial = new Jackson2JsonRedisSerializer(Object.class);
        ObjectMapper om = new ObjectMapper();
        om.setVisibility(PropertyAccessor.ALL, JsonAutoDetect.Visibility.ANY);
        om.enableDefaultTyping(ObjectMapper.DefaultTyping.NON_FINAL);
        jacksonSeial.setObjectMapper(om);
        template.setValueSerializer(jacksonSeial);
        template.setKeySerializer(new StringRedisSerializer());
        template.setHashKeySerializer(new StringRedisSerializer());
        template.setHashValueSerializer(jacksonSeial);
        template.afterPropertiesSet();
        return template;
    }
}
```



## 5. 添加dto类

```java
@Schema(description ="验证码校验对象")
@Builder
@Data
public class CaptchaCheck {

    @Schema(description = "验证码缓存key")
    private String verifyCodeKey;

    @Schema(description = "用户输入验证码")
    private String verifyCode;
}

@Schema(description ="验证码响应对象")
@Builder
@Data
public class CaptchaResult {

    @Schema(description = "验证码缓存key")
    private String verifyCodeKey;

    @Schema(description = "验证码图片Base64字符串")
    private String verifyCodeBase64;

}
```



## 6. 验证码生成

```java
@Component
@RequiredArgsConstructor
public class EasyCaptchaProducer {

    private final CaptchaConfig captchaConfig;

    public Captcha getCaptcha() {
        Captcha captcha;
        int width = captchaConfig.getWidth();
        int height = captchaConfig.getHeight();
        int length = captchaConfig.getLength();
        String fontName = captchaConfig.getFontName();

        switch (captchaConfig.getType()) {
            case ARITHMETIC:
                captcha = new ArithmeticCaptcha(width, height);
                //固定设置为两位，图片为算数运算表达式
                captcha.setLen(2);
                break;
            case CHINESE:
                captcha = new ChineseCaptcha(width, height);
                captcha.setLen(length);
                break;
            case CHINESE_GIF:
                captcha = new ChineseGifCaptcha(width, height);
                captcha.setLen(length);
                break;
            case GIF:
                captcha = new GifCaptcha(width, height);//最后一位是位数
                captcha.setLen(length);
                break;
            case SPEC:
                captcha = new SpecCaptcha(width, height);
                captcha.setLen(length);
                break;
            default:
                throw new RuntimeException("验证码配置信息错误！正确配置查看 CaptchaTypeEnum ");
        }
        captcha.setFont(new Font(fontName, captchaConfig.getFontStyle(), captchaConfig.getFontSize()));
        return captcha;

    }


}
```



## 7. 获取验证码并将验证码文本缓存至Redis，用于登录校验

```java
@Component
@RequiredArgsConstructor
public class EasyCaptchaService {

    private final EasyCaptchaProducer easyCaptchaProducer;

    private final RedisTemplate<String, String> redisTemplate;

    private final CaptchaConfig captchaConfig;

    /**
     * 获取验证码
     *
     * @return
     */
    public CaptchaResult getCaptcha() {
        // 获取验证码
        Captcha captcha = easyCaptchaProducer.getCaptcha();
        String captchaText = captcha.text(); // 验证码文本
        String captchaBase64 = captcha.toBase64(); // 验证码图片Base64字符串

        // 验证码文本缓存至Redis，用于登录校验
        String verifyCodeKey = IdUtil.fastSimpleUUID();
        redisTemplate.opsForValue().set(SecurityConstants.VERIFY_CODE_CACHE_PREFIX + verifyCodeKey, captchaText,
                captchaConfig.getTtl(), TimeUnit.SECONDS);

        return CaptchaResult.builder()
                .verifyCodeKey(verifyCodeKey)
                .verifyCodeBase64(captchaBase64)
                .build();
    }

}
```



## 8. 校验验证码

```java
@Component
public class VerifyCodeFilter {

    public boolean doFilterInternal(String verifyCode, String verifyCodeKey, HttpServletRequest request) {

        // 缓存中的验证码
        RedisTemplate redisTemplate = SpringUtil.getBean("redisTemplate", RedisTemplate.class);
        Object cacheVerifyCode = redisTemplate.opsForValue().get(SecurityConstants.VERIFY_CODE_CACHE_PREFIX + verifyCodeKey);
        if (cacheVerifyCode == null) {
            throw new BusinessException(ErrorCode.VERIFY_CODE_TIMEOUT);
        }
            // 验证码比对
        if (!StrUtil.equals(verifyCode, Convert.toStr(cacheVerifyCode))) {
            throw new BusinessException(ErrorCode.VERIFY_CODE_ERROR);
        }
        return true;
    }
}
```



## 9. 验证码接口

```java
@Tag(name = "CaptchaController")
@RequestMapping("/captcha")
@RestController
@Slf4j
public class CaptchaController {

    private final EasyCaptchaService easyCaptchaService;
    private final VerifyCodeFilter verifyCodeFilter;


    public CaptchaController(EasyCaptchaService easyCaptchaService, VerifyCodeFilter verifyCodeFilter) {
        this.easyCaptchaService = easyCaptchaService;
        this.verifyCodeFilter = verifyCodeFilter;
    }

    @Operation(summary = "获取验证码")
    @PostMapping("/get")
    public BaseResponse<CaptchaResult> getCaptcha() {
        CaptchaResult captcha = easyCaptchaService.getCaptcha();
        return ResultUtils.success(captcha);
    }

    @Operation(summary = "校验验证码")
    @PostMapping("/check")
    public BaseResponse<Boolean> checkCaptcha(@RequestBody CaptchaCheck CaptchaCheck, HttpServletRequest request) {
        String verifyCode = CaptchaCheck.getVerifyCode();
        String verifyCodeKey = CaptchaCheck.getVerifyCodeKey();
        boolean result = verifyCodeFilter.doFilterInternal(verifyCode, verifyCodeKey, request);
        return ResultUtils.success(result);
    }
}

```





