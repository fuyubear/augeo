// Logger to log to app.log file

// NOTE: By default, many modules have lines of code commented out of log output
//       which may contain PII; these commented out lines start with "// PRIVACY:".
//       Those lines of code should be commented out only if necessary (like debugging).
const pino = require("pino");

// when using start-with-pretty-logging use this logger below and comment out the other logger lines
// const logger = pino();

const logger = pino(
    {
        level: process.env.PINO_LOG_LEVEL || "info",
        formatters: {
            level: (label) => {
                return { level: label.toUpperCase() };
            },
        },
        timestamp: pino.stdTimeFunctions.isoTime,
    },
    pino.destination(`${__dirname}/app.log`)
);

module.exports.parentLogger = logger;
