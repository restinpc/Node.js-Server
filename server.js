/**
 * Node.js server - Main script.
 *
 * @ 26.10.2019 # Aleksandr Vorkunov <developing@nodes-tech.ru>
 */

/* @imports */
const env = require("dotenv");
env.config();
const PORT = process.env.REACT_APP_PORT || 80;
const fs = require("fs");
const http = require("http");
const url = require("url");
const mime = require("mime-types");
const API = require("./api/RestAPI.js");

//------------------------------------------------------------------------------
/** Function to create a file storage.
 * @param {string} dir - Initial directory.
 * @param {array} files_ - Resulting array.
 * @return {array} - Array with a relative paths to files.
 */
let getFiles = function(dir, files_) {
  files_ = files_ || [];
  let files = fs.readdirSync(dir);
  for (let i in files) {
    let name = dir + "/" + files[i];
    if (fs.statSync(name).isDirectory()) {
      getFiles(name, files_);
    } else {
      files_.push(name);
    }
  }
  return files_;
};

//------------------------------------------------------------------------------
/* App storage initialization */
// eslint-disable-next-line no-console
console.log("Building an App file storage..");
var files = [];
var mimes = [];
var _files = getFiles("./static");
let i = 0;
_files.forEach(item => {
  fs.readFile(item, function(err, contents) {
    files[item] = contents;
    mimes[item] = mime.lookup(item);
    if (++i === _files.length) {
      // eslint-disable-next-line no-console
      console.log(i + " file(s) are added to storage");
      main();
    }
  });
});

//------------------------------------------------------------------------------
/* Application process */
function main() {
  // eslint-disable-next-line no-console
  console.log("Starting API server at port " + PORT);
  try {
    var server = http.createServer(function(req, res) {
      try {
        // eslint-disable-next-line no-console
        req.on("error", function(err) {
          if (err.code === "PROTOCOL_CONNECTION_LOST") {
            // eslint-disable-next-line no-console
            console.log("http.createServer -> PROTOCOL_CONNECTION_LOST");
            res.end();
            server.close();
            // eslint-disable-next-line no-console
            console.log("Restarting API server...");
            setTimeout(main, 1);
            return 0;
          }
        });
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader(
          "Access-Control-Allow-Methods",
          "GET, POST, OPTIONS, PUT, PATCH, DELETE"
        );
        res.setHeader(
          "Access-Control-Allow-Headers",
          "X-Requested-With,content-type"
        );
        res.setHeader("Access-Control-Allow-Credentials", true);
        let request = url.parse(req.url, true).path.split("/");
        if (request[1] !== "api") {
          //----------------------------------------------------------
          // Static files request
          let file = "./static/not-found.html";
          let code = 404;
          let matcher = "./static";
          for (let i = 1; i < request.length; i++) {
            matcher += "/" + request[i];
          }
          if (matcher === "./static/") {
            matcher = "./static/index.html";
          }
          if (typeof files[matcher] !== "undefined") {
            file = matcher;
            code = 200;
          }
          new API(request, req.method, "").getRouts().then(fout => {
            fout.forEach(item => {
              if (matcher === "./static" + item) {
                file = "./static/index.html";
                code = 200;
              }
            });
            res.writeHead(code, { "Content-Type": mimes[file] });
            res.write(files[file]);
            res.end();
          });
        } else {
          //----------------------------------------------------------
          // API POST request
          if (req.method === "POST") {
            let body = "";
            req.on("data", function(data) {
              body += data;
            });
            req.on("end", function() {
              new Promise(callback => {
                new API(request, req.method, body).parse().then(fout => {
                  callback(fout);
                });
              }).then(fout => {
                if (typeof fout === "object") {
                  res.writeHead(fout.status, { "Content-Type": fout.contentType });
                  res.write(fout.data);
                } else {
                  res.writeHead("502", { "Content-Type": "text/plain" });
                  res.write("502 Bad Gateway");
                }
                res.end();
              });
            });
          } else {
            //----------------------------------------------------------
            // API GET request
            new Promise(callback => {
              new API(request, req.method, "").parse().then(fout => {
                callback(fout);
              });
            }).then(fout => {
              if (typeof fout === "object") {
                res.writeHead(fout.status, { "Content-Type": fout.contentType });
                res.write(fout.data);
              } else {
                res.writeHead("502", { "Content-Type": "text/plain" });
                res.write("502 Bad Gateway");
              }
              res.end();
            });
          }
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.log("http.createServer -> " + e.message);
        res.end();
        server.close();
        // eslint-disable-next-line no-console
        console.log("Restarting API server...");
        setTimeout(main, 1);
        return 0;
      }
    });
    server.listen(PORT);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.log("http.createServer -> " + e.message);
    server.close();
    // eslint-disable-next-line no-console
    console.log("Restarting API server...");
    setTimeout(main, 1);
    return 0;
  }
}
