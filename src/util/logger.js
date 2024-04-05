const util = require("util");
const path = require('path');
const fs = require('fs')
const { format, createLogger, config, } = require("winston");

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
const archivedFolder = logFolder+"/archived"
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
  maxFiles:"2",
  zippedArchive: true,
 });

 transport.on('archive', async function (file) {
  if (!fs.existsSync(archivedFolder)) {
    // Create the folder if it doesn't exist
    fs.mkdirSync(archivedFolder, { recursive: true });
  }

  const parsedData = path.parse(file);
  const pathName = parsedData.base;
  fs.promises.rename(path.join(logFolder, pathName), path.join(archivedFolder, pathName))
  .then(async(res)=>{
    fs.readdir(archivedFolder,(err,files)=>{
      if(files.length > 6){
          fs.unlink(path.join(archivedFolder, files[0]),(err)=>{
          if(err) console.log(err)
      })
       }
  });

  })

});


const logger = (event) => {
    const log = createLogger({
        levels:config.npm.levels,
        format: combine(label({ label: event }), timestamp(), customFormat, colorize()),
        transports: [
          transport
        ],
      });
      
  // if (process.env.NODE_ENV !== 'production') {
  //   log.add(new  transports.Console({
  //       format: combine(label({ label: event }), timestamp(), customFormat,colorize()),
  //   }));
  // }
      return log;
}
  
 

  
module.exports = logger;