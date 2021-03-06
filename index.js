const net = require('net');
const opm = require('openpromise');

function makeEnding(reg) {
    return new RegExp("(" + reg.source + ")$");
}



function RegExize(x) {
    if (typeof x === 'string' || x instanceof String) {
        x = x.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&')
    }
    return RegExp(x)
}


function inEngine(host, port) {

    var client;
    var inDelimiter = /\r\n|\n\r|\r|\n/
    var inDelimiterChecker = makeEnding(inDelimiter)
    var outDelimiter = '\n'
    var openTimeout = 1500
    var requestTimeout = 1500
    var clearOut = 0
    var defaultPrompt = /^$/
    var modeStrict = true
    var autoLineBreak = false
    var autoFlush = false
    var autoOpen = true
    var openTries = 1



    Object.defineProperty(this, 'inDelimiter', {
        set: function (x) {
            inDelimiter = new RegExize(x)
            inDelimiterChecker = makeEnding(inDelimiter)
        },
        get: function () { return inDelimiter; }
    });

    Object.defineProperty(this, 'outDelimiter', {
        set: function (x) {
            outDelimiter = String(x)
        },
        get: function () { return outDelimiter; }
    });

    Object.defineProperty(this, 'timeOut', {
        set: function (x) {
            openTimeout = isNaN(x) ? defaultTimeout : Math.abs(parseInt(x))
            requestTimeout = openTimeout
        },
        get: function () { return openTimeout; }
    });

    Object.defineProperty(this, 'requestTimeout', {
        set: function (x) {
            requestTimeout = isNaN(x) ? defaultTimeout : Math.abs(parseInt(x))
        },
        get: function () { return requestTimeout; }
    });

    Object.defineProperty(this, 'openTimeout', {
        set: function (x) {
            openTimeout = isNaN(x) ? defaultTimeout : Math.abs(parseInt(x))
        },
        get: function () { return openTimeout; }
    });


    Object.defineProperty(this, 'defaultPrompt', {
        set: function (x) {
            defaultPrompt = RegExize(x)
        },
        get: function () { return defaultPrompt; }
    });

    Object.defineProperty(this, 'clearOut', {
        set: function (x) {
            clearOut = isNaN(x) ? defaultClearOut : Math.abs(parseInt(x))
        },
        get: function () { return clearOut; }
    });

    Object.defineProperty(this, 'modeStrict', {
        set: function (x) {
            modeStrict = true && x
            if (!modeStrict) { treat() }
        },
        get: function () { return modeStrict; }
    });

    Object.defineProperty(this, 'autoLineBreak', {
        set: function (x) {
            if (x) { autoLineBreak = Number(x) }
            else { x = false }
        },
        get: function () { return autoLineBreak; }
    });

    Object.defineProperty(this, 'autoDetect', {
        set: function (x) {
            autoDetect = x ? Number(x) : false
        },
        get: function () { return autoDetect; }
    });

    Object.defineProperty(this, 'autoFlush', {
        set: function (x) {
            autoFlush = x ? Number(x) : false
        },
        get: function () { return autoFlush; }
    });


    Object.defineProperty(this, 'autoOpen', {
        set: function (x) {
            autoOpen = x ? true : false
        },
        get: function () { return autoOpen; }
    });

    Object.defineProperty(this, 'openTries', {
        set: function (x) {
            openTries = x ? math.max(10, math.min(1, Number(x))) : 1
        },
        get: function () { return openTries; }
    });


    this.makeReverser = () => {
        var xinDelimiter = inDelimiter
        var xinDelimiterChecker = inDelimiterChecker
        var xoutDelimiter = outDelimiter
        var xopenTimeout = openTimeout
        var xrequestTimeout = requestTimeout
        var xclearOut = clearOut
        var xdefaultPrompt = defaultPrompt
        var xmodeStrict = modeStrict
        var xautoLineBreak = autoLineBreak
        var xautoFlush = autoFlush
        var xautoOpen = autoOpen
        var xopenTries = openTries

        return () => {
            inDelimiter = xinDelimiter
            inDelimiterChecker = xinDelimiterChecker
            outDelimiter = xoutDelimiter
            openTimeout = xopenTimeout
            requestTimeout = xrequestTimeout
            clearOut = xclearOut
            defaultPrompt = xdefaultPrompt
            modeStrict = xmodeStrict
            autoLineBreak = xautoLineBreak
            autoFlush = xautoFlush
            autoOpen = xautoOpen
            openTries = xopenTries
        }
    }


    onConnecting = new opm.Cycle();
    onConnectionSuccess = new opm.Cycle();
    onConnectionTimeOut = new opm.Cycle();
    onConnectionError = new opm.Cycle();
    onConnectionEnd = new opm.Cycle();
    onResponseTimeOut = new opm.Cycle();
    onReceive = new opm.Cycle();


    this.onConnecting = (f) => { return onConnecting.thenAgain(f) }
    this.onConnectionSuccess = (f) => { return onConnectionSuccess.thenAgain(f) }
    this.onConnectionTimeOut = (f) => { return onConnectionTimeOut.thenAgain(f) }
    this.onConnectionError = (f) => { return onConnectionError.thenAgain(f) }
    this.onConnectionEnd = (f) => { return onConnectionEnd.thenAgain(f) }
    this.onResponseTimeOut = (f) => { return onResponseTimeOut.thenAgain(f) }
    this.onReceive = (f) => { return onReceive.thenAgain(f) }


    var lineBreakTimer = opm.Delay(0)
    lineBreakTimer.clear = true

    const rawReceiver = new opm.Cycle()

    var connectionGate = new opm.Flipflop()

    connectionGate.catch(() => { })

    const openConnection = (tries) => {
        if (!tries) { tries = openTries }
        if (connectionGate.resolved || (client && client.connecting)) { return }
        var flushFlag = autoFlush
        onConnecting.repeat()
        var outTimer = new opm.TimeOut(openTimeout)
        if (tries == 1) {
            outTimer.catch(() => {
                client.destroy()
                onConnectionTimeOut.repeat()
                connectionGate.fail();
            })
        }
        else {
            outTimer.catch(() => {
                client.destroy()
                openConnection(tries - 1)
            })
        }
        client = net.createConnection({ port: port, host: host },
            function () {
                outTimer.resolve()
                onConnectionSuccess.repeat()
                if (flushFlag) {
                    var flushDelay = new opm.Delay(flushFlag)
                    flushDelay.then(() => { connectionGate.on(); flushFlag = false })
                }
                else { connectionGate.on() }
            }

        )
        client.on('data', function (chunk) {
            let data = chunk.toString()
            rawReceiver.repeat(data)
            if (autoLineBreak) {
                if (inDelimiterChecker.exec(data)) { lineBreakTimer.fail() }
                else {
                    lineBreakTimer.reset(autoLineBreak)
                    lineBreakTimer = opm.Delay(autoLineBreak)
                    lineBreakTimer
                        .then(() => { treat(outDelimiter) })
                        .catch(() => { })
                        .finally(() => { lineBreakTimer.clear = true })
                }
            }

            if (!flushFlag) { treat(data) }
        })

        client.on('error', () => { onConnectionError.repeat() });

        client.on('end', () => { onConnectionEnd.repeat() });

        client.on('close', () => { connectionGate.off() })

        client.on('open', () => { connectionGate.on() })

    }


    function reOpenConnection() {
        openConnection()
        return connectionGate
    }


    var clearWaiter = opm.Delay(0)
    clearWaiter.clear = true

    function resetClearWaiter() {
        clearWaiter.reset(clearOut)
        if (clearWaiter.clear) {
            clearWaiter = opm.Delay(clearOut)
            clearWaiter.then(() => { clearWaiter.clear = true })
        }
    }

    const sender = new opm.Cycle()

    function sendLine(text, UID) {
        return clearWaiter.then(() => {
            client.write(text + outDelimiter);
            var msg = { request: text }
            if (responseUID) { msg.UID = UID }
            sender.repeat(msg)
        })
    }

    var responseExpected = false
    var responseUID = undefined
    var responseTest = undefined
    var responseRelease = undefined
    var responsePrompt = undefined
    var responseFoo = undefined
    var responseTimeout = undefined
    var responseRequest = undefined
    var responseCounter = undefined
    var responseDelayed = undefined
    var responseArray = []



    var sendQueue = new opm.Queue()

    const send_receive = (text, foo, test, UID, prompt) => {
        responseRelease = new opm.Defer()
        sendQueue.enQueue(() => {
            return reOpenConnection()
                .then(() => {
                    if (typeof text == "function" || text instanceof Function) { text = text() }
                    if (text || text == "") { return sendLine(text, responseUID) }
                })
                .then(() => {
                    if (test == noRespObj) {
                        responseRelease.resolve([]);
                        var interResponse = { end: true };
                        if (responseUID) { interResponse.UID = responseUID }
                        if (responseRequest || responseRequest == "") { interResponse.request = responseRequest }
                        broadcast(interResponse)
                        return
                    }
                    responseFoo = foo
                    responseRequest = text
                    tmpOjt = {}
                    responseTest = test ? (s, f) => { test(s, f, tmpOjt) } : (s, f) => { f() }
                    responseDelayed = test ? test.delayed : false
                    responseUID = UID
                    responsePrompt = prompt
                    responseTimeout = new opm.Delay(requestTimeout)
                    if (!responseDelayed) {
                        responseTimeout.then(() => {
                            responseRelease.fail(responseArray);
                            onResponseTimeOut.repeat()
                        })
                            .catch(() => { })
                    }
                    responseExpected = true
                    treat()
                })
                .catch(() => {
                    responseRelease.fail(responseArray)
                })
        })


        responseRelease
            .then(() => {
                responseTimeout.fail()
            })
            .catch(() => {
                var response = { fail: true }
                if (responseRequest) { response.request = responseRequest }
                if (UID) { response.UID = UID }
                broadcast(response)
            })
            .finally(() => {
                responseExpected = false
                responseUID = undefined
                responseTest = undefined
                responseRelease = undefined
                responsePrompt = undefined
                responseFoo = undefined
                responseTimeout = undefined
                responseCounter = undefined
                responseRequest = undefined
                responseArray = []
            })


        return responseRelease

    }

    var inTreatment = false;
    var buffer = ""

    const treat = (txt) => {
        if (txt) { buffer = buffer + txt, resetClearWaiter() }
        if (inTreatment) { return }
        if (!responseExpected && modeStrict) { return }
        inTreatment = true;
        var requestWIP = true
        onReceive.repeat()
        do {
            if (responseTimeout) { responseTimeout.reset(requestTimeout) }
            var pe = inDelimiter.exec(buffer)
            var pr = pe || !responsePrompt ? null : responsePrompt.exec(buffer)
            if (pe || pr) {
                var indexStart, indexEnd, promptEnd
                if (pr) {
                    indexStart = pr.index + pr[0].length
                    indexEnd = indexStart
                    promptEnd = true
                }
                else {
                    indexStart = pe.index
                    indexEnd = pe.index + pe[0].length
                    promptEnd = false
                }
                let sub = buffer.slice(0, indexStart)
                response = { response: sub }
                if (pe) { response.terminator = pe[0] }
                if (responseExpected) {
                    var resolved = false
                    responseCounter = responseCounter ? responseCounter + 1 : 1
                    response.count = responseCounter
                    if (responseUID) { response.UID = responseUID }
                    if (responseRequest || responseRequest == "") { response.request = responseRequest }
                    if (promptEnd) { requestWIP = false; response.end = true; response.prompt = pr[0]; resolved = true }
                    else {
                        if (responseDelayed) {
                            responseTest(sub, () => {
                                requestWIP = false
                                responseRelease.resolve(responseArray);
                                var interResponse = { end: true, delayed: true };
                                if (responseUID) { interResponse.UID = responseUID }
                                if (responseRequest || responseRequest == "") { interResponse.request = responseRequest }
                                broadcast(interResponse)
                            })
                        }
                        else {
                            responseTest(sub, () => { resolved = true; requestWIP = false; response.end = true })
                        }
                    }
                    if (responseFoo) { responseArray[responseCounter - 1] = responseFoo(response) }
                    else { responseArray[responseCounter - 1] = response }
                    if (resolved) { responseRelease.resolve(responseArray) }
                }
                broadcast(response)
                buffer = buffer.slice(indexEnd)
            }

        } while (requestWIP && (pe || pr))
        inTreatment = false
    }

    const broadcaster = new opm.Cycle()

    function broadcast(line) {
        broadcastQueue = broadcaster.repeat(line)
    }


    ////////////--------------------------------------------------------------------------------------------------------




    this.open = () => {
        sendQueue.enQueue(openConnection())
    }


    this.terminate = () => {
        sendQueue.enQueue(this.destroy)
    }

    this.destroy = () => {
        broadcaster.terminate()
        rawReceiver.terminate()
        client.destroy()
        onConnecting.terminate()
        onConnectionSuccess.terminate()
        onConnectionTimeOut.terminate()
        onConnectionError.terminate()
        onConnectionEnd.terminate()
        onReceive.terminate()
        onResponseTimeOut.terminate()
    }


    this.request = (req) => {
        return send_receive(req.request, req.foo, req.test, req.test ? req.test.prompt : undefined)
    }

    this.requestString = (req, test = oneLine(), foo, UID) => {
        return send_receive(req, foo ? (r) => { if (r.response || r.response == "") { return foo(r.response) } } :
            (r) => { if (r) { return r.response } },
            test, UID, test ? test.prompt : undefined)
    }


    this.listen = (foo) => { return broadcaster.thenAgain(foo) }



    this.listenString = (foo, UID) => {
        if (UID) {
            return broadcaster.thenAgain((r) => { if (r.response && r.UID == UID) { foo(r.response) } })
        }
        else {
            return broadcaster.thenAgain((r) => { if (r.response) { foo(r.response) } })
        }
    }


    this.echo = (foo) => { return sender.thenAgain(foo) }


    this.echoString = (foo, UID) => {
        if (UID) { return sender.thenAgain((r) => { if (r.UID == UID) { foo(r.request) } }) }
        else { return sender.thenAgain((r) => { foo(r.request) }) }
    }


    this.flush = (t = 100) => { return this.requestString(null, untilMilli(t)) }

    this.rawListen = (f) => { return rawReceiver.thenAgain(f) }
}


////////////--------------------------------------------------------------------------------------------------------




const fakeEngine = {}
fakeEngine.wait = () => { }
fakeEngine.request = () => { }
fakeEngine.requestString = () => { }
fakeEngine.flush = () => { }
fakeEngine.listen = () => { }
fakeEngine.listenString = () => { }

fakeEngine.do = () => { }
fakeEngine.terminate = () => { }
fakeEngine.destroy = () => { }
fakeEngine.release = () => { }
fakeEngine.proxy = () => { }

function Engine(host, port, predecessor) {



    var myEngine
    var commandQueue = new opm.Queue()
    var reverser

    this.wait = (t) => {
        commandQueue.enQueue(new opm.Delay(t))
    }


    this.open = () => {
        myEngine.open()
    }

    this.request = (req) => {
        return commandQueue.enQueue(
            () => { return myEngine.request(req) })
    }

    this.requestString = (req, test = oneLine(), foo, UID) => {
        return commandQueue.enQueue(
            () => { return myEngine.requestString(req, test, foo, UID) })
    }

    this.listen = (foo) => { return myEngine.listen(foo) }

    this.listenString = (foo, UID) => {
        return myEngine.listenString(foo, UID)
    }

    this.echo = (foo) => { return myEngine.echo(foo) }

    this.echoString = (foo) => { return myEngine.echoString(foo) }

    this.flush = (t = 100) => { return commandQueue.enQueue(() => { return myEngine.flush(t) }) }

    this.do = (f) => {
        return commandQueue.enQueue(f)
    }


    function disableProxy() {
        if (myEngine != fakeEngine) {
            myEngine = fakeEngine;
            reverser();
            predecessor.lock.resolve()
        }

    }


    if (!predecessor) {
        myEngine = new inEngine(host, port)
        this.terminate = () => { return commandQueue.enQueue(myEngine.terminate) }
        this.destroy = myEngine.destroy
    }
    else {
        myEngine = predecessor.engine
        reverser = myEngine.makeReverser()
        commandQueue.enQueue(() => { return predecessor.sema })
        this.release = () => { return commandQueue.enQueue(disableProxy) }
        predecessor.lock.then(disableProxy)
    }

    this.proxy = (timeOut) => {
        var lock = new opm.Delay(timeOut)
        var sema = new opm.Defer()
        commandQueue.enQueue(() => {
            sema.resolve()
            return lock
        })
        return new Engine(null, null, { lock: lock, sema: sema, engine: myEngine })
    }


    this.rawListen = myEngine.rawListen

    this.onConnecting = myEngine.onConnecting
    this.onConnectionSuccess = myEngine.onConnectionSuccess
    this.onConnectionTimeOut = myEngine.onConnectionTimeOut
    this.onConnectionError = myEngine.onConnectionError
    this.onConnectionEnd = myEngine.onConnectionEnd
    this.onResponseTimeOut = myEngine.onResponseTimeOut
    this.onReceive = myEngine.onReceive

    Object.defineProperty(this, 'inDelimiter', Object.getOwnPropertyDescriptor(myEngine, 'inDelimiter'))
    Object.defineProperty(this, 'outDelimiter', Object.getOwnPropertyDescriptor(myEngine, 'outDelimiter'))
    Object.defineProperty(this, 'timeOut', Object.getOwnPropertyDescriptor(myEngine, 'timeOut'))
    Object.defineProperty(this, 'defaultPrompt', Object.getOwnPropertyDescriptor(myEngine, 'defaultPrompt'))
    Object.defineProperty(this, 'clearOut', Object.getOwnPropertyDescriptor(myEngine, 'clearOut'))
    Object.defineProperty(this, 'modeStrict', Object.getOwnPropertyDescriptor(myEngine, 'modeStrict'))
    Object.defineProperty(this, 'autoLineBreak', Object.getOwnPropertyDescriptor(myEngine, 'autoLineBreak'))
    Object.defineProperty(this, 'autoDetect', Object.getOwnPropertyDescriptor(myEngine, 'autoDetect'))
    Object.defineProperty(this, 'autoFlush', Object.getOwnPropertyDescriptor(myEngine, 'autoFlush'))
    Object.defineProperty(this, 'autoOpen', Object.getOwnPropertyDescriptor(myEngine, 'autoOpen'))

}





////////////--------------------------------------------------------------------------------------------------------

function untilString(endstring) {
    return (s, f) => {
        if (s.includes(endstring)) { f() }
    }
}


function untilRegExp(endRegExp) {
    return (s, f) => {
        if (endRegExp.test(s)) { f() }
    }
}



function untilPrompt(promptRegEx) {
    var f = () => { }
    f.prompt = RegExp(promptRegEx)
    return f
}


function untilTrue(test) {
    return (s, f) => {
        if (test(s)) { f() }
    }
}



function untilNumLines(endingN) {
    return (s, f, obj) => {

        if (typeof obj.counter == 'undefined') {
            obj.counter = endingN;
        }
        else {
            obj.counter -= 1;
        }
        if (obj.counter <= 1) { f() }
    }
}


function untilMilli(endingT) {
    var test = (s, f, obj) => {
        clearTimeout(obj.timer)
        obj.timer = setTimeout(f, endingT)
    }
    test.delayed = true
    return test
}


function oneLine() {
    return (s, f) => { f() }
}

const noRespObj = () => { }

function noResponse() {
    return noRespObj
}


module.exports = {
    Engine,
    untilString,
    untilRegExp,
    untilNumLines,
    untilMilli,
    untilPrompt,
    oneLine,
    noResponse,
    untilTrue
}

