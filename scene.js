"use strict";

var canvas;
var gl;
var arrow_texture_shader;

var objectArray = [];
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

var rotateMatrixLoc;
var translateMatrixLoc;
var modelViewMatrixLoc;
var projectionMatrixLoc;


let count = 0;

function loadedArrow(data, _callback) {
    loadArrow(data);
    _callback();
}

function loadArrow(data){
    arrow_object = loadOBJFromBuffer(data);
    console.log(arrow_object);
    arrow_indices = arrow_object.i_verts;
    arrow_vertices = arrow_object.c_verts;
    numVerticesInAllArrowFaces = arrow_indices.length;
    arrow_normals = getOrderedNormalsFromObj(arrow_object);
    arrow_texture_coords = getOrderedTextureCoordsFromObj(arrow_object);

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

    objectArray.push({iBuffer, vBuffer, vTexBuffer, vNormBuffer, 
                      numVerticesInAllObjFaces : numVerticesInAllArrowFaces, translateX : 0.0, translateY : 0.0, translateZ : 0.0,
                      rotateY : 270.0, rotateZ : 20.0, velocityX : 0.0, velocityY : 0.0, velocityZ : 0.0, isMoving : false});
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
    
	gl.bindTexture(gl.TEXTURE_2D, texture);
	gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB,
		gl.RGB, gl.UNSIGNED_BYTE, image);
	gl.generateMipmap(gl.TEXTURE_2D);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER,
		gl.NEAREST_MIPMAP_LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    
	return texture;
}

window.addEventListener("keydown", function(){
    let obj = objectArray[objectArray.length-1];
	switch(event.keyCode) {
		case 38:  // up arrow key
            if (obj.rotateZ < 180.0) {
                obj.rotateZ = Math.min((obj.rotateZ + 2.0), 50.0);
            }
            else {
                obj.rotateZ = ((obj.rotateZ + 2.0) % 360.0);
            }
            console.log(obj.rotateZ);
			break;
		case 40:  // down arrow key
            if (obj.rotateZ > 180){
                obj.rotateZ = Math.max((obj.rotateZ - 2.0), 340.0);
            }
            else {
                obj.rotateZ = ((((obj.rotateZ - 2.0) % 360.0) + 360.0) % 360.0);
            }
            console.log(obj.rotateZ);
			break;
		case 37: // left arrow key
            obj.rotateY = Math.max(obj.rotateY - 2.0, 240.0);
            console.log(obj.rotateY);
			break;
		case 39: // right arrow key
            obj.rotateY = Math.min(obj.rotateY + 2.0, 300.0);
            console.log(obj.rotateY);
			break;
		case 32: // spacebar
            let velocity = 0.05;
            obj.velocityX = velocity * Math.cos(Math.PI * obj.rotateY / 180.0);
            obj.velocityY = velocity * Math.sin(Math.PI * obj.rotateZ / 180.0);
            obj.velocityZ = velocity * Math.cos(Math.PI * obj.rotateZ / 180.0);
            
            obj.isMoving = true;
            loadOBJFromPath("Arrow2.obj", loadArrow);
			break;
		}
        console.log(`velocityX: ${obj.velocityX}`);
        console.log(`velocityY: ${obj.velocityY}`);
        console.log(`velocityZ: ${obj.velocityZ}`);

}, true);

function setupAfterDataLoad() {
    gl.enable(gl.DEPTH_TEST);

    var image = document.getElementById("arrow_image");
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

    arrow_texture_shader = initShaders(gl, "arrow-vertex-shader", "arrow-fragment-shader");
    gl.useProgram(arrow_texture_shader);

    vPosition = gl.getAttribLocation(arrow_texture_shader, "vPosition");
    vTexCoord = gl.getAttribLocation(arrow_texture_shader, "vTexCoord");
    vNorm = gl.getAttribLocation(arrow_texture_shader, "vNorm");

    rotateMatrixLoc = gl.getUniformLocation( arrow_texture_shader, "rotateMatrix" );
    translateMatrixLoc = gl.getUniformLocation( arrow_texture_shader, "translateMatrix" );
    modelViewMatrixLoc = gl.getUniformLocation( arrow_texture_shader, "modelViewMatrix" );
    projectionMatrixLoc = gl.getUniformLocation( arrow_texture_shader, "projectionMatrix" );
    loadOBJFromPath("Arrow2.obj", loadedArrow, setupAfterDataLoad);
}

function renderObj(obj) {
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, obj.iBuffer);

    gl.bindBuffer(gl.ARRAY_BUFFER, obj.vBuffer);
    gl.vertexAttribPointer(vPosition, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    gl.bindBuffer(gl.ARRAY_BUFFER, obj.vTexBuffer);
    gl.vertexAttribPointer(vTexCoord, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vTexCoord);

    gl.bindBuffer(gl.ARRAY_BUFFER, obj.vNormBuffer);
    gl.vertexAttribPointer(vNorm, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vNorm);

    let rotateMatrix = mult(rotate(obj.rotateY, 0.0, 1.0, 0.0), rotate(obj.rotateZ, 0.0, 0.0, 1.0));
    gl.uniformMatrix4fv( rotateMatrixLoc, false, flatten(rotateMatrix) );

    if (obj.isMoving){
        obj.translateX += obj.velocityX;
        obj.translateY += obj.velocityY;
        obj.translateZ += obj.velocityZ;

        let translateMatrix = translate(obj.translateX, obj.translateY, obj.translateZ);
        gl.uniformMatrix4fv( translateMatrixLoc, false, flatten(translateMatrix) );
    }
    else {
        //gl.uniformMatrix4fv( translateMatrixLoc, false, flatten(mat4()));
        gl.uniformMatrix4fv( translateMatrixLoc, false, flatten(translate(0.0,0.0,0.0)));
    }

    let modelViewMatrix = mat4();
    let projectionMatrix = mat4();
    //let modelViewMatrix = lookAt( eye, at, up );
    //var scale = 1;
	//let projectionMatrix = ortho(-1.0*scale, 1.0*scale, -1.0*scale, 1.0*scale, -1.0*scale, 1.0*scale);
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix));
    gl.uniformMatrix4fv(projectionMatrixLoc, false, flatten(projectionMatrix));

    gl.drawElements(gl.TRIANGLES, obj.numVerticesInAllObjFaces, gl.UNSIGNED_SHORT, 0);
}

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    if (count % 500 == 0) console.log(objectArray);
    count++;
    for (let obj of objectArray){
        renderObj(obj);
    }

    requestAnimationFrame(render);
}