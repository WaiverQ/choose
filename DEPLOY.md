# 自动部署说明

这个项目已经配置为通过 GitHub Pages 自动部署。

## 当前配置

- 推送到 `main` 分支时自动部署
- 也支持手动触发 GitHub Actions
- 站点内容直接发布仓库根目录下的静态文件

## 你还需要做的事

1. 在项目目录初始化 Git 仓库：
   `git init`
2. 把默认分支切到 `main`：
   `git branch -M main`
3. 在 GitHub 上创建一个新仓库并添加远程：
   `git remote add origin <你的仓库地址>`
4. 提交并推送：
   `git add .`
   `git commit -m "Add GitHub Pages deployment"`
   `git push -u origin main`
5. 在 GitHub 仓库设置里启用 Pages：
   `Settings -> Pages -> Build and deployment -> Source: GitHub Actions`

## 注意

`index.html` 当前引用了 `style.css`，但仓库里没有这个文件。部署会成功，但页面样式会缺失，建议补上该文件后再上线。
