'use strict';

const { classes } = require('@formio/form-api');

module.exports = class Example extends classes.Action {
  /**
   * Actions can either be triggered immediately or after being synced to a server (if using offline plugin). If this
   * is set to true, it will only be triggered on the server. This is useful for actions like email and webhook which
   * should only be triggered from the server, not the client.
   *
   * @returns {boolean}
   */
  static get serverOnly() {
    return true;
  }

  /**
   * Info returns the information about the action such as its name, running information and default settings. This
   * informs the action lists about what information to show about the action so it can be added to a form.
   *
   * @returns actionInfo
   */
  static info() {
    return {
      name: 'example',
      title: 'Example',
      description: 'An example action.',
      group: 'default', // To be used for action grouping on the actions page.
      priority: 10, // Order the actions. The lower the number, the earlier it is run.
      default: true, // If default, it will be automatically added to any new forms.
      defaults: { // Defaults for the action settings. You can include other default settings as well.
        handler: ['before'],
        method: ['create'],
        exampleSetting: 'Setting Default',
      },
      access: { // Whether to allow modifying the handler and method settings in action configuration.
        handler: true,
        method: true
      }
    };
  }

  /**
   * This returns the setting form used to configure the action when it is added to a form. You need to pass an array
   * of form.io components to the super.settingsForm to fully create the form. Settings can then be used in resolve to
   * change the behavior of the action.
   *
   * 'options' contains roles, components and baseUrl that can be used to configure the settingsForm.
   *
   * @param options
   * @returns {*}
   */
  static settingsForm(options) {
    return super.settingsForm(options, [
      {
        type: 'textfield',
        key: 'exampleSetting',
        input: true,
        label: 'Example Setting',
        description: 'An example setting field that a user can configure when adding an action to a form.',
      }
    ]);
  }

  /**
   * The main function that executes the action. You can access the settings with this.settings.
   *
   * @param data
   * @param req
   * @param res
   * @param setActionInfoMessage
   */
  resolve({ data, req, res }, setActionInfoMessage) {
    return Promise.resolve();
  }
};
