/**
 * These event handlers can modify the characteristics of a scene.
 * These will be specific to a scene's models and the models' attributes.
 */

/**
 * The MIT License (MIT)
 *
 * Copyright (c) 2015 C. Wayne Brown
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.

 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

"use strict";

//-------------------------------------------------------------------------
/**
 * Event handlers for
 * @param scene Object An object that knows the scene data and can render the scene.
 * @param control_id_list Array A list of control ID's .
 * @param canvas_id String The HTML id for the canvas.
 * @constructor
 */
function SimpleEvents_03(scene, control_id_list, canvas_id) {

  var self = this;

  // Private variables
  var canvas = scene.canvas;

  // Remember the current state of events
  var start_of_mouse_drag = null;
  var previous_time = Date.now();
  var animate_is_on = scene.animate_active;

  // Control the rate at which animations refresh
  var frame_rate = 33; // 33 milliseconds = 1/30 sec

  //-----------------------------------------------------------------------
  self.mouse_drag_started = function (event) {

    //console.log("started mouse drag event x,y = " + event.clientX + " " + event.clientY + "  " + event.which);
    start_of_mouse_drag = event;
    event.preventDefault();

    if (animate_is_on) {
      scene.animate_active = false;
    }
  };

  //-----------------------------------------------------------------------
  self.mouse_drag_ended = function (event) {

    //console.log("ended mouse drag event x,y = " + event.clientX + " " + event.clientY + "  " + event.which);
    start_of_mouse_drag = null;

    event.preventDefault();

    if (animate_is_on) {
      scene.animate_active = true;
      self.animate();
    }
  };

  //-----------------------------------------------------------------------
  /**
   * Process a mouse drag event.
   * @param event A jQuery event object
   */
  self.mouse_dragged = function (event) {
    var delta_x, delta_y,rotate;

    //console.log("drag event x,y = " + event.clientX + " " + event.clientY + "  " + event.which);
    if (start_of_mouse_drag) {
      delta_x = event.clientX - start_of_mouse_drag.clientX;
      delta_y = -(event.clientY - start_of_mouse_drag.clientY);
      //console.log("moved: " + delta_x + " " + delta_y);

      scene.angle_x += delta_y;
      scene.angle_y -= delta_x;
      scene.render();

      start_of_mouse_drag = event;
      event.preventDefault();
    }
  };

  //-----------------------------------------------------------------------
  self.key_event = function (event) {
    var bounds, keycode, rotate;


    keycode = (event.keyCode ? event.keyCode : event.which);
    scene.out.displayInfo(event.keyCode + " keyboard event in canvas");
    switch (keycode) {
      case 87: //W
        rotate = scene.matrix.create();
        scene.matrix.setIdentity(rotate);
        scene.matrix.rotate(rotate,-scene.rotate_sensitivity,scene.rotation_matrix[4],scene.rotation_matrix[5],scene.rotation_matrix[6]);
        scene.matrix.multiply(scene.rotation_matrix,rotate, scene.rotation_matrix);
        scene.render();
        break; 
      case 83: //S
        rotate = scene.matrix.create();
        scene.matrix.setIdentity(rotate);
        scene.matrix.rotate(rotate,scene.rotate_sensitivity,scene.rotation_matrix[4],scene.rotation_matrix[5],scene.rotation_matrix[6]);
        scene.matrix.multiply(scene.rotation_matrix,rotate, scene.rotation_matrix);
        scene.render();
        break; 
      case 65: //A
        rotate = scene.matrix.create();
        scene.matrix.setIdentity(rotate);
        scene.matrix.rotate(rotate,-scene.rotate_sensitivity,scene.rotation_matrix[8],scene.rotation_matrix[9],scene.rotation_matrix[10]);
        scene.matrix.multiply(scene.rotation_matrix,rotate, scene.rotation_matrix);
        scene.render();
        break; 
      case 68: //D
        rotate = scene.matrix.create();
        scene.matrix.setIdentity(rotate);
        scene.matrix.rotate(rotate,scene.rotate_sensitivity,scene.rotation_matrix[8],scene.rotation_matrix[9],scene.rotation_matrix[10]);
        scene.matrix.multiply(scene.rotation_matrix,rotate, scene.rotation_matrix);
        scene.render();
        break;  
      case 81: //Q
        rotate = scene.matrix.create();
        scene.matrix.setIdentity(rotate);
        scene.matrix.rotate(rotate,-scene.rotate_sensitivity,scene.rotation_matrix[0],scene.rotation_matrix[1],scene.rotation_matrix[2]);
        scene.matrix.multiply(scene.rotation_matrix,rotate, scene.rotation_matrix);
        scene.render();
        break;  
      case 69: //E
        rotate = scene.matrix.create();
        scene.matrix.setIdentity(rotate);
        scene.matrix.rotate(rotate,scene.rotate_sensitivity,scene.rotation_matrix[0],scene.rotation_matrix[1],scene.rotation_matrix[2]);
        scene.matrix.multiply(scene.rotation_matrix,rotate, scene.rotation_matrix);
        scene.render();
        break;  
      case 36: //uparrow
        if (scene.type == 1 || !scene.geod){
          scene.ro_x += scene.move_sensitivity*scene.vec3.normalize(scene.vec3.create(scene.rotation_matrix[0],scene.rotation_matrix[1],scene.rotation_matrix[2]))[0];
          scene.ro_y += scene.move_sensitivity*scene.vec3.normalize(scene.vec3.create(scene.rotation_matrix[0],scene.rotation_matrix[1],scene.rotation_matrix[2]))[1];
          scene.ro_z += scene.move_sensitivity*scene.vec3.normalize(scene.vec3.create(scene.rotation_matrix[0],scene.rotation_matrix[1],scene.rotation_matrix[2]))[2];
        }else {
          var new_x = Math.cosh(scene.move_sensitivity)*scene.ro_x+Math.sinh(scene.move_sensitivity)* (scene.rotation_matrix[0]);
          var new_y = Math.cosh(scene.move_sensitivity)*scene.ro_y+Math.sinh(scene.move_sensitivity)* scene.rotation_matrix[1];
          var new_z = Math.cosh(scene.move_sensitivity)*scene.ro_z+Math.sinh(scene.move_sensitivity)* scene.rotation_matrix[2];
          //var new_w = Math.cosh(scene.move_sensitivity)*(scene.ro_x^2+scene.ro_x^2+scene.ro_x^2+1)+Math.sinh(scene.move_sensitivity)*(scene.rotation_matrix[0]^2+scene.rotation_matrix[1]^2+scene.rotation_matrix[3]^2-1);
          scene.rotation_matrix[0] = (new_x-Math.cosh(scene.move_sensitivity)*scene.ro_x)/Math.sinh(scene.move_sensitivity);
          scene.rotation_matrix[1] = (new_y-Math.cosh(scene.move_sensitivity)*scene.ro_y)/Math.sinh(scene.move_sensitivity);
          scene.rotation_matrix[2] = (new_z-Math.cosh(scene.move_sensitivity)*scene.ro_z)/Math.sinh(scene.move_sensitivity);
          scene.ro_x = new_x;
          scene.ro_y = new_y;
          scene.ro_z = new_z;
        }
        scene.render();
        break;
      case 33: //downarrow
        if (scene.type == 1||!scene.geod){
          scene.ro_x -= scene.move_sensitivity*scene.vec3.normalize(scene.vec3.create(scene.rotation_matrix[0],scene.rotation_matrix[1],scene.rotation_matrix[2]))[0];
          scene.ro_y -= scene.move_sensitivity*scene.vec3.normalize(scene.vec3.create(scene.rotation_matrix[0],scene.rotation_matrix[1],scene.rotation_matrix[2]))[1];
          scene.ro_z -= scene.move_sensitivity*scene.vec3.normalize(scene.vec3.create(scene.rotation_matrix[0],scene.rotation_matrix[1],scene.rotation_matrix[2]))[2];
        }else {
          var new_x = Math.cosh(scene.move_sensitivity)*scene.ro_x-Math.sinh(scene.move_sensitivity)* (scene.rotation_matrix[0]);
          var new_y = Math.cosh(scene.move_sensitivity)*scene.ro_y-Math.sinh(scene.move_sensitivity)* scene.rotation_matrix[1];
          var new_z = Math.cosh(scene.move_sensitivity)*scene.ro_z-Math.sinh(scene.move_sensitivity)* scene.rotation_matrix[2];
          //var new_w = Math.cosh(scene.move_sensitivity)*(scene.ro_x^2+scene.ro_x^2+scene.ro_x^2+1)+Math.sinh(scene.move_sensitivity)*(scene.rotation_matrix[0]^2+scene.rotation_matrix[1]^2+scene.rotation_matrix[3]^2-1);
          scene.rotation_matrix[0] = -(new_x-Math.cosh(scene.move_sensitivity)*scene.ro_x)/Math.sinh(scene.move_sensitivity);
          scene.rotation_matrix[1] = -(new_y-Math.cosh(scene.move_sensitivity)*scene.ro_y)/Math.sinh(scene.move_sensitivity);
          scene.rotation_matrix[2] = -(new_z-Math.cosh(scene.move_sensitivity)*scene.ro_z)/Math.sinh(scene.move_sensitivity);
          scene.ro_x = new_x;
          scene.ro_y = new_y;
          scene.ro_z = new_z;
        }
        scene.render();
        break;
      default: break; //Everything else
  }
  };



  //------------------------------------------------------------------------------
  self.html_control_event = function (event) {
    var control;

    control = $(event.target);
    if (control) {
      switch (control.attr('id')) {
        case "my_pause":
          if (control.is(":checked"))  {
            scene.animated = true;           
          } else {
            scene.animated = false;
          }
          break;
        case "geodesic_travel":
          if (control.is(":checked"))  {
            scene.geod = true;           
          } else {
            scene.geod = false;
          }
          scene.render();
          scene.out.displayInfo("geod is clicked");
          break;
        case "real_light":
          if (control.is(":checked"))  {
            scene.real = true;           
          } else {
            scene.real = false;
          }
          scene.render();
          scene.out.displayInfo("real light is clicked");
          break;
        case "type_1" :
        case "type_2":
        case "type_3":
        case "type_4":
          scene.type = parseInt(control.val());
          scene.render();
          break;
        case "directshadow":
        case "softshadow":
        case "noshadow":
          scene.softShadow = parseInt(control.val());
          scene.out.displayInfo("shadow"+parseInt(control.val()));
          scene.render();
          break;
        case "ro_x":
          scene.ro_x = parseFloat(control.val());
          scene.render();
          break;
        case "ro_y":
          scene.ro_y = parseFloat(control.val());
          scene.render();
          break;
        case "ro_z":
          scene.ro_z = parseFloat(control.val());
          scene.render();
          break;
        case "fov":
          scene.fov =  parseFloat(control.val());
          scene.render();
          break;
      }
    }
  };

  //------------------------------------------------------------------------------
  self.createAllEventHandlers = function () {
    var j, control;
    for (j = 0; j < control_id_list.length; j += 1) {
      control = $('#' + control_id_list[j]);
      if (control) {
        if (j<10){
          control.click( self.html_control_event );          
        }
        else{
          control.change( self.html_control_event );              
        }
      }
    }
  };

  //------------------------------------------------------------------------------
  self.removeAllEventHandlers = function () {
    var j, control;
    for (j = 0; j < control_id_list.length; j += 1) {
      control = $('#' + control_id_list[j]);
      if (control) {
        if (j<10){
          control.unbind("click", self.html_control_event);        
        }
        else{
          control.unbind("change", self.html_control_event);           
        }
      }
    }
  };
  

  //------------------------------------------------------------------------------
  // Constructor code after the functions are defined.

  // Add an 'onclick' callback to each HTML control
  self.createAllEventHandlers();
  window.addEventListener('keydown',self.key_event,false);
  // Setup callbacks for mouse events in the canvas window.
  var id = '#' + canvas_id;
  $( id ).mousedown( self.mouse_drag_started );
  $( id ).mouseup( self.mouse_drag_ended );
  $( id ).mousemove( self.mouse_dragged );
}



