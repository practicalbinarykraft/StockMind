import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
Config.setConcurrency(2);
Config.setCodec("h264");
Config.setPixelFormat("yuv420p");
Config.setImageSequence(false);

if (process.platform === "linux") {
  Config.setChromiumOpenGlRenderer("angle");
}
