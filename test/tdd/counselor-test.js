'use strict';

var devebot = require('devebot');
var lodash = devebot.require('lodash');
var path = require('path');
var assert = require('chai').assert;
var sinon = require('sinon');
var dtk = require('../index');

describe('counselor', function() {
  describe('unifyHttpHeaderName()', function() {
    var Counselor, unifyHttpHeaderName;

    beforeEach(function() {
      Counselor = dtk.acquire('counselor');
      unifyHttpHeaderName = dtk.get(Counselor, 'unifyHttpHeaderName');
    });

    it('unifyHttpHeaderName() will unify the names of HttpHeaders correctly', function() {
      assert.equal(unifyHttpHeaderName(''), '');
      assert.equal(unifyHttpHeaderName('CONTENT-TYPE'), 'Content-Type');
      assert.equal(unifyHttpHeaderName('x-access-token'), 'X-Access-Token');
      assert.equal(unifyHttpHeaderName('X-ACCESS-TOKEN'), 'X-Access-Token');
      assert.equal(unifyHttpHeaderName('x-request-id'), 'X-Request-Id');
      assert.equal(unifyHttpHeaderName('X-Request-ID'), 'X-Request-Id');
    });
  });

  describe('sanitizeHttpHeaders()', function() {
    var Counselor, sanitizeHttpHeaders;
    var loggingFactory = dtk.createLoggingFactoryMock({ captureMethodCall: false });
    var ctx = {
      L: loggingFactory.getLogger(),
      T: loggingFactory.getTracer(),
      blockRef: 'app-restfetch',
    }

    beforeEach(function() {
      Counselor = dtk.acquire('counselor');
      sanitizeHttpHeaders = dtk.get(Counselor, 'sanitizeHttpHeaders');
    });

    var mappings = {
      "restfetch-example/githubApi": {
        enabled: true,
        methods: {
          getListBranches: {
            method: "GET",
            url: "https://api.github.com/repos/:owner/:repoId/branches",
            arguments: {
              default: {
                headers: {
                  'content-type': 'application/json',
                  'x-access-token': 'A8Ytr54o0Mn',
                }
              },
              transform: function(owner, projectId) {
                var p = {};
                if (owner != null) {
                  p.owner = owner;
                }
                if (projectId != null) {
                  p.repoId = projectId;
                }
                return { params: p }
              }
            }
          },
          getProjectInfo: {
            method: "GET",
            url: "https://api.github.com/repos/:userOrOrgan/:projectId",
            arguments: {
              default: {
                params: {
                  userOrOrgan: 'apporo',
                  projectId: 'app-restfront'
                },
                query: {}
              },
              transform: function(data) {
                return data;
              }
            },
            response: {
              transform: function(res) {
                return res.json();
              }
            },
            exception: {
              transform: function(error) {
                return error;
              }
            }
          }
        }
      }
    }

    it('traverse configuration and sanitize the names of HttpHeaders', function() {
      var newHeaders = {
        'Content-Type': 'application/json',
        'X-Access-Token': 'A8Ytr54o0Mn',
      };
      var expected = lodash.set(lodash.cloneDeep(mappings), [
        "restfetch-example/githubApi", "methods", "getListBranches", "arguments", "default", "headers"
      ], newHeaders);

      var newMappings = sanitizeHttpHeaders(mappings);
      assert.notDeepEqual(newMappings, mappings);
      assert.deepEqual(newMappings, expected);

      assert.deepEqual(lodash.get(newMappings, [
        "restfetch-example/githubApi", "methods", "getListBranches", "arguments", "default", "headers"
      ]), newHeaders);
    });
  });

  describe('traverseDir()', function() {
    var loggingFactory = dtk.createLoggingFactoryMock({ captureMethodCall: false });
    var ctx = {
      L: loggingFactory.getLogger(),
      T: loggingFactory.getTracer(),
      blockRef: 'app-restfetch',
    }

    var MAPPING_HOME_DIR = "/home/devebot/example/mappings";
    const statOfDirectory = {
      isDirectory: function() { return true },
      isFile: function() { return false },
    }
    const statOfFile = {
      isDirectory: function() { return false },
      isFile: function() { return true },
    }

    var Counselor, traverseDirRecursively, fs;

    beforeEach(function() {
      Counselor = dtk.acquire('counselor');
      traverseDirRecursively = dtk.get(Counselor, 'traverseDirRecursively');
      fs = {
        readdirSync: sinon.stub(),
        statSync: sinon.stub()
      };
      dtk.set(Counselor, 'fs', fs);
    });

    it('get all of names of filtered files in a directory', function() {
      fs.readdirSync.withArgs(MAPPING_HOME_DIR)
        .returns([
          "github-api.js",
          "gitlab-api.js",
          "readme.md"
        ])
      fs.statSync.withArgs(MAPPING_HOME_DIR + "/github-api.js").returns(statOfFile)
      fs.statSync.withArgs(MAPPING_HOME_DIR + "/gitlab-api.js").returns(statOfFile)
      fs.statSync.withArgs(MAPPING_HOME_DIR + "/readme.md").returns(statOfFile);
      assert.deepEqual(traverseDirRecursively(MAPPING_HOME_DIR, MAPPING_HOME_DIR, [".js"], []), [
        {
          "home": "/home/devebot/example/mappings",
          "path": "",
          "dir": "/home/devebot/example/mappings",
          "base": "github-api.js",
          "name": "github-api",
          "ext": ".js"
        },
        {
          "home": "/home/devebot/example/mappings",
          "path": "",
          "dir": "/home/devebot/example/mappings",
          "base": "gitlab-api.js",
          "name": "gitlab-api",
          "ext": ".js"
        }
      ]);
    });

    it('get all of names of recursive filtered files in a directory', function() {
      fs.readdirSync.withArgs(MAPPING_HOME_DIR).returns([
        "api",
        "vcs",
        "doc",
        "index.js",
        "readme.md"
      ]);
      fs.statSync.withArgs(MAPPING_HOME_DIR + "/api").returns(statOfDirectory);
      fs.statSync.withArgs(MAPPING_HOME_DIR + "/vcs").returns(statOfDirectory);
      fs.statSync.withArgs(MAPPING_HOME_DIR + "/doc").returns(statOfDirectory);
      fs.statSync.withArgs(MAPPING_HOME_DIR + "/index.js").returns(statOfFile)
      fs.statSync.withArgs(MAPPING_HOME_DIR + "/readme.md").returns(statOfFile);

      fs.readdirSync.withArgs(MAPPING_HOME_DIR + "/vcs").returns([
        "git"
      ]);
      fs.statSync.withArgs(MAPPING_HOME_DIR + "/vcs/git").returns(statOfDirectory)

      fs.readdirSync.withArgs(MAPPING_HOME_DIR + "/vcs/git").returns([
        "github-api.js",
        "gitlab-api.js",
        "readme.md"
      ]);
      fs.statSync.withArgs(MAPPING_HOME_DIR + "/vcs/git/github-api.js").returns(statOfFile)
      fs.statSync.withArgs(MAPPING_HOME_DIR + "/vcs/git/gitlab-api.js").returns(statOfFile)
      fs.statSync.withArgs(MAPPING_HOME_DIR + "/vcs/git/readme.md").returns(statOfFile);

      assert.deepEqual(traverseDirRecursively(MAPPING_HOME_DIR, MAPPING_HOME_DIR, [".js"]), [
        {
          "home": "/home/devebot/example/mappings",
          "path": "/vcs/git",
          "dir": "/home/devebot/example/mappings/vcs/git",
          "base": "github-api.js",
          "name": "github-api",
          "ext": ".js"
        },
        {
          "home": "/home/devebot/example/mappings",
          "path": "/vcs/git",
          "dir": "/home/devebot/example/mappings/vcs/git",
          "base": "gitlab-api.js",
          "name": "gitlab-api",
          "ext": ".js"
        },
        {
          "home": "/home/devebot/example/mappings",
          "path": "",
          "dir": "/home/devebot/example/mappings",
          "base": "index.js",
          "name": "index",
          "ext": ".js"
        }
      ]);
    });
  });

  describe('loadMappingStore()', function() {
    var loggingFactory = dtk.createLoggingFactoryMock({ captureMethodCall: false });
    var ctx = {
      L: loggingFactory.getLogger(),
      T: loggingFactory.getTracer(),
      blockRef: 'app-restfetch',
    }

    var Counselor, loadMappingStore, fs;

    beforeEach(function() {
      Counselor = dtk.acquire('counselor');
      loadMappingStore = dtk.get(Counselor, 'loadMappingStore');
      fs = {
        statSync: sinon.stub()
      };
      dtk.set(Counselor, 'fs', fs);
    });
  });

  describe('Counselor() constructor', function() {
    var Counselor, loadMappingStore;
    var loggingFactory = dtk.createLoggingFactoryMock({ captureMethodCall: false });
    var ctx = {
      L: loggingFactory.getLogger(),
      T: loggingFactory.getTracer(),
      blockRef: 'app-restfetch',
    }

    var params = {
      sandboxConfig: {
        mappings: {
          "restfetch-example/githubApi": {
            enabled: false,
            methods: {
              getListBranches: {
                arguments: {
                  default: {
                    headers: {
                      'CONTENT-TYPE': 'text/plain',
                      'x-access-Token': '1111-1111',
                    }
                  }
                }
              }
            }
          }
        },
        mappingStore: {
          'restfetch-example': 'path-to-mappings-folder',
        }
      }
    }

    var mockMappings = {
      "restfetch-example/githubApi": {
        enabled: true,
        methods: {
          getListBranches: {
            method: "GET",
            url: "https://api.github.com/repos/:owner/:repoId/branches",
            arguments: {
              default: {
                headers: {
                  'content-type': 'application/json',
                  'x-access-token': 'A8Ytr54o0Mn',
                }
              },
              transform: function(owner, projectId) {
                var p = {};
                if (owner != null) {
                  p.owner = owner;
                }
                if (projectId != null) {
                  p.repoId = projectId;
                }
                return { params: p }
              }
            }
          },
          getProjectInfo: {
            method: "GET",
            url: "https://api.github.com/repos/:userOrOrgan/:projectId",
            arguments: {
              default: {
                params: {
                  userOrOrgan: 'apporo',
                  projectId: 'app-restfront'
                },
                query: {}
              },
              transform: function(data) {
                return data;
              }
            },
            response: {
              transform: function(res) {
                return res.json();
              }
            },
            exception: {
              transform: function(error) {
                return error;
              }
            }
          }
        }
      }
    }

    beforeEach(function() {
      Counselor = dtk.acquire('counselor');
      loadMappingStore = sinon.stub();
      loadMappingStore.onFirstCall().returns(mockMappings);
      dtk.set(Counselor, 'loadMappingStore', loadMappingStore);
    });

    it('Counselor will merge mappings properly', function() {
      var expected = lodash.cloneDeep(mockMappings);
      lodash.set(expected, [
        "restfetch-example/githubApi", "methods", "getListBranches", "arguments", "default", "headers"
      ], {
        'Content-Type': 'text/plain',
        'X-Access-Token': '1111-1111',
      });
      lodash.set(expected, ["restfetch-example/githubApi", "enabled"], false);

      var c = new Counselor(params);

      //console.log("newMappings: %s", JSON.stringify(c.mappings, null, 2));
      assert.deepEqual(c.mappings, expected);
    });
  });
});
