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
            awe.setup_scene();
            awe.pois.add({ id:'poi_1', position: { x:0, y:0, z:10000 }, visible: false });
            awe.projections.add({
              id:'projection_1',
              geometry: { shape: 'cube', x:120, y:120, z:120 },
              material:{ type: 'phong', color: 0xFFFFFF },
              texture: { path: 'awe_by_buildAR.png' },
            }, { poi_id: 'poi_1' });
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
                  if (event.detail['64']) { // we are mapping marker #64 to this projection
                    awe.pois.update({
                      data: {
                        visible: true,
                        position: { x:0, y:0, z:0 },
                        matrix: event.detail['64'].transform
                      },
                      where: {
                        id: 'poi_1'
                      }
                    });
                  }
                  else {
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