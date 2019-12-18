(function() {
  'use strict';
  angular
    .module('formioApp')
    .config([
      'AppConfig',
      'FormioProvider',
      'FormioAuthProvider',
      '$locationProvider',
      function(
        AppConfig,
        FormioProvider,
        FormioAuthProvider,
        $locationProvider
      ) {
        $locationProvider.hashPrefix('');
        FormioProvider.setAppUrl(AppConfig.appUrl);
        FormioProvider.setApiUrl(AppConfig.apiUrl);
        FormioAuthProvider.setForceAuth(true);
        FormioAuthProvider.setStates('auth.login', 'home');
        FormioAuthProvider.register('login', 'user', 'login');
      }
    ]);
})();
