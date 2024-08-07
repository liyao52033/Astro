---
title: FreeMarker生成文件及WEB使用
pubDate: 2023-11-23 15:20:08
permalink: /pages/376bd1/
tags: ["后端","springboot","FreeMarker"]
description: 'FreeMarker生成文件及WEB使用'
image:
    url: 'https://docs.astro.build/assets/rose.webp'
    alt: 'The Astro logo on a dark background with a pink glow.'
author: 华总
titleTag: 原创
---
## 生成本地文件

1. 创建一个Configuration对象，直接new一个对象。构造方法的参数就是freemarker对于的版本号。
2. 设置模板文件所在的路径。
3. 设置模板文件使用的字符集。一般就是utf-8.
4. 加载一个模板，创建一个模板对象。
5. 创建一个模板使用的数据集，可以是pojo也可以是map。一般是Map。
6. 创建一个Writer对象，一般创建一FileWriter对象，指定生成的文件名。
7. 调用模板对象的process方法输出文件。
8. 关闭流.

示例模板index.ftl如下

```velocity
<!DOCTYPE html>
<html lang="">
<head>
  <meta charset="utf-8">
  <title>Hello World!</title>
</head>
<body>
<b>普通文本 String 展示：</b><br><br>
Hello ${name} <br>
<hr>
<b>对象Student中的数据展示：</b><br/>
姓名：${stu.name}<br/>
年龄：${stu.age}
<hr>
</body>
</html>
```

业务层代码如下

```java
/**
 * FreeMarker一般的使用方式 示例
 */
@SpringBootTest
public class NormalTests {

    @Test
     public void test() throws IOException, TemplateException {

        String templateDir =  String templateDir = "src/main/resources/templates/";

        // -> 获取FreeMarker配置实例
        Configuration conf = new Configuration(Configuration.VERSION_2_3_32);

        // -> 指定模板文件所在文件夹
        // 直接指明文件夹路径的方式
         conf.setDirectoryForTemplateLoading(new File(templateDir));
        // 通过类加载器，使用相对路径的方式
        // conf.setClassLoaderForTemplateLoading(ClassLoader.getSystemClassLoader(), "/templates/");

        // -> 设置编码(注:如果不设置或设置错了此项的话，那么加载模板的时候，可能导致中文乱码)
        conf.setDefaultEncoding("utf-8");

        // -> 获取ftl模板
        Template template = conf.getTemplate("index.ftl");

        // -> 准备数据数据
        Map<String, Object> root = new HashMap<>(8);
        // 注意:因为freemarker模板会试着解析key,所以key命名时不要有敏感词汇；如:这里key取的是【root-key】的话，那么就会出错
       Map<String, Object> root = new HashMap<>(8);
       root.put("name","小舞");
       //实体类
       Student student = new Student();
       student.setAge(22);
       student.setName("张三");
       student.setBirthday(new Date());
       root.put("stu",student);

        // -> 准备输出流
        // 此方式可能导致输出时中文乱码
        // Writer out = new FileWriter(new File("E:/demo/templates/normal.html"));
        // 此方式可保证输出时中文不乱码
       Writer out =
                new BufferedWriter(new OutputStreamWriter(Files.newOutputStream(new File(templateDir + "index.html").toPath()),
                        StandardCharsets.UTF_8));
       
        // -> 数据 + 输出流 = 生成的文件
        template.process(root, out);

        // -> 释放资源
        out.flush();
        out.close();
    }
}
```

## 通过WEB使用FreeMarker的方式

::: tip 关键点说明

- 给控制层方法额外加一个SpringMVC数据处理模型(Model或ModelMap或Map)。
  注：对于那些请求本身就带有参数的方法，只需要额外加数据处理模型即可，不影响原参数的获取。
- 方法返回值为String,返回模板文件(相对于spring.freemarker.template-loader-path参数指定的文件夹)的文件名路径(不要后缀)。

:::

### 无参请求的使用方式

```java
/**
 * FreeMarker使用示例
 */
@Controller
public class DemoController {

    private static final int LIMIT_MAX = 5;

    /**
     * FreeMarker常用语法示例
     *
     * @param model
     *            SpringMVC 数据模型
     *
     * @return  (无后缀的)模板文件名
     *          注:模板文件所在根目录在配置文件
     */
    @GetMapping("/grammar/demo")
    public String demoMethod(Model model) {

        // 直接取值示例
        model.addAttribute("testOne", "邓沙利文");

        // 获取对象属性值示例
        User testTwoUser = User.builder()
                               .name("邓二洋")
                               .age(25)
                               .gender("男")
                               .hobby("女")
                               .motto("我是一只小小小小鸟~")
                               .build();
        model.addAttribute("testTwo", testTwoUser);

        // if示例
        User testThreeUser = User.builder().name("邓沙利文").age(25).build();
        model.addAttribute("testThree", testThreeUser);

        // list 示例
        List<User> testFourList = new ArrayList<>(8);
        for (int i = 0; i < LIMIT_MAX; i++) {
            User u = User.builder().name("邓" + i + "洋" ).motto("我是一只小小小小鸟~").build();
            testFourList.add(u);
        }
        model.addAttribute("testFourList", testFourList);

        // map示例
        Map<String, User> testFiveMap = new HashMap<>(8);
        for (int i = 0; i < LIMIT_MAX; i++) {
            User tempUser = User.builder().name("邓" + i + "洋" ).motto("我是一只小小小小鸟~").build();
            testFiveMap.put("key" + i, tempUser);
        }
        model.addAttribute("testFiveMap", testFiveMap);

        // 日期示例
        model.addAttribute("myDate", new Date());
        return "abc/grammar_demo";
    }

    /**
     * 以以下三种中的任意一种模型来封装数据，都是会被FreeMarker解析到的
     *
     * 1、org.springframework.ui.Model
     *
     * 2、org.springframework.ui.ModelMap
     *
     * 3、java.uti.Map
     *
     * @param mode
     *            SpringMVC 数据模型
     *
     * @return  (无后缀的)模板文件名
     *          注:模板文件所在根目录在配置文件
     */
    @GetMapping("/model/test1")
    public String modelTestOne(Model mode) {
        mode.addAttribute("xyz", "org.springframework.ui.Model也可以作为参数模型！");
        return "abc/model_test";
    }

    @GetMapping("/model/test2")
    public String modelTestTwo(ModelMap modelMap) {
        modelMap.addAttribute("xyz", "org.springframework.ui.ModelMap也可以作为参数模型！");
        return "abc/model_test";
    }

    @GetMapping("/model/test3")
    public String demoMethodThree(Map<String, Object> map) {
        map.put("xyz", "java.util.Map也可以作为参数模型！");
        return "abc/model_test";
    }
}
```

### 有参请求的使用方式

```java
/**
 * FreeMarker使用示例
 */
@Controller
public class DemoController {

    /**
     * 当方法需要传入参数时的 GET测试
     *
     * @param model
     *            SpringMVC 数据模型
     * @param name
     *            用户传入的参数name
     * @param age
     *            用户传入的参数age
     *
     * @return  (无后缀的)模板文件名
     *          注:模板文件所在根目录在配置文件
     */
    @GetMapping("/hava/param/get/")
    public String paramsTest(Model model, @RequestParam("name") String name, @RequestParam("age")  Integer age) {
        model.addAttribute("myRoot", name + age);
        return "abc/hava_params_test";
    }

    /**
     * 当方法需要传入参数时的 POST测试
     *
     * @param model
     *            SpringMVC 数据模型
     * @param user
     *            用户传入的参数user
     *
     * @return  (无后缀的)模板文件名
     *          注:模板文件所在根目录在配置文件
     */
    @PostMapping("/hava/param/post/")
    public String paramsTest(Model model, @RequestBody User user) {
        model.addAttribute("myRoot", user.getName() + "都特么" + user.getAge() + "岁了！");
        return "abc/hava_params_test";
    }
}
```

## 模板的语法

### 访问map中的key

```
${key}
```

### 访问pojo中的属性

```
${classes.classname}
```

### 取集合中的数据

```
<#list studentList as student> 遍历studentList 每次对象存为student
${student.id}/${studnet.name}
</#list>
```

### 取循环中的下标

```
<#list studentList as student>
	${student_index} 注意是_ 不是.
</#list>
```

### 判断

```
<#if student_index % 2 == 0>
<#else> 这里面写的和if一致
</#if>
```

### 日期类型格式化

```
${date?date}
${date?time}
${date?datetime}
${date?string(parten)}	${date?string("yyyy/MM/dd HH:mm:ss")}
```

### Null值的处理

```
${val!"val的值为null"} 如果返回true代表没有值
判断val的值是否为null
<#if val??>  这里和上面不一样,如果返回true代表有值
val中有内容
<#else>
val的值为null
</#if>
```

### Include标签

```
<#include “模板名称”>
```
