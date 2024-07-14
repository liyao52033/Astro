export function RemarkPlugin() {
    // 所有 remark 和 rehype 插件都返回一个单独的函数
    return function (tree, file) {
        file.data.astro.frontmatter.description = '华总是最棒的';
    }
}