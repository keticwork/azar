import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

const palette = {
  ink: '#17202A',
  surface: '#F5F7FA',
  muted: '#E2E8F0',
  coin: '#E8B449',
  teal: '#57B8A4',
  white: '#FFFFFF',
};

function hexToRgba(hex, alpha = 255) {
  const clean = hex.replace('#', '');
  return [
    parseInt(clean.slice(0, 2), 16),
    parseInt(clean.slice(2, 4), 16),
    parseInt(clean.slice(4, 6), 16),
    alpha,
  ];
}

function createImage(width, height, background = [0, 0, 0, 0]) {
  const data = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 4;
      data[index] = background[0];
      data[index + 1] = background[1];
      data[index + 2] = background[2];
      data[index + 3] = background[3];
    }
  }
  return { width, height, data };
}

function blendPixel(image, x, y, color) {
  const ix = Math.round(x);
  const iy = Math.round(y);
  if (ix < 0 || iy < 0 || ix >= image.width || iy >= image.height) {
    return;
  }

  const index = (iy * image.width + ix) * 4;
  const alpha = color[3] / 255;
  const inverseAlpha = 1 - alpha;
  image.data[index] = Math.round(color[0] * alpha + image.data[index] * inverseAlpha);
  image.data[index + 1] = Math.round(color[1] * alpha + image.data[index + 1] * inverseAlpha);
  image.data[index + 2] = Math.round(color[2] * alpha + image.data[index + 2] * inverseAlpha);
  image.data[index + 3] = Math.min(255, Math.round(color[3] + image.data[index + 3] * inverseAlpha));
}

function fillRect(image, x, y, width, height, color) {
  const minX = Math.max(0, Math.floor(x));
  const minY = Math.max(0, Math.floor(y));
  const maxX = Math.min(image.width, Math.ceil(x + width));
  const maxY = Math.min(image.height, Math.ceil(y + height));

  for (let py = minY; py < maxY; py += 1) {
    for (let px = minX; px < maxX; px += 1) {
      blendPixel(image, px, py, color);
    }
  }
}

function fillCircle(image, cx, cy, radius, color, predicate) {
  const minX = Math.max(0, Math.floor(cx - radius));
  const maxX = Math.min(image.width - 1, Math.ceil(cx + radius));
  const minY = Math.max(0, Math.floor(cy - radius));
  const maxY = Math.min(image.height - 1, Math.ceil(cy + radius));
  const radiusSquared = radius * radius;

  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= radiusSquared && (!predicate || predicate(x, y))) {
        blendPixel(image, x, y, color);
      }
    }
  }
}

function strokeCircle(image, cx, cy, radius, width, color) {
  const minX = Math.max(0, Math.floor(cx - radius));
  const maxX = Math.min(image.width - 1, Math.ceil(cx + radius));
  const minY = Math.max(0, Math.floor(cy - radius));
  const maxY = Math.min(image.height - 1, Math.ceil(cy + radius));
  const outer = radius * radius;
  const innerRadius = radius - width;
  const inner = innerRadius * innerRadius;

  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const dx = x - cx;
      const dy = y - cy;
      const distanceSquared = dx * dx + dy * dy;
      if (distanceSquared <= outer && distanceSquared >= inner) {
        blendPixel(image, x, y, color);
      }
    }
  }
}

function pointInPolygon(x, y, points) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i, i += 1) {
    const xi = points[i][0];
    const yi = points[i][1];
    const xj = points[j][0];
    const yj = points[j][1];
    const intersects = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersects) {
      inside = !inside;
    }
  }
  return inside;
}

function fillPolygon(image, points, color) {
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  const minX = Math.max(0, Math.floor(Math.min(...xs)));
  const maxX = Math.min(image.width - 1, Math.ceil(Math.max(...xs)));
  const minY = Math.max(0, Math.floor(Math.min(...ys)));
  const maxY = Math.min(image.height - 1, Math.ceil(Math.max(...ys)));

  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      if (pointInPolygon(x + 0.5, y + 0.5, points)) {
        blendPixel(image, x, y, color);
      }
    }
  }
}

function drawAzarCoin(image, cx, cy, radius, options = {}) {
  const scale = radius / 360;
  const coin = hexToRgba(palette.coin);
  const teal = hexToRgba(palette.teal);
  const ink = hexToRgba(options.monochrome ? palette.white : palette.ink);
  const ring = hexToRgba(palette.white, options.monochrome ? 255 : 190);

  if (!options.transparentShadow) {
    fillCircle(image, cx, cy + 22 * scale, radius + 18 * scale, hexToRgba('#CBD5E1', 120));
  }

  fillCircle(image, cx, cy, radius, coin);
  fillCircle(image, cx, cy, radius, teal, (x, y) => x + y > cx + cy + 118 * scale);
  strokeCircle(image, cx, cy, radius - 54 * scale, 28 * scale, ring);
  strokeCircle(image, cx, cy, radius - 2 * scale, 10 * scale, hexToRgba(palette.ink, 40));
  fillCircle(image, cx - 116 * scale, cy - 128 * scale, 32 * scale, hexToRgba(palette.white, 115));

  const a = (points) => points.map(([x, y]) => [cx + x * scale, cy + y * scale]);
  fillPolygon(image, a([
    [-132, 150],
    [-72, 150],
    [-8, -122],
    [-58, -122],
  ]), ink);
  fillPolygon(image, a([
    [16, -122],
    [82, 150],
    [146, 150],
    [60, -150],
  ]), ink);
  fillPolygon(image, a([
    [-48, 30],
    [72, 30],
    [88, 88],
    [-62, 88],
  ]), ink);
}

function writePng(path, image, options = {}) {
  const includeAlpha = options.alpha !== false;
  const channels = includeAlpha ? 4 : 3;
  const scanlineLength = image.width * channels + 1;
  const raw = Buffer.alloc(scanlineLength * image.height);

  for (let y = 0; y < image.height; y += 1) {
    raw[y * scanlineLength] = 0;
    if (includeAlpha) {
      image.data.copy(
        raw,
        y * scanlineLength + 1,
        y * image.width * 4,
        (y + 1) * image.width * 4,
      );
    } else {
      for (let x = 0; x < image.width; x += 1) {
        const source = (y * image.width + x) * 4;
        const target = y * scanlineLength + 1 + x * 3;
        raw[target] = image.data[source];
        raw[target + 1] = image.data[source + 1];
        raw[target + 2] = image.data[source + 2];
      }
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(image.width, 0);
  ihdr.writeUInt32BE(image.height, 4);
  ihdr[8] = 8;
  ihdr[9] = includeAlpha ? 6 : 2;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const png = Buffer.concat([
    PNG_SIGNATURE,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);

  writeFileSync(path, png);
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function crc32(buffer) {
  let crc = -1;
  for (const byte of buffer) {
    crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ byte) & 0xff];
  }
  return (crc ^ -1) >>> 0;
}

const CRC_TABLE = Array.from({ length: 256 }, (_, index) => {
  let c = index;
  for (let k = 0; k < 8; k += 1) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  return c >>> 0;
});

const icon = createImage(1024, 1024, hexToRgba(palette.surface));
fillCircle(icon, 160, 140, 145, hexToRgba(palette.teal, 38));
fillCircle(icon, 888, 850, 180, hexToRgba(palette.coin, 56));
drawAzarCoin(icon, 512, 520, 358);
writePng('assets/icon.png', icon, { alpha: false });

const splash = createImage(1024, 1024, [0, 0, 0, 0]);
drawAzarCoin(splash, 512, 512, 260, { transparentShadow: true });
writePng('assets/splash-icon.png', splash);

const foreground = createImage(512, 512, [0, 0, 0, 0]);
drawAzarCoin(foreground, 256, 256, 178, { transparentShadow: true });
writePng('assets/android-icon-foreground.png', foreground);

const background = createImage(512, 512, hexToRgba(palette.surface));
fillCircle(background, 72, 72, 92, hexToRgba(palette.teal, 40));
fillCircle(background, 444, 438, 120, hexToRgba(palette.coin, 60));
writePng('assets/android-icon-background.png', background);

const monochrome = createImage(512, 512, [0, 0, 0, 0]);
drawAzarCoin(monochrome, 256, 256, 178, {
  monochrome: true,
  transparentShadow: true,
});
writePng('assets/android-icon-monochrome.png', monochrome);

const favicon = createImage(48, 48, hexToRgba(palette.surface));
drawAzarCoin(favicon, 24, 24, 17, { transparentShadow: true });
writePng('assets/favicon.png', favicon);
