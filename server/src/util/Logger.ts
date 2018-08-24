// no var needed here, colors will attached colors
// to String.prototype
import "colors";
import config from "../config";

// create a noop (no operation) function for when loggin is disabled
const noop = function () { };
// check if logging is enabled in the config
// if it is, then use console.log
// if not then noop
const consoleLog = config.logging ? console.log.bind(console) : noop;
const consoleError = config.logging ? console.error.bind(console) : noop;

function getColorizedString(str: any, color: string) {
    return str[color];
}

function colorizeArgsByLogLevel(args: any[], logLevel: "log" | "error") {
    return args
        .map(function (arg) {
            if (typeof arg === "object") {
                // turn the object to a string so we
                // can log all the properties and color it
                const argStr = arg instanceof Error ? arg.stack : JSON.stringify(arg);
                return getColorizedString(argStr, logLevel === "error" ? "red" : "green");
            } else {
                // coerce to string to color
                arg += "";
                return getColorizedString(arg, logLevel === "error" ? "red" : "magenta");
            }
        });
}

const logger = {
    log: function (...args: any[]) {
        args = colorizeArgsByLogLevel(args, "log");
        // call either console.log or noop here
        // with the console object as the context
        // and the new colored args :)
        consoleLog.apply(console, args);
    },
    error: function (...args: any[]) {
        args = colorizeArgsByLogLevel(args, "error");
        // call either console.log or noop here
        // with the console object as the context
        // and the new colored args :)
        consoleError.apply(console, args);
    }
};

export default logger;