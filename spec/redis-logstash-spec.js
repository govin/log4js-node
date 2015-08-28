var appender = require('../lib/appenders/redis-logstash').appender;
var redis = require('redis');
var os = require('os');
var _ = require('underscore');

describe("redis logstash", function(){
  var redisConfig;
  var redisLayout;
  var redisOn;
  var redisRpush;
  var loggingFunction;
  var httpLogItem;
  var logEvent;

  beforeEach(function(){
    redisConfig = {
      type: 'redis-logstash',
      redisHost: 'localhost',
      redisPort: '6379',
      listName: 'logstash',
      baseLogFields: {
        type: 'GuestCenterReservationManager',
        environment: 'preprod'
      }
    };
    redisRpush = jasmine.createSpy("redisRpush");
    redisOn = jasmine.createSpy("redisOn").and.returnValue({
      rpush: redisRpush
    })
    spyOn(redis, "createClient").and.returnValue({
      on: redisOn
    })

    loggingFunction = appender(redisLayout, redisConfig);

    httpLogItem = {
      message: 'HTTPService GET took 142ms for https://api.mixpanel.com',
      url: 'https://api.mixpanel.com',
      method: 'GET',
      durationMs: 142,
      statusCode: 200
    }

    logEvent = {
      startTime: "mockStartTime",
      categoryName: 'HTTPService.coffee',
      level: 'DEBUG',
      logger: { category: 'HTTPService.coffee', _events: { log: [{}] } },
      severity: 'DEBUG'
    }
  });

  it("should create redis client", function(){
    expect(redis.createClient).toHaveBeenCalledWith(redisConfig.redisPort, redisConfig.redisHost)
    expect(redisOn).toHaveBeenCalledWith("error", console.log)
  })

  it("should return a logging function", function(){
    expect(typeof loggingFunction).toEqual("function")
  })

  describe("handle different types of log data", function(){
    it("array", function(){
      logEvent.data = [httpLogItem]
      loggingFunction(logEvent)

      var recordedObj = _.extend(redisConfig.baseLogFields, {hostname: os.hostname()}, httpLogItem);
      var rpushCalledArgs = redisRpush.calls.argsFor(0)
      rpushCalledArgs[1] = JSON.parse(rpushCalledArgs[1])
      expect(rpushCalledArgs).toEqual(["logstash",recordedObj])
    });
    it("string", function(){
      logEvent.data = httpLogItem.message
      loggingFunction(logEvent)

      var recordedObj = _.extend(redisConfig.baseLogFields, {
        hostname: os.hostname(),
        message: httpLogItem.message
      });
      var rpushCalledArgs = redisRpush.calls.argsFor(0)
      rpushCalledArgs[1] = JSON.parse(rpushCalledArgs[1])
      expect(rpushCalledArgs).toEqual(["logstash",recordedObj])
    });
    it("object", function(){
      logEvent.data = httpLogItem
      loggingFunction(logEvent)

      var recordedObj = _.extend(redisConfig.baseLogFields, {hostname: os.hostname()}, httpLogItem);
      var rpushCalledArgs = redisRpush.calls.argsFor(0)
      rpushCalledArgs[1] = JSON.parse(rpushCalledArgs[1])
      expect(rpushCalledArgs).toEqual(["logstash",recordedObj])
    });
  })
})
