class FileLocker {

    errorCallback(error) {
        console.log('Error in Locker.', error);
    }

    constructor(persistent = false, callback = function () { }, bytes = 5 * 1024 * 1024) {
        let locker = this;
        if (persistent)
            navigator.webkitPersistentStorage.requestQuota(bytes, (grantedBytes) =>
                window.webkitRequestFileSystem(PERSISTENT, grantedBytes, function (fs) {
                    locker.fs = fs;
                    callback();
                })
            );
        else
            navigator.webkitTemporaryStorage.requestQuota(bytes, (grantedBytes) => window.webkitRequestFileSystem(TEMPORARY, grantedBytes, fs => locker.fs = fs));
    }

    createDirectory(path, callback) {
        this.fs.root.getDirectory(path, { create: true }, directory => callback(directory), this.errorCallback);
    }

    removeDirectory(path, callback) {
        this.fs.root.getDirectory(path, {}, dirEntry => dirEntry.removeRecursively(callback, callback), callback);
    }

    listDirectory(path, callback) {

        function listDir(directory, callback) {
            var dir_reader = directory.createReader();
            var entries = [];

            let readEntries = _ => {
                let readResults = results => {
                    if (!results.length)
                        callback(entries);
                    else {
                        entries = entries.concat(Array.prototype.slice.call(results || [], 0));
                        readEntries();
                    }
                }
                dir_reader.readEntries(readResults, function () { });
            }
            readEntries();
        }

        this.fs.root.getDirectory(path, {}, directory => listDir(directory, callback), this.errorCallback);
    }

    loadFile(path, callback, error_callback) {
        this.fs.root.getFile(path, {}, fileEntry => {
            fileEntry.file(file => {
                var reader = new FileReader();
                reader.onloadend = function (e) {
                    var data = this.result;
                    callback(data);
                }
                reader.readAsText(file);
            });

        }, error_callback);
    }

    saveFile(path, data, callback) {
        let createFile = (path, data, callback) => {
            this.fs.root.getFile(path, { create: true }, fileEntry => {
                fileEntry.createWriter(fw => {
                    var blob = new Blob([data], { type: 'text/plain' });
                    fw.write(blob);
                    if (callback)
                        callback(fileEntry);
                });
            });
        }

        this.fs.root.getFile(path, {}, fileEntry => this.removeFile(path, result => createFile(path, data, callback)), fileEntry => createFile(path, data, callback));
    }

    saveImage(path, url, callback) {
        let createImage = (path, url, callback) => {
            this.fs.root.getFile(path, { create: true }, fileEntry =>
                fileEntry.createWriter(fw =>
                    fetch(url).then(response => response.blob()).then(blob => {
                        fw.write(blob);
                        if (callback)
                            callback()
                    }
                    )
                )
            );
        }

        this.fs.root.getFile(path, {}, fileEntry => this.removeFile(path, result => createImage(path, url, callback)), fileEntry => createImage(path, url, callback));
    }

    loadImage(path, callback) {
        this.fs.root.getFile(path, {}, fileEntry => {
            let url = fileEntry.toURL();
            callback(url);
        });
    }

    removeFile(path, callback) {
        this.fs.root.getFile(path, { create: false }, fileEntry => fileEntry.remove(callback, callback));
    }

    static async encrypt(value, password) {
        const ptUtf8 = new TextEncoder().encode(value);
        const pwUtf8 = new TextEncoder().encode(password);
        const pwHash = await crypto.subtle.digest('SHA-256', pwUtf8);
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const alg = { name: 'AES-GCM', iv: iv };
        const key = await crypto.subtle.importKey('raw', pwHash, alg, false, ['encrypt']);
        return { iv, encBuffer: await crypto.subtle.encrypt(alg, key, ptUtf8) };
    }

    static async decrypt(encBuffer, iv, password) {
        const pwUtf8 = new TextEncoder().encode(password);
        const pwHash = await crypto.subtle.digest('SHA-256', pwUtf8);
        const alg = { name: 'AES-GCM', iv: iv };
        const key = await crypto.subtle.importKey('raw', pwHash, alg, false, ['decrypt']);
        const ptBuffer = await crypto.subtle.decrypt(alg, key, encBuffer);
        const plaintext = new TextDecoder().decode(ptBuffer);
        return plaintext;
    }

    saveEncryptedFile(path, data, pass, callback) {
        FileLocker.encrypt(data, pass).then(res => {
            let encBuffer = res.encBuffer;
            this.saveFile(path, encBuffer, result => callback(res.iv));
        });
    }

    loadBuffer(path, callback) {
        this.fs.root.getFile(path, {}, fileEntry => {
            fileEntry.file(file => {
                var reader = new FileReader();
                reader.onloadend = function (e) {
                    var data = this.result;
                    callback(data);
                }
                reader.readAsArrayBuffer(file);
            });
        });
    }

    loadEncryptedFile(path, pass, iv, callback) {
        this.loadBuffer(path, res => {
            FileLocker.decrypt(res, iv, pass).then(response => callback(response));
        });
    }
}

let Monster = new function(){
    let monster = this;

    monster.whitelist = {};
    monster.blacklist = {};
    monster.current = "blacklist";
}

var locker = new FileLocker(true, function () {
    locker.loadFile('/lists', function (response) {
        let lists = JSON.parse(response);
        Monster.whitelist = lists.whitelist;
        Monster.blacklist = lists.blacklist;
        Monster.current = lists.current;
    }, function () {
        locker.saveFile('/lists', JSON.stringify(
            {
                whitelist: {
                    default: {
                        name: 'Whitelisted Domains',
                        domains: '',
                        method: 'allow'
                    },
                    custom: {

                    },
                    other: {
                        name: 'All Other Domains',
                        method: 'remove'
                    }
                },
                blacklist: {
                    default: {
                        name: 'Blacklisted Domains',
                        domains: '',
                        method: 'remove'
                    },
                    custom: {

                    },
                    other: {
                        name: 'All Other Domains',
                        method: 'allow'
                    }
                },
                current: "blacklist"
            }
        ),
            function () {
                locker.loadFile('/lists', function (response) {
                    let lists = JSON.parse(response);
                    Monster.whitelist = lists.whitelist;
                    Monster.blacklist = lists.blacklist;
                    Monster.current = lists.current;
                });
            }
        );
    });
})



var fullPort;

var get = filters => chrome.cookies.getAll(filters, cookies => fullPort.postMessage({
    type: 'load',
    data: cookies
}));

var remove = (filters, callback) => chrome.cookies.remove(filters, cookie => { if(callback) callback(); });

var removeCookies = (cookies) =>
{
    let len = cookies.length;
    for(var i = 0; i < cookies.length; i++){
        var cookie = cookies[i];
        cookie.i = i;
        chrome.cookies.remove({ url: cookie.url, name: cookie.name }, function (response) {
            if((len-1) == cookie.i){
                get({});
            }
        })
    }
}

var saveEdit = cookie =>
{
    console.log(`editing ${cookie}`);
    let obj = {
        url: cookie.add.url,
        name: cookie.add.name
    }
    remove(obj, res => chrome.cookies.set(cookie.add, res => get({})));
}

function handle_updates(updates){
    Monster.whitelist = updates.whitelist;
    Monster.blacklist = updates.blacklist;
    Monster.current = updates.current;
}

let handleMessage = (message) =>
{
    console.log(message);
    switch(message.type)
    {
        case 'initial-load':
            get({});
            break;
        case 'remove-cookie':
            removeCookies(message.data);
            break;
        case 'remove-all':
            chrome.cookies.getAll({}, function(res){
                let len = res.length;
                for(var i = 0; i < len; i++){
                    let cookie = res[i];
                    cookie.i = i;
                    chrome.cookies.remove({ url: 'https://' + cookie.domain + cookie.path, name: cookie.name }, function(response){
                        if((len - 1) == cookie.i){
                            console.log('removal');
                            get({})
                        }
                    })
                }
            })
            break;
        case 'edit':
            saveEdit(message.data);
            break;
        case 'updates':
            handle_updates(message.data);
            break;
    }
}
let connectionMade = (port) =>
{
    fullPort = port;
    port.onMessage.addListener(handleMessage);
    port.onDisconnect.addListener(port => fullPort = null);
}

function parse_url(cookie) {
    return (cookie.domain.startsWith('.')) ? `https://${cookie.domain.substring(1)}${cookie.path}` : `https://${cookie.domain}${cookie.path}`;
}

function analyze(cookie, domain){

    var transaction = {};
    transaction.cookie = cookie;
    transaction.current = Monster.current;

    function in_list(domain, entry){
        var matched = false;
        var domains = entry.domains.split(';');
        domains.forEach(_domain => {
            if(_domain.indexOf(domain) != -1) {
                matched = true;
                transaction.matched = true;
                transaction.method = entry.method;
            }
        });
        return matched;
    }

    in_list(domain, Monster[Monster.current].default);
    for(let list of Object.values(Monster[Monster.current].custom)){
        in_list(domain, list);
    }

    if(!transaction.matched){
        transaction.matched = false;
        transaction.method = Monster[Monster.current].other.method;
    }

    return transaction;
}

function poison_string(str){
    function isLetter(c) {
        return c.toLowerCase() != c.toUpperCase();
    }

    function isNumber(i){
        if('0123456789'.indexOf(i) !== -1) {
            return true;
        }
        return false;
    }

    function isCapital(l){
        return !(l == l.toLowerCase())
    }

    function rand_let(){
        return Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 1);
    }

    function rand_int() {
        let i = Math.floor(Math.random() * (9 - 0 + 1)) + 0;
        return i.toString();
    }

    var final_str = "";
    for(let l of str){
        if(isLetter(l)){
            if(isCapital(l)){
                final_str += rand_let().toUpperCase();
            }
            else {
                final_str += rand_let();
            }
        }
        else
        if(isNumber(l))
            final_str += rand_int();
        else
            final_str += l;
    }
    
    return final_str;
}

function make_index(cookie){
    return parse_url(cookie) + '-' + cookie.name;
}

let custom_remove = [];

function handle_change(change_info){

    var cause = change_info.cause;
    var domain = change_info.cookie.domain.match(/(?!(w+)\.)\w*(?:\w+\.)+\w+/g)[0];
    var cookie = change_info.cookie;
    var removed = change_info.removed;

 
    if(removed){
        fullPort.postMessage({
            type: 'cookie-remove',
            data: change_info.cookie
        });
    }
    else
    if(cause == 'explicit' && !removed) {
        var transaction = analyze(cookie, domain);

        console.log(transaction);
        if(transaction.method == 'remove') {
            remove({
                url: parse_url(cookie),
                name: cookie.name
            }, res => get({}));
        }
        else
        if(transaction.method == 'poison'){
            let index = make_index(cookie);
            var ind = custom_remove.indexOf(index);
            if(ind != -1){
                custom_remove.splice(ind, 1);
                console.log('removing poison entry');
                fullPort.postMessage({
                    type:'cookie-add',
                    data: change_info.cookie
                })
            }
            else {
                custom_remove.push(index);
                var poisoned = poison_string(cookie.value);
                chrome.cookies.set({
                    url: 'https://'+cookie.domain+cookie.path,
                    name: cookie.name,
                    value: poisoned
                });
            }
        }
        else
        if(transaction.method == 'swap'){
            
        }
        else {
            fullPort.postMessage({
                type: 'cookie-add',
                data: change_info.cookie
            });
        }
    }
}

chrome.cookies.onChanged.addListener(handle_change);
chrome.runtime.onConnect.addListener(connectionMade);
chrome.browserAction.onClicked.addListener((tab) => chrome.runtime.openOptionsPage());

