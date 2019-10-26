/**
 * Node.js server - API container.
 *
 * @ 26.10.2019 # Aleksandr Vorkunov <developing@nodes-tech.ru>
 */

/* @imports */
const mysql = require("mysql");
const MongoClient = require("mongodb").MongoClient;
const XMLHttpRequest = require("node-http-xhr");
const fs = require("fs");

/** RestAPI @constructor
 * @param {string[]} request - Provided URL.
 * @param {string} method [GET|POST|DELETE] as string.
 * @param {string} body - POST request contents.
 * @return {object} - instance of object.
 */
function RestAPI(request, method, body) {
  try {
    this.request = request;
    this.method = method;
    this.body = body;
    this.mysqlCon = null;
    this.mysqlConf = {
      host: "localhost",
      user: "root",
      password: ""
    };
    this.mongoClient = null;
    this.fout = {
      data: "500 Internal Server Error",
      status: 500,
      contentType: {
        "Content-Type": "text/plain"
      }
    };
  } catch (e) {
    // eslint-disable-next-line no-console
    console.log("RestAPI.constructor -> " + e.message);
  }
}

//------------------------------------------------------------------------------
/**
 * Initialization of MySQL client connection.
 */
RestAPI.prototype.mysqlConnect = function() {
  try {
    this.mysqlCon = mysql.createConnection(this.mysqlConf);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn("RestAPI.mysqlConnect -> " + e.message);
  }
};

//------------------------------------------------------------------------------
/**
 * Initialization of Mongo client connection.
 */
RestAPI.prototype.mongoConnect = function(mongoConf) {
  try {
    this.mongoClient = new MongoClient(mongoConf, { useNewUrlParser: true });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn("RestAPI.mongoConnect -> " + e.message);
  }
};

//------------------------------------------------------------------------------
/**
 * Base method to process input data to output.
 * @returns {Promise} Command execution result.
 */
RestAPI.prototype.parse = function() {
  return new Promise(callback => {
    try {
      if (this.request.length) {
        if (this.request[2] === "") {
          this.defaultResponse().then(fout => callback(fout));
        } else {
          this.invalidRequest().then(fout => callback(fout));
        }
      } else {
        this.invalidRequest().then(fout => callback(fout));
      }
    } catch (e) {
      this.invalidRequest().then(fout => callback(fout));
    }
  });
};

//------------------------------------------------------------------------------
/*
 * Converts a input variable to valid output data.
 * @return {object} Output data.
 */
RestAPI.prototype.output = function(data, status, contentType) {
  try {
    return {
      data: data,
      status: status,
      contentType: {
        "Content-Type": contentType
      }
    };
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn("RestAPI.output -> " + e.message);
  }
};

//------------------------------------------------------------------------------
/*
 * Main method to access to Mongo Store.
 * @return {Promise}
 */
RestAPI.prototype.mongoRequest = function(db, collection, limit) {
  this.db = db;
  this.collection = collection;
  this.limit = parseInt(limit);
  return new Promise(callback => {
    try {
      const collection = this.mongoClient
        .db(this.db)
        .collection(this.collection)
        .find()
        .limit(this.limit);
      let fout = "";
      collection
        .forEach(
          function(item) {
            // eslint-disable-next-line no-console
            console.log(item);
            fout += JSON.stringify(item) + ", ";
          }.bind(this)
        )
        .then(() => {
          if (fout === "") {
            callback(this.output("405 Invalid Request", 405, "text/plain"));
          } else {
            callback(
              this.output(
                '"output":[' + fout.substr(0, fout.length - 2) + "]}",
                200,
                "text/json"
              )
            );
          }
        });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn("RestAPI.mongoRequest -> " + e.message);
    }
  });
};

//------------------------------------------------------------------------------
/**
 * XHR Request processor.
 * @return {Promise}
 */
RestAPI.prototype.xhrRequest = function(url) {
  return new Promise(callback => {
    try {
      let xhr = new XMLHttpRequest();
      xhr.open("GET", url, true);
      xhr.send();
      xhr.onreadystatechange = () => {
        if (xhr.status != 200) {
          // eslint-disable-next-line no-console
          console.warn(xhr.status + ": " + xhr.statusText);
        } else {
          callback(xhr.responseText);
        }
      };
    } catch (e) {
      console.warn("RestAPI.xhrRequest -> " + e.message);
    }
  });
};

//------------------------------------------------------------------------------
/**
 * Routs getter.
 * @return {Promise}
 */
RestAPI.prototype.getRouts = function() {
  return new Promise(callback => {
    try {
      fs.readFile(
        "./src/views/Application/Router.tsx",
        "utf8",
        (error, data) => {
          let regex = /path="(.*?)"/gi;
          let result;
          let paths = [];
          while ((result = regex.exec(data))) {
            paths.push(result[1]);
          }
          callback(paths);
        }
      );
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn("RestAPI.getRouts -> " + e.message);
    }
  });
};

//------------------------------------------------------------------------------
/**
 * Empty Request processor.
 * @return {Promise}
 */
RestAPI.prototype.defaultResponse = function() {
  return new Promise(callback => {
    try {
      callback(this.output('{ "status": "ok" }', 200, "text/json"));
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn("RestAPI.defaultResponse -> " + e.message);
    }
  });
};

//------------------------------------------------------------------------------
/*
 * Invalid Request processor.
 * @return {Promise}
 */
RestAPI.prototype.invalidRequest = function() {
  return new Promise(callback => {
    try {
      callback(this.output("400 Bad Request", 400, "text/plain"));
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn("RestAPI.invalidRequest -> " + e.message);
    }
  });
};

module.exports = RestAPI;
