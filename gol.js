let gol_app = angular.module('gol',[]);
gol_app.controller('golCtrl',function($scope){
	'use strict';

	$scope.init = {
		pop:0,
		width:0,
		height:0,
		size:1
	};

	let utility = {
		randomInt : function(min,max){
			return Math.floor(Math.random() * (max-min+1)) + min;
		}
	}

	let canvas_active = false;

	let going = null; // used to hold interval object



	let view = function(){

		let setCanvasRes = function() {
			canvas.setAttribute('width', canvas.clientWidth + 'px');
			canvas.setAttribute('height', canvas.clientHeight + 'px');
			gl.viewport(0, 0, canvas.width, canvas.height);
		}

		let initShaderProgram = function(gl, vsSource, fsSource) {
			const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
			const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);

			const shaderProgram = gl.createProgram();
			gl.attachShader(shaderProgram, vertexShader);
			gl.attachShader(shaderProgram, fragmentShader);
			gl.linkProgram(shaderProgram);

			// fail-safe
			if(!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
				alert('Shader program could not be initialized. This application will likely fail');
				return null;
			}

			return shaderProgram;
		}

		let loadShader = function(gl, type, source){
			const shader = gl.createShader(type);

			gl.shaderSource(shader, source);

			gl.compileShader(shader);

			// fail-safe
			if(!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
				alert('Shader could not be compiled. This application will likely fail');
				gl.deleteShader(shader);
				return null;
			}

			return shader;
		}

		let drawScene = function(gl, programInfo, buffers) {
			gl.clearColor(1.0, 1.0, 1.0, 1.0); // clear white
			gl.clearDepth(1.0); // clear all
			gl.enable(gl.DEPTH_TEST);
			gl.depthFunc(gl.LEQUAL); // near obscure far

			gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

			const fieldOfView = 45 * Math.PI / 180;
			const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
			const zNear = 0.1;
			const zFar = 10000.0;
			const projectionMatrix = mat4.create();

			mat4.perspective(projectionMatrix,
											 fieldOfView,
											 aspect,
											 zNear,
											 zFar);

			const modelViewMatrix = mat4.create();

			mat4.translate(modelViewMatrix,
										 modelViewMatrix,
										 [translate.x , -translate.y , -scale]);

			{
				const numComponents = 2; // 2 vals per iter
				const type = gl.FLOAT; // 32bit floats in buffer
				const normalize = false;
				const stride = 0; // bytes to get from one set to the next, 0 -> use type and numComponents above

				const offset = 0;
				gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
				gl.vertexAttribPointer(
					programInfo.attribLocations.vertexPosition,
					numComponents,
					type,
					normalize,
					stride,
					offset);
				gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);
			}

			gl.useProgram(programInfo.program);

			gl.uniformMatrix4fv(programInfo.uniformLocations.projectionMatrix,false,projectionMatrix);
			gl.uniformMatrix4fv(programInfo.uniformLocations.modelViewMatrix,false,modelViewMatrix)

			{
				const offset = 0;
				const vertexCount = buffers.vertexCount;
				gl.drawArrays(gl.TRIANGLES, offset, vertexCount);
			}
		}

		let initBuffers = function(gl){
			const positionBuffer = gl.createBuffer();

			gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

			const positions = [

			];

			gl.bufferData(gl.ARRAY_BUFFER,
										new Float32Array(positions),
										gl.DYNAMIC_DRAW);

			return {
				position: positionBuffer,
				vertexCount: 0,
			};
		}


		// start 'main'
		const canvas = document.getElementById('gol');
		const gl = canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

		if(!gl){
			alert('WebGL could not be initialized. Your browser may not support WebGL, please use a modern browser if possible.');
			return null;
		}

		gl.clearColor(1.0, 1.0, 1.0, 1.0);
		gl.clear(gl.COLOR_BUFFER_BIT);

		// Vertex shader
	  const vsSource = `
			attribute vec4 aVertexPosition;

			uniform mat4 uModelViewMatrix;
			uniform mat4 uProjectionMatrix;

			void main() {
				gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
			}
		`;

		// Fragment shader
		const fsSource = `
			void main() {
				gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
			}
		`;

		const shaderProgram = initShaderProgram(gl, vsSource, fsSource);

		const programInfo = {
			program: shaderProgram,
			attribLocations: {
				vertexPosition: gl.getAttribLocation(shaderProgram, 'aVertexPosition'),
			},
			uniformLocations: {
				projectionMatrix: gl.getUniformLocation(shaderProgram, 'uProjectionMatrix'),
				modelViewMatrix: gl.getUniformLocation(shaderProgram, 'uModelViewMatrix'),
			},
		};

		let buffers = initBuffers(gl);

		let scale = 1.0;
		let translate = {x:0,y:0};

		return {
			clear:function(){
				// control.save();
				// control.setTransform(1, 0, 0, 1, 0, 0);
				// control.clearRect(0, 0, canvas.width, canvas.height);
				// control.restore();
			},
			drawWorld:function(active_cells){

				let positions = [];

				active_cells.forEach(function(cell){
					Array.prototype.push.apply(positions,[cell.x, cell.y,
																								cell.x + 1.0, cell.y,
																								cell.x, cell.y + 1.0,
																							 	cell.x, cell.y + 1.0,
																								cell.x + 1.0, cell.y,
																								cell.x + 1.0, cell.y + 1.0]);
				});

				gl.bufferData(gl.ARRAY_BUFFER,
											new Float32Array(positions),
											gl.DYNAMIC_DRAW);

				buffers.vertexCount = active_cells.length * 6;

				drawScene(gl, programInfo, buffers);
			},
			reset:function(){
				setCanvasRes();
				translate = {x:0,y:0};
				scale = $scope.init.size;
				// view.translate(window.innerWidth/(2 / $scope.init.size), window.innerHeight/(2 / $scope.init.size));
			},
			translate:function(x,y){
				translate.x += x;
				translate.y += y;
				// let changeX = x/scale;
				// let changeY = y/scale;
				// translate.x += changeX;
				// translate.y += changeY;
				// control.translate(changeX,changeY);
			},
			// DEPRACATED as of WebGL implementation, might be useful again at some point though
			updateWorld:function(b_and_d){
				drawScene(gl, programInfo, buffers);
				// control.beginPath();
				// b_and_d.births.forEach(function(cell){
				// 	control.rect(cell.x + 0.075,cell.y + 0.075,0.85,0.85);
				// });
				// control.fillStyle="black";
				// control.fill();
        //
				// control.beginPath();
				// b_and_d.deaths.forEach(function(cell){
				// 	control.rect(cell.x, cell.y, 1, 1);
				// });
				// control.fillStyle="white";
				// control.fill();
			},
			zoom:function(s,x,y){
				scale += s;
				// control.translate(-translate.x, -translate.y);
				// control.scale(s,s);
				// translate.x /= s;
				// translate.y /= s;
				// let prev_scale = scale;
				// scale *= s;
				// control.translate(translate.x + ((x/scale) - (x/prev_scale)), translate.y + ((y/scale) - (y/prev_scale)));
				// translate.x += ((x/scale) - (x/prev_scale));
				// translate.y += ((y/scale) - (y/prev_scale));
			}
		};
	}();

	window.addEventListener('resize',function(){
		view.reset();
	});

	let world = function(){
		let world_data = new ArrayBuffer(1000000);
		let cells = new Int8Array(world_data);

		let masks = {
			on:1,
			neighbors: 7 << 1
		}

		let cells_of_interest = [];

		let cell_id = function(){
			let x_reg = /x(.*)y/;
			let y_reg = /.*y(.*)/;
			return {
				create:function(x,y){
					return 'x' + x + 'y' + y;
				},
				decode:function(id){
					let x_srch = x_reg.exec(id);
					let y_srch = y_reg.exec(id);
					return x_srch && y_srch ? {x:parseInt(x_srch[1]),y:parseInt(y_srch[1])} : null;
				}
			}
		}();

		let positions = {
			all:[
				{x:-1,y:1},
				{x:0,y:1},
				{x:1,y:1},
				{x:-1,y:0},
				{x:1,y:0},
				{x:-1,y:-1},
				{x:0,y:-1},
				{x:1,y:-1}
			],
			pre:[
				{x:-1,y:1},
				{x:0,y:1},
				{x:1,y:1},
				{x:-1,y:0}
			],
			post:[
				{x:1,y:0},
				{x:-1,y:-1},
				{x:0,y:-1},
				{x:1,y:-1}
			]
		}

		let next_states = null;
		// populate next_states
		{
			next_states = new Map();
			for(let i = 0 ; i < 512 ; i++){
				let place_finder = i;
				let neighbors = 0;
				let status = null;
				let position = 1;
				while(position < 5){
					neighbors += (place_finder & 1);
					place_finder = place_finder >>> 1;
					position += 1;
				}
				status = (place_finder & 1);
				place_finder = place_finder >>> 1;
				position += 1;
				while(position < 10){
					neighbors += (place_finder & 1);
					place_finder = place_finder >>> 1;
					position += 1;
				}
				if((status === 1 && [2,3].includes(neighbors)) ||
					 (status === 0 && neighbors === 3)){
					next_states.set(i,1);
				} else {
					next_states.set(i,0);
				}
			}
		};

		let live_nums = new Set([5,6,7]);

		let getCell = function(x,y){
			let val = cells[(x + 500) + ((y + 500) * 1000)];
			return val !== undefined ? val : 0;
		}



		return {
			advanceTime:function(){
				let temp_data = world_data.slice(0);
				let temp_cells = new Int8Array(temp_data);
				for(let ii = 0 ; ii < 1000 ; ii++){
					for(let jj = 0 ; jj < 1000 ; jj++){
						let cell_val = getCell(ii - 500, jj - 500);
						if(cell_val === 0){
							continue;
						}
						if(((cell_val % 2) === 1) && ((cell_val !== 5) && (cell_val !== 7))){
							temp_cells[ii + (jj * 1000)] = temp_cells[ii + (jj * 1000)] - 1;
							positions.all.forEach(function(pos){
								if(temp_cells[ii + pos.x + ((jj + pos.y) * 1000)] !== undefined){
									temp_cells[ii + pos.x + ((jj + pos.y) * 1000)] -= 2;
								}
							});
						} else if(cell_val === 6){
							temp_cells[ii + (jj * 1000)] = temp_cells[ii + (jj * 1000)] + 1;
							positions.all.forEach(function(pos){
								if(temp_cells[ii + pos.x + ((jj + pos.y) * 1000)] !== undefined){
									temp_cells[ii + pos.x + ((jj + pos.y) * 1000)] += 2;
								}
							});
						}
					}
				}
				cells = temp_cells;
				world_data = temp_data;
			},
			getActiveCells:function(){
				return Array.from(cells).map(function(val,index){
					return (val % 2) === 1 ? {x:(index % 1000) - 500, y:(Math.floor(index / 1000)) - 500} : null;
				}).filter(function(val){return val !== null;});
			},
			randomize:function(width,height,n) {
				for(let i = 0 ; i < n ; i++){
					world.setCell(utility.randomInt(-width,width),utility.randomInt(-height,height),1);
				}
			},
			reset:function(){
				world_data = new ArrayBuffer(1000000);
				cells = new Int8Array(world_data);
			},
			setCell:function(x,y,active) {
				let index = x+500 + ((y + 500) * 1000);
				let cell_val = cells[index];
				if(cell_val !== undefined){
					if((cell_val & 1) !== active){
						if(active === 1){
							cells[index]++;
							positions.all.forEach(function(pos){
								if(cells[index + (pos.x + (pos.y * 1000))] !== undefined){
									cells[index + (pos.x + (pos.y * 1000))] += 2;
								}
							});
						} else {
							cells[index]--;
							positions.all.forEach(function(pos){
								if(cells[index + (pos.x + (pos.y * 1000))] !== undefined){
									cells[index + (pos.x + (pos.y * 1000))] -= 2;
								}
							});
						}
					}
				}
			}
		};
	}();

	let controller = function(){
		let going = null;
		let speed = 50; // ms of delay

		let start = function(){
			if(going){
				clearInterval(going);
			}
			going = setInterval(function(){
				world.advanceTime();
				view.drawWorld(world.getActiveCells());
			},speed);
		}

		let stop = function(){
			clearInterval(going);
			going = null;
		}

		return {
			createWorld:function(){
				world.randomize($scope.init.width,$scope.init.height,$scope.init.pop);
			},
			reset:function(){
				stop();
				view.reset();
				world.reset();
			},
			zoom:function(s,x,y){
				view.zoom(s,x,y);
				if(!going){
					view.drawWorld(world.getActiveCells());
				}
			},
			setSpeed:function(new_speed){
				speed = new_speed;
				start();
			},
			toggle:function(){
				if(going){
					stop();
				} else {
					start();
				}
			},
			translate:function(x,y){
				view.translate(x,y);
				if(!going){
					view.drawWorld(world.getActiveCells());
				}
			}
		}
	}();

	window.addEventListener("keypress", function (event) {
		if (event.defaultPrevented) {
			return; // Do nothing if the event was already processed
		}
		switch (event.key) {
			case " ":
				controller.toggle();
				break;
			case "Escape":
				controller.reset();
				$("#welcome").modal();
				canvas_active = false;
				break;
			default:
				return; // Quit when this doesn't handle the key event.
		}
		// Cancel the default action to avoid it being handled twice
		event.preventDefault();
	}, true);

	window.addEventListener("keydown", function (event) {
		if (event.defaultPrevented) {
			return; // Do nothing if the event was already processed
		}
		switch (event.key) {
			case "Control":
				if(canvas_active){
					$('#gol').addClass('move');
				}
				break;
			default:
				return; // Quit when this doesn't handle the key event.
		}
		// Cancel the default action to avoid it being handled twice
		event.preventDefault();
	}, true);

	window.addEventListener("keyup", function (event) {
		if (event.defaultPrevented) {
			return; // Do nothing if the event was already processed
		}
		switch (event.key) {
			case "Control":
				$('#gol').removeClass('move');
				break;
			default:
				return; // Quit when this doesn't handle the key event.
		}
		// Cancel the default action to avoid it being handled twice
		event.preventDefault();
	}, true);

	window.addEventListener("mousemove", function (event) {
		if (event.defaultPrevented) {
			return; // Do nothing if the event was already processed
		}
		if(event.buttons === 1) { // left mouse down
			if(event.ctrlKey){
				controller.translate(event.movementX / 10.0,event.movementY / 10.0);
			}
		}
		// Cancel the default action to avoid it being handled twice
		event.preventDefault();
	}, true);

	window.addEventListener("mousedown", function (event) {
		if(event.ctrlKey){
				$('#gol').addClass('moving');
		}
	}, true);

	window.addEventListener("mouseup", function (event) {
		$('#gol').removeClass('moving');
	}, true);

	window.addEventListener("wheel", function (event) {
		if (event.defaultPrevented) {
			return; // Do nothing if the event was already processed
		}
		// controller.zoom(1 + ((-event.deltaY)/10), event.x - (window.innerWidth/2), event.y - (window.innerHeight/2));
		controller.zoom(event.deltaY * 4, event.x - (window.innerWidth/2), event.y - (window.innerHeight/2));
		// Cancel the default action to avoid it being handled twice
		event.preventDefault();
	}, true);

	$('#controls').popover({content: '<span class="glyphicon glyphicon-zoom-in"></span> Scroll wheel up<br/>\
																		<span class="glyphicon glyphicon-zoom-out"></span> Scroll wheel down<br/>\
																		<span class="glyphicon glyphicon-move"></span> Ctrl click and drag<br/>\
																		<span class="glyphicon glyphicon-pause"></span> Spacebar<br/>\
																		<span class="glyphicon glyphicon-stop"></span> Escape',
													html: true, placement: "bottom"});

	$scope.start = function(){
		controller.reset();
		controller.createWorld();
		controller.zoom($scope.init.size,0,0);
		controller.toggle();
		canvas_active = true;
	}
	$("#welcome").modal();
});
