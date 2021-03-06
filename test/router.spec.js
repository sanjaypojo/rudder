const connect = require("connect")
const request = require("request")
const bodyParser = require("body-parser")
const quip = require("quip")
const chai = require("chai")
const aileron = require("../src/index")
const should = chai.should()

const { router, middleware } = aileron({
  strict: true,
  badInputHandler: (req, res, err, errMsg) =>
    res.forbidden().json({ err, message: errMsg }),
  errHandler: (req, res, err, errMsg) => res.error().json({ err, message: "Yo" }),
  successHandler: (req, res, payload) => {
    res.ok().json(payload)
  }
})

// Create a temporary server for tests
let testServer = connect()

const controller1 = {
  get: {
    inputs: {},
    errMsg: "",
    handler: (req, data) => {
      return { cowId: parseInt(data.cowId) }
    }
  }
}

const controller2 = {
  get: {
    inputs: {},
    errMsg: "",
    handler: (req, data) => {
      if (data.complexId) {
        return {
          cowId: parseInt(data.cowId),
          complexId: parseInt(data.complexId)
        }
      } else {
        return {
          cowId: parseInt(data.cowId),
          complexId: 365
        }
      }
    }
  },
  post: {
    inputs: {},
    errMsg: "",
    handler: (req, data) => {
      return {
        cowId: parseInt(data.cowId),
        complexId: parseInt(data.complexId) + 1
      }
    }
  },
  patch: {
    inputs: {},
    errMsg: "",
    handler: (req, data) => {
      return {
        cowId: parseInt(data.cowId),
        complexId: parseInt(data.complexId) + 2
      }
    }
  },
  put: {
    inputs: {},
    errMsg: "",
    handler: (req, data) => {
      return {
        cowId: parseInt(data.cowId),
        complexId: parseInt(data.complexId) + 3
      }
    }
  },
  delete: {
    inputs: {},
    errMsg: "",
    handler: (req, data) => {
      return {
        cowId: parseInt(data.cowId),
        complexId: parseInt(data.complexId) + 4
      }
    }
  }
}

const controller3 = {
  patch: {
    inputs: {},
    errMsg: "",
    handler: (req, data) => {
      return {
        monkeyCode: data.monkeyCode,
        complexId: parseInt(data.complexId) + 4
      }
    }
  }
}

const controller4 = {
  patch: {
    inputs: {},
    errMsg: "",
    handler: (req, data) => {
      return {
        monkeyCode: data.monkeyCode,
        complexId: parseInt(data.complexId) + 6
      }
    }
  }
}

const passthrough = {
  errMsg: "passthrough error",
  handler: (req, data) => {
    return
  }
}

const strictModeController = {
  get: {
    inputs: {},
    errMsg: "",
    handler: (req, data) => {
      return { strictId: parseInt(data.strictId) }
    }
  }
}

const errorController = {
  get: {
    inputs: {},
    errMsg: "",
    handler: (req, data) => {
      return { assessmentId: data.assessmentId }
    }
  }
}

const inputCheckingController = {
  post: {
    inputs: { name: "String", age: "Number" },
    errMsg: "them weird inputs guv",
    handler: (req, data) => {
      const { name, age } = data
      return { name, age }
    }
  },
  put: {
    inputs: { name: "String", age: "Number" },
    inputCheck: parsedInputs => {
      if (parsedInputs.name === "Jon Snow") {
        throw "You know nothing, Jon Snow"
      }
    },
    errMsg: "them weird inputs guv",
    handler: (req, data) => {
      const { name, age } = data
      return { name, age }
    }
  },
  patch: {
    inputs: { age: "Number?" },
    errMsg: "them optional inputs guv",
    handler: (req, data) => {
      return { age: data.age || "No age specified" }
    }
  }
}

const timeout = ms => {
  return new Promise(resolve => setTimeout(resolve, ms))
}

const asyncController = {
  get: {
    inputs: {},
    errMsg: "async givin you trouble",
    handler: async (req, data) => {
      await timeout(25)
      return { cookie: "You wait you get a cookie!" }
    }
  },
  post: {
    inputs: { throw: "Boolean", throwText: "String" },
    errMsg: "async throws be tricky",
    handler: async (req, data) => {
      if (data.throw) {
        throw data.throwText
      }
      return { noPotato: true }
    }
  }
}

const middleware1 = {
  errMsg: "Avo4Lyf",
  handler: (req, data) => {
    if (data.middlewareCode !== "avo") {
      throw "Not hipster."
    } else {
      req.middlewareData = { middlewareCode: data.middlewareCode }
    }
  }
}

const middleware2 = {
  errMsg: "Optionality",
  handler: (req, data) => {
    req.middlewareData = { optionalCode: data.optionalCode }
  }
}

const middlewareAsync = {
  errMsg: "Async Middleware is Broken",
  handler: async (req, data) => {
    await timeout(25)
    if (data.music === "pop") {
      throw "Not classy."
    } else {
      req.middlewareData = { music: data.music }
    }
  }
}

const routerForMiddlewareTests = {
  get: {
    errMsg: "routerForMiddlewareTests",
    inputs: {},
    handler: (req, data) => {
      return req.middlewareData
    }
  },
  post: {
    errMsg: "routerForMiddlewareTests",
    inputs: {},
    handler: (req, data) => {
      return req.middlewareData
    }
  }
}

let runningServer = testServer
  .use(quip)
  .use(bodyParser.urlencoded({ extended: false }))
  .use(bodyParser.json())
  .use(middleware("/middleware/:middlewareCode/middleware1", middleware1))
  .use(middleware("/middleware/:id/middleware2/:optionalCode", middleware2))
  .use(middleware("/middleware/:id/middlewareAsync/:music", middlewareAsync))
  .use(
    router(
      "/middleware/:id/middleware1/:routerCode/paths/allowed/here",
      routerForMiddlewareTests
    )
  )
  .use(
    router(
      "/middleware/:id/middleware2/:routerCode/paths/allowed/here",
      routerForMiddlewareTests
    )
  )
  .use(
    router(
      "/middleware/:id/middlewareAsync/:routerCode/paths/allowed/here",
      routerForMiddlewareTests
    )
  )
  .use(router("/middleware/:id/middleware2", routerForMiddlewareTests))
  .use(router("/cow/:cowId/abc", controller1))
  .use(middleware("/app/assessments/:assessmentId", passthrough))
  .use(
    router(
      "/app/assessments/:assessmentId/respondents/:respondentId/questionnaire",
      errorController
    )
  )
  .use(router("/monkey/:monkeyCode/complex/:complexId", controller3))
  .use(router("/cow/:cowId/complex/:complexId", controller2))
  .use(router("/monkey/:monkeyCode/complex/:complexId/abc", controller4))
  .use(router("/cow/:cowId/def/", controller1))
  .use(router("/strict/:strictId", strictModeController, true))
  .use(router("/input-checking", inputCheckingController))
  .use(router("/async", asyncController))
  .use((req, res, next) => res.notFound("Help"))
  .listen(3003)

let reqHost = "http://localhost:3003"

describe("Router and Middleware Tests", () => {
  after(() => {
    runningServer.close()
  })

  describe("Router", () => {
    it("should handle get requests if supported", done => {
      request.get(`${reqHost}/cow/12/complex/23`, (err, response, body) => {
        let data = JSON.parse(body)
        data.cowId.should.equal(12)
        data.complexId.should.equal(23)
        done()
      })
    })
    it("should handle get requests without id", done => {
      request.get(`${reqHost}/cow/12/complex`, (err, response, body) => {
        let data = JSON.parse(body)
        data.cowId.should.equal(12)
        data.complexId.should.equal(365)
        done()
      })
    })
    it("should handle post requests if supported", done => {
      request.post(`${reqHost}/cow/12/complex/23`, (err, response, body) => {
        let data = JSON.parse(body)
        data.cowId.should.equal(12)
        data.complexId.should.equal(24)
        done()
      })
    })
    it("should handle patch requests if supported", done => {
      request.patch(`${reqHost}/cow/12/complex/23`, (err, response, body) => {
        let data = JSON.parse(body)
        data.cowId.should.equal(12)
        data.complexId.should.equal(25)
        done()
      })
    })
    it("should handle put requests if supported", done => {
      request.put(`${reqHost}/cow/12/complex/23`, (err, response, body) => {
        let data = JSON.parse(body)
        data.cowId.should.equal(12)
        data.complexId.should.equal(26)
        done()
      })
    })
    it("should handle delete requests if supported", done => {
      request.del(`${reqHost}/cow/12/complex/23`, (err, response, body) => {
        let data = JSON.parse(body)
        data.cowId.should.equal(12)
        data.complexId.should.equal(27)
        done()
      })
    })
    it("should activate the right controller", done => {
      request.get(`${reqHost}/cow/15/abc`, (err, response, body) => {
        let data = JSON.parse(body)
        data.cowId.should.equal(15)
        should.not.exist(data.complexId)
        done()
      })
    })
    it("should ignore trailing slashes", done => {
      request.get(`${reqHost}/cow/15/def`, (err, response, body) => {
        let data = JSON.parse(body)
        data.cowId.should.equal(15)
        should.not.exist(data.complexId)
        done()
      })
    })
    it("should ignore trailing slashes", done => {
      request.get(`${reqHost}/cow/15/def/`, (err, response, body) => {
        let data = JSON.parse(body)
        data.cowId.should.equal(15)
        should.not.exist(data.complexId)
        done()
      })
    })
    it("should send a 404 if the request method is not supported", done => {
      request.patch(`${reqHost}/cow/15/abc`, (err, response, body) => {
        response.statusCode.should.equal(404)
        done()
      })
    })
    it("should handle string IDs", done => {
      request.patch(`${reqHost}/monkey/all/complex/27`, (err, response, body) => {
        let data = JSON.parse(body)
        data.monkeyCode.should.equal("all")
        data.complexId.should.equal(31)
        done()
      })
    })
    it("should not match subset urls", done => {
      request.get(`${reqHost}/app/assessments/13`, (err, response, body) => {
        response.statusCode.should.equal(404)
        done()
      })
    })
    it("should pass forward superset urls", done => {
      request.patch(`${reqHost}/monkey/123/complex/27/abc`, (err, response, body) => {
        let data = JSON.parse(body)
        data.monkeyCode.should.equal("123")
        data.complexId.should.equal(33)
        done()
      })
    })
    it("should ignore unmatched superset urls", done => {
      request.get(`${reqHost}/cow/12/complex/12/divi/12`, (err, response, body) => {
        response.statusCode.should.equal(404)
        done()
      })
    })
    it("should handle trailing slashes correctly", done => {
      request.patch(`${reqHost}/monkey/all/complex/27/`, (err, response, body) => {
        response.statusCode.should.equal(200)
        let data = JSON.parse(body)
        data.monkeyCode.should.equal("all")
        data.complexId.should.equal(31)
        done()
      })
    })
    it("should not accept subset URLs without id in strict mode", done => {
      request.get(`${reqHost}/strict`, (err, response, body) => {
        response.statusCode.should.equal(404)
        done()
      })
    })
    it("should not allow missing inputs", done => {
      request.post(`${reqHost}/input-checking`, (err, response, body) => {
        const data = JSON.parse(body)
        data.message.should.have.string("weird")
        response.statusCode.should.equal(403)
        done()
      })
    })
    it("should not allow incorrect inputs", done => {
      request.post(
        {
          url: `${reqHost}/input-checking`,
          json: { name: "Pojo", age: "25" }
        },
        (err, response, body) => {
          body.err.msg.should.have.string("Aileron type error")
          response.statusCode.should.equal(403)
          done()
        }
      )
    })
    it("should not allow inputs that inputCheck throws", done => {
      request.put(
        {
          url: `${reqHost}/input-checking`,
          json: { name: "Jon Snow", age: 25 }
        },
        (err, response, body) => {
          body.message.should.have.string("them weird inputs guv")
          body.err.should.have.string("You know nothing, Jon Snow")
          response.statusCode.should.equal(403)
          done()
        }
      )
    })
    it("should allow APIs where inputs and inputCheck succeed", done => {
      request.put(
        {
          url: `${reqHost}/input-checking`,
          json: { name: "Pojo", age: 25 }
        },
        (err, response, body) => {
          response.statusCode.should.equal(200)
          body.name.should.equal("Pojo")
          body.age.should.equal(25)
          done()
        }
      )
    })
    it("should allow API if all inputs are correct", done => {
      request.post(
        {
          url: `${reqHost}/input-checking`,
          json: { name: "Pojo", age: 25 }
        },
        (err, response, body) => {
          response.statusCode.should.equal(200)
          body.name.should.equal("Pojo")
          body.age.should.equal(25)
          done()
        }
      )
    })
    it("should reject optional inputs with incorrect types", done => {
      request.patch(
        {
          url: `${reqHost}/input-checking`,
          json: { age: "25" }
        },
        (err, response, body) => {
          body.err.msg.should.have.string("Aileron type error")
          response.statusCode.should.equal(403)
          done()
        }
      )
    })
    it("should allow optional inputs with correct types", done => {
      request.patch(
        {
          url: `${reqHost}/input-checking`,
          json: { age: 42 }
        },
        (err, response, body) => {
          response.statusCode.should.equal(200)
          body.age.should.equal(42)
          done()
        }
      )
    })
    it("should allow undefined inputs when marked optional", done => {
      request.patch(
        {
          url: `${reqHost}/input-checking`,
          json: {}
        },
        (err, response, body) => {
          response.statusCode.should.equal(200)
          body.age.should.equal("No age specified")
          done()
        }
      )
    })
    it("should allow async handlers", done => {
      request.get(`${reqHost}/async`, (err, response, body) => {
        response.statusCode.should.equal(200)
        const data = JSON.parse(body)
        data.cookie.should.have.string("cookie")
        done()
      })
    })
    it("should catch errors thrown in async handlers", done => {
      request.post(
        {
          url: `${reqHost}/async`,
          json: { throw: true, throwText: "Potato" }
        },
        (err, response, body) => {
          response.statusCode.should.equal(500)
          body.err.should.equal("Potato")
          body.message.should.equal("Yo")
          done()
        }
      )
    })
  })

  describe("Middleware", () => {
    it("should work for partial matches", done => {
      request.post(
        `${reqHost}/middleware/avo/middleware1/any/paths/allowed/here`,
        (err, response, body) => {
          response.statusCode.should.equal(200)
          const data = JSON.parse(body)
          data.middlewareCode.should.equal("avo")
          done()
        }
      )
    })
    it("should catch errors and send them through the errorHandler", done => {
      request.get(
        `${reqHost}/middleware/orange/middleware1/orange/paths/allowed/here`,
        (err, response, body) => {
          response.statusCode.should.equal(500)
          const data = JSON.parse(body)
          data.err.should.equal("Not hipster.")
          done()
        }
      )
    })
    it("should work for partial matches with an ID at the end", done => {
      request.post(
        `${reqHost}/middleware/avo/middleware2/12/paths/allowed/here`,
        (err, response, body) => {
          response.statusCode.should.equal(200)
          const data = JSON.parse(body)
          data.optionalCode.should.equal("12")
          done()
        }
      )
    })
    it("should work for partial matches with missing ID at the end", done => {
      request.post(`${reqHost}/middleware/avo/middleware2`, (err, response, body) => {
        response.statusCode.should.equal(200)
        const data = JSON.parse(body)
        should.not.exist(data.optionalCode)
        done()
      })
    })
    it("should work for async middleware matches", done => {
      request.post(
        `${reqHost}/middleware/avo/middlewareAsync/jazz/paths/allowed/here`,
        (err, response, body) => {
          response.statusCode.should.equal(200)
          const data = JSON.parse(body)
          data.music.should.equal("jazz")
          done()
        }
      )
    })
    it("should catch async errors and send them through the errorHandler", done => {
      request.get(
        `${reqHost}/middleware/orange/middlewareAsync/pop/paths/allowed/here`,
        (err, response, body) => {
          response.statusCode.should.equal(500)
          const data = JSON.parse(body)
          data.err.should.equal("Not classy.")
          done()
        }
      )
    })
  })
})
