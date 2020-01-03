'use strict';

module.exports = function(router) {
  return {
    alias: require('./alias')(router),
    params: require('./params')(router),
    accessHandler: require('./accessHandler')(router),
    addSubmissionResourceAccess: require('./addSubmissionResourceAccess')(router),
    bootstrapEntityOwner: require('./bootstrapEntityOwner')(router),
    bootstrapFormAccess: require('./bootstrapFormAccess')(router),
    bootstrapNewRoleAccess: require('./bootstrapNewRoleAccess')(router),
    bootstrapSubmissionAccess: require('./bootstrapSubmissionAccess')(router),
    condensePermissionTypes: require('./condensePermissionTypes')(router),
    condenseSubmissionPermissionTypes: require('./condenseSubmissionPermissionTypes')(router),
    filterIdCreate: require('./filterIdCreate')(router),
    filterMongooseExists: require('./filterMongooseExists')(router),
    filterResourcejsResponse: require('./filterResourcejsResponse')(router),
    filterProtectedFields: require('./filterProtectedFields')(router),
    formLoader: require('./formLoader')(router),
    deleteActionHandler: require('./deleteActionHandler')(router),
    deleteFormHandler: require('./deleteFormHandler')(router),
    deleteRoleHandler: require('./deleteRoleHandler')(router),
    deleteSubmissionHandler: require('./deleteSubmissionHandler')(router),
    formId: require('./formId')(router),
    formHandler: require('./formHandler')(router),
    formActionHandler: require('./formActionHandler')(router),
    ownerFilter: require('./ownerFilter')(router),
    permissionHandler: require('./permissionHandler')(router),
    loadPreviousSubmission: require('./loadPreviousSubmission')(router),
    setFilterQueryTypes: require('./setFilterQueryTypes')(router),
    sortMongooseQuery: require('./sortMongooseQuery')(router),
    submissionApplyPatch: require('./submissionApplyPatch')(router),
    submissionHandler: require('./submissionHandler')(router),
    submissionResourceAccessFilter: require('./submissionResourceAccessFilter')(router),
    tokenHandler: require('./tokenHandler')(router),
    restrictRequestTypes: require('./restrictRequestTypes')(router),
    filterIndex: require('./filterIndex')(router)
  };
};
