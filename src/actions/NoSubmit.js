'use strict';
module.exports = function(router) {
  var Action = router.formio.Action;

  /**
   * NoSubmit class.
   *   This class is used to create the Email action.
   *
   * @constructor
   */
  var NoSubmit = function(data, req, res) {
    Action.call(this, data, req, res);
  };

  // Derive from Action.
  NoSubmit.prototype = Object.create(Action.prototype);
  NoSubmit.prototype.constructor = NoSubmit;
  NoSubmit.info = function(req, res, next) {
    next(null, {
      name: 'nosubmit',
      title: 'Skip Form Submission',
      description: 'Skips the form submission.',
      priority: 0,
      defaults: {
        handler: ['before'],
        method: ['create', 'update']
      },
      access: {
        handler: false,
        method: false
      }
    });
  };

  /**
   * Settings form for no submit action.
   *
   * @param req
   * @param res
   * @param next
   */
  NoSubmit.settingsForm = function(req, res, next) {
    next(null, {});
  };

  /**
   * Send emails to people.
   *
   * @param req
   *   The Express request object.
   * @param res
   *   The Express response object.
   * @param cb
   *   The callback function to execute upon completion.
   */
  NoSubmit.prototype.resolve = function(handler, method, req, res, next) {
    req.disableDefaultAction = true;
    req.skipResource = true;
    next();
  };

  // Return the NoSubmit.
  return NoSubmit;
};
