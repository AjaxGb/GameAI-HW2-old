"use strict";

const engine = new Engine(document.getElementById("canvas"));

engine.textures.add("red", "textures/red.png");
engine.load().then(function(e) {
	e.addEntity(
		new Sprite("red", 20, 20, e.textures.get("red"))
	).event("frame", function(e) {
		this.x += 50 * e.time.delta;
	});
});

engine.start();
