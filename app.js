const express = require("express");
const fetch = require("node-fetch");
require("dotenv").config();

// 创建 express 服务器
const app = express();

// 服务器端口号
const PORT = process.env.PORT || 3000;

// 设置模板引擎
app.set("view engine", "ejs");
app.use(express.static("public"));

// 解析 HTML 数据用于 POST 请求
app.use(express.urlencoded({
    extended: true
}));
app.use(express.json());

// 首页路由
app.get("/", (req, res) => {
    res.render("index");
});

// 辅助函数：从 YouTube URL 中提取视频 ID
function extractVideoID(url) {
    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[7].length === 11) ? match[7] : null;
}

// 转换为 MP3 的路由
app.post("/convert-mp3", async (req, res) => {
    const videoUrl = req.body.videoURL;
    
    if (!videoUrl) {
        return res.render("index", { success: false, message: "Please enter a YouTube URL" });
    }

    const videoId = extractVideoID(videoUrl);

    if (!videoId) {
        return res.render("index", { success: false, message: "Invalid YouTube URL" });
    }

    try {
        const fetchAPI = await fetch(`https://youtube-mp36.p.rapidapi.com/dl?id=${videoId}`, {
            "method": "GET",
            "headers": {
                "x-rapidapi-key": process.env.API_KEY,
                "x-rapidapi-host": process.env.API_HOST
            }
        });

        const fetchResponse = await fetchAPI.json();

        if (fetchResponse.status === "ok")
            return res.render("index", { success: true, song_title: fetchResponse.title, song_link: fetchResponse.link });
        else
            return res.render("index", { success: false, message: fetchResponse.msg });
    } catch (error) {
        console.error("Error:", error);
        return res.render("index", { success: false, message: "An error occurred while processing your request" });
    }
});

// 启动服务器
app.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`);
});