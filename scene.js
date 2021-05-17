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
var point_light;
var light1WorldPosition, light2WorldPosition;			// Location of point lights for torus

var rotateMatrixLoc;
var curRY;
var curRZ;
var translateMatrixLoc;
var modelViewMatrixLoc;
var projectionMatrixLoc;
var gravity;
var start_velocity;
var going_up;

var aspect;


let count = 0;
var prevArrow = false;

function loadedArrow(data, _callback) {
    loadArrow(data);
    _callback();
}

function loadArrow(data){
    arrow_object = loadOBJFromBuffer(data);
    // console.log(arrow_object);
    arrow_indices = arrow_object.i_verts;
    arrow_vertices = arrow_object.c_verts;
    numVerticesInAllArrowFaces = arrow_indices.length;
    arrow_normals = getOrderedNormalsFromObj(arrow_object);
    arrow_texture_coords = getOrderedTextureCoordsFromObj(arrow_object);
    console.log(arrow_indices);
    console.log(arrow_vertices);
    console.log(arrow_normals);
    console.log(arrow_texture_coords);

    
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
                      rotateY : curRY, rotateZ : curRZ, velocityX : 0.0, velocityY : 0.0, velocityZ : 0.0, isMoving : false});
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
                obj.rotateZ = Math.min((obj.rotateZ + 2.0), 15.0);
                // obj.rotateZ = obj.rotateZ + 2.0;
            }
            else {
                obj.rotateZ = ((obj.rotateZ + 2.0) % 360.0);
            }
            curRZ = obj.rotateZ;
            // console.log(obj.rotateZ);
			break;
		case 40:  // down arrow key
            if (obj.rotateZ > 180){
                obj.rotateZ = Math.max((obj.rotateZ - 2.0), 335.0);
                // obj.rotateZ = obj.rotateZ - 2.0;
            }
            else {
                obj.rotateZ = ((((obj.rotateZ - 2.0) % 360.0) + 360.0) % 360.0);
            }
            curRZ = obj.rotateZ;
            // console.log(obj.rotateZ);
			break;
		case 37: // left arrow key
            //obj.rotateY = Math.min(obj.rotateY + 2.0, 305.0);
             obj.rotateY = obj.rotateY + 2.0;
            curRY = obj.rotateY;
            // console.log(obj.rotateY);
			break;
		case 39: // right arrow key
            obj.rotateY = Math.max(obj.rotateY - 2.0, 255.0);
            // obj.rotateY = obj.rotateY - 2.0;
            curRY = obj.rotateY;
            // console.log(obj.rotateY);
			break;
		case 32: // spacebar
            if(going_up) {
                start_velocity += 0.01;
                if(start_velocity > 250.0/1000) going_up = false;
            }
            else {
                start_velocity -= 0.01;
                if(start_velocity < 10/1000.0) going_up = true;
            }
            document.getElementById("progress").value = start_velocity*1000;
            let points = generatePoints();
            console.log(points);
			break;
		}
        // console.log(`velocityX: ${obj.velocityX}`);
        // console.log(`velocityY: ${obj.velocityY}`);
        // console.log(`velocityZ: ${obj.velocityZ}`);

}, true);

window.addEventListener("keyup", function(){
    let obj = objectArray[objectArray.length-1];
	switch(event.keyCode) {
        case 32:
            let velocity = start_velocity;
            obj.velocityX = velocity * Math.cos(Math.PI * obj.rotateY / 180.0);
            obj.velocityY = velocity * Math.sin(Math.PI * obj.rotateZ / 180.0);
            obj.velocityZ = velocity * Math.cos(Math.PI * obj.rotateZ / 180.0);
            obj.velocity = velocity;
            obj.isMoving = true;
            let d = new Date();
            let t = d.getTime();
            obj.lastRender = t;
            loadOBJFromPath("Arrow2.obj", loadArrow);
            break;
    }
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
    aspect = canvas.width / canvas.height;
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
    light1WorldPosition = 	gl.getUniformLocation( arrow_texture_shader, "light1WorldPosition");
	light2WorldPosition = 	gl.getUniformLocation( arrow_texture_shader, "light2WorldPosition");
    // curRY = 270.0;
    // curRZ = -5.0;
    gravity = 0.001;
    curRY = 270.0;
    curRZ = 0.0;
    point_light = [0, 100, 0];
    start_velocity = 0.05;
    going_up = true;
	// origin = [0, 0, 0];
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
    let direction = vec3(0.0, obj.rotateY, obj.rotateZ);
    let d = new Date();
    let elapsed = (d.getTime()-obj.lastRender)/15;
    obj.lastRender = d.getTime();
    
    if(obj.isMoving) {
            // direction = vec3(normalize(vec3(obj.velocityX, obj.velocityY, obj.velocityZ)));
            // console.log(obj.velocityX, obj.velocityY, obj.velocityZ);
            // direction[2] = 360*direction[2];
            //console.log(`${obj.rotateZ} ${obj.velocityY} ${(obj.velocityY/obj.velocity)}`);
            obj.velocity = Math.sqrt(Math.pow(obj.velocityX, 2)+Math.pow(obj.velocityY, 2)+Math.pow(obj.velocityZ, 2));
            obj.rotateZ -= elapsed * (180/Math.PI*Math.asin(0.003/obj.velocity)*Math.abs((obj.velocityY/obj.velocity)));
            //obj.velocityZ = velocity * Math.cos(Math.PI * obj.rotateZ / 180.0);

            // direction[0] = 0.0;
            // direciton[2] = obj.rotateZ
            // direction[2] = 360*direction[2];
            // console.log(direction);
    }
    let rotateMatrix = mult(rotate(obj.rotateY, 0.0, 1.0, 0.0), rotate(direction[2], 0.0, 0.0, 1.0));
    let tempMat = mult(translate(-0.25, -0.255, 0.0), rotateMatrix)
    rotateMatrix = mult(tempMat, translate(0.25, 0.255, 0.0))
    gl.uniformMatrix4fv( rotateMatrixLoc, false, flatten(rotateMatrix) );

    if (obj.isMoving){
        
        if(obj.translateY < -1.17) {
            obj.isMoving = false;
        } else {
            obj.translateX += obj.velocityX;
            obj.translateY += obj.velocityY;
            obj.translateZ += obj.velocityZ;
            obj.velocityY -= (elapsed * 1.3 * gravity);
        }
            /*
        obj.translateX += obj.velocityX;
        obj.velocityY -= 0.0005;
        obj.translateY += obj.velocityY;
        obj.translateZ += obj.velocityZ;
        obj.velocityY -= gravity;
        if(obj.translateY < -1.5) {
            obj.isMoving = false;
        }
        */
    }

    let translateMatrix = translate(obj.translateX, obj.translateY, obj.translateZ);
    gl.uniformMatrix4fv( translateMatrixLoc, false, flatten(translateMatrix) );
    gl.drawElements(gl.TRIANGLES, obj.numVerticesInAllObjFaces, gl.UNSIGNED_SHORT, 0);
}

function renderGround(){
    let ground_indices = [0, 1, 2, 1, 2, 3];
    let ground_vertices = [-2.0, -2.0, -2.0, 2.0, -2.0, -2.0, -2.0, -2.0, 20.0, 2.0, -2.0, 20.0];
    let ground_normals = [vec3(0.0, 1.0, 0.0), vec3(0.0, 1.0, 0.0), vec3(0.0, 1.0, 0.0), vec3(0.0, 1.0, 0.0)];
    let ground_texture_coords = [vec2(0.5, 0.5), vec2(0.5, 0.5), vec2(0.5, 0.5), vec2(0.5, 0.5)];
    let numVerticesInAllGroundFaces = ground_indices.length;

    iBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, iBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(ground_indices), gl.STATIC_DRAW);

    vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(ground_vertices), gl.STATIC_DRAW);

    vTexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vTexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(flatten(ground_texture_coords)), gl.STATIC_DRAW);

    vNormBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vNormBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(flatten(ground_normals)), gl.STATIC_DRAW);

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

    gl.drawElements(gl.TRIANGLES, numVerticesInAllGroundFaces, gl.UNSIGNED_SHORT, 0);
    
}

function generatePoints() {
    let obj = objectArray[0];
    let vx = start_velocity * Math.cos(Math.PI * obj.rotateY / 180.0);
    let vy = start_velocity * Math.sin(Math.PI * obj.rotateZ / 180.0);
    let vz = start_velocity * Math.cos(Math.PI * obj.rotateZ / 180.0);
    let travel_time = 2 * vy / gravity;
    let time = [0, travel_time / 3, 2 * travel_time / 3, travel_time];
    let dists = [];
    for(let i = 0; i < 4; i++) {
        let x1 = vx * time[i];
        let y1 = vy * time[i] + 1/2 * gravity * time[i]^2;
        let z1 = vz * time[i];
        dists.push(vec3(x1, y1, z1));
    }
    return dists;
}

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    

    //if (count % 500 == 0) console.log(objectArray);
    //count++;

    //let modelViewMatrix = mat4();
    //let projectionMatrix = mat4();
    var eye = vec3([-0.25, 0.255, -1.0]);
	var at = vec3([-0.25, -0.0, 0.0]);
	var up = vec3([0.0, 1.0, 0.0]);
	// modelViewMatrix = lookAt(eye, at, up);
    var modelViewMatrix = lookAt( eye, at, up );
    var scale = 1;
	// var projectionMatrix = ortho(-1.0*scale, 1.0*scale, -1.0*scale, 1.0*scale, -1.0*scale, 10.0*scale);
    var projectionMatrix = perspective(50.0, aspect, 0.1 * scale, 100 * scale);
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix));
    gl.uniformMatrix4fv(projectionMatrixLoc, false, flatten(projectionMatrix));
	gl.uniform3fv(light1WorldPosition, [0.0, 1000.0, 3000.0]);
	gl.uniform3fv(light2WorldPosition, [0.0, 0.0, 0.0]);


    gl.uniformMatrix4fv(rotateMatrixLoc, false, flatten(mat4()));
    gl.uniformMatrix4fv(translateMatrixLoc, false, flatten(mat4()));
    
    


    renderGround();

    for (let obj of objectArray){
        renderObj(obj);
    }
    requestAnimationFrame(render);
}