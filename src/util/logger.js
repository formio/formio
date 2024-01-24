const { format, createLogger, transports, config, } = require("winston");

const jsonStringify = require('fast-safe-stringify');

const { combine, timestamp, label, printf ,colorize } = format;
 
const DailyRotateFile = require('winston-daily-rotate-file');

 
 
const logFolder = process.env.LOG_FOLDER || "./logs"
const logFile = "formio-%DATE%.log"
//Using the printf format.
const customFormat = printf(({ level, message, label, timestamp, ...meta}) => {
 
    const args = meta[Symbol.for('splat')];
 
    const strArgs = args?.map(jsonStringify).join(' ') || '';
 
  return `${timestamp} [${label}] ${level}: ${message} ${strArgs}`;
});

 
const transport = new DailyRotateFile({
  filename: logFile,
  dirname:logFolder,
  // datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
 });

 transport.on('rotate', function(oldFilename, newFilename) {
   console.log(oldFilename,newFilename)
});
const logger = (event) => {
    const log = createLogger({
        levels:config.npm.levels,
        format: combine(label({ label: event }), timestamp(), customFormat, colorize()),
        transports: [
          transport
        ],
      });
      
  if (process.env.NODE_ENV !== 'production') {
    log.add(new  transports.Console({
        format: combine(label({ label: event }), timestamp(), customFormat,colorize()),
    }));
  }
      return log;
}
  
 

  
module.exports = logger;