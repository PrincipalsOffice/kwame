var tabId = parseInt(window.location.search.substring(1));
var reqResDict = {};
var postDataDict = {};

window.addEventListener('load', function() {
    chrome.debugger.sendCommand({tabId:tabId}, 'Network.enable');
    chrome.debugger.onEvent.addListener(allEventHandler);
});

window.addEventListener('unload', function() {
    chrome.debugger.detach({tabId:tabId});
});

function allEventHandler(debuggeeId, message, params) {

    if (tabId != debuggeeId.tabId) {
        return;
    }
    if (message == 'Network.requestWillBeSent'
        && params.type == 'XHR'
        && params.request.url.indexOf('core.eventmobi') > 0 ) { 
        if (params.request.hasOwnProperty('postData')){
            postDataDict[params.requestId] = JSON.parse(params.request.postData);
        }
    } else if (message == 'Network.responseReceived' 
        && params.type == 'XHR'
        && params.response.mimeType == 'application/json'
        && params.response.status.toString()[0] == '2') { //response return 

        chrome.debugger.sendCommand({
            tabId: debuggeeId.tabId
        }, 'Network.getResponseBody', {
            'requestId': params.requestId
        }, function(response) {
            var resp = JSON.parse(response.body);
            if (resp.data){
                var url = resp.meta.request.url;
                var data = {
                    'request': {
                        'method': resp.meta.request.method,
                        'query': resp.meta.request.query
                    },
                    'response': {
                        'type': resp.type,
                        'status': resp.status,
                        'error': resp.error,
                        'data': resp.data,
                    }
                };
                if (params.requestId in postDataDict) {
                    data['request']['data'] = postDataDict[params.requestId];
                    delete postDataDict[params.requestId];
                }
                if (url in reqResDict && checkDuplicateReq(reqResDict[url], data) == false) {
                    reqResDict[url].push(data);
                } else {
                    reqResDict[url] = [data];
                }
                document.getElementById('container').innerHTML = JSON.stringify(reqResDict, undefined, 2);
            }
        });
    }
}

function checkDuplicateReq(reqs, newReq) {
    for (var index in reqs) {
        if (JSON.stringify(reqs[index].request) === JSON.stringify(newReq.request)) {
            return true;
        }
    }
    return false;
}
