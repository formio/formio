//'use strict';
//
//let Spawn = require('threads').spawn;
////let Thread = require('./Thread');
//
//class Worker {
//  constructor(task, context, modules, timeout, callback) {
//    this.thread = new Spawn((input, done) => {
//      console.log(`thread spawn`);
//
//      try {
//        // Split the input for ease of use
//        let task = input.task;
//        let context = input.context;
//        let timeout = input.timeout;
//
//        //console.log(`task: `, task);
//        //console.log(`context: `, context);
//        //console.log(`timeout: `, timeout);
//
//        console.log(`typeof context: ${typeof context}`);
//        (Object.keys(context) || []).forEach(ctx => {
//          console.log(`[context] ${ctx}: ${context[ctx]}`)
//        });
//
//        console.log(`typeof context.environment: ${typeof context.environment}`);
//        (Object.keys(context.environment) || []).forEach(ctx => {
//          console.log(`[context.environment] ${ctx}: ${context.environment[ctx]}`)
//        });
//
//        (input.modules || []).forEach(module => {
//          context[module] = require(module);
//        });
//
//        // Create the vm environment.
//        let vm = require('vm');
//        let vmCode = new vm.Script(task);
//        let vmContext = new vm.createContext(context);
//        vmCode.runInContext(vmContext, { timeout });
//
//        return done(null, context);
//      }
//      catch (e) {
//        console.log(`Thread error..`);
//        console.log(e.message);
//        console.log(e.stack);
//        return done(e)
//      }
//    });
//
//
//    //this.thread = new Thread();
//    this.thread
//    .send({task, context, modules, timeout})
//    .on('message', response => {
//      console.log(`thread message: ${response}`);
//      Object.keys(response).forEach(item => {
//        console.log(`${item}: ${response[item]}`);
//      });
//
//      this.thread.kill();
//      return callback(null, response);
//    })
//    .on('error', err => {
//      console.log(`thread error: ${err}`);
//      return callback(err);
//    })
//    .on('exit', () => {
//      console.log(`thread exit`);
//    });
//  }
//}
//
//module.exports = Worker;
