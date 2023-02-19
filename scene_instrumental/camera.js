var createScene = function () {
    var scene = new BABYLON.Scene(engine);

    var light = new BABYLON.DirectionalLight("Omni", new BABYLON.Vector3(-2, -5, 2), scene);

    //Add the camera, to be shown as a cone and surrounding collision volume
    var camera = new BABYLON.UniversalCamera("MyCamera", new BABYLON.Vector3(0, 1, 0), scene);
    camera.minZ = 0.0001;
    camera.attachControl(canvas, true);
    camera.speed = 0.02;
    camera.angularSpeed = 0.05;
    camera.angle = Math.PI/2;
    camera.direction = new BABYLON.Vector3(Math.cos(camera.angle), 0, Math.sin(camera.angle));
    
    //Add viewCamera that gives first person shooter view
    var viewCamera = new BABYLON.UniversalCamera("viewCamera", new BABYLON.Vector3(0, 3, -3), scene);
    viewCamera.parent = camera;
    viewCamera.setTarget(new BABYLON.Vector3(0, -0.0001, 1));
    
    //Activate both cameras
    scene.activeCameras.push(viewCamera);
    scene.activeCameras.push(camera);

    //Add two viewports
    camera.viewport = new BABYLON.Viewport(0, 0.5, 1.0, 0.5);
    viewCamera.viewport = new BABYLON.Viewport(0, 0, 1.0, 0.5);  
    
    //Dummy camera as cone
    var cone = BABYLON.MeshBuilder.CreateCylinder("dummyCamera", {diameterTop:0.01, diameterBottom:0.2, height:0.2}, scene);
    cone.parent = camera;
    cone.rotation.x = Math.PI/2;


    //Gravity and Collisions Enabled
    scene.gravity = new BABYLON.Vector3(0, -0.9, 0);
    scene.collisionsEnabled = true;

    camera.checkCollisions = true;
    camera.applyGravity = true;

    ground.checkCollisions = true;
    lowerGround.checkCollisions = true;

    camera.ellipsoid = new BABYLON.Vector3(0.5, 1, 0.5);
    camera.ellipsoidOffset = new BABYLON.Vector3(0, 1, 0); 

    //Create Visible Ellipsoid around camera
    var a = 0.5;
    var b = 1;
    var points = [];
    for(var theta = -Math.PI/2; theta < Math.PI/2; theta += Math.PI/36) {
        points.push(new BABYLON.Vector3(0, b * Math.sin(theta), a * Math.cos(theta)));
    }

    var ellipse = [];
    ellipse[0] = BABYLON.MeshBuilder.CreateLines("e", {points:points}, scene);
    ellipse[0].color = BABYLON.Color3.Red();
    ellipse[0].parent = camera;
    ellipse[0].rotation.y = 5 * Math.PI/ 16;
    for(var i = 1; i < 23; i++) {
            ellipse[i] = ellipse[0].clone("el" + i);
            ellipse[i].parent = camera;
            ellipse[i].rotation.y = 5 * Math.PI/ 16 + i * Math.PI/16;
    }
    
    /* New Input Management for Camera
    __________________________________*/
    
    //First remove the default management.
    camera.inputs.removeByType("FreeCameraKeyboardMoveInput");
    camera.inputs.removeByType("FreeCameraMouseInput");
     
    //Key Input Manager To Use Keys to Move Forward and BackWard and Look to the Left or Right
    var FreeCameraKeyboardWalkInput = function () {
        this._keys = [];
        this.keysUp = [38];
        this.keysDown = [40];
        this.keysLeft = [37];
        this.keysRight = [39];
    }
    
    //Add attachment controls
    FreeCameraKeyboardWalkInput.prototype.attachControl = function (noPreventDefault) {
            var _this = this;
            var engine = this.camera.getEngine();
            var element = engine.getInputElement();
            if (!this._onKeyDown) {
                element.tabIndex = 1;
                this._onKeyDown = function (evt) {                 
                    if (_this.keysUp.indexOf(evt.keyCode) !== -1 ||
                        _this.keysDown.indexOf(evt.keyCode) !== -1 ||
                        _this.keysLeft.indexOf(evt.keyCode) !== -1 ||
                        _this.keysRight.indexOf(evt.keyCode) !== -1) {
                        var index = _this._keys.indexOf(evt.keyCode);
                        if (index === -1) {
                            _this._keys.push(evt.keyCode);
                        }
                        if (!noPreventDefault) {
                            evt.preventDefault();
                        }
                    }
                };
                this._onKeyUp = function (evt) {
                    if (_this.keysUp.indexOf(evt.keyCode) !== -1 ||
                        _this.keysDown.indexOf(evt.keyCode) !== -1 ||
                        _this.keysLeft.indexOf(evt.keyCode) !== -1 ||
                        _this.keysRight.indexOf(evt.keyCode) !== -1) {
                        var index = _this._keys.indexOf(evt.keyCode);
                        if (index >= 0) {
                            _this._keys.splice(index, 1);
                        }
                        if (!noPreventDefault) {
                            evt.preventDefault();
                        }
                    }
                };
                element.addEventListener("keydown", this._onKeyDown, false);
                element.addEventListener("keyup", this._onKeyUp, false);
            }
        };


        //Add detachment controls
        FreeCameraKeyboardWalkInput.prototype.detachControl = function () {
            var engine = this.camera.getEngine();
            var element = engine.getInputElement();
            if (this._onKeyDown) {
                element.removeEventListener("keydown", this._onKeyDown);
                element.removeEventListener("keyup", this._onKeyUp);
                BABYLON.Tools.UnregisterTopRootEvents(canvas, [
                    { name: "blur", handler: this._onLostFocus }
                ]);
                this._keys = [];
                this._onKeyDown = null;
                this._onKeyUp = null;
            }
        };

        //Keys movement control by checking inputs
        FreeCameraKeyboardWalkInput.prototype.checkInputs = function () {
            if (this._onKeyDown) {
                var camera = this.camera;
                for (var index = 0; index < this._keys.length; index++) {
                    var keyCode = this._keys[index];
                    var speed = camera.speed;
                    if (this.keysLeft.indexOf(keyCode) !== -1) {
                        camera.rotation.y -= camera.angularSpeed;
                        camera.direction.copyFromFloats(0, 0, 0);                
                    }
                    else if (this.keysUp.indexOf(keyCode) !== -1) {
                        camera.direction.copyFromFloats(0, 0, speed);               
                    }
                    else if (this.keysRight.indexOf(keyCode) !== -1) {
                        camera.rotation.y += camera.angularSpeed;
                        camera.direction.copyFromFloats(0, 0, 0);
                    }
                    else if (this.keysDown.indexOf(keyCode) !== -1) {
                        camera.direction.copyFromFloats(0, 0, -speed);
                    }
                    if (camera.getScene().useRightHandedSystem) {
                        camera.direction.z *= -1;
                    }
                    camera.getViewMatrix().invertToRef(camera._cameraTransformMatrix);
                    BABYLON.Vector3.TransformNormalToRef(camera.direction, camera._cameraTransformMatrix, camera._transformedDirection);
                    camera.cameraDirection.addInPlace(camera._transformedDirection);
                }
            }
        };

        //Add the onLostFocus function
        FreeCameraKeyboardWalkInput.prototype._onLostFocus = function (e) {
            this._keys = [];
        };
        
        //Add the two required functions for the control Name
        FreeCameraKeyboardWalkInput.prototype.getClassName = function () {
            return "FreeCameraKeyboardWalkInput";
        };

        FreeCameraKeyboardWalkInput.prototype.getSimpleName = function () {
            return "keyboard";
        };
    
    //Add the new keys input manager to the camera.
     camera.inputs.add(new FreeCameraKeyboardWalkInput());



    //The Mouse Manager to use the mouse (touch) to search around including above and below
    var FreeCameraSearchInput = function (touchEnabled) {
        if (touchEnabled === void 0) { touchEnabled = true; }
        this.touchEnabled = touchEnabled;
        this.buttons = [0, 1, 2];
        this.angularSensibility = 2000.0;
        this.restrictionX = 100;
        this.restrictionY = 60;
    }

    //add attachment control which also contains the code to react to the input from the mouse 
    FreeCameraSearchInput.prototype.attachControl = function (noPreventDefault) {
        var _this = this;
        var engine = this.camera.getEngine();
        var element = engine.getInputElement();
        var angle = {x:0, y:0};
        if (!this._pointerInput) {
            this._pointerInput = function (p, s) {
                var evt = p.event;
                if (!_this.touchEnabled && evt.pointerType === "touch") {
                    return;
                }
                if (p.type !== BABYLON.PointerEventTypes.POINTERMOVE && _this.buttons.indexOf(evt.button) === -1) {          
                    return;
                }
                if (p.type === BABYLON.PointerEventTypes.POINTERDOWN) {          
                    try {
                        evt.srcElement.setPointerCapture(evt.pointerId);
                    }
                    catch (e) {
                        //Nothing to do with the error. Execution will continue.
                    }
                    _this.previousPosition = {
                        x: evt.clientX,
                        y: evt.clientY
                    };
                    if (!noPreventDefault) {
                        evt.preventDefault();
                        element.focus();
                    }
                }
                else if (p.type === BABYLON.PointerEventTypes.POINTERUP) {          
                    try {
                        evt.srcElement.releasePointerCapture(evt.pointerId);
                    }
                    catch (e) {
                        //Nothing to do with the error.
                    }
                    _this.previousPosition = null;
                    if (!noPreventDefault) {
                        evt.preventDefault();
                    }
                }
                else if (p.type === BABYLON.PointerEventTypes.POINTERMOVE) {            
                    if (!_this.previousPosition || engine.isPointerLock) {
                        return;
                    }
                    var offsetX = evt.clientX - _this.previousPosition.x;
                    var offsetY = evt.clientY - _this.previousPosition.y;                   
                    angle.x +=offsetX;
                    angle.y -=offsetY;  
                    if(Math.abs(angle.x) > _this.restrictionX )  {
                        angle.x -=offsetX;
                    }
                    if(Math.abs(angle.y) > _this.restrictionY )  {
                        angle.y +=offsetY;
                    }       
                    if (_this.camera.getScene().useRightHandedSystem) {
                        if(Math.abs(angle.x) < _this.restrictionX )  {
                            _this.camera.cameraRotation.y -= offsetX / _this.angularSensibility;
                        }
                    }
                    else {
                        if(Math.abs(angle.x) < _this.restrictionX )  {
                            _this.camera.cameraRotation.y += offsetX / _this.angularSensibility;
                        }
                    }
                    if(Math.abs(angle.y) < _this.restrictionY )  {
                        _this.camera.cameraRotation.x += offsetY / _this.angularSensibility;
                    }
                    _this.previousPosition = {
                        x: evt.clientX,
                        y: evt.clientY
                    };
                    if (!noPreventDefault) {
                        evt.preventDefault();
                    }
                }
            };
        }
        this._onSearchMove = function (evt) {       
            if (!engine.isPointerLock) {
                return;
            }       
            var offsetX = evt.movementX || evt.mozMovementX || evt.webkitMovementX || evt.msMovementX || 0;
            var offsetY = evt.movementY || evt.mozMovementY || evt.webkitMovementY || evt.msMovementY || 0;
            if (_this.camera.getScene().useRightHandedSystem) {
                _this.camera.cameraRotation.y -= offsetX / _this.angularSensibility;
            }
            else {
                _this.camera.cameraRotation.y += offsetX / _this.angularSensibility;
            }
            _this.camera.cameraRotation.x += offsetY / _this.angularSensibility;
            _this.previousPosition = null;
            if (!noPreventDefault) {
                evt.preventDefault();
            }
        };
        this._observer = this.camera.getScene().onPointerObservable.add(this._pointerInput, BABYLON.PointerEventTypes.POINTERDOWN | BABYLON.PointerEventTypes.POINTERUP | BABYLON.PointerEventTypes.POINTERMOVE);
        element.addEventListener("mousemove", this._onSearchMove, false);
    };

    //Add detachment control
    FreeCameraSearchInput.prototype.detachControl = function () {
        var engine = this.camera.getEngine();
        var element = engine.getInputElement();
        if (this._observer && element) {
            this.camera.getScene().onPointerObservable.remove(this._observer);
            element.removeEventListener("mousemove", this._onSearchMove);
            this._observer = null;
            this._onSearchMove = null;
            this.previousPosition = null;
        }
    };

    //Add the two required functions for names
    FreeCameraSearchInput.prototype.getClassName = function () {
        return "FreeCameraSearchInput";
    };

    FreeCameraSearchInput.prototype.getSimpleName = function () {
        return "MouseSearchCamera";
    };

    //Add the new mouse input manager to the camera
    camera.inputs.add(new FreeCameraSearchInput());

    

    return scene;
}