"use strict";

var canvas;
var gl;
var arrow_texture_shader;

var numVerticesInAllArrowFaces;
var arrow_texture;
var arrow_indices;
var arrow_vertices;
var arrow_object;
var arrow_normals;
var arrow_texture_coords;

var vBuffer;
var vPosition;
var vTexBuffer;
var vTexCoord;
var iBuffer;
var vNormBuffer;
var vNorm;

function loadedArrow(data, _callback) {
    arrow_object = loadOBJFromBuffer(data);
    console.log(arrow_object);
    arrow_indices = arrow_object.i_verts;
    arrow_vertices = arrow_object.c_verts;
    numVerticesInAllArrowFaces = arrow_indices.length;
    arrow_normals = getOrderedNormalsFromObj(arrow_object);
    arrow_texture_coords = getOrderedTextureCoordsFromObj(arrow_object);
    _callback();
}

// Properly orders the normals from the OBJ file.
function getOrderedNormalsFromObj(obj_object) {

	var normalsOrderedWithVertices = [];
	var i_norms = obj_object['i_norms'];
	var c_norms = obj_object['c_norms'];
	var i_verts = obj_object['i_verts'];

	for (let i = 0; i < i_verts.length; i++) {
		let cur_i_vert = i_verts[i];
		let norms_i = 3 * i_norms[i];
		normalsOrderedWithVertices[cur_i_vert] = vec3(c_norms[norms_i], c_norms[norms_i + 1], c_norms[norms_i + 2]);
	}

	return normalsOrderedWithVertices;
}

// Properly orders the texture coordinates from the OBJ file.
function getOrderedTextureCoordsFromObj(obj_object) {

	var i_uvt = obj_object['i_uvt'];
	var c_uvt = obj_object['c_uvt'];
	var i_verts = obj_object['i_verts'];
	var texCoordsOrderedWithVertices = [];

	for (let i = 0; i < i_verts.length; i++) {
		let cur_i_vert = i_verts[i];
		let tex_i = 2 * i_uvt[i];
		texCoordsOrderedWithVertices[cur_i_vert] = vec2(c_uvt[tex_i], c_uvt[tex_i + 1]);
	}

	return texCoordsOrderedWithVertices;
}



// Configures initial texture setup.
function configureTexture(image) {
	var texture = gl.createTexture();
    /*
	gl.bindTexture(gl.TEXTURE_2D, texture);
	gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB,
		gl.RGB, gl.UNSIGNED_BYTE, image);
	gl.generateMipmap(gl.TEXTURE_2D);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER,
		gl.NEAREST_MIPMAP_LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    */
	return texture;
}

function setupAfterDataLoad() {
    gl.enable(gl.DEPTH_TEST);

    setupArrowShaderBuffers();
    gl.useProgram(arrow_texture_shader);
    var image = document.getElementById("arrow_texture");
    gl.activeTexture(gl.TEXTURE0);
    arrow_texture = configureTexture(image);
    gl.uniform1i(gl.getUniformLocation(arrow_texture_shader, "texture"), 0);

    render();
}

window.onload = function init() {
    canvas = document.getElementById("gl-canvas");

    gl = WebGLUtils.setupWebGL(canvas);
    if(!gl) alert("WebGL isn't available");

    gl.viewport(0, 0, canvas.width, canvas.height);
    
    gl.clearColor(1.0, 1.0, 1.0, 1.0);

    loadOBJFromPath("Arrow2.obj", loadedArrow, setupAfterDataLoad);
}

function setupArrowShaderBuffers() {
    arrow_texture_shader = initShaders(gl, "arrow-vertex-shader", "arrow-fragment-shader");
    gl.useProgram(arrow_texture_shader);

    iBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, iBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(arrow_indices), gl.STATIC_DRAW);

    vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(arrow_vertices), gl.STATIC_DRAW);

    vTexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vTexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(flatten(arrow_texture_coords)), gl.STATIC_DRAW);

    vNormBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vNormBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(flatten(arrow_normals)), gl.STATIC_DRAW);

    vPosition = gl.getAttribLocation(arrow_texture_shader, "vPosition");
    vTexCoord = gl.getAttribLocation(arrow_texture_shader, "vTexCoord");
    vNorm = gl.getAttribLocation(arrow_texture_shader, "vNorm");

}

function renderArrow() {
    gl.useProgram(arrow_texture_shader);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, iBuffer);

    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.vertexAttribPointer(vPosition, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    gl.bindBuffer(gl.ARRAY_BUFFER, vTexBuffer);
    gl.vertexAttribPointer(vTexCoord, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vTexCoord);

    gl.bindBuffer(gl.ARRAY_BUFFER, vNormBuffer);
    gl.vertexAttribPointer(vNorm, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vNorm);

    gl.drawElements(gl.TRIANGLES, numVerticesInAllArrowFaces, gl.UNSIGNED_SHORT, 0);
}

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    renderArrow();

    requestAnimationFrame(render);
}