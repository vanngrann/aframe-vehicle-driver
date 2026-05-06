/**
 * aframe-vehicle-driver
 * A reusable A-Frame component for WASD-based vehicle driving with
 * realistic steering, throttle, and visual tilt response.
 *
 * Usage:
 *   <a-entity vehicle-driver="speed: 8; turnSpeed: 60; tiltAngle: 8" ...>
 *
 * jsdelivr CDN (host on GitHub + jsDelivr):
 *   <script src="https://cdn.jsdelivr.net/gh/YOUR_USER/YOUR_REPO/aframe-vehicle-driver.js"></script>
 *
 * @version 1.0.0
 */

(function () {
  'use strict';

  if (typeof AFRAME === 'undefined') {
    console.error('[aframe-vehicle-driver] AFRAME not found. Make sure A-Frame is loaded first.');
    return;
  }

  AFRAME.registerComponent('vehicle-driver', {
    schema: {
      /** Forward/backward movement speed in m/s */
      speed: { type: 'number', default: 6 },

      /** Turning speed in degrees per second */
      turnSpeed: { type: 'number', default: 55 },

      /** Max visual body-roll tilt angle in degrees when steering */
      tiltAngle: { type: 'number', default: 8 },

      /** Max visual pitch angle in degrees when accelerating/braking */
      pitchAngle: { type: 'number', default: 4 },

      /** Smoothing factor for tilt interpolation (0-1, lower = smoother) */
      tiltSmoothing: { type: 'number', default: 0.1 },

      /** Smoothing for velocity interpolation */
      velocitySmoothing: { type: 'number', default: 0.12 },

      /** Selector of a child mesh/model to apply visual tilt to.
       *  If empty, tilts the root entity. */
      bodySelector: { type: 'string', default: '' },

      /** Enable/disable the component */
      enabled: { type: 'boolean', default: true },

      /** Restrict movement to the XZ plane (no flying) */
      constrainToGround: { type: 'boolean', default: true },

      /** Key bindings (future-proof, currently WASD) */
      keyForward:  { type: 'string', default: 'KeyW' },
      keyBackward: { type: 'string', default: 'KeyS' },
      keyLeft:     { type: 'string', default: 'KeyA' },
      keyRight:    { type: 'string', default: 'KeyD' },
    },

    // ─── Lifecycle ────────────────────────────────────────────────────────────

    init: function () {
      this._keys = {};
      this._yaw = 0;           // current heading in degrees
      this._currentTiltZ = 0;  // current roll tilt
      this._currentTiltX = 0;  // current pitch tilt
      this._currentSpeed = 0;  // interpolated speed scalar

      // Pull initial yaw from entity rotation
      this._yaw = this.el.object3D.rotation.y * THREE.MathUtils.RAD2DEG;

      // Bind key handlers
      this._onKeyDown = this._onKeyDown.bind(this);
      this._onKeyUp   = this._onKeyUp.bind(this);
      window.addEventListener('keydown', this._onKeyDown);
      window.addEventListener('keyup',   this._onKeyUp);

      // Resolve body target (child mesh or self)
      this._bodyEl = null;
      if (this.data.bodySelector) {
        this._bodyEl = this.el.querySelector(this.data.bodySelector);
      }

      // Emit ready event
      this.el.emit('vehicle-driver-ready', { component: this });
    },

    remove: function () {
      window.removeEventListener('keydown', this._onKeyDown);
      window.removeEventListener('keyup',   this._onKeyUp);
    },

    // ─── Tick (main loop) ─────────────────────────────────────────────────────

    tick: function (time, delta) {
      if (!this.data.enabled) return;

      const dt = Math.min(delta / 1000, 0.05); // seconds, capped to avoid spiral of death

      const keys = this._keys;
      const fwd  = keys[this.data.keyForward]  ? 1 : 0;
      const back = keys[this.data.keyBackward] ? -1 : 0;
      const left = keys[this.data.keyLeft]     ? 1 : 0;
      const right= keys[this.data.keyRight]    ? -1 : 0;

      const throttle = fwd + back;      // -1, 0, or 1
      const steer    = left + right;    // -1, 0, or 1

      // ── 1. Turning – only turn when moving ──────────────────────────────────
      // Only turn when the car is actually moving
      const speedFactor = Math.abs(this._currentSpeed) / this.data.speed;
      const turnAmount = steer * this.data.turnSpeed * speedFactor * dt;
      this._yaw += turnAmount;

      // ── 2. Velocity ─────────────────────────────────────────────────────────
      const targetSpeed = throttle * this.data.speed;
      this._currentSpeed = this._lerp(this._currentSpeed, targetSpeed, this.data.velocitySmoothing);

      // ── 3. Move entity in its facing direction ───────────────────────────────
      const yawRad = THREE.MathUtils.DEG2RAD * this._yaw;
      const dx = Math.sin(yawRad) * this._currentSpeed * dt;
      const dz = Math.cos(yawRad) * this._currentSpeed * dt;

      const pos = this.el.object3D.position;
      pos.x -= dx;
      pos.z -= dz;
      if (this.data.constrainToGround) {
        // keep Y as-is (terrain/physics can override)
      }

      // ── 4. Apply heading rotation to root entity ─────────────────────────────
      this.el.object3D.rotation.y = THREE.MathUtils.DEG2RAD * this._yaw;

      // ── 5. Visual body tilt ──────────────────────────────────────────────────
      const targetTiltZ = -steer  * this.data.tiltAngle;  // roll on turns
      const targetTiltX =  throttle * this.data.pitchAngle; // pitch on accel/brake

      this._currentTiltZ = this._lerp(this._currentTiltZ, targetTiltZ, this.data.tiltSmoothing);
      this._currentTiltX = this._lerp(this._currentTiltX, targetTiltX, this.data.tiltSmoothing);

      const bodyObj = this._bodyEl
        ? this._bodyEl.object3D
        : this.el.object3D;

      // Only apply tilt to body (not heading rotation which is on root)
      if (this._bodyEl) {
        bodyObj.rotation.z = THREE.MathUtils.DEG2RAD * this._currentTiltZ;
        bodyObj.rotation.x = THREE.MathUtils.DEG2RAD * this._currentTiltX;
      } else {
        // Tilt in local space on the same object (heading already applied)
        // We compose: first tilt, then yaw – store separately
        // For single-entity setups, encode tilt as local X/Z on top of Y rotation:
        const euler = this.el.object3D.rotation;
        euler.x = THREE.MathUtils.DEG2RAD * this._currentTiltX;
        euler.z = THREE.MathUtils.DEG2RAD * this._currentTiltZ;
      }

      // ── 6. Emit drive event for external listeners ───────────────────────────
      this.el.emit('vehicle-drive', {
        speed:    this._currentSpeed,
        throttle: throttle,
        steer:    steer,
        yaw:      this._yaw,
      }, false /* don't bubble – perf */);
    },

    // ─── Helpers ──────────────────────────────────────────────────────────────

    _lerp: function (a, b, t) {
      return a + (b - a) * t;
    },

    _onKeyDown: function (e) {
      this._keys[e.code] = true;
    },

    _onKeyUp: function (e) {
      this._keys[e.code] = false;
    },

    // ─── Public API ───────────────────────────────────────────────────────────

    /** Teleport the vehicle to a position */
    setPosition: function (x, y, z) {
      this.el.object3D.position.set(x, y, z);
    },

    /** Set the vehicle's heading in degrees */
    setHeading: function (degrees) {
      this._yaw = degrees;
    },

    /** Programmatically enable or disable controls */
    setEnabled: function (val) {
      this.data.enabled = val;
      if (!val) {
        this._keys = {};
        this._currentSpeed = 0;
      }
    },
  });

  console.log('[aframe-vehicle-driver] v1.0.0 registered ✓');
})();
