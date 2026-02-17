import { Config } from "@remotion/cli/config";

// Настройки для серверного рендеринга видео
Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
Config.setConcurrency(2); // Для 10 пользователей достаточно
Config.setCodec("h264");

// Дополнительные настройки для оптимизации
Config.setPixelFormat("yuv420p");
Config.setImageSequence(false);
// Качество устанавливается через CRF при рендеринге (18-28, где меньше = лучше)

export {};
