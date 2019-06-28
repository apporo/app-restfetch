'use strict';

var devebot = require('devebot');
var lodash = devebot.require('lodash');
var assert = require('chai').assert;
var sinon = require('sinon');
var dtk = require('../index');

describe('resolver', function() {
  describe('init()', function() {
    var loggingFactory = dtk.createLoggingFactoryMock({ captureMethodCall: false });
    var ctx = {
      L: loggingFactory.getLogger(),
      T: loggingFactory.getTracer(),
      blockRef: 'app-restfetch',
    }

    var services = {};
    var mappings = {
      "service_1": {},
      "service_2": {},
    };

    var Resolver, init, createService;

    beforeEach(function() {
      Resolver = dtk.acquire('resolver');
      init = Resolver.__get__('init');
      createService = sinon.stub();
      Resolver.__set__('createService', createService);
    });

    it('createService will not be called if enabled ~ false', function() {
      init(ctx, services, mappings, false);
      assert.equal(createService.callCount, 0);
    });

    it('createService will be called to initialize every service descriptors', function() {
      init(ctx, services, mappings);
      assert.equal(createService.callCount, lodash.keys(mappings).length);
    });

    it('createService will be passed the correct arguments with right order', function() {
      init(ctx, services, mappings);
      assert.equal(createService.callCount, lodash.keys(mappings).length);
      assert.isTrue(createService.getCall(0).calledWith(ctx, services, "service_1", {}));
      assert.isTrue(createService.getCall(1).calledWith(ctx, services, "service_2", {}));
    });
  });

  describe('buildFetchArgs()', function() {
    var loggingFactory = dtk.createLoggingFactoryMock({ captureMethodCall: false });
    var ctx = {
      L: loggingFactory.getLogger(),
      T: loggingFactory.getTracer(),
      blockRef: 'app-restfetch',
    }

    var context = {
      headers: {
        "Content-Type": "application/json"
      },
      query: {
        accessToken: 'abc.xyz:hello-world'
      }
    }

    var descriptor = {
      url: "https://api.github.com/repos/:owner/:repoId",
      method: "GET",
      arguments: {
        default: {
          params: {
            owner: 'apporo',
            repoId: 'app-restfetch'
          },
          query: {
            accessToken: '1234567890'
          }
        }
      }
    }

    var methodArgs = {
      params: {
        owner: 'devebot',
        repoId: 'valvekit'
      },
      query: {
        accessToken: '0987654321',
        type: ['api', 'sms']
      }
    }

    var Resolver = dtk.acquire('resolver');
    var buildFetchArgs = Resolver.__get__('buildFetchArgs');

    it('return the fetch parameters which built from the arguments of a method invocation', function() {
      var fa = buildFetchArgs(context, descriptor, methodArgs);
      assert.isUndefined(fa.error);
      assert.equal(fa.url, 'https://api.github.com/repos/devebot/valvekit?accessToken=0987654321&type[]=api&type[]=sms');
      assert.deepEqual(fa.args, {
        method: 'GET',
        headers: {
          "Content-Type": "application/json"
        }
      });
      assert.isUndefined(fa.timeout);
    });

    it('return the fetch parameters which built from the method arguments and default params of descriptor', function() {
      var methodArgs = {
        body: {
          orderId: 'ed441963-52b3-4981-ab83-6ea9eceb2213',
          name: 'PowerFan-W200'
        }
      }
      var fa = buildFetchArgs(context, descriptor, methodArgs);
      assert.isUndefined(fa.error);
      assert.equal(fa.url, 'https://api.github.com/repos/apporo/app-restfetch?accessToken=1234567890');
      assert.deepEqual(fa.args, {
        method: 'GET',
        headers: {
          "Content-Type": "application/json"
        },
        body: {
          orderId: 'ed441963-52b3-4981-ab83-6ea9eceb2213',
          name: 'PowerFan-W200'
        }
      });
      assert.isUndefined(fa.timeout);
    });
  })

  describe('getQueryString()', function() {
    var Resolver = dtk.acquire('resolver');
    var getQueryString = Resolver.__get__('getQueryString');

    it('Create a query string properly', function() {
      assert.isEmpty(getQueryString({}));
      assert.equal(getQueryString({ abc: 123 }), "abc=123");
      assert.equal(getQueryString({ id: "Aw762Ytu", sort: true, limit: 10 }), "id=Aw762Ytu&sort=true&limit=10");
      assert.equal(getQueryString({ id: "A&762=tu", from: 10 }), "id=A%26762%3Dtu&from=10");
      //console.log("Result[%s]", getQueryString({ id: "A&762=tu", from: 10 }));
    })
  });

  describe('getTicket()/releaseTicket()', function() {
    var loggingFactory = dtk.createLoggingFactoryMock({ captureMethodCall: false });
    var ctx = {
      L: loggingFactory.getLogger(),
      T: loggingFactory.getTracer(),
      blockRef: 'app-restfetch',
    }

    var Resolver = dtk.acquire('resolver');
    var getTicket = Resolver.__get__('getTicket');

    it('return default ticket if throughputValve is empty', function() {
      var ticket = getTicket(ctx);
      ticket.then(function(ticketId) {
        assert.isNotNull(ticketId);
        assert.equal(ticketId.length, 22);
      });
    });
  })
});
