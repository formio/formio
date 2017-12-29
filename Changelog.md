# Change Log
All notable changes to this project will be documented in this file

The format is based on [Keep a Changelog](http://keepachangelog.com/)
and this project adheres to [Semantic Versioning](http://semver.org/).

## [UNRELEASED]
### Fixed
 - CSV export when Select component within DataGrid component.
 - Do not replace the title and name during import if none are provided.
 
### Added
 - Custom Form properties.

## 1.23.7
### Changed
 - Allow people to provide their form access settings on POST.

### Fixed
 - Issue with CSV export crashing on fields within a datagrid.

## 1.23.6
### Fixed
 - Threading so that it will not block debugging ports.

## 1.23.5
### Fixed
 - Make async validators work properly and move select to joi validation.
 - Fix issue with importing subforms out of order.
 - Move sub form validation and submission to the appropriate areas so it works in conjunction with other functionality.
 - Hooks for tempTokens.

## 1.23.3
### Fixed
 - Problems with using temp tokens with remote environments.
 - Import order of subforms no longer crashes import.

## 1.23.2
### Fixed
 - Issues with problematic aggresive resource caching.

## 1.23.1
### Changed
 - Upgraded dependencies.

## 1.23.0
### Fixed
 - Datetime fields to be stored as MongoDB Date objects.

### Added
 - Ability to alter models dynamically.
 - Partial indexes for non-deleted entities.
 - Ability to provide dynamic sub-forms from parent form submissions.

### Changed
 - Upgrade all dependencies.

## 1.22.19
### Changed
 - Made the editgrid validation not dependant on the multiple flag in component settings.

## 1.22.18
### Fixed
 - Bugfix/FOR-809. Fix in CSVExporter for multivalue resource and select fields.
 - EditGrid validation.

## 1.22.17
## 1.22.16
## 1.22.15
### Fixed
 - Tests

## 1.22.14
### Fixed
 - A hook within the submission tests to get the right hook.alter.

## 1.22.13
### Added
 - Ability to alter validation form before submission validation occurs.

## 1.22.12
### Added
 - Enhancements to webhook actionz

### Fixed
 - Validation for Checkbox component with 'radio' type and 'name' option.

## 1.22.11
### Added
 - Allow altering of resources for forms.
 - Backend validation checks for select dropdown components.
 - Blocking webhook support
 - Possibility to add shortcuts.

## 1.22.10
### Fixed
 - Issue with the validation clearing out values when clearOnHide is set to false.

## 1.22.9
### Fixed
 - Issue where a database update would be able to occur.

## 1.22.7
### Changed
 - Ensure we are on a 3.1.0 db schema.

## 1.22.6
### Changed
 - Allow patch schema updates without stopping server start.

## 1.22.5
### Changed
 - Added update hook to remove previous machineName indexes.

### Fixed
 - Stop empty string removal on validation

## 1.22.4
### Fixed
 - More changes to machineName so that it is not enforced unique at mongo level to keep duplicate errors from occuring.

## 1.22.3
### Fixed
 - Machine name collisions on project import when there exists deleted entities.

## 1.22.2
### Fixed
 - The export and import to translate the form property on form components.

## 1.22.1
### Fixed
 - Issues with the machineKey not auto-incrementing and staying unique.

### Added
 - Ability to alter submission with a hook.
 - Possibility to use underscore in API key.

## 1.21.0
### Changed
 - Upgraded many dependencies to latest versions.

## 1.20.0
### Added
 - Add json logic validation

### Changed
 - Upgrade Joi to 1.11.1
 - Move custom javascript validation to Joi extension
 - Change validator to return all errors instead of only the first encountered
 - Return validation result along with errors
 - Return result on dryrun

## 1.19.7
### Fixed
 - Issue where data grid elements could not share name of parent element.

## 1.19.6
### Changed
 - Include the form settings within the export.

## 1.19.5
### Fixed
 - Added a try/catch around the checkConditionals so that it will not crash when a bad conditional is provided.

## 1.19.4
### Fixed
 - Submission validation with multi-value with empty strings would fail on the second save. Allow nulls.

## 1.19.3
### Added
 - Sub-submissions and validations for form components where the submissions are already not established.

## 1.19.2
### Fixed
 - Mongoose depcrecation warnings.

## 1.19.1
### Fixed
 - Allowed for the temp token hooks to be asynchronous.

### Added
 - Return SQL Server query results from get action

## 1.19.0
### Fixed
 - Datagrids with invalid rows will no longer remove those rows.
 - Validation errors on PUT will now return 400 instead of 500.
 - Required fields hidden with JSON logic will no longer throw validation errors.

## 1.18.14
### Fixed
 - Issue with import routine crashing on undefined function router.post.
### Added
 - A way to track the parent submission when viewing submissions submitted from multi-form workflows.

## 1.18.13
### Fixed
 - Merging of columns removes width, offset, push and pull settings.

## 1.18.12
### Fixed
 - The token generation for SSO tokens to not require erroneous parameters.
 - An issue with the Reset password action not working with case insensitive emails.
 - Data in a datagrid showing in email notifications.

## 1.18.10
### Added
 - Ability to modify the current form based on submission data before validation.
 - `start:dev` script for npm with Nodemon support.
### Fixed
 - An issue with custom validations with components within a datagrid were not working properly.
 - CSV export for Resource component and Select component with data source Resource / URL / JSON.

## 1.18.9
### Fixed
 - An issue where if you have clearOnHide not set, it would still clear out values for hidden fields.

## 1.18.6, 1.18.7, 1.18.8
### Fixed
 - Issue with unit tests from extended libraries that introduce new properties.

## 1.18.5
### Fixed
 - Issue with components still getting cleared even though clearOnHide is false.

## 1.18.4
### Added
 - The ability to import a custom project.json during installation.

### Fixed
 - Issue during installation where the paths would get all messed up.

## 1.18.3
### Added
 - The ability to provide "full=true" query parameter to the form load and retrieve the full form, including form components.

## 1.18.2
### Fixed
 - The possibility of the server crashing for reference fields.

## 1.18.1
### Fixed
 - The body limit for form sizes to allow forms up to 16mb in size (JSON format).

## 1.18.0
### Added
 - Method for having reference field types that can dynamically link to sub resources.

### Fixed
 - Deprecated validation handler in the Roles model.
 - 'Unknown resource' error on PUT of form which has multiple save actions to other resources

## 1.17.6
### Changed
 - Submission Resource Access are calculated on the server during submission instead of in the browser.

### Added
 - Allow roles to have their own permissions apart from default owner permissions.

## 1.17.5
### Fixed
 - Make sure to not run the temp token tests for customer docker deployment test runs.

## 1.17.4
### Added
 - A tempToken hook system to allow external libraries to modify temp token payloads.

## 1.17.3
### Fixed
 - The way that the debug flag was being checked for debugging purposes.

## 1.17.2
### Added
 - Allow exported action machine names to be altered.

### Fixed
 - Fixed debugger issues with the email threads, due to an issue with process forking using the parent process.
 - Automatic generation of action machine names to be form:action.
 - Don't attempt to set headers after response has been sent.

## 1.17.1
### Added
 - Allow template export steps to be altered with templateExportSteps
 - Allow default template to be modified.

### Changed
 - Change templateSteps to templateImportSteps
 - Updating the default template for new email actions to use the submission macro, rather than email, to change the
   output of signature components to be Yes/No

### Reverted
 - Revert project version back to 2.0.0 and use tag instead.

## 1.17.0
???

## 1.16.7
### Added
 - Adding entity query hooks to the import entities.

## 1.16.6
### Changed
 - Changed export filename to include version.
 - Changed export version to reference project version not export schema.

### Removed
 - Removed plan from export.

## 1.16.5
### Added
 - Template import / export tests
 - git pre commit hooks for linting
 - External token hooks

### Fixed
 - Template action imports could fail based on resources not existing at creation time.
 - customPrivate validations now work for components nested inside of layout components.

### Removed
 - Removed old template schema translations on import.

## 1.16.4
### Added
 - Added temporary auth token support. You can now generate new tokens using the
   /token endpoint with the following headers.
    - x-expire = The expiration of the token in seconds.
    - x-allow = The paths to allow for the token in the format: GET:/path/[0-9a-z]+

## 1.16.3
### Added
 - Make action handlers alterable.
 - Add mongo indices to all entities.
