export function RemarkPlugin() {
    // 所有 remark 和 rehype 插件都返回一个单独的函数
    return function (tree, file) {
        file.data.astro.frontmatter.layout = '../../layouts/MarkdownPostLayout.astro';
    }
}