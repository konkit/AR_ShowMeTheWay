// In Quaternion format
var arrowsRotationData = {
  1:  '0 1 0 3.14159265359',
  2:  '0 1 0 0',
  64: '0 1 0 1.57079632679'
};


// CAMERA_BASED TRACKING STUFF
window.URL = window.URL || window.webkitURL;

DEBUG = true;

var runtime = null;
var root = null;

var initDone = false;
var doTracking = true;

var width = 320;
var height = 240;

var canvas = null;
var videoCanvas = null;

var detector = null;
var raster = null;

var resultMat = null;
var threshold = 100;

document.getElementById("threshold").innerHTML = threshold;

$("#slider").slider({ min:0, max: 255, value: threshold });

$("#slider").on( "slide", function( event, ui ) {
  threshold = ui.value;
  document.getElementById("threshold").innerHTML = threshold;
} );

// Using getUserMedia to access the webcam
var videoStream = null;

var video = document.createElement('video');

video.width = width;
video.height = height;
video.loop = true;
video.autoplay = true;
video.controls = true;
video.volume = 0;
video.style.display = 'none';

var getUserMedia = function(t, onsuccess, onerror) {
  if (navigator.getUserMedia) {
    return navigator.getUserMedia(t, onsuccess, onerror);
  } else if (navigator.webkitGetUserMedia) {
    return navigator.webkitGetUserMedia(t, onsuccess, onerror);
  } else if (navigator.mozGetUserMedia) {
    return navigator.mozGetUserMedia(t, onsuccess, onerror);
  } else if (navigator.msGetUserMedia) {
    return navigator.msGetUserMedia(t, onsuccess, onerror);
  } else {
    onerror(new Error("No getUserMedia implementation found."));
    return null;
  }
};

var createObjectURL = window.URL.createObjectURL;

if (!createObjectURL) {
  throw new Error("URL.createObjectURL not found.");
}

// Get available cameras
//TODO: Well, right now it chooses the last camera (last iteration assigns last camera)
//TODO: It would be good if it could be chosen by user
MediaStreamTrack.getSources(function(sourceInfos) {
  var videoSource = null;

  for (var i = 0; i != sourceInfos.length; ++i) {
    var sourceInfo = sourceInfos[i];
    if (sourceInfo.kind === 'video') {
      console.log('Video:', sourceInfo.id, sourceInfo.label || 'camera');
      videoSource = sourceInfo.id;
    } else {
      console.log('Some other kind of source: ', sourceInfo);
    }
  }

  sourceSelected(videoSource);
});

function sourceSelected(videoSource) {
  var constraints = {
    audio: false,
    video: {
      optional: [{sourceId: videoSource}]
    }
  };

  getUserMedia(
    constraints,
    function(stream) {
      video.crossOrigin = "";
      video.src = createObjectURL(stream);
      videoStream = stream;
    },
    function(error) {
      alert("Could not access webcam.");
    });
}


document.onload = function()
{
  runtime = document.getElementById("x3d").runtime;

  root = document.getElementById("root");

  runtime.exitFrame = function () {
    if (!initDone) {
      initializeTracker();
      initDone = true;
    }

    if (doTracking) {
      animate();
      this.triggerRedraw();
    }
  };
};

function toggleTracking()
{
  var btn = document.getElementById("btnTrack");

  doTracking = !doTracking;

  if (!doTracking) {
    document.getElementById("status").innerHTML = "Not tracking...";
    btn.value = "Start tracking";

    video.pause();
    video.src = "";
    videoStream.stop();
    videoStream = null;
  }
  else {
    startCam();

    btn.value = "Stop tracking";
    runtime.triggerRedraw();
  }
}

function redraw()
{
  videoCanvas.getContext('2d').drawImage(video, 0, 0);
  canvas.getContext('2d').drawImage(videoCanvas, 0, 0, width, height);

  // Tell JSARToolKit that the canvas has changed.
  canvas.changed = true;
}

function animate()
{
  // Draw the video frame to the canvas.
  try {
    redraw();
  }
  catch (e) {
    // workaround for Firefox
    if (e.name == "NS_ERROR_NOT_AVAILABLE") {
      setTimeout(function() { redraw(); }, 10);
    }
    else { throw e; }
  }

  // Detect the markers in the video frame.
  var markerCount = detector.detectMarkerLite(raster, threshold);

  for (var i=0; i<markerCount; i++) {
    var markerId = detector.getARCodeIndex(i);

    console.log("Marker #" + i + " id: " + markerId );

    var rotationData = arrowsRotationData[markerId];

    console.log(rotationData);

    if( rotationData !== 'undefined' ) {
      document.getElementById('arrowRotation').setAttribute('rotation', rotationData);
    }

    // Get the marker matrix into the result matrix.
    detector.getTransformMatrix(i, resultMat);

    // Copy the marker matrix to the tmp matrix.
    var tmpMat = adaptMarkerMatrix(resultMat);

    // Copy the marker matrix over to your marker root object.
    root.setAttribute("matrix", tmpMat.toGL().toString());
  }

  if (markerCount > 0 ) {
    document.getElementById("status").innerHTML = "Tracking " + markerCount + " marker"
  }
  else {
    document.getElementById("status").innerHTML = "Not tracking..."
  }
}

function adaptMarkerMatrix(arMat)
{
  var tmpMat = new x3dom.fields.SFMatrix4f(
    arMat.m00,  arMat.m01,  arMat.m02,  arMat.m03,
    arMat.m10,  arMat.m11,  arMat.m12,  arMat.m13,
    arMat.m20,  arMat.m21,  arMat.m22,  arMat.m23,
    0,          0,          0,          1);

  var translation = new x3dom.fields.SFVec3f(0,0,0),
    scale = new x3dom.fields.SFVec3f(1,1,1);
  var rotation = new x3dom.fields.Quaternion(0,0,1,0),
    scaleOrient = new x3dom.fields.Quaternion(0,0,1,0);

  tmpMat.getTransform(translation, rotation, scale, scaleOrient);

  // camera image is flipped, therefore flip orientation, too
  rotation.y *= -1;
  rotation.z *= -1;
  translation.y *= -1;
  translation.z *= -1;

  tmpMat = rotation.toMatrix();
  tmpMat.setTranslate(translation);

  return tmpMat;
}

function initializeTracker()
{
  // Setting up JSARToolKit
  canvas = document.createElement('canvas');
  canvas.id = "trackerCanvas";
  canvas.width = width;
  canvas.height = height;
  document.body.appendChild(canvas);

  if (DEBUG) {
    var debugCanvas = document.createElement('canvas');
    debugCanvas.id = 'debugCanvas';
    debugCanvas.width = width;
    debugCanvas.height = height;
    document.body.appendChild(debugCanvas);
  }

  // Create an RGB raster object for the 2D canvas.
  // JSARToolKit uses raster objects to read image data.
  // Note that you need to set canvas.changed = true on every frame.
  raster = new NyARRgbRaster_Canvas2D(canvas);

  // FLARParam is the thing used by FLARToolKit to set camera parameters.
  // Here we create a FLARParam for images with 320x240 pixel dimensions.
  var param = new FLARParam(width, height);

  // The FLARMultiIdMarkerDetector is the actual detection engine for marker detection.
  // It detects multiple ID markers. ID markers are special markers that encode a number.
  detector = new FLARMultiIdMarkerDetector(param, 120);

  // For tracking video set continue mode to true. In continue mode, the detector
  // tracks markers across multiple frames.
  detector.setContinueMode(true);

  // Copy the camera perspective matrix from the FLARParam to the WebGL library camera matrix.
  // The second and third parameters determine the zNear and zFar planes for the perspective matrix.
  var camera = document.getElementById("vf");

  var zNear = camera.getNear();
  var zFar = camera.getFar();
  var perspectiveMatrix = runtime.projectionMatrix().toGL();

  param.copyCameraMatrix(perspectiveMatrix, zNear, zFar);

  var proj = new x3dom.fields.SFMatrix4f();
  proj.setFromArray(perspectiveMatrix);
  proj._22 *= -1;
  proj._32 *= -1;

  camera.setAttribute("projection", proj.toGL().toString());

  // Detecting markers
  videoCanvas = document.getElementById('bgnd');

  // Create a NyARTransMatResult object for getting the marker translation matrices.
  resultMat = new NyARTransMatResult();

  // Draw the video frame to the raster canvas, scaled to 320x240.
  // And tell the raster object that the underlying canvas has changed.
  redraw();
}
