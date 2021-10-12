import logger from "./logger";
import dotenv from "dotenv";
import fs from "fs";

if (fs.existsSync(".env")) {
    logger.debug("Using .env file to supply config environment variables");
    dotenv.config({ path: ".env" });
} else {
    logger.debug("Using .env.example file to supply config environment variables");
    dotenv.config({ path: ".env.example" });  // you can delete this after you create your own .env file!
}
export const ENVIRONMENT = process.env.NODE_ENV;
const prod = ENVIRONMENT === "production"; // Anything else is treated as 'dev'

export const SESSION_SECRET = process.env["SESSION_SECRET"];
export const MONGODB_URI = prod ? process.env["MONGODB_URI"] : process.env["MONGODB_URI_LOCAL"];
export const RATE_LIMIT_WINDOWMS = process.env["RATE_LIMIT_WINDOWMS"];
export const RATE_LIMIT_MAX = process.env["RATE_LIMIT_MAX"];
export const CROS_ORIGIN = process.env["CROS_ORIGIN"];

if (!SESSION_SECRET) {
    logger.error("No client secret. Set SESSION_SECRET environment variable.");
    process.exit(1);
}

if (!MONGODB_URI) {
    if (prod) {
        logger.error("No mongo connection string. Set MONGODB_URI environment variable.");
    } else {
        logger.error("No mongo connection string. Set MONGODB_URI_LOCAL environment variable.");
    }
    process.exit(1);
}

if(!RATE_LIMIT_WINDOWMS || isNaN(Number(RATE_LIMIT_WINDOWMS))) {
    logger.error("No rate limit windowms defined. Set RATE_LIMIT_WINDOWMS environment variable.");
    process.exit(1);
}

if(!RATE_LIMIT_MAX || isNaN(Number(RATE_LIMIT_MAX))) {
    logger.error("No rate limit max defined. Set RATE_LIMIT_MAX environment variable.");
    process.exit(1);
}

if(!CROS_ORIGIN) {
    logger.error("No cros origin defined. Set CROS_ORIGIN environment variable.");
    process.exit(1);
}