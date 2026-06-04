<script lang="ts">
  import { onMount } from 'svelte';

  let canvasEl: HTMLCanvasElement;

  onMount(async () => {
    if (!canvasEl) return;

    const THREE = await import('three');
    const COUNT = 18000;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const renderer = new THREE.WebGLRenderer({
      canvas: canvasEl, antialias: true, alpha: true, powerPreference: 'high-performance',
    });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(52, 1, 0.1, 100);
    camera.position.set(0, 0, 9);

    const group = new THREE.Group();
    scene.add(group);

    // ---- shape generators ----
    function alloc() { return new Float32Array(COUNT * 3); }

    function shapeSphere(r = 3.4) {
      const a = alloc(); const phi = Math.PI * (3 - Math.sqrt(5));
      for (let i = 0; i < COUNT; i++) {
        const y = 1 - (i / (COUNT - 1)) * 2;
        const rad = Math.sqrt(1 - y * y);
        const th = phi * i;
        a[i*3] = Math.cos(th) * rad * r;
        a[i*3+1] = y * r;
        a[i*3+2] = Math.sin(th) * rad * r;
      }
      return a;
    }

    function shapeGalaxy() {
      const a = alloc(); const arms = 4;
      for (let i = 0; i < COUNT; i++) {
        const t = Math.pow(Math.random(), 0.6);
        const radius = t * 4.6;
        const arm = (i % arms) / arms * Math.PI * 2;
        const spin = radius * 0.9;
        const spread = (1 - t) * 0.7 + 0.08;
        const ang = arm + spin;
        const rx = (Math.random() - 0.5) * spread;
        const ry = (Math.random() - 0.5) * spread * 0.5;
        const rz = (Math.random() - 0.5) * spread;
        a[i*3] = Math.cos(ang) * radius + rx;
        a[i*3+1] = ry + (Math.random() - 0.5) * 0.25;
        a[i*3+2] = Math.sin(ang) * radius + rz;
      }
      return a;
    }

    function shapeTerrain() {
      const a = alloc(); const side = Math.ceil(Math.sqrt(COUNT));
      const span = 9;
      for (let i = 0; i < COUNT; i++) {
        const gx = (i % side) / side;
        const gz = Math.floor(i / side) / side;
        const x = (gx - 0.5) * span;
        const z = (gz - 0.5) * span;
        const y = Math.sin(x * 0.9) * Math.cos(z * 0.8) * 0.9
                + Math.sin(x * 0.35 + z * 0.4) * 0.6;
        a[i*3] = x; a[i*3+1] = y - 0.4; a[i*3+2] = z;
      }
      return a;
    }

    function shapeKnot(p = 2, q = 3) {
      const a = alloc();
      for (let i = 0; i < COUNT; i++) {
        const u = (i / COUNT) * Math.PI * 2 * 6;
        const r = 1.6 + Math.cos(q * u) * 0.6;
        const jitter = 0.18;
        a[i*3]   = (r * Math.cos(p * u)) * 1.15 + (Math.random() - 0.5) * jitter;
        a[i*3+1] = (r * Math.sin(p * u)) * 1.15 + (Math.random() - 0.5) * jitter;
        a[i*3+2] = (Math.sin(q * u) * 1.4) + (Math.random() - 0.5) * jitter;
      }
      return a;
    }

    function shapeDisperse() {
      const a = alloc();
      for (let i = 0; i < COUNT; i++) {
        const r = 3 + Math.random() * 4.5;
        const th = Math.random() * Math.PI * 2;
        const ph = Math.acos(2 * Math.random() - 1);
        a[i*3]   = Math.sin(ph) * Math.cos(th) * r;
        a[i*3+1] = Math.cos(ph) * r * 0.7;
        a[i*3+2] = Math.sin(ph) * Math.sin(th) * r;
      }
      return a;
    }

    let SHAPES = [shapeSphere(), shapeGalaxy(), shapeTerrain(), shapeKnot(), shapeDisperse()];

    // ---- geometry + material ----
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(SHAPES[0]);
    const colors    = new Float32Array(COUNT * 3);
    const seeds     = new Float32Array(COUNT);

    const cA = new THREE.Color('#41ecd0');
    const cB = new THREE.Color('#8b7dff');
    const cC = new THREE.Color('#ffffff');
    for (let i = 0; i < COUNT; i++) {
      const f = i / COUNT;
      const m = Math.pow(Math.random(), 2.2);
      const c = cA.clone().lerp(cB, f);
      c.lerp(cC, m * 0.5);
      colors[i*3] = c.r; colors[i*3+1] = c.g; colors[i*3+2] = c.b;
      seeds[i] = Math.random();
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color',    new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('aSeed',    new THREE.BufferAttribute(seeds, 1));

    const material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
      uniforms: {
        uTime:   { value: 0 },
        uSize:   { value: 2.6 * renderer.getPixelRatio() },
        uBreath: { value: 0 },
      },
      vertexShader: /* glsl */`
        uniform float uTime;
        uniform float uSize;
        uniform float uBreath;
        attribute float aSeed;
        varying vec3 vColor;
        varying float vF;
        void main() {
          vColor = color;
          vec3 p = position;
          float s = aSeed * 6.2831;
          p.x += sin(uTime * 0.6 + s) * 0.06 * uBreath;
          p.y += cos(uTime * 0.5 + s * 1.7) * 0.06 * uBreath;
          p.z += sin(uTime * 0.4 + s * 2.3) * 0.06 * uBreath;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          float d = -mv.z;
          vF = clamp(1.0 - (d - 5.0) / 12.0, 0.15, 1.0);
          gl_PointSize = uSize * (300.0 / d) * (0.5 + aSeed * 0.8);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */`
        varying vec3 vColor;
        varying float vF;
        void main() {
          vec2 uv = gl_PointCoord - 0.5;
          float r = length(uv);
          if (r > 0.5) discard;
          float a = smoothstep(0.5, 0.0, r);
          a = pow(a, 1.6);
          gl_FragColor = vec4(vColor * (0.7 + vF * 0.7), a * vF);
        }
      `,
    });

    const points = new THREE.Points(geo, material);
    group.add(points);

    // ---- scroll morph ----
    let scrollP = 0;
    let easedP  = 0;

    function pageProgress() {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      return max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
    }

    const onScroll = () => { scrollP = pageProgress(); };
    window.addEventListener('scroll', onScroll, { passive: true });
    scrollP = pageProgress();

    const ptr = { x: 0, y: 0, tx: 0, ty: 0 };
    const onPointer = (e: PointerEvent) => {
      ptr.tx = e.clientX / window.innerWidth - 0.5;
      ptr.ty = e.clientY / window.innerHeight - 0.5;
    };
    window.addEventListener('pointermove', onPointer, { passive: true });

    function applyMorph(p: number) {
      const segs = SHAPES.length - 1;
      const f = p * segs;
      let i = Math.floor(f);
      if (i >= segs) i = segs - 1;
      let t = f - i;
      t = t * t * (3 - 2 * t);
      const A = SHAPES[i], B = SHAPES[i + 1];
      const arr = geo.attributes.position.array as Float32Array;
      for (let k = 0; k < COUNT * 3; k++) {
        arr[k] = A[k] + (B[k] - A[k]) * t;
      }
      geo.attributes.position.needsUpdate = true;
    }

    // ---- render loop ----
    const clock = new THREE.Clock();
    let lastMorph = -1;
    let rafId: number;

    function tick() {
      const dt = clock.getDelta();
      const t  = clock.elapsedTime;
      material.uniforms.uTime.value = t;

      easedP += (scrollP - easedP) * Math.min(1, dt * 4);

      if (Math.abs(easedP - lastMorph) > 0.0006) {
        applyMorph(easedP);
        lastMorph = easedP;
      }

      material.uniforms.uBreath.value = 0.5 + (1 - easedP) * 0.8;

      if (!reduce) {
        group.rotation.y = t * 0.04 + easedP * Math.PI * 1.2;
        group.rotation.x = Math.sin(t * 0.1) * 0.08 + easedP * 0.5;
      } else {
        group.rotation.y = easedP * Math.PI * 1.2;
      }

      ptr.x += (ptr.tx - ptr.x) * Math.min(1, dt * 3);
      ptr.y += (ptr.ty - ptr.y) * Math.min(1, dt * 3);
      camera.position.x = ptr.x * 1.6;
      camera.position.y = -ptr.y * 1.2;
      camera.position.z = 9 + Math.sin(easedP * Math.PI) * -1.5;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
      rafId = requestAnimationFrame(tick);
    }

    // ---- resize ----
    function resize() {
      const w = window.innerWidth, h = window.innerHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      material.uniforms.uSize.value = 2.6 * renderer.getPixelRatio();
    }
    window.addEventListener('resize', resize);
    resize();
    rafId = requestAnimationFrame(tick);

    // ---- public API ----
    function resampleTo(flat: Float32Array, target: number): Float32Array {
      const srcN = Math.floor(flat.length / 3);
      const out = new Float32Array(target * 3);
      for (let i = 0; i < target; i++) {
        const j = Math.floor((i / target) * srcN);
        out[i*3] = flat[j*3]; out[i*3+1] = flat[j*3+1]; out[i*3+2] = flat[j*3+2];
      }
      return out;
    }

    function normalize(flat: Float32Array): Float32Array {
      let cx = 0, cy = 0, cz = 0;
      const n = Math.floor(flat.length / 3);
      for (let i = 0; i < n; i++) { cx += flat[i*3]; cy += flat[i*3+1]; cz += flat[i*3+2]; }
      cx /= n; cy /= n; cz /= n;
      let max = 0;
      for (let i = 0; i < n; i++) {
        const dx = flat[i*3]-cx, dy = flat[i*3+1]-cy, dz = flat[i*3+2]-cz;
        max = Math.max(max, Math.hypot(dx, dy, dz));
      }
      const s = max > 0 ? 3.4 / max : 1;
      const out = new Float32Array(flat.length);
      for (let i = 0; i < n; i++) {
        out[i*3]   = (flat[i*3]   - cx) * s;
        out[i*3+1] = (flat[i*3+1] - cy) * s;
        out[i*3+2] = (flat[i*3+2] - cz) * s;
      }
      return out;
    }

    (window as any).Portfolio = (window as any).Portfolio || {};
    (window as any).Portfolio.loadPointcloud = function (
      positionsFlat: ArrayLike<number>,
      colorsFlat?: ArrayLike<number>,
      slot = 0,
    ) {
      const norm = normalize(Float32Array.from(positionsFlat));
      SHAPES[slot] = resampleTo(norm, COUNT);
      if (colorsFlat) {
        const c = resampleTo(Float32Array.from(colorsFlat), COUNT);
        (geo.attributes.color.array as Float32Array).set(c);
        geo.attributes.color.needsUpdate = true;
      }
      lastMorph = -1;
      return `loaded ${Math.floor(positionsFlat.length / 3)} pts -> slot ${slot}`;
    };
    (window as any).Portfolio.shapeCount = SHAPES.length;

    console.log(
      '%c[pointcloud] ready · Portfolio.loadPointcloud(positions, colors?, slot?) to plug in real data',
      'color:#41ecd0',
    );

    window.dispatchEvent(new CustomEvent('pointcloud:ready'));

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('pointermove', onPointer);
      window.removeEventListener('resize', resize);
      renderer.dispose();
    };
  });
</script>

<canvas id="cloud" bind:this={canvasEl}></canvas>
