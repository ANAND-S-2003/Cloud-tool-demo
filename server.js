const http = require("http");
const fs = require("fs");
const path = require("path");

const server = http.createServer((req, res) => {
  let filePath = "." + req.url;

  if (filePath === "./") {
    filePath = "./index.html";
  }

  const extname = path.extname(filePath);
  let contentType = "text/html";

  if (extname === ".css") contentType = "text/css";
  if (extname === ".js") contentType = "text/javascript";

  fs.readFile(filePath, (error, content) => {
    if (error) {
      res.writeHead(500);
      res.end("Error loading file");
    } else {
      res.writeHead(200, { "Content-Type": contentType });
      res.end(content);
    }
  });
});

server.listen(process.env.PORT || 3000);
