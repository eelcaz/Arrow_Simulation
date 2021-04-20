"use strict";

var canvas;
var gl;

function setupAfterDataLoad() {
    gl.enable(gl.DEPTH_TEST);

    render();
}

window.onload = function init() {
    canvas = document.getElementById("gl-canvas");

    gl = WebGLUtils.setupWebGL(canvas);
    if(!gl) alert("WebGL isn't available");

    gl.viewport(0, 0, canvas.width, canvas.height);
    
    gl.clearColor(1.0, 1.0, 1.0, 1.0);
}

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    requestAnimationFrame(render);
}