# AUTOSTRADA
A local Three.js pasta sculpture with interactive Tone.js sound. All browser dependencies are served locally.

Run `npm run dev`, then open http://127.0.0.1:4173.

The tunnel moves continuously. Scroll or use the arrow keys to modulate speed; speed gradually settles back to cruise. Click to twist, move or drag to shift the vanishing point. Space pauses; M toggles the synthesized drone. Sound starts off. Reduced-motion preferences start the sculpture paused.

`dist/` contains the complete app. `original.html` preserves the supplied reference.

## Interactive sound

Tone.js 15.1.22 is installed through npm, with a local browser bundle in `dist/vendor/tone.js`. Run `npm install` and `npm run vendor` to refresh that bundle after dependency changes. No remote CDN is needed. The original synthesized drone has been removed.

The entry screen lets you enter with or without sound. Audio initializes on a user gesture. The top-right sound control fades the master bus without restarting the loops or the visuals. Missing layers are skipped with a status message; a total failure still lets you explore the tunnel. All files load once, with a 15-second fetch timeout. M toggles sound. Switching tabs fades out and suspends the same context, then resumes it on return. Resource disposal runs when leaving the page (with a separate back/forward-cache suspension path).

Hovering either AUTOSTRADA logo plays `dist/audio/voce-dolce.mp3` once. In the tunnel it only plays while sound is on. On the entry screen, browsers block it until the visitor's first click or key press on the page.

### Files

- `dist/audio/AudioEngine.js`: Tone players, loop-boundary overlap, filters, low-shelf pressure, panning, master gain, -3 dB safety limiter, loading and lifecycle.
- `dist/audio/audioConfig.js`: levels, fade times, smoothing, scroll normalization and file names.
- `dist/audio/audioMapping.js`: scroll-velocity adapter and geometry-to-audio mapping.
- `dist/audio/interactiveAudio.js`: entry/toggle UI and render-loop bridge.
- `dist/audio/debug.js`: development panel, loaded only on a loopback host with `?audioDebug=1`.
- `dist/app.js`: forwards wheel, drag and keyboard deltas plus `flow`, `shape`, `torsion`, and pause state. The renderer receives the existing continuous speed, twist and shape controls; its geometry state feeds the audio adapter.
- `dist/index.html`, `dist/style.css`: plain-red entry screen, discreet sound control and accessible loading/failure status.
- `audio.test.mjs`: mapping, gain bounds, frame-rate consistency, geometry motion and loop-seam tests. Run `npm test`.

The footer counters come from `odometer()` in `dist/scene/motion.js`, which reads the camera's own travel. The scale comes from the pasta on screen: a rendered strand averages 79.2 world units along its curve and stands for a 25 cm spaghetti, so 1.00× cruise is about 1.1 cm/s and distance is shown in metres. Each 32-unit chunk holds 19 strands and a 100 g plate is about 100 strands, so one plate is passed about every 47 s at cruise, or 53 cm. `dist/scene/PlateScene.js` draws a small 3D plate beside the count: its spaghetti coils on as the current plate fills, and it pops when a plate is served. Both start at zero when the visitor leaves the entry screen; travel stops during pause.

The five supplied MP3s are already copied here:

| Layer | Local served file | Response |
| --- | --- | --- |
| INFINITO | `dist/audio/infinito.mp3` | Constant ambient gain; slow filter evolution with travel |
| ACCELERAZIONE | `dist/audio/accelerazione.mp3` | Absolute scroll velocity raises gain and opens filter |
| FUSILLI | `dist/audio/fusilli.mp3` | Signed angular motion controls pan; magnitude controls gain |
| AL DENTE | `dist/audio/al-dente.mp3` | Contraction raises gain and low shelf, lowers cutoff |
| DIGESTIONE ELETTRONICA | `dist/audio/digestione.mp3` | Constant background gain just under INFINITO; filter stays open |

### How the controls map

Wheel deltas are converted to pixels (including line/page wheel modes), accumulated, divided by elapsed frame time, and normalized by `velocityPixelsPerSecond` (1800 by default). The signed value is damped with exponential, elapsed-time smoothing. Drag and arrow-key input feed the same adapter. It decays to zero without input even while the tunnel keeps cruising.

The 3D renderer and audio adapter share `dist/scene/motion.js`. The renderer passes the actual rotation and compression controls sampled at the camera’s current world-space cross-section. Signed rotation change per second drives FUSILLI, and the current radial scale drives AL DENTE. These are representative cross-section measurements; individual strands also have their own local bending. Motion pause fades the reactive layers while leaving the atmosphere.

The tunnel is infinite, so `progress` is a smooth periodic depth phase derived from `flow`, not a finite scroll percentage. All modulation runs imperatively at up to 25 Hz with audio parameter ramps; no players are recreated per frame.

### Tuning and verification

Open `http://127.0.0.1:4173/?audioDebug=1` for live state, actual gains, targets, context state, loaded layers and errors. Enable Manual mapping to test the four normalized parameters. Keep twist and contraction at zero to isolate INFINITO and ACCELERAZIONE. Turn off Manual mapping to restore geometry-driven behavior. This panel is not activated on production hosts.

Tune `audioConfig.js`: lower `velocityPixelsPerSecond` for a more sensitive acceleration layer; increase `smoothing` for slower transitions; adjust `layers` and `master` for levels. The `crossfade` setting bakes an 80 ms tail/head overlap into an in-memory PCM copy. The source MP3s are untouched; the effective loop becomes 80 ms shorter. Gain limits are conservative and a limiter protects the output, but final perceived loudness and musical seam quality should be checked on headphones with the supplied recordings.

Browser verification confirmed all four decoded layers, a running audio context, scroll reactivity, manual layer isolation, and sound activation. Automated tests cover mathematical response and loop-seam continuity; they do not certify perceptual audio quality or 60 FPS on every device. Tone API reference: https://tonejs.github.io/docs/15.1.22/


## True 3D scene

`dist/scene/TunnelScene.js` replaces the original fullscreen radial shader with Three.js geometry. There are 152 Catmull–Rom spaghetti paths, each with a circular TubeGeometry and rounded ends, batched into eight meshes sharing a non-metallic, slightly rough pasta material. Individual radii, lengths, angular drift and wave phases vary deterministically. Overlapping depth sections produce near-field occlusion, crossing strands and distant structure.

`dist/scene/TunnelWall.js` surrounds the camera with an open tube painted in the shader: 120 fine cream and gold stripes spiralling into a dark core. The pasta winds through the same spiral (`HELIX` in `dist/scene/motion.js`), and clicks twist both. `dist/scene/Cosmos.js` adds the wall and the instanced tomato, basil and cheese pieces that drift around the axis and recycle ahead of the camera.

A 72° perspective camera advances at `flow × 3.6` world units, along a gently curved centerline. Scroll still controls speed, with continuous forward cruise; pointer movement adds lateral translation and changes the gaze direction. The camera does not simulate travel by scaling a flat image. Geometry sections recycle only after passing fully behind the camera and reappear beyond the opaque red fog.

GPU deformation rotates, compresses and bends actual tube vertices. Normals are transformed using the deformation Jacobian so moving cylindrical surfaces remain correctly lit. Warm key, rim and fill lights reveal volume. Desktop adds a 1024px directional shadow map; mobile omits cast shadows and uses fewer tube segments. No bloom or metallic material is used.

Desktop starts with 64 longitudinal segments and 9 radial segments, mobile with 48 and 7. There are eight main geometry draw calls, plus the desktop shadow pass. Pixel ratio starts capped at 1.6 / 1.35 and is reduced when sustained frame times exceed 26 ms. This is adaptive quality, not a guaranteed 60 FPS benchmark. Geometry is built once and recycled without per-frame regeneration.

`scene.test.mjs` verifies geometry depth, finite/unit normals, continuous geometry controls and actual camera travel. Browser checks cover desktop and mobile rendering. See `scene/motion.js` for camera speed and deformation tuning, and `scene/TunnelScene.js` for tube density, thickness, lights and fog. Three.js documentation: https://threejs.org/docs/pages/TubeGeometry.html and https://threejs.org/docs/pages/PerspectiveCamera.html.
