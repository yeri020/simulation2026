const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { spawnSync } = require("node:child_process");
const { chromium } = require("playwright-core");
const ffmpeg = process.env.FFMPEG_PATH || require("ffmpeg-static");

const root = __dirname;
const htmlPath = path.join(root, "intro.html");
const outputDir = path.join(root, "assets");
const videoPath = path.join(outputDir, "concept-quest-intro.mp4");
const audioPath = path.join(outputDir, "concept-quest-intro.wav");
const isStoryboard = process.argv.includes("--storyboard");
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "concept-quest-render-"));
const storyboardPath = path.join(os.tmpdir(), "concept-quest-beat-storyboard.png");

function runFfmpeg(args) {
  if (!ffmpeg || !fs.existsSync(ffmpeg)) {
    throw new Error("FFmpeg was not found. Set FFMPEG_PATH to the FFmpeg executable.");
  }
  const result = spawnSync(ffmpeg, args, { stdio: "inherit", windowsHide: true });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`FFmpeg exited with status ${result.status}`);
}

function findBrowser() {
  const candidates = [
    process.env.BROWSER_EXECUTABLE,
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/microsoft-edge",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
  ].filter(Boolean);
  const executable = candidates.find((candidate) => fs.existsSync(candidate));
  if (!executable) throw new Error("Install Chrome or Edge, or set BROWSER_EXECUTABLE.");
  return executable;
}

async function main() {
  fs.mkdirSync(outputDir, { recursive: true });
  const browser = await chromium.launch({
    executablePath: findBrowser(),
    headless: true,
    args: ["--allow-file-access-from-files"],
  });
  try {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
    const renderUrl = `${pathToFileURL(htmlPath).href}?render=1`;
    await page.goto(renderUrl, { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready);
    const fontLoaded = await page.evaluate(() => document.fonts.check('900 180px "Noto Sans KR"'));
    if (!fontLoaded) throw new Error("Noto Sans KR did not finish loading.");

    if (isStoryboard) {
      for (let beat = 0; beat < 30; beat++) {
        await page.evaluate((time) => window.seek(time), beat * 0.5);
        await page.screenshot({
          path: path.join(tempDir, `beat-${String(beat).padStart(2, "0")}.jpg`),
          type: "jpeg",
          quality: 92,
        });
      }
      runFfmpeg([
        "-y", "-hide_banner", "-loglevel", "error",
        "-framerate", "1",
        "-i", path.join(tempDir, "beat-%02d.jpg"),
        "-vf", "tile=5x6",
        "-frames:v", "1",
        storyboardPath,
      ]);
      console.log(`Beat storyboard: ${storyboardPath}`);
      return;
    }

    const wavBase64 = await page.evaluate(() => window.renderWavBase64());
    fs.writeFileSync(audioPath, Buffer.from(wavBase64, "base64"));
    const totalFrames = 15 * 60 * 3;
    for (let frame = 0; frame < totalFrames; frame++) {
      await page.evaluate((time) => window.seek(time), frame / 180);
      await page.screenshot({
        path: path.join(tempDir, `frame-${String(frame).padStart(5, "0")}.jpg`),
        type: "jpeg",
        quality: 93,
      });
    }
    runFfmpeg([
      "-y", "-hide_banner", "-loglevel", "warning",
      "-framerate", "180",
      "-i", path.join(tempDir, "frame-%05d.jpg"),
      "-i", audioPath,
      "-filter:v", "tmix=frames=3:weights='1 1 1':scale=0,fps=60,format=yuv420p",
      "-frames:v", "900",
      "-t", "15",
      "-c:v", "libx264",
      "-preset", "medium",
      "-crf", "17",
      "-c:a", "aac",
      "-b:a", "192k",
      "-movflags", "+faststart",
      videoPath,
    ]);
    console.log(`Rendered ${videoPath}`);
    console.log(`Soundtrack ${audioPath}`);
  } finally {
    await browser.close();
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
