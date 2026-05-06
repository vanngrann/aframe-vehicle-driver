# aframe-vehicle-driver

A reusable A-Frame component for WASD and arrow key vehicle driving with steering, throttle, and visual body tilt.

---

## Install

Include after A-Frame:

```html
<script src="https://aframe.io/releases/1.7.1/aframe.min.js"></script>
<script src="https://cdn.jsdelivr.net/gh/vanngrann/aframe-vehicle-driver@main/aframe-vehicle-driver.js"></script>
```

---

## Basic Usage

```html
<a-entity
  vehicle-driver="speed: 10; turnSpeed: 70; bodySelector: #my-model"
  position="0 1 0"
>
  <a-gltf-model id="my-model" src="models/car/scene.gltf" rotation="0 180 0"></a-gltf-model>
  <a-camera
    position="0 4 6"
    rotation="-15 0 0"
    look-controls="enabled: false"
    wasd-controls="enabled: false"
  ></a-camera>
</a-entity>
```

> **Important:** Always disable `look-controls` and `wasd-controls` on the camera, otherwise A-Frame's built-in controls will conflict with the component.

---

## Controls

| Input | Action |
|---|---|
| `W` or `Arrow Up` | Accelerate forward |
| `S` or `Arrow Down` | Brake / Reverse |
| `A` or `Arrow Left` | Turn left |
| `D` or `Arrow Right` | Turn right |

Turning is speed-dependent. The car will not rotate while stationary.

---

## Schema

| Property | Type | Default | Description |
|---|---|---|---|
| `speed` | number | `6` | Top speed in m/s |
| `turnSpeed` | number | `55` | Max rotation rate in degrees per second |
| `tiltAngle` | number | `8` | Max body roll on turns in degrees |
| `pitchAngle` | number | `4` | Max body pitch on throttle in degrees |
| `tiltSmoothing` | number | `0.1` | Lerp factor for tilt (lower is smoother) |
| `velocitySmoothing` | number | `0.12` | Lerp factor for acceleration |
| `bodySelector` | string | `''` | CSS selector of child mesh to apply visual tilt to |
| `constrainToGround` | boolean | `true` | Locks Y position |
| `enabled` | boolean | `true` | Enables or disables controls |
| `keyForward` | string | `KeyW` | Key code for forward |
| `keyBackward` | string | `KeyS` | Key code for reverse |
| `keyLeft` | string | `KeyA` | Key code for left |
| `keyRight` | string | `KeyD` | Key code for right |

---

## JavaScript API

```js
const driver = document.querySelector('#vehicle').components['vehicle-driver'];

driver.setPosition(x, y, z);   // teleport the vehicle
driver.setHeading(degrees);     // set facing direction
driver.setEnabled(false);       // disable controls
```

---

## Events

The component emits a `vehicle-drive` event every tick on the entity.

```js
document.querySelector('#vehicle').addEventListener('vehicle-drive', function (e) {
  console.log(e.detail.speed);     // current interpolated speed
  console.log(e.detail.throttle);  // -1, 0, or 1
  console.log(e.detail.steer);     // -1, 0, or 1
  console.log(e.detail.yaw);       // world heading in degrees
});
```

---

## Camera Setup

The camera should be a child of the vehicle entity so it follows automatically. Position it behind and above the model. The exact values depend on the scale of your model.

```html
<!-- Close follow cam -->
<a-camera position="0 3 5" rotation="-10 0 0" look-controls="enabled: false" wasd-controls="enabled: false"></a-camera>

<!-- Further back, higher angle -->
<a-camera position="0 6 10" rotation="-20 0 0" look-controls="enabled: false" wasd-controls="enabled: false"></a-camera>
```

---

## Tips

**Model is rotating around the wrong point**

Make sure the gltf model is at `position="0 0 0"` on the child entity. Offsetting the model shifts the pivot and makes turns look wrong. Move the camera instead to adjust framing.

**Controls feel sluggish**

Increase `velocitySmoothing` closer to `1` for snappier response, or lower it toward `0` for more gradual acceleration.

**Controls feel too twitchy**

Lower `turnSpeed` and increase `tiltSmoothing`.

**Car drifts or floats**

Make sure no other movement components are on the same entity, such as `wasd-controls` on the parent.

---

## License

MIT
