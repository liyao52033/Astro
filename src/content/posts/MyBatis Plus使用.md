---
title: MyBatis Plus使用
permalink: /pages/17352a/
tags: ["MyBatis Plus","springboot","后端"]
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

```xml
<dependency>
    <groupId>com.baomidou</groupId>
    <artifactId>mybatis-plus-boot-starter</artifactId>
    <version>3.5.3.2</version>
</dependency>
```

yml配置

```yaml
mybatis-plus:
  configuration:
    map-underscore-to-camel-case: false
    log-impl: org.apache.ibatis.logging.stdout.StdOutImpl
  global-config:
    db-config:
      logic-delete-field: isDelete # 全局逻辑删除的实体字段名
      logic-delete-value: 1 # 逻辑已删除值（默认为 1）
      logic-not-delete-value: 0 # 逻辑未删除值（默认为 0）

```


:::



## 1.常用CRUD及基本流程

```java
基本流程 mapper.xml => mapper => serviceImpl => service => controller => 前端
```

### 1.1 CRUD使用

mapper，mapper.xml及基本的service层由MybatisX生成，基本使用直接在controller层调用即可，如下

```java
   @GetMapping("/")
    public Website listConfig() {
        QueryWrapper<Website> queryWrapper = new QueryWrapper<>();
        queryWrapper.select("config");
        return websiteService.getOne(queryWrapper);
    }
```

也可在service层自定义接口，serviceImpl层写具体逻辑，controller层调用

```java
 // service层
boolean userLogin(String userAccount, String userPassword);

// serviceImpl层
 @Override
public boolean userLogin(String userAccount, String userPassword) {

    //密码字段加密
    String encryptPassword = DigestUtils.md5DigestAsHex((SALT + userPassword).getBytes());

    User user = new User();
    user.setUserAccount(userAccount);
    user.setUserPassword(encryptPassword);
    return this.save(user);
}

//controller层调用
    @PostMapping("/add")
    public Result<String> add(@Validated @RequestBody UserQueryRequest userQueryRequest) {
       String userAccount = userQueryRequest.getUserAccount();
       String password = userQueryRequest.getUserPassword();

        QueryWrapper wrapper = new QueryWrapper<>();
        wrapper.eq("userAccount",userAccount);
        Long count = userService.count(wrapper);
        if(count > 0){
            return Result.handle(ErrorCode.OPERATION_ERROR.getCode(),ErrorCode.OPERATION_ERROR.getMessage(), Collections.singletonList("账户已存在"));
        }

       boolean result = userService.userLogin(userAccount,password);
       if (result) {
          return Result.success("保存成功");
       } else {
          return Result.failure(ErrorCode.SYSTEM_ERROR);
       }
   }
```

### 1.2 自定义错误码及错误封装

1.2.1 自定义错误码

```java
// 自定义错误码
public enum ErrorCode {

    //错误代码
    PARAMS_ERROR(40000, "请求参数错误",""),
    NOT_LOGIN_ERROR(40100, "未登录", ""),
    NO_AUTH_ERROR(40101, "权限不足，请用管理员账号登录", ""),
    NOT_FOUND_ERROR(40400, "请求数据不存在", ""),
    FORBIDDEN_ERROR(40300, "禁止访问", ""),
    SYSTEM_ERROR(50000, "系统错误", ""),
    NOT_EQUALS(66666,"两次密码不一致",""),
    OPERATION_ERROR(50001, "操作失败", "");


    /**
     * 状态码
     */
    private final int code;

    /**
     * 信息
     */
    private final String message;

    /**
     * 数据
     */
    private final String data;

    // 构造函数，该构造函数需要传入一个整数代码、消息和数据字符串。
    ErrorCode(int code, String message, String data) {
        this.code = code;
        this.message = message;
        this.data = data;
    }

    public int getCode() {
        return code;
    }

    public String getMessage() {
        return message;
    }

    public String getData() {
        return data;
    }
}

```

1.2.2 自定义返回类

```java
@Data
public class Result<T> {

    private int code;  // 响应状态码
    private String message;  // 响应消息
    private T data;  // 响应数据


    // 构造函数
    public Result(int code, String message, T data) {
        this.code = code;
        this.message = message;
        this.data = data;
    }

    //参数检验失败函数，在GlobalControllerAdvice.java里调用
    public Result() {

    }

    // 成功时的静态工厂方法
    public static <T> Result<T> success(T data) {

        return new Result<T>(200, "操作成功", data);
    }

    // 失败时的静态工厂方法
    public static <T> Result<T> failure(ErrorCode errorCode) {

        return new Result<T>(errorCode.getCode(), errorCode.getMessage(), (T) errorCode.getData());
    }

    // 参数检验失败的提示
    public static Result handle(int value, String badRequestMsg, List<String> collect) {
        return new Result(value,badRequestMsg, collect);
    }
}

```

1.2.3 参数校验类

```java
// 参数检验
@Data
public class UpdateQueryRequest implements Serializable {

    /**
     * id
     */
    @TableId(type = IdType.ASSIGN_ID)
    @NotNull(message = "id不能为空")
    private Long id;

    @Size(min = 8, max = 16, message = "密码长度必须是8-16个字符")
    private String userPassword;

    @Size(min = 8, max = 16, message = "校验密码长度必须是8-16个字符")
    private String checkPassword;

    private static final long serialVersionUID = 1L;

}

// 获取参数检验注解里的说明并组合成数组传给前端
@RestControllerAdvice
public class GlobalControllerAdvice {

    // <1> 处理 form data方式调用接口校验失败抛出的异常
    @ExceptionHandler(BindException.class)
    public Result bindExceptionHandler(BindException e) {
        List<FieldError> fieldErrors = e.getBindingResult().getFieldErrors();
        // 组合参数检验类里的说明
        List<String> collect = fieldErrors.stream()
                .map(o -> o.getDefaultMessage())
                .collect(Collectors.toList());
        return new Result().handle(ErrorCode.PARAMS_ERROR.getCode(), ErrorCode.PARAMS_ERROR.getMessage(), collect);
    }
    // <2> 处理 json 请求体调用接口校验失败抛出的异常
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public Result methodArgumentNotValidExceptionHandler(MethodArgumentNotValidException e) {
        List<FieldError> fieldErrors = e.getBindingResult().getFieldErrors();
        // 组合参数检验类里的说明
        List<String> collect = fieldErrors.stream()
                .map(o -> o.getDefaultMessage())
                .collect(Collectors.toList());
        return Result.handle(ErrorCode.PARAMS_ERROR.getCode(), ErrorCode.PARAMS_ERROR.getMessage(), collect);
    }
    // <3> 处理单个参数校验失败抛出的异常
    @ExceptionHandler(ConstraintViolationException.class)
    public Result constraintViolationExceptionHandler(ConstraintViolationException e) {
        Set<ConstraintViolation<?>> constraintViolations = e.getConstraintViolations();
        // 组合参数检验类里的说明
        List<String> collect = constraintViolations.stream()
                .map(o -> o.getMessage())
                .collect(Collectors.toList());
        return Result.handle(ErrorCode.PARAMS_ERROR.getCode(), ErrorCode.PARAMS_ERROR.getMessage(), collect);
    }
}

// controller层使用
@Validated  //类上加@Validated 注解
public class UserController {
   @PostMapping("/add")
    // 方法参数里加上@Validated 注解即可实现对参数的校验
    // 有其他的实体类只需在对应字段添加相应注解及说明，在控制层类和方法上加上@Validated 注解即可
    public Result<String> add(@Validated @RequestBody UserQueryRequest userQueryRequest) {
       String userAccount = userQueryRequest.getUserAccount();
       String password = userQueryRequest.getUserPassword();

        QueryWrapper wrapper = new QueryWrapper<>();
        wrapper.eq("userAccount",userAccount);
        Long count = userService.count(wrapper);
        if(count > 0){
            return Result.handle(ErrorCode.OPERATION_ERROR.getCode(),ErrorCode.OPERATION_ERROR.getMessage(), Collections.singletonList("账户已存在"));
        }

       boolean result = userService.userLogin(userAccount,password);
        // 自定义返回类及错误码
       if (result) {
          return Result.success("保存成功");
       } else {
          return Result.failure(ErrorCode.SYSTEM_ERROR);
       }
   }
}
```



## 2.分页插件使用

### 2.1 **添加配置文件**

```java
@Configuration
@MapperScan("scan.your.mapper.package")
public class MybatisPlusConfig {

    /**
     * 新的分页插件,一缓和二缓遵循mybatis的规则,需要设置 MybatisConfiguration#useDeprecatedExecutor = false 避免缓存出现问题(该属性会在旧插件移除后一同移除)
     */
    @Bean
    public MybatisPlusInterceptor mybatisPlusInterceptor() {
        MybatisPlusInterceptor interceptor = new MybatisPlusInterceptor();
        interceptor.addInnerInterceptor(new PaginationInnerInterceptor(DbType.H2));
        return interceptor;
    }

    @Bean
    public ConfigurationCustomizer configurationCustomizer() {
        return configuration -> configuration.setUseDeprecatedExecutor(false);
    }
}
```

### 2.2 **mapper层自定义分页接口**

```java
IPage<UserVO> selectMyPage(Page<User> page, @Param(Constants.WRAPPER) Wrapper<User> queryWrapper);
```

Constants.WRAPPER则是一个固定的字符串，用于表示Wrapper实例的标识符，可以在使用Wrapper实例的时候作为参数名称传递给Mapper接口方法，以便MyBatis-Plus能够正确地解析Wrapper实例并生成SQL语句

### 2.3 **mapper.xml文件配置**

```java
 <select id="selectMyPage" resultType="com.xiaoying.hello.model.VO.UserVO">
        select * from user ${ew.customSqlSegment}
    </select>
```

${ew.customSqlSegment} 是一个占位符，用于动态拼接 SQL 语句。${ew.customSqlSegment} 中的 ew 是一个Wrapper实例的变量名，用于表示Wrapper实例中的自定义 SQL 片段，customSqlSegment 是一个Wrapper实例中的方法名，用于表示自定义 SQL 片段的名称。当我们使用 Wrapper 来构建查询条件时，可以通过调用 Wrapper 中的自定义 SQL 方法来构建自定义 SQL 片段。

### 2.4 **service层配置**

```java
IPage<UserVO> getUserPage(Page<User> userPage, ListQueryRequest listQueryRequest);
```

userpage表示分页对象，listQueryRequest为dto,表示分页参数

### 2.5 **serviceImpl层配置**

```java
  @Override
    public IPage<UserVO> getUserPage(Page<User> userPage, ListQueryRequest listQueryRequest) {

        // 获取所需参数
        String UserAccount = listQueryRequest.getUserAccount();
        String userName = listQueryRequest.getUserName();
        String userProfile = listQueryRequest.getUserProfile();
        String searchText = listQueryRequest.getSearchText();
        String createTime = listQueryRequest.getCreateTime();
        long current = userPage.getCurrent(); //当前页数
        long size = userPage.getSize(); //每页条数

        //构造查询条件
        QueryWrapper<User> Wrapper = new QueryWrapper<>();
        Wrapper.like(StringUtils.isNoneBlank(UserAccount),"UserAccount",UserAccount);
        Wrapper.like(StringUtils.isNotBlank(userName),"userName",userName);
        Wrapper.like(StringUtils.isNotBlank(userProfile),"userProfile",userProfile);
        Wrapper.like(StringUtils.isNotBlank(createTime),"createTime", createTime);
        if(StringUtils.isNotBlank(searchText)){
            Wrapper.like(StringUtils.isNotBlank(userName),"userName",userName).or()
                    .like(StringUtils.isNotBlank(UserAccount),"UserAccount",UserAccount);
        }

        //分页查询
        Page<User> page = new Page<>(current,size);
        return userMapper.selectMyPage(page,Wrapper);
    }
```

### 2.6 **controller配置**

```java
  @PostMapping("/list")
    public Result<IPage<UserVO>> list(@RequestBody ListQueryRequest listQueryRequest) {

        long current = listQueryRequest.getCurrent();
        long size = listQueryRequest.getSize();

        Page<User> page = new Page<>(current,size);
        IPage<UserVO> mapIPage = userService.getUserPage(page,listQueryRequest);
        return Result.success(mapIPage);
    }
```

### 2.7 **VO层配置**

```java
@Data
public class UserVO implements Serializable {
    /**
     * 账号
     */
    private String userAccount;

    /**
     * 用户昵称
     */
    private String userName;

    /**
     * 用户头像
     */
    private String userAvatar;

    /**
     * 用户简介
     */
    private String userProfile;

    /**
     * 创建时间
     */
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss", timezone="GMT+8")
    private LocalDateTime createTime;

}

```

枚举需要返回的字段,可以进行脱敏，包装类转换等操作

## 3.判断数据是否已存在

```java
要使用 MyBatis Plus 来判断数据是否已存在，可以使用 MyBatis Plus 提供的通用方法 `selectCount`。以下是一个示例：

   QueryWrapper<ApiInfo> queryWrapper = new QueryWrapper<>();
   String url = apiAddRequest.getUrl();
   queryWrapper.eq("url", url);
   long count = apiInfoMapper.selectCount(queryWrapper);
   ThrowUtils.throwIf(count > 0, ErrorCode.EXIST_ERROR,"接口已存在");

在上述代码中，我们使用 `QueryWrapper` 创建一个查询条件，使用 `eq` 方法指定要查询的数据列和要匹配的值。然后，我们使用 `selectCount` 方法执行查询，该方法会返回匹配查询条件的数据行数。最后，我们将结果与 0 进行比较，如果大于 0 则表示数据已存在，返回 `true`；否则，表示数据不存在，返回 `false`。

请将上述代码中的 `Entity` 替换为您的实体类名称，并将 `data_column` 替换为您要进行判断的数据列名称。
```







