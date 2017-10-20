﻿var express = require("express"),
    morgan = require("morgan"),
    cookieParser = require("cookie-parser"),
    sessionParser = require("express-session"),
    database = require("./database.js"),
    fs = require("fs"),
    path = require("path"),
    constants = require("./constants.js"),
    formatting = require("./formatting.js"),
    middleware = require("./middleware.js");

// HACK: BOM must die
var config = JSON.parse(fs.readFileSync(process.argv[2], "utf8").replace(/^\uFEFF/, ""));
var sitePages = JSON.parse(fs.readFileSync(path.join(config.pageDirectory, "titles.json"), "utf8").replace(/^\uFEFF/, ""));

database.createConnection(config.mysql);

// Init server and middleware
var server = express();
server.use(cookieParser());
server.use(sessionParser({ secret: config.sessionSecret || "hello world", resave: false, saveUninitialized: false }));
server.use(morgan(config.morganLogFormat));
// if it's not there, don't use it - theoretically then, nginx could be handling it
if (config.resDirectory) {
    server.use("/res", express.static(config.resDirectory));
}
server.set("views", config.viewDirectory);
server.set("view engine", 'ejs');
if (config.runBehindProxy) {
    server.set("trust proxy", "127.0.0.1"); // don't hardcode?
}

// Application routes
server.use(require("./userRoutes.js")(config, database, sitePages));
server.use(require("./libraryRoutes.js")(config, database, sitePages));

server.use(require("./saDownloadRoutes.js")(config, database, sitePages));
server.use(require("./saProductRoutes.js")(config, database, sitePages));
server.use(require("./saReleaseRoutes.js")(config, database, sitePages));
server.use(require("./saMirrorRoutes.js")(config, database, sitePages));

// handle last because pages soaks up root routes
server.use(require("./pageRoutes.js")(config, database, sitePages));

server.listen(3000, config.runBehindProxy ? "127.0.0.1" : "0.0.0.0");