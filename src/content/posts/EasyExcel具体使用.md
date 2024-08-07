---
title: EasyExcel具体使用
pubDate: 2023-11-09 10:16:01
permalink: /pages/2077cc/
tags: ["后端","springboot","EasyExcel"]
description: '这是我 Astro 博客的第一篇文章。'
image:
    url: 'https://docs.astro.build/assets/rose.webp'
    alt: 'The Astro logo on a dark background with a pink glow.'
author: 华总
titleTag: 原创
---
## UploadData（dto类）

```java

@EqualsAndHashCode(callSuper = false)
@Data
public class UploadData extends PageRequest implements Serializable {

    /**
     * 姓名
     */
    @ExcelProperty("姓名")
    private String name;

    /**
     * 年龄
     */
    @ExcelProperty("年龄")
    private Integer age;

    /**
     * 手机号
     */
    @ExcelProperty("手机号")
    private Long phone;

    /**
     * 工资
     */
    @ExcelProperty("工资")
    private Long salary;

    /**
     * 生日
     */
    @JsonFormat(timezone = "GMT+8", pattern = "yyyy-MM-dd")
    @DateTimeFormat(Pattern = "yyyy-MM-dd")
    @ExcelProperty("生日")
    private Date birthday;

    private static final long serialVersionUID = 1L;

    public static UploadData convertToDto(Excel excel) {
        UploadData uploadData = new UploadData();
        uploadData.setName(excel.getName());
        uploadData.setAge(excel.getAge());
        uploadData.setPhone(excel.getPhone());
        uploadData.setSalary(excel.getSalary());
        uploadData.setBirthday(excel.getBirthday());
        return uploadData;
    }

}

```

## DateConverter（日期格式转换）

```java
public class DateConverter implements Converter<Date> {

    private static final String PATTERN_YYYY_MM_DD = "yyyy-MM-dd";

    @Override
    public Class<?> supportJavaTypeKey() {
        return Converter.super.supportJavaTypeKey();
    }

    @Override
    public CellDataTypeEnum supportExcelTypeKey() {
        return Converter.super.supportExcelTypeKey();
    }

    @Override
    public WriteCellData<?> convertToExcelData(Date value, ExcelContentProperty contentProperty, GlobalConfiguration globalConfiguration) throws Exception {
        SimpleDateFormat sdf = new SimpleDateFormat(PATTERN_YYYY_MM_DD);
        String dateValue = sdf.format(value);
        return new WriteCellData<>(dateValue);
    }
}


```

## UploadDataVO（VO类）

```java
@Data
public class UploadDataVO  implements Serializable {

    /**
     * 姓名
     */
    @ColumnWidth(15)
    @ExcelProperty(value = "姓名", index = 0)
    private String name;

    /**
     * 年龄
     */
    @ColumnWidth(10)
    @ExcelProperty(value = "年龄", index = 1)
    private Integer age;

    /**
     * 手机号
     */
    @ColumnWidth(25)
    @ExcelProperty(value = "手机号", index = 2)
    private Long phone;

    /**
     * 工资
     */
    @ColumnWidth(20)
    @ExcelProperty(value = "工资", index = 3)
    private Long salary;

    /**
     * 生日
     */
    @ColumnWidth(30)
    @JsonFormat(timezone = "GMT+8", pattern = "yyyy-MM-dd")
    @ExcelProperty(value = "生日", index = 4, converter = DateConverter.class)
    private Date birthday;

    private static final long serialVersionUID = 1L;

    public static UploadDataVO convertToVO(Excel excel) {
        UploadDataVO uploadData = new UploadDataVO();
        uploadData.setName(excel.getName());
        uploadData.setAge(excel.getAge());
        uploadData.setPhone(excel.getPhone());
        uploadData.setSalary(excel.getSalary());
        uploadData.setBirthday(excel.getBirthday());
        return uploadData;
    }

}

```

## UploadDAO（DAO层）

```java
@Repository
public class UploadDAO {

    @Resource
    private ExcelService excelService;

    public void save(List<Excel> list) {
        excelService.saveBatch(list);
    }

    public List<Excel> list(Wrapper<Excel> list) {

        return excelService.list(list);
    }

    public List<Excel> convertToEntityList(List<UploadData> uploadDataList) {
        List<Excel> excelList = new ArrayList<>();

        for (UploadData uploadData : uploadDataList) {
            Excel excel = convertToEntity(uploadData);
            excelList.add(excel);
        }

        return excelList;
    }

    public List<UploadDataVO> convertToDtoList(List<Excel> uploadDataList) {
        List<UploadDataVO> excelList = new ArrayList<>();

        for (Excel uploadData : uploadDataList) {
            UploadDataVO excel = UploadDataVO.convertToVO(uploadData);
            excelList.add(excel);
        }

        return excelList;
    }

    public Excel convertToEntity(UploadData uploadData) {
        Excel excel = new Excel();
        excel.setName(uploadData.getName());
        excel.setAge(uploadData.getAge());
        excel.setPhone(uploadData.getPhone());
        excel.setSalary(uploadData.getSalary());
        excel.setBirthday(uploadData.getBirthday());
        return excel;
    }
}

```

## UploadDataListener（监听器）

```java
/**
 * 模板的读取类
 *
 * @author Jiaju Zhuang
 */
// 有个很重要的点 DemoDataListener 不能被spring管理，要每次读取excel都要new,然后里面用到spring可以构造方法传进去
@Slf4j
public class UploadDataListener implements ReadListener<UploadData> {
    /**
     * 每隔5条存储数据库，实际使用中可以100条，然后清理list ，方便内存回收
     */
    private static final int BATCH_COUNT = 100;
    private List<UploadData> cachedDataList = ListUtils.newArrayListWithExpectedSize(BATCH_COUNT);

    @Resource
    private UploadDAO uploadDAO;

    @Resource
    private ExcelMapper excelMapper;

    public UploadDataListener() {
        // 这里是demo，所以随便new一个。实际使用如果到了spring,请使用下面的有参构造函数
        uploadDAO = new UploadDAO();
    }

    /**
     * 如果使用了spring,请使用这个构造方法。每次创建Listener的时候需要把spring管理的类传进来
     *
     * @param uploadDAO
     */
    public UploadDataListener(UploadDAO uploadDAO) {
        this.uploadDAO = uploadDAO;
    }

    /**
     * 这个每一条数据解析都会来调用
     *
     * @param data    one row value. It is same as {@link AnalysisContext#readRowHolder()}
     * @param context
     */
    @Override
    public void invoke(UploadData data, AnalysisContext context) {
        log.info("解析到一条数据:{}", JSON.toJSONString(data));
        cachedDataList.add(data);
        // 达到BATCH_COUNT了，需要去存储一次数据库，防止数据几万条数据在内存，容易OOM
        if (cachedDataList.size() >= BATCH_COUNT) {
           saveData();
            // 存储完成清理 list
            cachedDataList = ListUtils.newArrayListWithExpectedSize(BATCH_COUNT);
        }
    }

    /**
     * 异常方法 (类型转换异常也会执行此方法)  （读取一行抛出异常也会执行此方法)
     *
     * @param exception
     * @param context
     * @throws Exception
     */
    @Override
    public void onException(Exception exception, AnalysisContext context) {
        // 如果是某一个单元格的转换异常 能获取到具体行号
        // 如果要获取头的信息 配合invokeHeadMap使用
        if (exception instanceof ExcelDataConvertException) {
            ExcelDataConvertException excelDataConvertException = (ExcelDataConvertException)exception;
            log.error("第{}行，第{}列解析异常，数据为:{}", excelDataConvertException.getRowIndex(),
                    excelDataConvertException.getColumnIndex(), excelDataConvertException.getCellData());
            throw new BusinessException(ErrorCode.OPERATION_ERROR,"第"+excelDataConvertException.getRowIndex()+"行" + "，第" + (excelDataConvertException.getColumnIndex() + 1) + "列读取错误");
        }
    }

    /**
     * 所有数据解析完成了 都会来调用
     *
     * @param context
     */
    @Override
    public void doAfterAllAnalysed(AnalysisContext context) {
        // 这里也要保存数据，确保最后遗留的数据也存储到数据库
        saveData();
        log.info("所有数据解析完成！");
    }

    /**
     * 返回数据
     *
     * @return 返回读取的数据集合
     **/
    public List<UploadData> listData() {
        return cachedDataList;
    }

    /**
     * 加上存储数据库
     */
    private void saveData() {
        log.info("{}条数据，开始存储数据库！", cachedDataList.size());

        // 检查是否重复导入
        QueryWrapper<Excel> queryWrapper = new QueryWrapper<>();
        queryWrapper.in("phone", cachedDataList.stream().map(UploadData::getPhone).toArray());
        List<Excel> databaseData = uploadDAO.list(queryWrapper);

        for (UploadData excelRecord : cachedDataList) {
            for (Excel dbRecord : databaseData) {
                if (excelRecord.getPhone().equals(dbRecord.getPhone()) && excelRecord.getName().equals(dbRecord.getName())) {
                    throw new BusinessException(ErrorCode.OPERATION_ERROR, "重复导入: " + excelRecord);
                }
            }
        }

       // 保存到数据库
        List<Excel> list = uploadDAO.convertToEntityList(cachedDataList);
        uploadDAO.save(list);
        log.info("存储数据库成功！");
    }
}

```

## ExcelService

```java
public interface ExcelService extends IService<Excel> {

    /**
     * 分页获取帖子封装
     *
     * @param excelPage
     * @param request
     * @return
     */
    Page<UploadData> getExcelPage(Page<Excel> excelPage, HttpServletRequest request);

    /**
     * 获取查询条件
     *
     * @param uploadData
     * @return
     */
    QueryWrapper<Excel> getQueryWrapper(UploadData uploadData);

}
```

## ExcelServiceImpl

```java
@Service
public class ExcelServiceImpl extends ServiceImpl<ExcelMapper, Excel>
    implements ExcelService{

    /**
     * 分页获取帖子封装
     *
     * @param excelPage
     * @param request
     * @return
     */
    @Override
    public Page<UploadData> getExcelPage(Page<Excel> excelPage, HttpServletRequest request) {
        List<Excel> excellists = excelPage.getRecords();
        Page<UploadData> fileListVOPage = new Page<>(excelPage.getCurrent(), excelPage.getSize(),
                excelPage.getTotal());
        List<UploadData> fileListVOList = excellists.stream().map(fileList -> {
            UploadData fileListVO = UploadData.convertToDto(fileList);
            return fileListVO;
        }).collect(Collectors.toList());
        fileListVOPage.setRecords(fileListVOList);
        return fileListVOPage;
    }

    /**
     * 获取查询条件
     *
     * @param uploadData
     * @return
     */
    @Override
    public QueryWrapper<Excel> getQueryWrapper(UploadData uploadData) {

        QueryWrapper<Excel> wrapper = new QueryWrapper<>();
        if (uploadData == null) {
            return wrapper;
        }

         String name = uploadData.getName();
         Integer age = uploadData.getAge();
         Long phone = uploadData.getPhone();
         Long salary = uploadData.getSalary();


        wrapper.like(StringUtils.isNotBlank(name),"name",name);
        wrapper.like(ObjectUtils.isNotEmpty(age),"age",age);
        wrapper.like(ObjectUtils.isNotEmpty(phone),"phone",phone);
        wrapper.like(ObjectUtils.isNotEmpty(salary),"salary",salary);

        return wrapper;
    }
}
```

## ExcelController

```java
/**
 * Excel文件接口
 *
 */
@RestController
@RequestMapping("/excel")
@Slf4j
@Tag(name = "ExcelController")
public class ExcelController {

    @Resource
    private UserService userService;

    @Resource
    private UploadDAO uploadDAO;

    @Resource
    private ExcelService excelService;

    /**
     * 文件上传
     * <p>
     * 1. 创建excel对应的实体对象 参照{@link UploadData}
     * <p>
     * 2. 由于默认一行行的读取excel，所以需要创建excel一行一行的回调监听器，参照{@link UploadDataListener}
     * <p>
     * 3. 直接读即可
     */
    @PostMapping("upload")
    @Operation(summary = "easyExcel上传")
    @ResponseBody
    public BaseResponse<List<UploadData>> upload(MultipartFile file, HttpServletRequest request) throws IOException {

        userService.getLoginUser(request);

        UploadDataListener uploadListener = new UploadDataListener(uploadDAO);
        EasyExcel.read(file.getInputStream(), UploadData.class, uploadListener).sheet().doRead();
        return ResultUtils.success(uploadListener.listData());
    }

    /**
     * 文件下载（失败了会返回一个有部分数据的Excel）
     * <p>
     * 1. 创建excel对应的实体对象 参照{@link UploadData}
     * <p>
     * 2. 设置返回的 参数
     * <p>
     * 3. 直接写，这里注意，finish的时候会自动关闭OutputStream,当然你外面再关闭流问题不大
     */
    @GetMapping("download")
    @Operation(summary = "easyExcel下载")
    public void download(HttpServletResponse response, HttpServletRequest request) throws IOException {

        userService.getLoginUser(request);

        // 这里注意 有同学反应使用swagger 会导致各种问题，请直接用浏览器或者用postman
        response.setContentType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        response.setCharacterEncoding("utf-8");
        // 这里URLEncoder.encode可以防止中文乱码
        Date now = new Date();
        long timestamp = now.getTime();
        String uuid = RandomStringUtils.randomAlphanumeric(8);
        String filename = uuid + "-" + timestamp + "-模板";
        String fileName = URLEncoder.encode(filename, "UTF-8").replaceAll("\\+", "%20");
        response.setHeader("Content-disposition", "attachment;filename*=utf-8''" + fileName + ".xlsx");

        List<Excel> data = excelService.list();
        List<UploadDataVO> list =  uploadDAO.convertToDtoList(data);

        // 头的策略
        WriteCellStyle headWriteCellStyle = new WriteCellStyle();
        // 背景设置为红色
        WriteFont headWriteFont = new WriteFont();
        headWriteFont.setFontHeightInPoints((short)20);
        headWriteCellStyle.setWriteFont(headWriteFont);
        headWriteCellStyle.setHorizontalAlignment(HorizontalAlignment.CENTER);


        // 内容的策略
        WriteCellStyle contentWriteCellStyle = new WriteCellStyle();
        WriteFont contentWriteFont = new WriteFont();
        //contentWriteFont.setFontName("微软雅黑");
        contentWriteFont.setFontHeightInPoints((short) 16);
        contentWriteFont.setColor(IndexedColors.BLACK.getIndex());
        // 字体大小
        contentWriteCellStyle.setWriteFont(contentWriteFont);

        contentWriteCellStyle.setBorderLeft(BorderStyle.THIN); // 左边框线
        contentWriteCellStyle.setBorderRight(BorderStyle.THIN); // 右边框线
        contentWriteCellStyle.setBorderTop(BorderStyle.THIN); // 上边框线
        contentWriteCellStyle.setBorderBottom(BorderStyle.THIN); // 下边框线
        contentWriteCellStyle.setWrapped(false);  //设置自动换行;
        contentWriteCellStyle.setHorizontalAlignment(HorizontalAlignment.CENTER);//设置水平对齐的样式为居中对齐;
        contentWriteCellStyle.setVerticalAlignment(VerticalAlignment.CENTER);  //设置垂直对齐的样式为居中对齐;
        contentWriteCellStyle.setShrinkToFit(true);//设置文本收缩至合适

        // 这个策略是 头是头的样式 内容是内容的样式 其他的策略可以自己实现
        HorizontalCellStyleStrategy horizontalCellStyleStrategy =
                new HorizontalCellStyleStrategy(headWriteCellStyle, contentWriteCellStyle);

        EasyExcel.write(response.getOutputStream(), UploadDataVO.class).registerWriteHandler(horizontalCellStyleStrategy).sheet("sheet1").doWrite(list);
    }

    /**
     * 分页获取列表（封装类）
     *
     * @param uploadData
     * @param request
     * @return
     */
    @Operation(summary = "获取Excel文件列表")
    @PostMapping("/list/page")
    public BaseResponse<Page<UploadData>> listExcelList(@RequestBody UploadData uploadData,
                                                       HttpServletRequest request) {
        long current = uploadData.getCurrent();
        long size = uploadData.getPageSize();

        userService.getLoginUser(request);

        ThrowUtils.throwIf(size > 80, ErrorCode.PARAMS_ERROR);
        Page<Excel> postPage = excelService.page(new Page<>(current, size),
                excelService.getQueryWrapper(uploadData));
        return ResultUtils.success(excelService.getExcelPage(postPage, request));
    }
}
```

