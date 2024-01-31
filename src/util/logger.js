const util = require("util");
const { format, createLogger, transports, config, } = require("winston");

const { combine, timestamp, label, printf ,colorize } = format;
 
const DailyRotateFile = require('winston-daily-rotate-file');

const formatObjectsAndArrays = (obj) => {
  if (typeof obj === 'object' && obj !== null) {
      if (Array.isArray(obj)) {
          return `[${obj.map(formatObjectsAndArrays).join(', ')}]`;
      } else {
          return `{ ${Object.entries(obj).map(([key, value]) => `${key}: ${formatObjectsAndArrays(value)}`).join(', ')} }`;
      }
  } else {
      return util.format('%s', obj);
  }
};


 
const logFolder = process.env.LOG_FOLDER || "./logs"
const logFile = "formio-%DATE%.log"
//Using the printf format.
const customFormat = printf(({ level, label, timestamp, ...meta}) => {
    const args = meta[Symbol.for('splat')];
     if(args) meta.message = util.format(meta.message, ...args);
     meta.message = formatObjectsAndArrays(meta.message);
  return `${timestamp} [${label}] ${level}: ${meta.message}`;
});

 
const transport = new DailyRotateFile({
  filename: logFile,
  dirname:logFolder,
  // datePattern: 'YYYY-MM-DD',
  maxFiles:"7d",
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