class FileLocker {

    errorCallback(error){
        console.log('Error in Locker.', error);
    }

	constructor(persistent = false, callback=function(){}, bytes=5 * 1024 * 1024){
		let locker = this;
		if(persistent)
			navigator.webkitPersistentStorage.requestQuota(bytes, (grantedBytes) =>
				window.webkitRequestFileSystem(PERSISTENT, grantedBytes, function(fs){
					locker.fs = fs;
					callback();
				})
			);
		else
			navigator.webkitTemporaryStorage.requestQuota(bytes, (grantedBytes) => window.webkitRequestFileSystem(TEMPORARY, grantedBytes, fs => locker.fs = fs));
    }

    createDirectory(path, callback){
        this.fs.root.getDirectory(path, {create: true}, directory => callback(directory), this.errorCallback);
    }

    removeDirectory(path, callback){
        this.fs.root.getDirectory(path, {}, dirEntry => dirEntry.removeRecursively(callback,callback), callback);
    }

    listDirectory(path, callback){

		function listDir(directory, callback){
			var dir_reader = directory.createReader();
			var entries = [];

			let readEntries = _ =>
			{
				let readResults = results =>
				{
					if (!results.length)
						callback(entries);
					else {
						entries = entries.concat(Array.prototype.slice.call(results || [], 0));
						readEntries();
					}
				}
				dir_reader.readEntries(readResults, function(){});
			}
			readEntries();
		}

        this.fs.root.getDirectory(path, {}, directory => listDir(directory, callback), this.errorCallback);
    }

    loadFile(path, callback, error_callback){
        this.fs.root.getFile(path,{}, fileEntry =>
        {
			fileEntry.file(file =>
			{
				var reader = new FileReader();
				reader.onloadend = function(e)
				{
					var data = this.result;
					callback(data);
				}
				reader.readAsText(file);
			});
			
        },error_callback);
    }

    saveFile(path, data, callback){
		let createFile = (path, data, callback) =>
		{
			this.fs.root.getFile(path, {create: true}, fileEntry =>
			{
				fileEntry.createWriter(fw =>
				{
					var blob = new Blob([data],{type: 'text/plain'});
					fw.write(blob);
					if(callback)
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

    removeFile(path, callback){
        this.fs.root.getFile(path, {create: false}, fileEntry => fileEntry.remove(callback, callback));
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

    saveEncryptedFile(path, data, pass, callback){
		FileLocker.encrypt(data,pass).then(res =>
		{
            let encBuffer = res.encBuffer;
            this.saveFile(path, encBuffer, result => callback(res.iv));
        });
	}
	
	loadBuffer(path, callback){
		this.fs.root.getFile(path, {}, fileEntry =>
		{
			fileEntry.file(file =>
			{
				var reader = new FileReader();
				reader.onloadend = function(e)
				{
					var data = this.result;
					callback(data);
				}
				reader.readAsArrayBuffer(file);
			});
		});
	}

    loadEncryptedFile(path, pass, iv, callback){
		this.loadBuffer(path, res =>
		{
            FileLocker.decrypt(res, iv, pass).then(response => callback(response));
        });
    }
}