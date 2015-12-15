var markerData = {
  markers: [
    {
      locationId: 'someLocationPlaceholder',
      markerId: '64',
      directions: [
        {
          targetLocationId: 'someLocationPlaceholder',
          rotation: { x: 0, y: 0, z: 0 }
        },
      ]
    },
  ]
}

window.addEventListener('load', function() {

  window.awe.init({
    device_type: awe.AUTO_DETECT_DEVICE_TYPE,
    settings: {
      container_id: 'container',
      default_camera_position: { x:0, y:0, z:0 },
      default_lights:[
        {
          id: 'point_light',
          type: 'point',
          color: 0xFFFFFF,
        },
      ],
    },
    ready: function() {
      awe.util.require([
        {
          capabilities: ['gum','webgl'],
          files: [
            [ 'js/awe-standard-dependencies.js', 'js/awe-standard.js'],
            'js/awe-jsartoolkit-dependencies.js',
            'js/awe.marker_ar.js',
          ],
          success: function() {
            initialize();
          },
        },
        {
          capabilities: [],
          success: function() {
            document.body.innerHTML = '<p>Try this demo in the latest version of Chrome or Firefox on a PC or Android device</p>';
          },
        },
      ]);
    }
  });
});

function initialize() {
  awe.setup_scene();
  addPOIs();
  addProjections();
  addEvents();
}

function addPOIs() {
  awe.pois.add({ id:'poi_1', position: { x:0, y:0, z:10000 }, visible: false });
}

function addProjections() {
  awe.projections.add({
    id:'projection_1',
    geometry: { shape: 'cube', x: 200, y: 200, z: 200 },
    material:{ type: 'phong', color: 0xFFFFFF },
    texture: { path: 'awe_by_buildAR.png' },
  }, { poi_id: 'poi_1' });
}

function addEvents() {
  awe.events.add([{
    id: 'ar_tracking_marker',
    device_types: {
      pc: 1,
      android: 1
    },
    register: function(handler) {
      window.addEventListener('ar_tracking_marker', handler, false);
    },
    unregister: function(handler) {
      window.removeEventListener('ar_tracking_marker', handler, false);
    },
    handler: function(event) {
      if (event.detail) {

        var found = false;

        markerData.markers.forEach(function(marker) {
          if (event.detail[marker.markerId]) { // we are mapping marker #64 to this projection
            found = true;

            awe.pois.update({
              data: {
                visible: true,
                position: { x:0, y:0, z:0 },
                matrix: event.detail[marker.markerId].transform
              },
              where: {
                id: 'poi_1'
              }
            });
          }
        });

        if( found == false ) {
          awe.pois.update({
            data: {
              visible: false
            },
            where: {
              id: 'poi_1'
            }
          });
        }

        awe.scene_needs_rendering = 1;
      }
    }
  }])
}
