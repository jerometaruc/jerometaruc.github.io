
var canvas;
var gl;

var program;

var near = 1;
var far = 100;


var left = -6.0;
var right = 6.0;
var ytop =6.0;
var bottom = -6.0;


var lightPosition2 = vec4(100.0, 100.0, 100.0, 1.0 );
var lightPosition = vec4(0.0, 0.0, 100.0, 1.0 );

var lightAmbient = vec4(0.2, 0.2, 0.2, 1.0 );
var lightDiffuse = vec4( 1.0, 1.0, 1.0, 1.0 );
var lightSpecular = vec4( 1.0, 1.0, 1.0, 1.0 );

var materialAmbient = vec4( 1.0, 0.0, 1.0, 1.0 );
var materialDiffuse = vec4( 1.0, 0.8, 0.0, 1.0 );
var materialSpecular = vec4( 0.4, 0.4, 0.4, 1.0 );
var materialShininess = 30.0;

var ambientColor, diffuseColor, specularColor;

var modelMatrix, viewMatrix, modelViewMatrix, projectionMatrix, normalMatrix;
var modelViewMatrixLoc, projectionMatrixLoc, normalMatrixLoc;
var eye;
var at = vec3(0.0, 0.0, 0.0);
var up = vec3(0.0, 1.0, 0.0);

var RX = 0;
var RY = 0;
var RZ = 0;

var MS = []; // The modeling matrix stack
var TIME = 0.0; // Realtime
var dt = 0.0
var prevTime = 0.0;
var resetTimerFlag = true;
var animFlag = true;
var controller;

// These are used to store the current state of objects.
// In animation it is often useful to think of an object as having some DOF
// Then the animation is simply evolving those DOF over time. You could very easily make a higher level object that stores these as Position, Rotation (and also Scale!)
var sphereRotation = [0,0,0];
var spherePosition = [-3,0,0];

var cubeRotation = [0,0,0];
var cubePosition = [0,0,0];

var cylinderRotation = [0,0,0];
var cylinderPosition = [1.1,0,0];

var coneRotation = [0,0,0];
var conePosition = [3,0,0];

// Setting the colour which is needed during illumination of a surface
function setColor(c)
{
    ambientProduct = mult(lightAmbient, c);
    diffuseProduct = mult(lightDiffuse, c);
    specularProduct = mult(lightSpecular, materialSpecular);
    
    gl.uniform4fv( gl.getUniformLocation(program,
                                         "ambientProduct"),flatten(ambientProduct) );
    gl.uniform4fv( gl.getUniformLocation(program,
                                         "diffuseProduct"),flatten(diffuseProduct) );
    gl.uniform4fv( gl.getUniformLocation(program,
                                         "specularProduct"),flatten(specularProduct) );
    gl.uniform4fv( gl.getUniformLocation(program,
                                         "lightPosition"),flatten(lightPosition) );
    gl.uniform1f( gl.getUniformLocation(program, 
                                        "shininess"),materialShininess );
}

window.onload = function init() {

    canvas = document.getElementById( "gl-canvas" );
    
    gl = WebGLUtils.setupWebGL( canvas );
    if ( !gl ) { alert( "WebGL isn't available" ); }

    gl.viewport( 0, 0, canvas.width, canvas.height );
    gl.clearColor( 0.0, 0.0, 0.0, 1.0 );
    
    gl.enable(gl.DEPTH_TEST);

    //
    //  Load shaders and initialize attribute buffers
    //
    program = initShaders( gl, "vertex-shader", "fragment-shader" );
    gl.useProgram( program );
    

    setColor(materialDiffuse);
	
	// Initialize some shapes, note that the curved ones are procedural which allows you to parameterize how nice they look
	// Those number will correspond to how many sides are used to "estimate" a curved surface. More = smoother
    Cube.init(program);
    Cylinder.init(20,program);
    Cone.init(20,program);
    Sphere.init(36,program);

    // Matrix uniforms
    modelViewMatrixLoc = gl.getUniformLocation( program, "modelViewMatrix" );
    normalMatrixLoc = gl.getUniformLocation( program, "normalMatrix" );
    projectionMatrixLoc = gl.getUniformLocation( program, "projectionMatrix" );
    
    // Lighting Uniforms
    gl.uniform4fv( gl.getUniformLocation(program, 
       "ambientProduct"),flatten(ambientProduct) );
    gl.uniform4fv( gl.getUniformLocation(program, 
       "diffuseProduct"),flatten(diffuseProduct) );
    gl.uniform4fv( gl.getUniformLocation(program, 
       "specularProduct"),flatten(specularProduct) );	
    gl.uniform4fv( gl.getUniformLocation(program, 
       "lightPosition"),flatten(lightPosition) );
    gl.uniform1f( gl.getUniformLocation(program, 
       "shininess"),materialShininess );


    document.getElementById("animToggleButton").onclick = function() {
        if( animFlag ) {
            animFlag = false;
        }
        else {
            animFlag = true;
            resetTimerFlag = true;
            window.requestAnimFrame(render);
        }
        //console.log(animFlag);
    };
    initializeStars();
    window.requestAnimFrame(render);
}

// Sets the modelview and normal matrix in the shaders
function setMV() {
    modelViewMatrix = mult(viewMatrix,modelMatrix);
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix) );
    normalMatrix = inverseTranspose(modelViewMatrix);
    gl.uniformMatrix4fv(normalMatrixLoc, false, flatten(normalMatrix) );
}

// Sets the projection, modelview and normal matrix in the shaders
function setAllMatrices() {
    gl.uniformMatrix4fv(projectionMatrixLoc, false, flatten(projectionMatrix) );
    setMV();   
}

// Draws a 2x2x2 cube center at the origin
// Sets the modelview matrix and the normal matrix of the global program
// Sets the attributes and calls draw arrays
function drawCube() {
    setMV();
    Cube.draw();
}

// Draws a sphere centered at the origin of radius 1.0.
// Sets the modelview matrix and the normal matrix of the global program
// Sets the attributes and calls draw arrays
function drawSphere() {
    setMV();
    Sphere.draw();
}

// Draws a cylinder along z of height 1 centered at the origin
// and radius 0.5.
// Sets the modelview matrix and the normal matrix of the global program
// Sets the attributes and calls draw arrays
function drawCylinder() {
    setMV();
    Cylinder.draw();
}

// Draws a cone along z of height 1 centered at the origin
// and base radius 1.0.
// Sets the modelview matrix and the normal matrix of the global program
// Sets the attributes and calls draw arrays
function drawCone() {
    setMV();
    Cone.draw();
}

// Post multiples the modelview matrix with a translation matrix
// and replaces the modeling matrix with the result, x, y, and z are the translation amounts for each axis
function gTranslate(x,y,z) {
    modelMatrix = mult(modelMatrix,translate([x,y,z]));
}

// Post multiples the modelview matrix with a rotation matrix
// and replaces the modeling matrix with the result, theta is the rotation amount, x, y, z are the components of an axis vector (angle, axis rotations!)
function gRotate(theta,x,y,z) {
    modelMatrix = mult(modelMatrix,rotate(theta,[x,y,z]));
}

// Post multiples the modelview matrix with a scaling matrix
// and replaces the modeling matrix with the result, x, y, and z are the scale amounts for each axis
function gScale(sx,sy,sz) {
    modelMatrix = mult(modelMatrix,scale(sx,sy,sz));
}

// Pops MS and stores the result as the current modelMatrix
function gPop() {
    modelMatrix = MS.pop();
}

// pushes the current modelViewMatrix in the stack MS
function gPush() {
    MS.push(modelMatrix);
}

function animateAstronaut() {
    var astronautX = 0.5 * Math.sin(0.5 * TIME);
    var astronautY = 0.5 * Math.sin(0.5 * TIME);
    var astronautZ = 0.0;
    gTranslate(astronautX, astronautY, astronautZ);
}
 
function drawAstronaut() {
    gPush();
        gRotate(-25, 0, 1, 0);
        setColor(vec4(1.0, 1.0, 1.0, 1.0));
        drawBody();
        drawHead();
        drawArms();
        drawLegs();
    gPop();
}
 
function drawBody() {
    gPush();
        gScale(0.5, 0.8, 0.45);
        drawCube();
 
        // NASA patch
        gPush();
            gTranslate(-0.5, 0.69, 1.0);
            gScale(0.3, 0.19, 0.02);
            setColor(vec4(0.0, 0.0, 1.0, 1.0));
            drawSphere();
        gPop();
 
        // Inlets/Outlets
        gPush();
            gTranslate(0.4, 0.19, 1.0);
            gScale(0.2, 0.13, 0.2);
            setColor(vec4(0.0, 0.0, 1.0, 1.0));
            drawSphere();
        gPop();
        gPush();
            gTranslate(-0.4, 0.19, 1.0);
            gScale(0.2, 0.13, 0.2);
            setColor(vec4(0.0, 0.0, 1.0, 1.0));
            drawSphere();
        gPop();
        gPush();
            gTranslate(0.6, -0.19, 1.0);
            gScale(0.2, 0.13, 0.2);
            setColor(vec4(0.0, 1.0, 0.0, 1.0));
            drawSphere();
        gPop();
        gPush();
            gTranslate(-0.6, -0.19, 1.0);
            gScale(0.2, 0.13, 0.2);
            setColor(vec4(0.0, 1.0, 0.0, 1.0));
            drawSphere();
        gPop();
        gPush();
            gTranslate(0.4, -0.56, 1.0);
            gScale(0.2, 0.13, 0.2);
            setColor(vec4(1.0, 0.0, 0.0, 1.0));
            drawSphere();
        gPop();
        gPush();
            gTranslate(-0.4, -0.56, 1.0);
            gScale(0.2, 0.13, 0.2);
            setColor(vec4(1.0, 0.0, 0.0, 1.0));
            drawSphere();
        gPop();
    gPop();
}
 
function drawHead() {
    gPush();
        gTranslate(0, 1.25, 0);
        gScale(0.5, 0.5, 0.5);
        setColor(vec4(1, 1, 1, 1.0));
        drawSphere();

        // Visor
        gPush();
            gTranslate(0, 0, 1.0);
            gScale(0.8, 0.5, 0.25);
            setColor(vec4(1.0, 0.8, 0.0, 1.0));
            drawSphere();
        gPop();
    gPop();
}
 
function drawArms() {
    drawArm(-0.8, 1, -1);
    drawArm(0.8, 1, 1);
}
 
function drawArm(x, direction, side) {
    gPush();
        gTranslate(x, 0, 0);
        gRotate((20 * side) + 5 * Math.sin(TIME * 2) * direction, 0, 0, 1);
        gScale(0.15, 0.75, 0.15);
        setColor(vec4(1, 1, 1, 1.0));
        drawCube();
    gPop();
}
 
function drawLegs() {
    drawLeg(-0.3, 1);
    drawLeg(0.3, -1);
}

function drawLeg(x, direction) {
    gPush();
        // Upper Leg
        gTranslate(x, -1.25, 0);
        gRotate(15, 1, 0, 0); 
        gRotate(10 * Math.sin(TIME * 2) * direction, 1, 0, 0);
        gScale(0.15, 0.75, 0.15);
        drawCube();

        // Knee Joint
        gTranslate(0,-1.2,-.3);
        gRotate(60 + 10 * Math.sin(TIME * 2)* direction, 1, 0, 0);

        // Lower Leg
        gPush();
            gScale(1.0,1.2,0.5);
            drawCube();
        gPop();
        
        // Foot
        gPush();
            gTranslate(0,-1,0.3);
            gScale(1.0,0.1,0.7);
            drawCube();
        gPop();
    gPop();
}

var numStars = 100;
var stars = [];
var starSpeedX = 0.02;
var starSpeedY = 0.02;

function initializeStars() {
    for (let i = 0; i < numStars; i++) {
        let x = Math.random() * 12 - 6;
        let y = Math.random() * 12 - 6;
        let scale = Math.random() * 0.05 + 0.010;
        stars.push({x, y, scale});
    }
}

function drawStars() {
    for (let i = 0; i < numStars; i++) {
        gPush();
            gTranslate(stars[i].x, stars[i].y, -5);
            gScale(stars[i].scale, stars[i].scale, stars[i].scale);
            setColor(vec4(1, 1, 1, 1));
            drawSphere();
        gPop();
    }
}

function updateStars() {
    for (let i = 0; i < numStars; i++) {
        let star = stars[i];
        star.x += starSpeedX;
        star.y += starSpeedY;

        if (star.x > 6) {
            star.x = -6;
            star.y = Math.random() * 6 - 6;
        }

        if (star.y > 6) {
            star.y = -6;
            star.x = Math.random() * 12 - 6;
        }
    }
}

function render(timestamp) {
    
    gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    
    eye = vec3(0,0,10);
    MS = []; // Initialize modeling matrix stack
	
	// initialize the modeling matrix to identity
    modelMatrix = mat4();
    
    // set the camera matrix
    viewMatrix = lookAt(eye, at , up);
   
    // set the projection matrix
    projectionMatrix = ortho(left, right, bottom, ytop, near, far);
    
    // set all the matrices
    setAllMatrices();
    
	if( animFlag )
    {
		// dt is the change in time or delta time from the last frame to this one
		// in animation typically we have some property or degree of freedom we want to evolve over time
		// For example imagine x is the position of a thing.
		// To get the new position of a thing we do something called integration
		// the simpelst form of this looks like:
		// x_new = x + v*dt
		// That is, the new position equals the current position + the rate of of change of that position (often a velocity or speed) times the change in time
		// We can do this with angles or positions, the whole x,y,z position, or just one dimension. It is up to us!
		dt = (timestamp - prevTime) / 1000.0;
		prevTime = timestamp;
        TIME += dt;
	}

    gPush();
    {
        animateAstronaut();
        drawAstronaut();
    }
    gPop();

    drawStars();
    updateStars();
    
    if( animFlag )
        window.requestAnimFrame(render);
}
