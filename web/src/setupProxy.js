// ตอน npm start ส่งต่อ /api/* ไปที่ Go ในเครื่อง หน้าเว็บกับ API จึงอยู่ origin เดียวกัน ไม่ติด CORS
// (ใช้ไฟล์นี้แทน "proxy" ใน package.json เพราะแบบนั้นทำ dev server พังบนเครื่องที่หา LAN IP ไม่เจอ)
// ไฟล์นี้ใช้เฉพาะ dev server ไม่ถูก build ไปด้วย ถ้าอยากให้ไปที่อื่นตั้ง API_PROXY_TARGET
const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function (app) {
  app.use(
    '/api',
    createProxyMiddleware({
      target: process.env.API_PROXY_TARGET || 'http://localhost:8080',
      changeOrigin: true,
    })
  );
};
