const express = require("express");
const fetch = require("node-fetch");
const helmet = require('helmet');
require("dotenv").config();

const app = express();

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https:"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://youtube-mp36.p.rapidapi.com", "https://youtube-video-download-info.p.rapidapi.com"],
      fontSrc: ["'self'", "https:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'", "https:"],
      frameSrc: ["'self'"],
    },
  },
}));

const PORT = process.env.PORT || 3000;

app.set("view engine", "ejs");
app.use(express.static("public"));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.get("/", (req, res) => {
    res.render("index");
});

function extractVideoID(url) {
    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[7].length === 11) ? match[7] : null;
}

app.post("/convert", async (req, res) => {
    const videoUrl = req.body.videoURL;
    const format = req.body.format;
    
    if (!videoUrl) {
        return res.render("index", { success: false, message: "Please enter a YouTube URL" });
    }

    const videoId = extractVideoID(videoUrl);

    if (!videoId) {
        return res.render("index", { success: false, message: "Invalid YouTube URL" });
    }

    try {
        let fetchAPI;
        let fetchResponse;

        if (format === "mp3") {
            fetchAPI = await fetch(`https://youtube-mp36.p.rapidapi.com/dl?id=${videoId}`, {
                method: "GET",
                headers: {
                    "x-rapidapi-key": process.env.API_KEY,
                    "x-rapidapi-host": process.env.API_HOST
                }
            });
            fetchResponse = await fetchAPI.json();

            if (fetchResponse.status === "ok") {
                return res.render("index", { success: true, song_title: fetchResponse.title, song_link: fetchResponse.link });
            } else {
                return res.render("index", { success: false, message: fetchResponse.msg });
            }
        } else if (format === "mp4") {
            fetchAPI = await fetch(`https://youtube-video-download-info.p.rapidapi.com/dl?id=${videoId}`, {
                method: "GET",
                headers: {
                    "x-rapidapi-key": process.env.API_KEY2,
                    "x-rapidapi-host": process.env.API_HOST2
                }
            });
            fetchResponse = await fetchAPI.json();

            console.log("MP4 API Response:", JSON.stringify(fetchResponse, null, 2));

            if (fetchResponse.status === "ok") {
                // 提取所有MP4格式并检查其分辨率
                const videoFormats = Object.values(fetchResponse.link)
                    .filter(details => details[4].includes('video/mp4'))
                    .map(details => ({
                        url: details[0],
                        resolution: parseInt(details[2].replace('p', ''), 10),
                        qualityLabel: details[2]
                    }))
                    .sort((a, b) => b.resolution - a.resolution);

                // 输出筛选后的所有格式，供调试用
                console.log("Available MP4 formats:", videoFormats);

                if (videoFormats.length > 0) {
                    const highestQualityVideo = videoFormats[0];

                    return res.render("index", { 
                        success: true, 
                        song_title: fetchResponse.title, 
                        song_link: highestQualityVideo.url,
                        quality: highestQualityVideo.qualityLabel // 显示选中的最高画质
                    });
                } else {
                    return res.render("index", { success: false, message: "No MP4 format available for this video" });
                }
            } else {
                return res.render("index", { success: false, message: "Failed to fetch MP4 video" });
            }
        }
    } catch (error) {
        console.error("Error:", error);
        return res.render("index", { success: false, message: "An error occurred while processing your request: " + error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`);
});
