"use strict";
var layouts = require('../layouts');
var redis = require('redis');
var _ = require('underscore');
var os = require('os');

function redisLogstashAppender (layout, config) {
    layout = layout || layouts.colouredLayout;
    var client = redis.createClient(config.redisPort, config.redisHost).on('error', console.log);
    return function(loggingEvent) {
        var logObject = {}
        _.extend(logObject, config.baseLogFields)
        var hostname = os.hostname();
        logObject.level = loggingEvent.level.levelStr
        logObject.hostname = hostname;
        logObject.host = hostname;
        if (loggingEvent.data) {
            var data = loggingEvent.data;
            if (Array.isArray(loggingEvent.data)) {
              data = data[0];
            }
            
            if (typeof data == "string") {
                logObject.message = data
            } else if (typeof data == "object") {
                _.extend(logObject, data)
            }
            client.rpush(config.listName, JSON.stringify(logObject));
        }
    };
}

function configure(config) {
    var layout;
    if (config.layout) {
        layout = layouts.layout(config.layout.type, config.layout);
    }
    return redisLogstashAppender(layout, config);
}

exports.name = "redisLogstash";
exports.appender = redisLogstashAppender;
exports.configure = configure;
