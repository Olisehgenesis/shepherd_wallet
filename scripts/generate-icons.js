import sharp from "sharp";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SOURCE = process.argv[2] || path.join(ROOT, "icon.svg");
const WEB_PUBLIC = path.join(ROOT, "apps/web/public");
const EXT_PUBLIC = path.join(ROOT, "apps/ext/public");
const EXT_ICONS = path.join(EXT_PUBLIC, "icons");

const EXTENSION_SIZES = [16, 32, 48, 128];
const ACTION_SIZES = [16, 24, 32];
const WEB_MAP = [
  [32, "favicon.png"],
  [64, "icon-64.png"],
  [128, "icon-128.png"],
  [192, "icon.png"],
];

async function writePng(buffer, size, outPath) {
  await sharp(buffer)
    .resize(size, size, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toFile(outPath);
  console.log(`Generated: ${outPath} (${size}x${size})`);
}

async function main() {
  const sourceBuffer = fs.readFileSync(SOURCE);
  fs.mkdirSync(EXT_ICONS, { recursive: true });
  fs.mkdirSync(WEB_PUBLIC, { recursive: true });
  fs.mkdirSync(EXT_PUBLIC, { recursive: true });

  for (const size of EXTENSION_SIZES) {
    await writePng(sourceBuffer, size, path.join(EXT_ICONS, `icon${size}.png`));
  }
  for (const size of ACTION_SIZES) {
    await writePng(sourceBuffer, size, path.join(EXT_ICONS, `action${size}.png`));
  }
  for (const [size, name] of WEB_MAP) {
    await writePng(sourceBuffer, size, path.join(WEB_PUBLIC, name));
    await writePng(sourceBuffer, size, path.join(EXT_PUBLIC, name));
  }

  // Keep SVG favicon in sync with source mark
  const svg = fs.readFileSync(SOURCE, "utf8");
  fs.writeFileSync(path.join(WEB_PUBLIC, "favicon.svg"), svg);
  fs.writeFileSync(path.join(EXT_PUBLIC, "favicon.svg"), svg);

  console.log("\nAll icons generated successfully.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
