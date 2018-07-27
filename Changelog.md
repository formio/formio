# Change Log
All notable changes to this project will be documented in this file

The format is based on [Keep a Changelog](http://keepachangelog.com/)
and this project adheres to [Semantic Versioning](http://semver.org/)

## 1.33.0
### Added
 - Introduced an "Everyone" permission which applies to Anonymous + all Roles.

### Changed
 - Fixed dependency deprecation and vulnerabilities.
 - Fixed the permission handler to work as expected with "owner" permissions.
 - Upgraded dependencies.

## 1.32.0
### Changed
 - Upgraded colors@1.3.1, mongoose@5.2.4, nodemon@1.18.3, mysql@2.16.0, eslint@5.2.0, fs-extra@7.0.0, method-override@3.0.0

### Fixed
 - Issue with SQL Action for update commands.

### Added
 - maxWords and minWords validation.

## 1.31.4
### Fixed
 - Fixed the machine names to be performant and without special chars.
 - Allow admins the ability to see all anonymous submissions
 - Issues where the validator would crash for certain JSON form structures.

### Changed
 - formiojs@2.32.3, mongodb@3.1.1, mongoose@5.2.3, eslint@5.1.0, nodemon@1.18.1, bcrypt@3.0.0

### Added
 - Date converting for filter.

## 1.31.2
### Added
 - The original message type of an email to the message payload.

## 1.31.1
### Changed
 - Moved all instances of mongoose to use a single entity provided within the formio object.

## 1.31.0
### Fixed
 - Make select query validation use caching to limit requests being made.
 - CSV export of wysiwyg
 - Webhook improvements

### Changed
 - Upgrade mongoose@5.1.7, nodemailer@4.6.7, jsonwebtoken@8.3.0, eslint@5.0.1

## 1.30.2
### Fixed
 - Problems with the machine name generation where numbers in the project name would mess it up.

## 1.30.1
### Fixed
 - Issues with the machine name generation for names with more than 10 instances.

## 1.30.0
### Added
 - Ability for email templates to execute from workers library.
 - Validation changes for multi-mask fields
 - Ability to configure email transports via hooks.

### Changed
 - Upgraded JSONStream@1.3.3, async@2.6.1, body-parser@1.18.3, mongodb@3.0.8, nodemailer@4.6.5, vanilla-text-mask@5.1.1, nodemon@1.17.5, colors@1.3.0, csv@3.1.0, formiojs@2.32.2, joi@13.3.0, mongoose@5.1.3, nodemailer-mailgun-transport@1.4.0, request@2.87.0, mocha@5.2.0, supertest@3.1.0, fs-extra@6.0.1, adm-zip@0.4.11

## 1.29.2
### Fixed
 - Potential crash when merging forms when one row was empty or missing.

## 1.29.1
### Changed
 - Upgraded resourcejs to v1.23.1 to fix issue with number filtering.

## 1.29.0
### Added
 - Ability to calculate values of fields on server.

## 1.28.0
### Added
 - Unique validation for objects.

### Fixed
 - Issues with DataGrid exports.
 - Issues with DateTime filters on index apis.

### Changed
 - Upgraded dependencies.

## 1.27.3
### Fixed
 - Save as reference issues with multiple configuration.
 - Problems with using the "exists" endpoint with the new converted ObjectId's
 - Problems with providing an _id filter when using save as reference indexes.

### Changed
 - Upgraded formiojs@2.30.1, mongoose@5.0.12, nodemailer@4.6.4, nodemon@1.17.3, moment@2.22.0

### Added
 - Email view for File component.

## 1.27.2
### Fixed
 - Problem where some values would get converted to ObjectIds and then would not work with indexing.

## 1.27.1
### Changed
 - Upgraded express@4.16.3, mongodb@3.0.5, mongoose@5.0.11, nodemailer@4.6.3, mocha@5.0.5, nodemon@1.17.2, colors@1.2.1, formiojs@2.30.0, request@2.85.0, eslint@4.19.1

## 1.27.0
### Changed
 - Convert all sub-document submissions to use ObjectId's for form, owner, and _id.
 - Added recommended indexes for performance.

## 1.26.8
### Fixed
 - Problem where the references could get in a state where the Id's are not ObjectIds.
 - Running the update hook to fix the references again to ensure they are all ObjectIds.

## 1.26.7
### Fixed
 - Issues with single record save-as-reference where previous submission would mess up queries.
 - Problems with the SMTP settings where username and password could be optional.

## 1.26.6
### Fixed
 - Problems with the save-as-reference not working with empty references.

## 1.26.5
### Fixed
 - Fixed some filtering issues with Save as reference.

## 1.26.4
### Fixed
 - Potential crash within the CSV export functions.

## 1.26.3
### Fixed
 - Refactored the save-as-reference so pagination + sort works as expected.

## 1.26.2
### Fixed
 - Pagination issues with save-as-reference

## 1.26.1
### Fixed
 - Correct sorting for save-as-reference when there are more items than references.
 - Issues with save-as-reference lookup for single references.

## 1.26.0
### Fixed
 - Some more issues with save as reference features.

### Changed
 - Resourcejs to allow fix date values.
 - Upgrade dependencies.

## 1.25.12
### Fixed
 - The form component unique validation to only care about input components.

## 1.25.11
### Fixed
 - Issues with the store as reference features.

## 1.25.10
### Fixed
 - The filter and sort index queries for referenced fields.

## 1.25.9
### Fixed
 - CSV exporter that would throw an error for DateTime components.
 - Issue where hidden components that have a value set remove their parent containers or datagrids.
 - Ensure sub-requests get their own cloned request paramters.
 - Issue with the field parameter actions would execute twice unintentionally.
 - Issue where empty list of references would fail the request.

## 1.25.8
### Fixed
 - Some potential undefined references causing crashes.
 - A bunch of small bugs in CSV export.

## 1.25.7
### Fixed
 - Issue with the resource references index query taking too long and taking a lot of memory.
 - Problems with using cloneDeep on sub-requests which would gobble up memory.

## 1.25.8
### Fixed
 - Problems with sub-responses calling methods that do not exist.

### Changed
 - Upgraded formiojs (2.29.5), nodemailer (4.5.0), nunjucks (3.1.0)
 - Upgraded mongoose to 5.0.6, formio.js to 2.29.2

## 1.25.4
### Changed
 - Removed all calls to snapshot since it was causing serious performance regressions.

## 1.25.3
### Fixed
 - Problem with the owner property not getting set properly when they are an admin.

## 1.25.2
### Changed
 - Upgrade config@1.29.4, joi@13.1.2, lodash@4.17.5, eslint@4.17.0

### Fixed
 - A potential crash when assigning submission resource access.

## 1.25.1
### Changed
 - Upgraded MongoDB driver to 3.0.2, Mongoose 5.0.3

### Added
 - Add list querystring to allow more efficient list returns.
 - Field Logic handling.

### Fixed
 - Fix required multi-value fields not returning required.
 - Fix the way rows are found for datagrid checkConditionals.
 - Fix email actions for external authentication (User doesn't exist in form.io)
 - Fixed an issue where the token handler would return 401 when it should try as anonymous.

## 1.25.0
### Changed
 - Upgrade MongoDB (v3) and Mongoose (v5) to latest versions.

## 1.24.7
### Fixed
 - Potential crashes in CSV export and template imports.

## 1.24.6
### Changed
 - Removed a bunch of superfluous debug messages for memory and performance improvements.

## 1.24.5
### Fixed
 - Tests to refer to the correct helper template instead of the global one.

## 1.24.4
### Fixed
 - Submission index queries that filter based on the user owner.

## 1.24.3
### Fixed
 - Problems with the Save as Reference for Select dropdowns and other bugs.
 - Connection issues with SQL Action.

### Changed
 - ES6 cleanup items.

## 1.24.2
### Fixed
 - Issue where the metadata property for submissions was getting stripped out.
 - DateTime component export.

## 1.24.1
### Changed
 - Upgraded resourcejs to latest version.

## 1.24.0
### Changed
 - Upgraded all dependencies.

## 1.23.12
### Changed
 - Upgraded resourcejs to fix crash in index queries.

## 1.23.11
### Changed
 - The owner property to be either a MongoID or a string with custom value.
 - Converted some code into ES6 patterns.

### Added
 - Hook into the export capabilities.

## 1.23.10
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
