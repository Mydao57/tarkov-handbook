import { logger } from "./logger.js";
import { startWebPanel } from "./server.js";

startWebPanel().catch((err) => {
  logger.error("Failed to start the admin panel:", err);
  process.exit(1);
});
