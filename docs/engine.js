"use strict";

Function.prototype.extends = function(parent) {
	this.prototype = Object.create(parent.prototype);
	this.prototype.constructor = this;
}

function Loader(loadItem, errorItem) {
	this.promises = [];
	this.promises.idMap = {}; // Stores indices
	this.loaded = {};
	
	this.loadItem = loadItem.bind(this);
	this.errorItem = errorItem;
}
Loader.prototype.add = function(id, data) {
	if (id in this.promises.idMap) {
		return Promise.reject("ID already exists");
	}
	
	const p = this.loadItem(id, data),
		promises = this.promises,
		loaded = this.loaded;
	
	promises.idMap[id] = promises.push(p) - 1;
	
	p.then(function(item) {
		loaded[id] = item;
	}, function(err) {
		promises.splice(promises.idMap[id], 1);
		delete promises.idMap[id];
	});
	return p;
};
Loader.prototype.load = function(id) {
	if (id) {
		const i = this.promises.idMap[id];
		if (i == null) return Promise.reject("ID not found");
		return this.promises[i];
	}
	return Promise.all(this.promises);
};
Loader.prototype.get = function(id) {
	return this.loaded[id] || this.errorItem;
};

function Engine(canvas) {
	this.canvas = canvas;
	this.g2d = canvas.getContext("2d", {alpha: false});
	
	// Contains `start`, `now`, `lastFrame`, and `delta`.
	this.time = {};
	
	this.entities = [];
	
	const errImage = new Image();
	errImage.src = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgAQMAAABJtOi3AAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAAZdEVYdFNvZnR3YXJlAHBhaW50Lm5ldCA0LjAuMTczbp9jAAAABlBMVEUAAAD/AP82/WKvAAAAFElEQVQI12NgYPj/n4GKBHVNYwAA7b0/wfSyzYsAAAAASUVORK5CYII=";
	this.textures = new Loader(function(id, url) {
		return new Promise(function(resolve, reject) {
			const img = new Image();
			img.onload = resolve.bind(null, img);
			img.onerror = reject;
			img.src = url;
		});
	}, errImage);
	
	this.frame = this.frame.bind(this);
}
Engine.prototype.load = function() {
	const e = this;
	return this.textures.load().then(function() {
		return e;
	});
};
Engine.prototype.start = function() {
	for (let i = this.entities.length - 1; i >= 0; --i) {
		const e = this.entities[i];
		if (e.start) e.start(this);
	}
	
	this.time.start = this.time.now = this.time.lastFrame =
		performance.now() / 1000;
	this.time.delta = 0;
	this.animFrameID = requestAnimationFrame(this.frame);
};
Engine.prototype.frame = function(timestamp) {
	timestamp /= 1000;
	this.time.lastFrame = this.time.now;
	this.time.now = timestamp;
	this.time.delta = this.time.now - this.time.lastFrame;
	
	this.g2d.clearRect(0, 0, this.canvas.width, this.canvas.height);
	
	for (let i = this.entities.length - 1; i >= 0; --i) {
		const e = this.entities[i];
		if (e.onframe && e.awake) e.onframe(this);
		if (e.draw && e.visible) e.draw(this.g2d, this);
	}
	
	this.animFrameID = requestAnimationFrame(this.frame);
};
Engine.prototype.addEntity = function(entity) {
	this.entities.push(entity);
	return entity;
};

function EventHub() {
	this.listeners = {};
}
EventHub.prototype.event = function(type, callback) {
	(this.listeners[type] || (this.listeners[type] = [])).push(callback);
	return this;
};
EventHub.prototype.dispatchEvent = function(type, argList) {
	const callbacks = this.listeners[type];
	if (!callbacks) return;
	for (let i = callbacks.length - 1; i >= 0; --i) {
		callbacks[i].apply(this, argList);
	}
};

function Entity(name, x, y) {
	EventHub.call(this);
	this.name = name;
	this.x = x;
	this.y = y;
	this.rotation = 0;
	this.awake = true;
	this.visible = true;
}
Entity.extends(EventHub);
Entity.prototype.onframe = function() {
	this.dispatchEvent("frame", arguments);
};

function Sprite(name, x, y, sprite) {
	Entity.call(this, name, x, y);
	this.sprite = sprite;
}
Sprite.extends(Entity);
Sprite.prototype.draw = function(g2d) {
	if (this.rotation === 0) {
		g2d.drawImage(this.sprite, this.x, this.y);
	}
	
	const xCent = this.x + this.sprite.width  / 2,
	      yCent = this.y + this.sprite.height / 2;
	
	g2d.save();
	g2d.translate(xCent, yCent);
	g2d.rotate(this.rotation);
	g2d.translate(-xCent, -yCent);
	g2d.drawImage(this.sprite, this.x, this.y);
	g2d.restore();
};
