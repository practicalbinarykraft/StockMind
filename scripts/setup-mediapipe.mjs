import { cpSync, mkdirSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const dest = resolve(root, "client/public/mediapipe");
const wasmSrc = resolve(root, "node_modules/@mediapipe/tasks-vision/wasm");
const modelDest = resolve(dest, "selfie_segmenter.tflite");
const modelUrl =
  "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite";

mkdirSync(dest, { recursive: true });

const wasmFiles = [
  "vision_wasm_internal.js",
  "vision_wasm_internal.wasm",
  "vision_wasm_nosimd_internal.js",
  "vision_wasm_nosimd_internal.wasm",
];

let copied = 0;
for (const f of wasmFiles) {
  const src = resolve(wasmSrc, f);
  const dst = resolve(dest, f);
  if (!existsSync(dst)) {
    cpSync(src, dst);
    copied++;
  }
}
if (copied) console.log(`[setup-mediapipe] Copied ${copied} WASM files`);

if (!existsSync(modelDest)) {
  console.log("[setup-mediapipe] Downloading selfie_segmenter model...");
  try {
    execSync(`curl -L -o "${modelDest}" "${modelUrl}"`, { stdio: "inherit" });
    console.log("[setup-mediapipe] Model downloaded");
  } catch {
    console.warn(
      "[setup-mediapipe] Could not download model via curl. " +
        "Please manually download from:\n  " +
        modelUrl +
        "\n  and place it at: " +
        modelDest
    );
  }
}

console.log("[setup-mediapipe] Done");
