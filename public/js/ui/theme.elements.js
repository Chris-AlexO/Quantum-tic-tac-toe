
export class Atom {
    constructor(xs, ys, dx, dy, orbitR, colour, r = 5, twoOrbits = true, edge = false) {
        this.x = xs;
        this.y = ys;
        this.r = r;
        this.c = colour;
        this.orbitR = orbitR;
        this.edge = edge;
        this.orbitStart;
        this.orbitEnd;

        let random = Math.random();

        this.orbitAngle = this.edge ? -Math.PI / 2.2 : 2 * Math.PI * random;
        this.orbitAngle2 = this.orbitAngle - Math.PI / 2;

        let cosRot;
        let sinRot;

        let t = random * Math.PI * 2;

        this.dx = dx;
        this.dy = dy;
        this.dt = (Math.random() * 5 / 100) * Math.PI;

        this.drawNuclueus = () => {
            c.beginPath();
            c.arc(this.x, this.y, this.r, 0, 2 * Math.PI);
            c.fillStyle = this.c;
            c.strokeStyle = "white";
            //c.strokeStyle= this.c;
            if (this.edge === true) {
                c.lineWidth = 10;
                c.stroke();
            }
            c.fill();
            c.closePath();
        };

        this.drawOrbit = (orbitAngle = this.orbitAngle) => {
            c.beginPath();
            if (this.edge) {
                this.orbitStart = 0.45;
                this.orbitEnd = Math.PI * 2 / 1.08;
                c.ellipse(this.x, this.y, this.orbitR / 2, this.orbitR, orbitAngle, this.orbitStart, this.orbitEnd);
                c.lineWidth = 5;
                c.strokeStyle = "silver";
            } else {
                c.ellipse(this.x, this.y, this.orbitR / 2, this.orbitR, orbitAngle, 0, Math.PI * 2);
                c.lineWidth = 1;
                c.strokeStyle = "grey";
            }
            c.stroke();
            c.closePath();
        };

        this.drawElectron = (orbAngle) => {
            c.beginPath();
            c.fillStyle = Math.random() > 0.5 ? "#243adfff" : "#7e0be3ff";
            cosRot = Math.cos(orbAngle);
            sinRot = Math.sin(-orbAngle);
            let electronSize = this.edge ? 15 : 2;
            c.arc(this.x + cosRot * this.orbitR * Math.cos(t) / 2 + sinRot * this.orbitR * Math.sin(t), -sinRot * this.orbitR * Math.cos(t) / 2 + cosRot * this.orbitR * Math.sin(t) + this.y, electronSize, 0, Math.PI * 2);
            c.fill();
            c.closePath();
        };

        this.update = () => {
            let cut = 35;
            let right = this.x + this.orbitR / 2 + this.orbitR * Math.cos(this.orbitAngle) / 2;
            let left = this.x - (this.orbitR / 2 + this.orbitR * Math.cos(this.orbitAngle) / 2);
            let top = this.y - (this.orbitR / 2 + this.orbitR * Math.sin(this.orbitAngle) / 2);
            let bottom = this.y + this.orbitR / 2 + this.orbitR * Math.sin(this.orbitAngle) / 2;


            if (right >= canvas.width || left <= 0) {
                this.dx = -this.dx;
            }
            if (bottom >= canvas.height || top <= 0) {
                this.dy = -this.dy;
            }


            if (t >= Math.PI * 2) {
                t = 0;
            } else {
                t += this.dt;
            }

            this.x += this.dx;
            this.y += this.dy;

            this.drawNuclueus();
            this.drawOrbit();
            this.drawElectron(this.orbitAngle);
            if (twoOrbits === true) {
                this.drawOrbit(this.orbitAngle2);
                this.drawElectron(this.orbitAngle2);
            }

        };
    }
}

// Fancy celestial object for HTML Canvas 2D
// Usage:
// const star = new Star({ x: 200, y: 150, layer: 0.6 });
// function animate(){
//   ctx.clearRect(0,0,canvas.width,canvas.height);
//   star.update(1/60, canvas); // dt seconds (or just 1)
//   star.draw(ctx);
//   requestAnimationFrame(animate);
// }
// animate();

export class Star {
  constructor({
    x,
    y,
    vx = 0,
    vy = 0,
    // Visuals
    radius = rand(1.2, 3.6),
    color = null,                 // if null, auto choose star-ish hue
    glowStrength = rand(0.6, 1.2), // multiplier for bloom
    // Motion / depth
    layer = rand(0.15, 1.0),       // 0..1: lower = farther (slower, smaller, dimmer)
    wrap = true,                   // wrap around edges instead of bounce
    // Twinkle
    twinkleSpeed = rand(0.6, 1.8),
    twinkleAmount = rand(0.15, 0.45),
    // Optional orbiting body
    hasCompanion = Math.random() < 0.35,
  } = {}) {
    this.x = x ?? rand(0, 800);
    this.y = y ?? rand(0, 600);

    // Depth tricks: smaller + dimmer + slower for far layers
    this.layer = clamp(layer, 0.05, 1.0);
    this.baseRadius = radius * lerp(0.6, 1.2, this.layer);
    this.baseAlpha = lerp(0.25, 1.0, this.layer);
    this.glowStrength = glowStrength * lerp(0.5, 1.3, this.layer);

    this.vx = vx * this.layer;
    this.vy = vy * this.layer;

    // Twinkle uses a phase offset so a bunch of stars don't sync
    this.twinkleSpeed = twinkleSpeed;
    this.twinkleAmount = twinkleAmount;
    this.phase = Math.random() * Math.PI * 2;

    // A subtle “temperature” tint: bluish -> white -> warm
    const tempHue = pick([205, 210, 220, 45, 35, 25]); // blue-ish or warm-ish
    this.color = color ?? hsvToRgba(
      tempHue + rand(-8, 8),
      rand(0.05, 0.18),
      rand(0.92, 1.0),
      1
    );

    // Sparkle points (like little diffraction spikes)
    this.spikeCount = Math.random() < 0.5 ? 4 : 6;
    this.spikeLength = rand(6, 18) * lerp(0.5, 1.1, this.layer);

    // Companion orbiting body (planet/moon vibe)
    this.companion = null;
    if (hasCompanion) {
      this.companion = new OrbitingBody({
        host: this,
        orbitA: rand(10, 55) * lerp(0.7, 1.3, this.layer), // semi-major axis
        orbitB: rand(8, 40) * lerp(0.7, 1.2, this.layer),  // semi-minor axis
        orbitSpeed: rand(0.4, 1.6) * (0.6 + this.layer),
        radius: rand(0.8, 2.0) * lerp(0.6, 1.2, this.layer),
        color: hsvToRgba(rand(0, 360), rand(0.2, 0.55), rand(0.6, 0.95), 1),
        ring: Math.random() < 0.25,
      });
    }

    // Internal time accumulator for deterministic animation
    this.t = 0;
  }

  update(dt, canvas, wind = { x: 0, y: 0 }) {
    // dt in seconds (or pass 1 for frame-based)
    this.t += dt;

    // Drift with optional "wind" (nice for background ambience)
    this.x += (this.vx + wind.x * this.layer) * dt;
    this.y += (this.vy + wind.y * this.layer) * dt;

    if (canvas) {
      if (this.wrap) {
        // Wrap edges: seamless starfield
        if (this.x < -50) this.x = canvas.width + 50;
        if (this.x > canvas.width + 50) this.x = -50;
        if (this.y < -50) this.y = canvas.height + 50;
        if (this.y > canvas.height + 50) this.y = -50;
      } else {
        // Bounce (like your Atom)
        if (this.x < 0 || this.x > canvas.width) this.vx *= -1;
        if (this.y < 0 || this.y > canvas.height) this.vy *= -1;
      }
    }

    if (this.companion) this.companion.update(dt);
  }

  draw(ctx) {
    // Twinkle: a smooth, not-too-random shimmer
    // Trick: combine two sine waves so it's less “metronome”
    const tw = 1 + this.twinkleAmount * (
      Math.sin(this.phase + this.t * this.twinkleSpeed * 2.2) * 0.65 +
      Math.sin(this.phase * 0.7 + this.t * this.twinkleSpeed * 3.7) * 0.35
    );

    const r = this.baseRadius * tw;
    const alpha = this.baseAlpha * clamp(0.7 + (tw - 1) * 1.2, 0.25, 1.15);

    ctx.save();

    // Bloom / glow: draw big soft circles first, then the core
    // Trick: "lighter" blending gives that spacey additive glow
    ctx.globalCompositeOperation = "lighter";

    // Outer glow
    drawSoftGlow(ctx, this.x, this.y, r * 6.0, this.color, alpha * 0.10 * this.glowStrength);
    // Inner glow
    drawSoftGlow(ctx, this.x, this.y, r * 3.0, this.color, alpha * 0.18 * this.glowStrength);

    // Core
    ctx.globalAlpha = alpha;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, r, 0, Math.PI * 2);
    ctx.fill();

    // Spikes (optional)
    // Trick: rotate spikes slowly based on time for subtle liveliness
    const spin = this.t * 0.35 * (0.3 + this.layer);
    ctx.globalAlpha = alpha * 0.35;
    ctx.translate(this.x, this.y);
    ctx.rotate(spin);
    ctx.strokeStyle = this.color;
    ctx.lineWidth = Math.max(0.6, r * 0.45);

    for (let i = 0; i < this.spikeCount; i++) {
      const a = (i / this.spikeCount) * Math.PI;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * r * 0.6, Math.sin(a) * r * 0.6);
      ctx.lineTo(Math.cos(a) * (r + this.spikeLength), Math.sin(a) * (r + this.spikeLength));
      ctx.stroke();

      // opposite direction
      ctx.beginPath();
      ctx.moveTo(-Math.cos(a) * r * 0.6, -Math.sin(a) * r * 0.6);
      ctx.lineTo(-Math.cos(a) * (r + this.spikeLength), -Math.sin(a) * (r + this.spikeLength));
      ctx.stroke();
    }

    ctx.restore();

    // Companion should render after star glow so it feels in front
    if (this.companion) this.companion.draw(ctx);
  }
}

export class OrbitingBody {
  constructor({
    host,
    orbitA = 30,
    orbitB = 20,
    orbitSpeed = 1.0, // radians per second-ish
    orbitTilt = rand(-0.8, 0.8), // rotate ellipse
    radius = 1.5,
    color = "rgba(180,200,255,1)",
    ring = false,
  } = {}) {
    this.host = host;
    this.a = orbitA;
    this.b = orbitB;
    this.speed = orbitSpeed;
    this.tilt = orbitTilt;
    this.r = radius;
    this.color = color;
    this.ring = ring;

    this.theta = Math.random() * Math.PI * 2;
  }

  update(dt) {
    this.theta += this.speed * dt;
    if (this.theta > Math.PI * 2) this.theta -= Math.PI * 2;
  }

  draw(ctx) {
    const cosT = Math.cos(this.theta);
    const sinT = Math.sin(this.theta);

    // Ellipse point then tilt-rotate it
    const ex = cosT * this.a;
    const ey = sinT * this.b;

    const cosR = Math.cos(this.tilt);
    const sinR = Math.sin(this.tilt);

    const x = this.host.x + ex * cosR - ey * sinR;
    const y = this.host.y + ex * sinR + ey * cosR;

    // Optional orbit path (very faint)
    ctx.save();
    ctx.globalAlpha = 0.08 * this.host.baseAlpha;
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 1;
    ctx.beginPath();
    // ellipse doesn't support tilt in all browsers? it does on modern Canvas2D.
    ctx.ellipse(this.host.x, this.host.y, this.a, this.b, this.tilt, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // Planet/moon glow + body
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    drawSoftGlow(ctx, x, y, this.r * 5, this.color, 0.12 * this.host.baseAlpha);

    ctx.globalAlpha = 0.9 * this.host.baseAlpha;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(x, y, this.r, 0, Math.PI * 2);
    ctx.fill();

    if (this.ring) {
      ctx.globalAlpha = 0.22 * this.host.baseAlpha;
      ctx.strokeStyle = this.color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(x, y, this.r * 3.2, this.r * 1.4, this.tilt + 0.6, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }
}

/* ---------- Helpers ---------- */

function drawSoftGlow(ctx, x, y, radius, color, alpha) {
  // radial gradient = cheap bloom
  const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
  // We keep same color but fade alpha outward
  g.addColorStop(0.0, withAlpha(color, alpha));
  g.addColorStop(0.4, withAlpha(color, alpha * 0.35));
  g.addColorStop(1.0, withAlpha(color, 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
}

function withAlpha(rgba, a) {
  // expects rgba(...) or rgb(...)
  // If user passes a hex or named color, you can skip this & just use globalAlpha,
  // but we'll keep it simple & robust for rgba strings.
  if (rgba.startsWith("rgba(")) {
    return rgba.replace(/rgba\(([^)]+)\)/, (_, inside) => {
      const parts = inside.split(",").map(s => s.trim());
      return `rgba(${parts[0]}, ${parts[1]}, ${parts[2]}, ${a})`;
    });
  }
  if (rgba.startsWith("rgb(")) {
    return rgba.replace("rgb(", "rgba(").replace(")", `, ${a})`);
  }
  // fallback: rely on globalAlpha if it's not rgb/rgba
  return rgba;
}

function hsvToRgba(h, s, v, a = 1) {
  h = ((h % 360) + 360) % 360;
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r = 0, g = 0, b = 0;

  if (h < 60) { r = c; g = x; b = 0; }
  else if (h < 120) { r = x; g = c; b = 0; }
  else if (h < 180) { r = 0; g = c; b = x; }
  else if (h < 240) { r = 0; g = x; b = c; }
  else if (h < 300) { r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }

  const R = Math.round((r + m) * 255);
  const G = Math.round((g + m) * 255);
  const B = Math.round((b + m) * 255);
  return `rgba(${R}, ${G}, ${B}, ${a})`;
}

function rand(min, max) {
  return min + Math.random() * (max - min);
}

function pick(arr) {
  return arr[(Math.random() * arr.length) | 0];
}

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}



