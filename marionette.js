/* Things Marionette takes for granted

XMLHttpRequest (sorry IE6)
JSON.parse
FormData

*/

var Marionette = {};

Marionette.Application = function(templatePath, ready){
	/*
		requestUrl
		requestRunning
		requestResponseData
		templates
	*/
	
	this.onfailure = function(e){};
	
	var self = this;
	
	var onSuccess = function(){
		if(this.readyState == 1){
			self.requestRunning = true;
		}
		if(this.readyState == 4){
			self.requestRunning = false;
			if(this.status == 200){
				var redirect = this.getResponseHeader('X-Marionette-Location');
				if(redirect){
					this.request('GET', redirect, null, {
						'Accept': 'application/json;',
						'X-Requested-With': 'XMLHttpRequest'
					});
				}else{
					var json;
					try{
						json = JSON.parse(this.responseText);
					}catch(e){
						self.onfailure.call(self, e);
						return;
					}
					self.requestResponseData = json;
					
					// Todo: Use Link headers instead of custom ones, and get rid of the template loader
					var templateName = this.getResponseHeader('X-Marionette-Template');
					var layout = this.getResponseHeader('X-Marionette-Layout') || 'layout';

					var rendered = Mustache.to_html(self.templates[templateName], json);
					var laid = Mustache.to_html(self.templates[layout], {"yield":rendered})
					
					// Todo: Make main container configurable
					var container = document.getElementById('container').innerHTML = laid;
				}
			}
		}
	}

	this.xhr = new XMLHttpRequest();
	
	this.xhr.onreadystatechange = function(){
		if(this.readyState == 4 && this.status == 200){
			// Set up the normal callback
			this.onreadystatechange = onSuccess;
			
			// Set up the listeners
			// what do we do about assholes who click-click-click-click?
			self.addEventListener(document, 'click', function(evt){
				if(evt.target.tagName.toUpperCase() == 'A'){
					evt.preventDefault();
					self.dispatch(evt.target);
				}
			});
			self.addEventListener(document, 'submit', function(evt){
				evt.preventDefault();
				self.dispatch(evt.target);
			});
			
			// TODO: error delegation
			self.templates = JSON.parse(this.responseText);
			
			ready.call(this);
		}else{
			// Throw a "Can't get Templates" Exception
		}
	}
	
	this.request('GET', templatePath);
};

Marionette.Application.prototype.addEventListener = (function () {
	// taken from MDN
	if (document.addEventListener) {  
		return function (el, type, listener, useCapture) { 
			el.addEventListener(type, listener, useCapture);   
		};
	} else if (document.attachEvent)  {
		return function (el, type, listener) {
			el.attachEvent('on' + type, listener);
		};
	}  
})();

Marionette.Application.prototype.dispatch = function(element){
	if(this.requestRunning) this.xhr.abort();
	var method = element.dataset.method || element.method || 'GET';
	var url = element.dataset.url || element.action || element.href;
	
	var data = null;
	if(element.tagName.toUpperCase() == "FORM"){
		data = new FormData(element);
	}
	
	this.requestUrl = url;
	this.request(method, url, data, {
		'Accept': 'application/json;',
		'X-Requested-With', 'XMLHttpRequest'
	});
};

Marionette.Application.prototype.request = function (method, url, data, headersCollection) {
	this.xhr.open(method, url);
	if (typeof headersCollection === 'object') {
		for (var header in headers) {
			this.xhr.setRequestHeader(header, headersCollection[header]);
		}
	}
	this.xhr.send(data);
};