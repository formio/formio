# Change Log
All notable changes to this project will be documented in this file

The format is based on [Keep a Changelog](http://keepachangelog.com/)
and this project adheres to [Semantic Versioning](http://semver.org/)//

## 3.5.2-rc.1
### Changed
 - Updated formiojs@4.19.2-rc.1
 - Updated formio-workers@1.21.2-rc.1

## 3.5.1
### Changed
 - Official Release
 - Updated formiojs@4.19.1
 - Updated formio-workers@1.21.1

## 3.5.1-rc.4
### Changed
 - Updated formiojs@4.19.1-rc.4
 - Updated formio-workers@1.21.1-rc.4

## 3.5.1-rc.3
### Changed
 - Updated formiojs@4.19.1-rc.3
 - Updated formio-workers@1.21.1-rc.3

## 3.5.1-rc.2
### Changed
 - Updated formiojs@4.19.1-rc.2
 - Updated formio-workers@1.21.1-rc.2

### Changed
 - FIO-8087: Fixes an issue where Email Action with logs enabled don't render nested form value and shows ID instead
   
## 3.5.1-rc.1
### Changed
 - Updated formiojs@4.19.1-rc.1
 - Updated formio-workers@1.21.1-rc.1
 - FIO-7623: Fixes an issue where Email action with Logs turned on will fail for the nested form with Attach Submission PDF

 - FIO-7671: add features test for compound indexes that contain nested paths
   
## 3.5.0
### Changed
 - Official Release
 - Updated formiojs@4.19.0
 - Updated formio-workers@1.21.0

## 3.5.0-rc.6
### Changed
 - Updated formiojs@4.19.0-rc.7
 - Updated formio-workers@1.21.0-rc.6

## 3.5.0-rc.5
### Changed
 - Updated formiojs@4.19.0-rc.6
 - Updated formio-workers@1.21.0-rc.5
 - FIO-7498 Changed the passing of a data field to decrypt hook

## 3.5.0-rc.4
### Changed
 - Updated formiojs@4.19.0-rc.5
 - Updated formio-workers@1.21.0-rc.4
 - FIO-7823: add error boundary around server-side form validation

## 3.5.0-rc.3
### Changed
 - Updated formiojs@4.19.0-rc.3
 - Updated formio-workers@1.21.0-rc.3

## 3.5.0-rc.2
### Changed
 - Updated formiojs@4.19.0-rc.2
 - Updated formio-workers@1.21.0-rc.2

## 3.5.0-rc.1
### Changed
 - Updated formiojs@4.19.0-rc.1
 - Updated formio-workers@1.21.0-rc.1
 - FIO-7498 Fixed the issue with data not being decrypted when trying to export submissions


## 3.4.1-rc.4
### Changed
 - Updated formiojs@4.18.1-rc.4
 - Updated formio-workers@1.20.1-rc.4

## 3.4.1-rc.3
### Changed
 - Updated formiojs@4.18.1-rc.3
 - Updated formio-workers@1.20.1-rc.3
 - FIO-7549: Revert 1669 default.json and email.js

## 3.4.1-rc.2
### Changed
 - Updated formiojs@4.18.1-rc.2
 - Updated formio-workers@1.20.1-rc.2

## 3.4.1-rc.1
### Changed
 - Updated formiojs@4.18.1-rc.1
 - Updated formio-workers@1.20.1-rc.1
 - FIO-7514: fixed an issue where submission reference object is not attached to the value of select component with reference enabled
 - FIO-7549: evaluate axios upgrades and CVE resolution

## 3.4.0
### Changed
 - Official Release
 - Updated formiojs@4.18.0
 - Updated formio-workers@1.20.0

## 3.4.0-rc.19
### Changed
 - revert changes related to FIO-7125 feature - missed commits

## 3.4.0-rc.18
### Changed
 - revert changes related to FIO-7125 feature

## 3.4.0-rc.17
### Changed
 - Updated formiojs@4.18.0-rc.11
 - Updated formio-workers@1.20.0-rc.13

## 3.4.0-rc.16
### Changed
 - Updated formiojs@4.18.0-rc.10
 - Updated formio-workers@1.20.0-rc.12

## 3.4.0-rc.15
### Changed
 - Updated formiojs@4.18.0-rc.9
 - Updated formio-workers@1.20.0-rc.11
 - FIO-7482: added ability to update default configuration forms in db to the versions required by the server (required for reportingUI form)

## 3.4.0-rc.14
### Changed
 - Updated formiojs@4.18.0-rc.8
 - Updated formio-workers@1.20.0-rc.10

## 3.4.0-rc.13
### Changed
 - Pinned axios (from mailgun.js) to v1.5.1

## 3.4.0-rc.12
### Changed
 - Updated formiojs@4.18.0-rc.7
 - Updated formio-workers@1.20.0-rc.9

## 3.4.0-rc.11
### Changed
 - Fix tests
   
## 3.4.0-rc.10
### Changed
 - Updated formio-workers@1.20.0-rc.8
 - FIO-7491: fixed an issue where dataTable component with resource data type does not work after exporting/importing
 - FIO-7510: Revert isolated vm changes

## 3.4.0-rc.9
### Changed
 - Updated formiojs@4.18.0-rc.6
 - Updated formio-workers@1.20.0-rc.7

## 3.4.0-rc.8
### Changed
 - Updated formiojs@4.18.0-rc.5
 - Updated formio-workers@1.20.0-rc.6
 - Updated @formio/core@1.3.0-rc.22
 - FIO-7344 Changed Rendering method tooltip
 - FIO-7371: Adds checks to define if raw DB data should be returned in response
 - FIO-7167: Isolated vm
 - FIO-7329: remove nodemailer sendgrid and mailgun

## 3.4.0-rc.7
### Changed
 - FIO-7125: Adds password protected update feature to the SaveSubmission action and async variations of cache methods

## 3.4.0-rc.6
### Changed
 - Updated formiojs@4.18.0-rc.4
 - Updated formio-workers@1.20.0-rc.5
 - FIO-7351 fixed submitting data using Wizard with conditionals for Panel component

## 3.4.0-rc.5
### Changed
 - bugfix: add catch block to nunjucks injection

## 3.4.0-rc.4
### Changed
 - Updated formiojs@4.18.0-rc.3
 - Updated formio-workers@1.20.0-rc.4

## 3.4.0-rc.3
### Changed
 - Updated formiojs@4.18.0-rc.2
 - Updated formio-workers@1.20.0-rc.3

### Changed
 - Revert - FIO-6630: Expanded Actions Logic UI

## 3.4.0-rc.2
### Changed
 - Updated formiojs@4.18.0-rc.1
 - Updated formio-workers@1.20.0-rc.2
 - FIO-6493: added reporting-ui form for project template

## 3.4.0-rc.1
### Changed
 - Updated formiojs@4.17.0-rc.6
 - Updated formio-workers@1.20.0-rc.1
 - FIO-6630: Expanded Actions Logic UI
 - FIO-7124: replaced action logging with hook
 - FIO-6493: fixed formio-server tests that were broken by reporting ui PR

### Changed

## 3.3.0-rc.2
### Changed
 - Updated formiojs@4.17.0-rc.3
 - Updated formio-workers@1.19.0-rc.2

## 3.3.0-rc.1
### Changed
 - Updated formiojs@4.17.0-rc.2
 - Updated formio-workers@1.19.0-rc.1
 - FIO-6919: fixed value for Signature submission in Data Tab
 - FIO-5731: fixed validation error for wizard forms with advanced conditions
 - FIO-6966: Fixes empty address component data in CSV
   
## 3.2.0
### Changed
 - Official Release
 - Updated formiojs@4.16.0
 - Updated formio-workers@1.18.0

## 3.2.0-rc.9
### Changed
 - Updated formiojs@4.16.0-rc.11
 - Updated formio-workers@1.18.0-rc.7

## 3.2.0-rc.8
### Changed
 - Updated formiojs@4.16.0-rc.10
 - Updated formio-workers@1.18.0-rc.6

## 3.2.0-rc.7
### Changed
 - Updated formiojs@4.16.0-rc.9
 - Updated formio-workers@1.18.0-rc.5

## 3.2.0-rc.6
### Changed
 - FIO-4216 | FIO-6601 - Fixes no custom submission collection lookup when getting submissions
 - FIO-7166: Adding a mongodb feature check to core

## 3.2.0-rc.5
### Changed
 - FIO-7161: fixed issue with possible undefined value for radio component in csv …
 - FIO-7067: fixed issue with empty value for patch request

## 3.2.0-rc.4
### Changed
 - Updated formiojs@4.16.0-rc.8
 - Updated formio-workers@1.18.0-rc.4
 - FIO-7067: fixed issue with id parsing and eslint warnings

## 3.2.0-rc.3
### Changed
 - Updated formiojs@4.16.0-rc.7
 - Updated formio-workers@1.18.0-rc.3
   
## 3.2.0-rc.2
### Changed
 - Updated formiojs@4.16.0-rc.5
 - Updated formio-workers@1.18.0-rc.2
 - FIO-6769: Removes empty template
 - FIO-6840: change to allow case insensitive exists endpoint
 - FIO-6406 fixed filter for Select inside DT (#1537)
   
## 3.2.0-rc.1
### Fixed
 - FIO-5731: fixed validation error for wizard forms with advanced conditions
 - FIO-6966: Fixes empty address component data in CSV
 - FIO-6601: Fix getting submissions by reference from custom submissions collection
 - FIO-4500: Fixes an issue where specified in the component settings delimiter is not used for CSVExport of Tags component data
 - FIO-6414: fixed filtering issues inside DT
 - FIO-4216: Fixes 'Resource not found' issue when using submission collection and trying to retrieve submission using x-token
 - FIO-6840: Refactor authentication to use case-insensitive query and fallback to $regex
 - FIO-6729: changed the output of data in the logs
 - FIO-3840: fixed swagger spec definition for components with obj type
 - FIO-4809: Added tests for Wizard suffix/prefix
 - Bump json5 from 2.2.1 to 2.2.3
 - Bump @xmldom/xmldom from 0.7.5 to 0.7.11
 - Bump nunjucks from 3.2.3 to 3.2.4
 - Bump vm2 from 3.9.11 to 3.9.18
 - Bump semver from 7.3.8 to 7.5.2
 - Bump cookiejar from 2.1.3 to 2.1.4
 - FIO-6919: fixed value for Signature submission in Data Tab

## 3.1.0-rc.5
### Fixed
 - FIO 6579: another potential problem with legacy templates
 - FIO-6424: fixed displaying of Select component with Save as reference property when download PDF

## 3.1.0-rc.4
### Changed
 - TO-DO: ADD INFO HERE.

## 3.1.0-rc.3
### Changed
 - Updated formiojs@4.15.0-rc.19
 - Updated formio-workers@1.17.0-rc.2

### Fixed
 - FIO-5688: Allow for a DEFAULT_TRANSPORT to enable the default sending…

## 3.1.0-rc.2
### Changed
 - Revert "FIO-5497: fixed DeprecationWarning for crypto.createDecipher"
 - FIO-5709: fix the response radio value in the CSV shows as blank

## 3.1.0-rc.1
### Changed
 - Updated formiojs@4.15.0-rc.18
 - Updated formio-workers@1.17.0-rc.1

### Changed
 - Increment minor version.
 - Remove submission collection tests in open source core
 - upgrade jsonwebtoken dependency
 - Allow the display of all images and signatures in index when ?full=true is provided in the url
 - Revert "FIO-5497: fixed DeprecationWarning for crypto.createDecipher"

### Fixed
 - FIO-4189: fixed advanced logic not working inside Nested Form
 - FIO-5497: fixed DeprecationWarning for crypto.createDecipher
 - FIO-5471: Removed mongoose.save from codebase
 - FIO-5860: export error caused by old temp
 - FIO-5860: fixed tests
 - Revert "FIO-5233: fixed an issue with incorrect values in different timezones…"
 - FIO-5911: update email action steps
 - FIO-5785 Fixed Select component submission showing id instead of template for URL data source
 - FIO-5904: fixed saving data for Components outside of Wizards
 - FIO-6069: document db restrictions handling
 - FIO-5904: Fixed a bug where data for form components wouldn't save if outside of a wizard
 - FIO-5688: Allow for a DEFAULT_TRANSPORT to enable the default sending method for emails.
 - FIO-6579: Fix project template exports crashing the server

## 3.0.0-rc.11
### Fixed
 - FIO-5494: removed erroneous empty addresses
 - FIO-5774: added revisions of submissions collections
 - FIO-5756: PDF | Regression | FFT 502 Bad gateway error after Click on submit
 - FIO-5495: added submission data for delete req

## 3.0.0-rc.10
### Fixed
 - FIO-5435: fixed exists endpoint with submission collections
 - FIO-5090: vid numbering fix

### Changed
 - Upgrade dependencies: body-parser@1.20.1, express@4.18.2, mongoose@6.6.5, nodemailer-mailgun-transport@2.1.5, semver@7.3.8, nodemon@2.0.20, mongodb@4.10.0, nodemailer@6.8.0, eslint@8.
25.0, supertest@6.3.0, mailgun.js@8.0.1

## 3.0.0-rc.9
### Fixed
 - FIO-5433: fixed (snyk) Prototype Pollution in mongoose
 - Upgrade dependencies.

## 3.0.0-rc.8
### Fixed
 - FIO-4433: fixed recalculation on server for draft submission

## 3.0.0-rc.7
### Fixed
 - FIO-5155: Fixes submissions not loaded for sub forms with array data structure
 - FIO-5363: deleted default value of transport select for email action settings

## 3.0.0-rc.6
### Fixed
 - FIO-5334: fixed typo in the email action settings bcc placeholder

## 3.0.0-rc.5
### Fixed
 - FIO-5199: Provided user information for external users
 - FIO-5233: fixed an issue with incorrect values in different timezones

## 3.0.0-rc.4
### Fixed
 - Fixes Group Permissions issue

## 3.0.0-rc.3
### Fixed
 - Issue with the noValidate to allow the request object to set it before.

## 3.0.0-rc.2
### Fixed
 - fixed processing of loadRevision execution results
 - FIO-4974: allowed to process all types of requests without a body for the webhook action
 - FIO-5076: fixed subId parameter
 - FIO-5076: synchronized form id and submission id
 - FIO-5090: form revisions transfer for stage deployment
 - FIO-5000: Change to use accept list for accepted headers.
 - FIO-4860: Added new index to action items
 - FIO-4859: Field based access for patch request fix
 - FIO-4448: Adds route for deleting all form submissions with x-delete-confirm header check
 - Allow all submission data setting with form setting changes.

## 3.0.0-rc.1
### Breaking Change
 - Removed the SQL Action

### Fixed
 - Fixed issues where form revisions with original configured would not
 - FIO-4741: Added max password length for password reset

### Added
 - Add noValidate property to req object on submission validation
 - Added public config support for OSS

### Changed
 - Upgrade html-entities@2.3.3, mailgun.js@5.0.5, moment@2.29.2, mongoose@6.2.10, semver@7.3.6, body-parser@1.20.0, mongodb@4.5.0, eslint@8.12.0
 - formio-workers@1.16.3, mailgun.js@5.2.0, eslint@8.13.0

## 2.5.0-rc.8
### Changed
 - Updated formiojs@4.15.0-rc.7

## 2.5.0-rc.7
### Fixed
 - FIO-4781: Fixing email pdf attachments.

## 2.5.0-rc.6
### Changed
 - Updated formiojs@4.15.0-rc.6

## 2.5.0-rc.5
### Changed
 - Updated formiojs@4.15.0-rc.5

## 2.5.0-rc.4
### Changed
 - Updated formiojs@4.15.0-rc.4

## 2.5.0-rc.3
### Changed
 - Updated formiojs@4.15.0-rc.3

### Fixed
 - Revert "FIO-4216: 'Resource not found' when get submission form submission collection"

## 2.5.0-rc.2
### Changed
 - Updated formiojs@4.15.0-rc.2

### Fixed
 - Fixed a crash in resource field removal.
 - FIO-4359: submission revision issue fix

## 2.5.0-rc.1
### Fixed
 - FIO-4359: submission revisions

## 2.4.0-rc.2
### Changed
 - Updated formiojs@4.14.1-rc.8

## 2.4.0-rc.1
### Changed
 - Updated formiojs@4.14.1-rc.7

### Changed
 - Upgrade @azure/ms-rest-nodeauth@3.1.1, async@3.2.3, body-parser@1.19.1, config@3.3.7, debug@4.3.3, express@4.17.2, nodemailer@6.7.2, prompt@1.2.1, mocha@9.1.4, nodemon@2.0.15, @sendgrid/mail@7.6.0, mongodb@4.3.0, mongoose@6.1.7, mssql@7.3.0, supertest@6.2.1, csv@6.0.5, mailgun.js@4.1.4, eslint@8.7.0, moment-timezone@0.5.34
 - FIO-4003: added ability to use the revisionId

### Fixed
 - FIO-3853: fixed export json function freeze 

## 2.3.3
### Changed
 - Official Release

## 2.3.3-rc.3
### Changed
 - Upgrade formiojs@4.14.1-rc.6

## 2.3.3-rc.2
### Fixed
 - FIO-4455: Fixes value calculation on conditionally shown field

## 2.3.3-rc.1
### Changed
 - Updated formiojs@4.14.1-rc.5
 - Updated formio-workers@1.16.1

## 2.3.2
### Changed
 - Official Release

## 2.3.2-rc.3
### Fixed
 - FIO-3042: Return current endpoint to whitelist
 - FIO-4216: 'Resource not found' when get submission form submission collection
 - FIO-3737: fixed reCAPTCHA submission protection issue
 - FIO-1453: formio.template.import expanded

## 2.3.2-rc.2
### Changed
 - Updated formiojs@4.14.1-rc.4

### Changed
 - FIO-4088: added tests for patch submission
 - FIO-4228: removed parsing of MONGO_HIGH_AVAILABILITY

## 2.3.2-rc.1
### Changed
 - Updated formiojs@4.14.1-rc.2
 - FIO-4088: added tests for patch submission

## 2.3.1
### Changed
 - Official Release
 - Updated formiojs@4.14.0

## 2.3.1-rc.1
### Changed
 - Updated formiojs@4.14.0-rc.38

## 2.3.0
### Changed
 - Official Release
 - Updated formio-workers@1.16.0

## 2.3.0-rc.17
### Changed
 - Updated formiojs@4.14.0-rc.36

## 2.3.0-rc.16
### Fixed
 - Adding /current back to permission whitelist.

## 2.3.0-rc.15
### Fixed
 - Issue where Reset Password was not calling next method.

## 2.3.0-rc.14
### Changed
 - Upgrade formio-workers@1.16.0-rc.2

### Fixed
 - FIO-805: empty stage creating issue fix

## 2.3.0-rc.13
### Fixed
 - FIO-3783: Build fix
 - FIO-3780: direct the sending of emails without user parameter to non-priority tasks queue

### Changed
 - FIO-3054: Add check of primary admin
 - Upgrade formio.js@4.14.0-rc.33

## 2.3.0-rc.12
 - Revert "FIO-3763 Close ability to hit a form with get request as an anonymous…"

## 2.3.0-rc.11
### Changed
 - Upgrade formio@4.14.0-rc.29
 - Upgrade mongoose@6.0.11, mocha@9.1.3
 - Revert "FIO-3783 Added renderingMethod option to Email action."

## 2.3.0-rc.10
### Changed
 - Upgrade formio-workers@1.16.0-rc.1
 - Upgrade mongodb@4.1.3, mongoose@6.0.10, vm2@3.9.4, mocha@9.1.2, nodemon@2.0.13, @azure/ms-
rest-nodeauth@3.1.0, mailgun.js@3.6.0, nodemailer@6.7.0, adm-zip@0.5.9

## 2.3.0-rc.9
### Fixed
 - FIO-3436: Refactored so that any email address can be set as Reply-To
 - FIO-3783: Added renderingMethod option to Email action.
 - FIO-3950: Export JSON/CSV doesn't work
 - FIO-3763 Close ability to hit a form with get request as an anonymous user while form access turned off
 - FIO-3561: Required field is showing as invalid and form can't be submitted

## 2.3.0-rc.8
### Changed
 - Upgrade mailgun.js@3.5.9, mongodb@4.1.2, mongoose@6.0.6, adm-zip@0.5.6

## 2.3.0-rc.7
### Changed
 - Upgrade formiojs@4.14.0-rc.25

### Fixed
 - Bootup race conditions.
 - FIO-3403: feat(import): search for existing roles in DB when importing an incomplete template
 - FIO-1453: fixed search for missing resources

## 2.3.0-rc.6
### Fixed
 - Problem where the MongoDB sslCA was reading it as a string and messing up the mongo driver.

## 2.3.0-rc.5
### Changed
 - Fixed the field based access.

## 2.3.0-rc.4
### Changed
 - Adding an index to the key of the tokens collection to resolve performance issues.
 - Upgrade chance@1.1.8, csv@5.5.3, mailgun.js@3.5.8, mongoose@6.0.4, mocha@9.1.1

### Fixed
 - Fixing issue with mailgun not working with latest version.
 - Fixed an SSL Cert issue related to mongoose.

## 2.3.0-rc.3
### Changed
 - Upgrade dependencies and fixed tests.

## 2.3.0-rc.2
### Fixed
 - Issue with loading SSL CA file with latest mongodb driver.

### Changed
 - Upgrade mongodb@4.1.1, prompt@1.2.0, mongoose@6.0.2

## 2.3.0-rc.1
### Fixed
 - FIO-790: checkbox set as radio showing blank on CSV downloads issue
 - FIO-1442: Adds an ability to set transformers for the specific fields in the csv exporter.
 - FIO-3555, FIO-1538: Implements 2FA
 - FIO-1038: limiting default email usage provider
 - FIO-899: removing roles issue fix
 - FIO-885: Import/Export database error handling
 - FIO-2764: Fixes an issue when the signature component was set a default value with noDefaults option
 - FIO-3624: fixed problem on sending get request to /token endpoint using x-token header
 - FIO-3583: Fixed issue with recursion in the form load routines.
 - Issues related to the MongoDB 4.1.0 upgrade.

### Added
 - FIO-3435: form definition downloading according query parameter
 - FIO-3436: ability to set reply to header

### Changed
 - Upgrade formiojs@4.14.0-rc.19
 - Upgrade mongodb@4.1.0
 - Upgrade async@3.2.1, mailgun.js@3.5.7, mongoose@5.13.8, mssql@7.2.1, supertest@6.1.6, mocha@9.1.0, fast-json-patch@3.1.0

## 2.2.4-rc.1
### Changed
 - Upgrade formiojs@4.14.0-rc.18

## 2.2.3
### Changed
 - No changes. Official release.

## 2.2.3-rc.11
### Fixed
 - Upgrade formiojs@4.14.0-rc.17

## 2.2.3-rc.10
### Changed
 - Upgrade formiojs@4.14.0-rc.16
 - Upgrade mongoose@5.13.5, mocha@9.0.3, supertest@6.1.4, mssql@7.2.0, eslint@7.32.0

## 2.2.3-rc.9
### Fixed
 - FIO-3441: resolve vulnerabilities
 - FIO-898: Implements keeping POST request headers in submission.metadata.headers.

## 2.2.3-rc.8
### Fixed
 - Fixed issues with action conditions not working when "submission" or "previous" were used in the conditional.

### Changed
 - Upgrade formiojs@4.14.0-rc.15

## 2.2.3-rc.7
### Fixed
 - Tests to make them more robust.

## 2.2.3-rc.6
### Fixed
 - Resolved broken test.

## 2.2.3-rc.5
### Changed
 - Upgrade mongoose@5.13.3, nodemailer@6.6.3, mailgun.js@3.5.2, eslint@7.31.0

### Fixed
 - Improve validation performance by moving VM instance outside Evaluator
 - FIO-1453: Add import fallbacks
 - FIO-3441: resolve vulnerabilities
 - Ensure we truncate the jwtIssuedAfter.
 - FIO-3471: Ensure that the queries include all indexes to speed up performance.

## 2.2.3-rc.4
### Fixed
 - FIO-2834: Fixes an issue where File's values are shown in CSV as empty
 - Unhid block component label in webhook action settings form
 - FIO-3099: Implements the oAuthM2M Token hook to the Login Action
 - FIO-3116: Fixes an issue files inside containers and editgrids weren't attaching to an email. Added tests
 - FIO-3251 fix: values which should be cleared on hide are used in calculations before it happened

### Changed
 - Upgrade formiojs@4.14.0-rc.14
 - Upgrade mongodb@3.6.10, nodemon@2.0.12
 - FIO-2764: Adds an ability to have the submission contain only data that you submitted.
 - Added indexes to queries to improve performance of resource load times.

## 2.2.3-rc.2
### Fixed
 - FIO-3369: Removed the submissionCollection hook which was messing up submission collection.

## 2.2.3-rc.1
### Changed
 - FIO-3099: Adds a hook for the Access-Control-Expose-Headers
## 2.2.2
### Changed
 - No changes. Released 2.2.2-rc.8 as official release.

## 2.2.2-rc.8
### Fixed
 - Issue where upgrading mailgun-transport causes server to crash.

## 2.2.2-rc.7
### Fixed
 - Fixing tests further.

## 2.2.2-rc.6
### Fixed
 - Custom submission collection tests.

## 2.2.2-rc.5
### Fixed
 - Custom submission collection tests.

## 2.2.2-rc.4
### Fixed
 - FIO-3369: Removed the submissionCollection hook which was messing up the submission collection.

## 2.2.2-rc.3
### Changed
 - Upgrade formio-workers@1.14.16

## 2.2.2-rc.2
### Fixed
 - FIO-3223: Fixes an error with out of memory
 - Fixing potential references to null variables.

### Changed
 - Upgrade formio-workers@1.14.15

## 2.2.2-rc.1
### Fixed
 - FIO-3091: added automatic useUnifiedTopology parameter setting
 - FIO-3095: Allow for checking email accounts before sending emails.
 - FIO-3040: Adds tests for FIO-3040 when wasn't handle the Webhook error and respond instead of spinning forever.

## 2.2.1
### Changed
 - No changes. Released 2.2.1-rc.2 as official release.

## 2.2.1-rc.2
### Changed
 - Upgrade formiojs@4.14.0-rc.5
 - Upgrade mongodb@3.6.7, mongoose@5.12.10

## 2.2.1-rc.1
### Fixed
 - FIO-2823: Fixes an issue when custom mongodb collection on a resource breaks the resource and the submission data cannot be accessed
 - Changed action items "require" to "required"
 - Added extra check to prevent server crashes

### Changed
 - Upgrade formiojs@4.13.2-rc.2
 - Upgrade dependencies.

## 2.2.0
### Changed
 - Official release of 2.2.0-rc.2

## 2.2.0-rc.2
### Fixed
 - FIO-2766: preventing unathorized users from viewing form definition

## 2.2.0-rc.1
### Changed
 - Upgrade formiojs@4.13.1-rc.1

### Fixed
 - FIO-2484: Implements Split Roles PR with Group permission

## 2.1.1
### Changed
 - No changes. Official Release.

## 2.1.1-rc.2
### Fixed
 - Modified the expiring indexes to have try/caches around all instances.

## 2.1.1-rc.1
### Changed
 - Adding try/catch around expiring indexes for DB's that don't support it.

## 2.1.0
### Changed
 - Upgrade formiojs@4.13.0

## 2.1.0-rc.18
### Changed
 - Upgrade formiojs@4.13.0-rc.27

## 2.1.0-rc.17
### Changed
 - Upgrade formiojs@4.13.0-rc.26
 - Upgrade resourcejs@2.3.4
 - Upgrade other dependencies.

## 2.1.0-rc.16
 - Upgrade formiojs@4.13.0-rc.25

## 2.1.0-rc.15
### Fixed
 - FIO-2634: Fixes an issue where Signatures/Files values are excluded from the response when load subForms submissions by a reference

### Changed
 - Upgrade formiojs@4.13.0-rc.23
 - Upgrade other dependencies.

## 2.1.0-rc.14
### Fixed
 - Upgrade formiojs@4.13.0-rc.20

## 2.1.0-rc.13
### Fixed
 - Updated html-entities@2.1.1, mongodb@3.6.5, mocha@8.3.2, csv@5.4.0, mongoose@5.12.0, eslint@7.22.0

## 2.1.0-rc.12
### Fixed
 - FIO-1555: fixed an issue where server validation errors do not come from the server if component with error is not on the first wizard page

### Changed
 - Upgrade formiojs@4.13.0-rc.19

## 2.1.0-rc.10
### Changed
 - Using cloneDeep on vm sandboxes.
 - Updated dependencies.

## 2.1.0-rc.7
### Changed
 - Using @formio/node-fetch-http-proxy instead of local file.
 - FIO-1528: FIO-1528: change default 'from' email address domain to use example in the deployment environment variable
 - Ensure we cloneDeep vm context for added protection.

## 2.1.0-rc.6
### Fixed
 - Automated tests.

## 2.1.0-rc.5
### Changed
 - Fixed serer to work with latest formio-workers.

## 2.1.0-rc.4
### Changed
 - Upgrade mongoose@5.11.17, eslint@7.20.0, adm-zip@0.5.3
 - Using vm2 for added security.

### Fixed
 - FIO-476: Fixes an issue when Sketch Pad didn't show data on CSV export - showed a list of empty strings.
 - fix: allow Docker to load git npm paths

## 2.1.0-rc.3
### Added
 - Added action logs to form context only.

### Fixed
 - FIO-1309: Fixed recalculation of field if calculateServer is disabled.
 - FIO-888: Adds CSV Formula Injection Protection
 - FIO-1140: Fixes an issue where deprecated formRevision property is added when deploying a version to a stage

## 2.1.0-rc.2
### Fixed
 - FIO-832: fixed error code returned when trying to delete the Everyone role

## 2.1.0-rc.1
### Changed
 - FOR-2866: Single submission bug using different collection master
 - Upgrade mongoose@5.11.14, supertest@6.1.3, html-entities@2.1.0, eslint@7.19.0, adm-zip@0.5.2

### Fixed
 - FIO-838: Fixes an issue when a "Save Submission to resource" action had an incorrect priority.
 - FIO-854: Amazon DocumentDB to update default engine version to 4.0.0
 - FIO-1163: fixed an issue where submission data is deleted for components with the same key as parent layout component
 - FIO-911: Entire project JSON is dumped into the server logs
 - FIO-128: Added markModifiedParameters method to utils.

## 2.0.1-rc.2
### Fixed
 - FIO-832: fixed error code returned when trying to delete the Everyone role

### Changed
 - Upgrade nodemailer@6.4.18, mocha@8.3.0

## 2.0.1-rc.1
### Changed
 - Upgrade formiojs@4.13.0-rc.9
 - Upgrade mongodb@3.6.4, mongoose@5.11.15, supertest@6.1.3, html-entities@2.1.0, eslint@7.19.0, adm-zip@0.5.2, moment-timezone@0.5.33

## 2.0.0
### Changed
 - No changes. Released 2.0.0-rc.42 as official release.

## 2.0.0-rc.42
### Fixed
 - FIO-1175: User is being automatically logged out on remote server
 - Fix: add a token for resources select components

### Changed
 - Upgrade mongoose@5.11.12, fs-extra@9.1.0, eslint@7.18.0, supertest@6.1.1

## 2.0.0-rc.41
### Changed
 - Temporarily reverted the expiring action logs. Will wait for 2.1.0 to release this feature.
 - Changed field match access schema to have splitted permissions instead

## 2.0.0-rc.40
### Fixed
 - FIO-1125: Unable to download a CSV report with Select component

### Changed
 - Upgrade formiojs@4.13.0-rc.6

## 2.0.0-rc.39
### Changed
 - FOR-2762: Changes default permissions for a new project
 - Upgrade formio-workers@1.14.10, mongoose@5.11.11, resourcejs@2.3.3

## 2.0.0-rc.38
### Breaking Change
 - FIO-1027: Adds an ability to switch on/off permissions to access the EXISTS endpoint. Makes access with permissions by default.

### Fixed
 - FIO-847: Fixes an issue when in post submission data where any datagrid or editgrid are some not empty string, the server was crashing.
 - FIO-761: Fixes an issue when the server throws 'Error: cyclic dependency detected' when calling Webhook action

### Changed
 - Upgrade formiojs@4.13.0-rc.5
 - Upgrade mongoose@5.11.10

## 2.0.0-rc.37
### Changed
 - Removed the LegacyValidator.
 - Decreased limit for resource select to avoid error
 - Fixed typo in fieldMatchAccess
 - FIO-853: Added check if fieldMatchAccess object is not empty
 - FIO-1035: Fixes an issue when a nested form inside the nested Form was receiving "Too many recursive requests." on submit.

## 2.0.0-rc.36
### Fixed
 - FOR-2868: Adds an ability to pass the rejectUnauthorized flag to the fetch method.
 - FIO-994: Makes onlyAvailableItems validation optional

### Changed
 - Updated formiojs@4.12.3, html-entities@1.3.3, mongoose@5.11.8, nodemailer@6.4.17, mssql@6.3.0

## 2.0.0-rc.35
### Fixed
 - FOR-2874: Added server side validation of recaptcha token.
 - Adding expiring action items.

### Changed
 - Upgrade formiojs@4.12.2
 - Upgrade config@3.3.3, nodemailer-mailgun-transport@2.0.2, semver@7.3.4, mongoose@5.11.4, eslint@7.15.0, adm-zip@0.5.1

## 2.0.0-rc.34
### Fixed
 - Issues with ResetPassword action not setting form object correctly within email parameters.

## 2.0.0-rc.33
### Fixed
 - Tests regarding new validations.

## 2.0.0-rc.32
### Added
 - FJS-1380: Adds field actions for Select and Radio which allow onlyAvailableItems validation

### Fixed
 - FJS-1297: fix submission of nested wizards

### Changed
 - Upgrade mongoose@5.10.15, debug@4.3.1, adm-zip@0.5.0
 - Upgrade formiojs@4.12.2-rc.3

## 2.0.0-rc.31
### Fixed
 - FJS-1443: add exceptions for the DynamicWizard component
 - Fixes an issue where for validating a submission with a form revision always was getting the latest version of the form.

### Changed
 - Upgrade formiojs@4.12.1
 - Upgrade mongoose@5.10.14, nodemailer@6.4.16, moment-timezone@0.5.32

## 2.0.0-rc.30
### Fixed
 - Fix references updating

### Changed
 - Upgrade mongodb@3.6.3, mongoose@5.10.13, nodemailer@6.4.15, eslint@7.13.0

## 2.0.0-rc.29
### Fixed
 - FJS-1336, FJS-1337, FJS-1422: Adds configFormio hook call to the index.js

### Upgrade
 - mongoose@5.10.12
 - formiojs@4.12.1-rc.25

## 2.0.0-rc.28
### Fixed
 - 112 split roles bug that fixes server tests

### Changed
 - Upgrade formiojs@4.12.1-rc.24

## 2.0.0-rc.27
### Changed
 - Upgrade formiojs@4.12.1-rc.23
 - Added hook to configure Formio instance

## 2.0.0-rc.26
### Fixed
 - Failing tests for enterprise.

## 2.0.0-rc.25
### Fixed
 - FOR-2805: Wizard Conditional pages not saving data
 - 112 split permissions for field based resource access

### Changed
 - Upgrade formiojs@4.12.1-rc.19

## 2.0.0-rc.24
### Fixed
 - - Errors being thrown about calling save() in parallel

## 2.0.0-rc.23
### Fixed
 - FOR-2741: Fixes memory leaks that come from Validator.
 - Fixes an issue when we get a server error while submitting a form with conditional page with subform inside.

### Changed
 - Upgrade mongoose@5.10.9, nodemailer@6.4.14, nodemon@2.0.6, eslint@7.11.0, mocha@8.2.0

## 2.0.0-rc.22
### Fixed
 - Problem where btoa not being defined would cause validator to crash.

## 2.0.0-rc.21
### Fixed
 - Issue where server calculations were not getting performed correctly."

## 2.0.0-rc.20
### Fixed
 - FOR-2771: Fixed issue where calculated values get overridden on the server.

## 2.0.0-rc.19
### Changed
 - Upgrade formiojs@4.12.1-rc.4

## 2.0.0-rc.18
### Fixed
 - FJS-1240: fixed an issue where address data (if address is inside dataGrid) is missed when loading as CSV.

## 2.0.0-rc.17
### Fixed
 - Fixed issues where data would be ignored due to bug with renderer validation.

### Changed
 - Upgrade formiojs@4.12.1-rc.2
 - Upgrade config@3.3.2, mongoose@5.10.7, mssql@6.2.3, eslint@7.10.0

## 2.0.0-rc.16
### Fixed
 - Revert "Fixed an issue where submission of reference Nested Form is not updated when was modified through the parent…"

## 2.0.0-rc.15
### Changed
 - Upgrade mongodb@3.6.2, mongoose@5.10.6, mssql@6.2.2, node-fetch@2.6.1, resourcejs@2.3.2, debug@4.2.0, formiojs@4.12.0, moment@2.29.0, eslint@7.9.0

### Fixed
 - Fix some updates resetting password due to isomorphic validator adding back a default value.
 - Fix queries so indexes exist for cosmos.

## 2.0.0-rc.14
### Fixed
 - Adding ability to execute field actions on dryrun. Fixes validate endpoint for DataSource component.

## 2.0.0-rc.13
### Fixed
 - FOR-2719: Fixes an issue where new actions and removed actions weren't deployed on a stage.
 - Ensure we also check hostname when checking the NO_PROXY environment variable.

### Changed
 - FOR-2722: Updated a test for Webhook actions.
 - Upgrade mongodb@3.6.1

## 2.0.0-rc.12
### Fixed
 - Ensure the mongoSA variables are always set correctly.
 - Fixing an issue with the form revisions not getting set correctly when loading with full=true.

### Changed
 - Upgrade chance@1.1.7, formiojs@4.11.3, mongoose@5.10.2, mocha@8.1.3, eslint@7.8.0

## 2.0.0-rc.11
### Removed
 - Method override for security reasons.

## 2.0.0-rc.10
### Fixed
 - FJS-1129: fixes an issue where the Custom Error Message is not used for the Unique validation error
 - FOR-2728: modified CSVExporter preprocessor to convert roadio component data to string

### Added
 - A way to include the mongoCA certificate as a file path.

### Changed
 - Changing configuration (with reverse compatibility) of the mongoSA variable to the more correct mongoCA name.

## 2.0.0-rc.8
### Changed
 - Merged changes from 1.x

## 2.0.0-rc.8
### Changed
 - Group permissions so that it can handle more complex group assignments.
 - Upgrade mongoose@5.9.25, eslint@7.5.0

## 2.0.0-rc.7
### Fixed
 - FOR-2708: Remove resource from action if it was not found on import.
 - FJS-1049: Fixed CSV export of components with minimized schema.
 - Fixed setting of formRevision property on import when revisions are enabled.

## 2.0.0-rc.5-6
### Changed
 - Updated logging functionality.

## 2.0.0-rc.1-4
### Changed
 - Merge changes from 1.x

## 2.0.0-beta.10
### Changed
 - Update formio.js to 4.1.0-rc.13

## 2.0.0-beta.9
### Changed
 - retagging

## 2.0.0-beta.8
### Added
 - Additional options to fetch wrapper.

## 2.0.0-beta.7
### Added
 - New hooks to extend the authentication system.

### Changed
 - Update formio.js to 4.1.0-rc.6

## 2.0.0-beta.6
### Added
 - Add tree validation to server.
 - Mongo SSL Certificate options.

### Changed
 - Replace request library with node-fetch.
 - Updated formio.js to 4.10.0-rc.4 to fix isomorphic validation.

## 2.0.0-beta.5
### Changed
 - Upgrade dependencies.
 - FJS 864: Fixed login action resources limitation
 - Set email for User and Admin ressource required & unique
 - Fixed server crash on invalid x-query

## 2.0.0-beta.4
### Added
 - Hooks for the alias.
 - Hooks for the formResponse.

### Changed
 - Upgrade mongodb@3.5.5, mongoose@5.9.4, nodemailer@6.4.5, mssql@6.2.0
 - Upgrade formiojs@4.9.0-rc.10
 - Ensure that field actions are triggered on dryrun.

## 2.0.0-beta.3
#### Changed
 - Upgrade formiojs@4.9.0-rc.6

## 2.0.0-beta.2
#### Changed
 - Upgrading dependencies.

## 2.0.0-beta.1
### Breaking Changes
 - Isomorphic validations. May cause error interface and codes to change slightly.

### Changed
 - Upgrade mongodb@3.5.4, async@3.2.0
 - Upgrade ResourceJS@2.0.0

## 1.90.7
### Fixed
 - Problem where the req.params would get removed before sending off emails.

## 1.90.6
### Fixed
 - Upgrade formiojs@4.11.2-rc.4 so it will remove errors about Element not defined.

## 1.90.5
### Added
 - Add TLS connection for mongoose connection as well.

## 1.90.4
### Changed
 - Upgrade dependencies.

### Fixed
 - FOR-2708: Remove resource from action if it was not found on import.
 - FJS-1049: Fixed CSV export of components with minimized schema.

## 1.90.3
### Changed
 - Fixed setting of formRevision property on import when revisions are enabled.

## 1.90.2
### Changed
 - Cherry pick email fix for large emails.

## 1.90.1
### Changed
 - Resource.js library to 2.3.1 to revert change in aggregation.

## 1.90.0
### Fixed
 - A bad revert.

## 1.89.0
### Changed
 - Revert "Added a middleware for loading a full form schema for use component settings.

## 1.88.0
### Fixed
 - FOR-2707: Fixes an issue where the PATCH request was being failed if a form has a nested form as reference.
 - Server crashes when a bad query is passed to ResourceJS
 - Added a middleware for loading a full form schema for use component settings.

## 1.87.0
### Fixed
 - Export of form controllers.

## 1.86.0
### Fixed
 - FJS-704: Address Refactor Issues
 - Refactored for the verbose health endpoint
 - Fixed Form Controller export.

### Added
 - Support Extra form fields exporting

### Changed
 - Upgraded formio-workers@1.14.8, mongodb@3.5.9, mongoose@5.9.19, nodemailer@6.4.10, formiojs@4.10.2, fs-extra@9.0.1, resourcejs@2.2.0, mocha@8.0.1

## 1.85.0
### Changed
 - FJS-953: Fixed getting error when exporting scv with time inside dataGrid
 - PDF 14 - Allow PDF Submission endpoint to be retrieved by 'Form Alias'

## 1.84.0
### Fixed
 - Fixed callback invocation after alterFormSave series.

## 1.83.0
### Changed
 - Update chance@1.1.6, formio-workers@1.14.7, mongodb@3.5.8, mongoose@5.9.16, nodemailer@6.4.8, moment@2.26.0, eslint@7.1.0, mocha@7.2.0

### Fixed
 - FOR-2665: Ensure calculate value eval context

## 1.82.0
### Added
 - Template import/export improvements.

## 1.81.0
### Added
 - Fix (Tree): added validation schema.

## 1.80.0
### Changed
 - FJS-917: Add options to use SSL Certs with Mongo connection.

## 1.79.0
### Added
 - More options for mapping Save Submission action to a Resource.

## 1.78.0
### Changed
 - Reverted action logs to save correctly.

### Fixed
 - Problem where malformed data could throw errors.

## 1.77.0
### Fixed
 - Issue with email renderings not working with workers upgrade.
 - EditGrid issues when exported in CSV format.

## 1.76.0
### Fixed
 - FJS 864: Fixed login action resources limitation
 - Fixed server crash on invalid x-query

## 1.75.0
### Fixed
 - Issues where loading subforms could lose references.

### Changed
 - Upgrade formiojs@4.9.19

## 1.74.0
### Changed
 - Upgrade formiojs@4.9.18, mongodb@3.5.6, mongoose@5.9.9, nodemon@2.0.3, html-entities@1.3.1, semver@7.3.2

### Added
 - Debug messages to the loadSubForms method.
 - Validator for tagpad component.

## 1.73.0
### Fixed
 - Validations for checkboxes configured as radio inputs.

### Changed
 - Upgrade config@3.3.1, formiojs@4.9.13, mongoose@5.9.7, nodemailer@6.4.6, mocha@7.1.1

## 1.72.0
### Changed
 - Upgrade mongoose@5.9.5

### Fixed
 - Fixed CSVExporter: Add default format for datetime

## 1.71.0
### Changed
 - Upgrade csv@5.3.2, mongodb@3.5.5, mongoose@5.9.4, nodemailer@6.4.5, async@3.2.0, config@3.3.0, mssql@6.2.0, mocha@7.1.0

### Fixed
 - Fixing dryrun for field actions so they execute, and adding more hooks for formResponse and alias.

## 1.70.0
### Added
 - Tokens to the calculate value evaluate contexts.

## 1.69.0
### Added
 - The decoded JWT Token as "token" to the evaluation context for Calculated Values.

### Changed
 - Upgrade nodemailer@6.4.3

## 1.68.0
### Changed
 - Updated config@3.2.6, mongoose@5.9.2, moment-timezone@0.5.28
 - Made changes to ensure evals cannot be can on the server.

## 1.67.0
### Fixed
 - Ensure we call loadForm hook for all types of form loading methods.

### Changed
 - Upgrade formio.js@4.9.0-beta.8

## 1.66.0
### Changed
 - Upgrade mongoose@5.9.1, mssql@6.1.0
 - Added additional hooks for loadForm.

## 1.65.0
### Changed
 - Upgrade mongoose@5.9.0

### Added
 - Added actionsQuery alter hook.

## 1.64.0
### Fixed
 - All deprecations and warnings.

### Changed
 - Upgrade mongodb@3.5.3, request@2.88.2, adm-zip@0.4.14, async@3.1.1, mssql@6.0.1, nodemailer-mailgun-transport@2.0.0, semver@7.1.3, mocha@7.0.1, nodemon@2.0.2

## 1.63.11
### Fixed
 - Set sort order of exports.

## 1.63.10
### Fixed
 - FOR-2608: Fixed Cc and Bcc for Mailgun.
 - FOR-2603: Fixed issue when server would throw an error if nested submission was not found.

### Added
 - Added missing variables to check conditional context.

### Changed
 - Upgraded formiojs@4.8.1, mongoose@5.8.11, mysql@2.18.1

## 1.63.9
### Fixed
 - Fixed some more email issues with BCC and CC.

## 1.63.8
### Added
 - Added support for Cc and Bcc for Email action.

### Fixed
 - Fixed file component validations.

### Changed
 - Upgrade config@3.2.5, mongoose@5.8.9, mongodb@3.5.2

## 1.63.7
### Fixed
 - Tests to ignore controller form property.

### Changed
 - Upgrade mongoose@5.8.6

## 1.63.6
### Changed
 - Upgraded mongodb@3.4.1, mongoose@5.8.3, resourcejs@1.38.2

## 1.63.5
### Fixed
 - Issue where the Swagger IO intreface was not working.

## 1.63.4
### Fixed
 - Issue where Swagger could throw an unhandled error.

### Changed
 - Upgraded resourcejs@1.38.0

## 1.63.3
### Changed
 - Reverted the sort order of CSV exports.

## 1.63.2
### Fixed
 - Other issues with CSV export using wizards.

## 1.63.1
### Fixed
 - Login lockout test wait times to be more forgiving.

## 1.63.0
### Fixed
 - Issue where CSV exports with wizards was throwing errors.

### Changed
 - Upgrade mongodb@3.4.0, mongoose@5.8.0

## 1.62.0
### Added
 - ```create``` Group Permissions layer

### Changed
 - ```write``` and ```admin``` Group Permissions layers to have ability to create submissions

### Fixed
 - Convert field and property handlers to work with complex data types by managing the path correctly.

## 1.61.0
### Changed
 - Upgraded dependencies

### Added
 - Add submission, previous and moment to action should execute context.
 - Added Merge Component Schema action type.
 - Added api token support

### Fixed
 - Fixed temp token check generated with admin key
 - Fix URL to download Github archives
 - Fix nested form submissions export

## 1.60.8
### Addded
 - ignoreTLS flag for the nodemailer SMTP configurations.

## 1.60.7
### Fixed
 - Problems where empty datetime components were returning the wrong values.

## 1.60.6
### Fixed
 - Issue with multiple datetime fields erasing the values provided.

## 1.60.5
### Changed
 - Upgraded formiojs@4.6.1, resourcejs@1.37.0

### Added
 - Submission filter queries to the export functions.

## 1.60.4
### Fixed
 - Fix Mongoose deprecation warnings

### Changed
 - Upgraded config@3.2.4, mongodb@3.3.3, mongoose@5.7.7, mocha@6.2.2, nodemon@1.19.4, formiojs@4.6.0, eslint@6.6.0, moment-timezone@0.5.27

### Added
 - Add the ability to alter actions.

## 1.60.3
### Changed
 - Upgraded chance@1.1.3, formiojs@4.3.3, mongoose@5.7.4, nodemailer@6.3.1

## 1.60.2
### Added
 - Add minItems and maxItems validation

### Changed
 - Upgraded config@3.2.3, mongoose@5.7.3, mocha@6.2.1, nodemon@1.19.3, formiojs@4.3.1, eslint@6.5.1
 - Upgrade formio.js to 4.x branch.

## 1.60.1
### Fixed
 - Default name of environment variable to change the email batch size.
 - Not running unique keys validation on components with missing input property

## 1.60.0
### Fixed
 - Crash in the Login Action when no settings were provided.

### Added
 - Support for bulk emails by breaking up a large amount into chunks.

## 1.59.0
### Fixed
 - FOR-2498: Added final cleanup after project import.
 - Upgrade formio-workers to 1.14.0 https://github.com/formio/formio-workers/blob/master/Changelog.md#v1140

### Changed
 - Upgraded mongoose@5.7.1

## 1.58.0
### Changed
 - FOR-2499: Always treat actionContext alter hook as Promise-returning

## 1.57.0
### Fixed
 - Fix issue where field logic value settings were forced to a string

### Changed
 - FOR-2499: Make actionContext hook async

## 1.56.0
### Fixed
 - FOR-2493: Added configurable access endpoints.
 - FOR-2500: Added empty subsubmission data check before updating.
 - FOR-2493: Fix issue with files in submission index endpoint when URL is undefined

### Changed
 - Upgraded formio-workers to 1.13.0 to resolve email issue with empty file uploads.
 - Upgrade mongoose to 5.7.0

## 1.55.0
### Added
 - Configurable access endpoint.

## 1.54.0
### Changed
 - Reverted commit that alters access endpoints.

## 1.53.0
### Fixed
 - The filter queries to allow for string 'false', 'true', and 'null' as well as hard values using "__eq" and "__ne" selectors.

### Changed
 - Upgraded formiojs@3.27.3, mongoose@5.6.12, nodemon@1.19.2, chance@1.1.0, resourcejs@1.36.0

## 1.52.0
### Added
 - The ability to query deleted submissions by providing the filter parameter "?deleted__ne=null" in the submission index query.

### Fixed
 - The access endpoint to work with authentication to ensure that it only provides information that the user has access to.

### Changed
 - Upgraded formiojs@3.27.1, formio-workers@1.12.0

## 1.51.0
### Fixed
 - The submission index query to provide more meta-data for file uploads. Just remove any base64 data.

## 1.50.0
### Added
 - Token schema

## Fixed
 - Issue with CSV export crashing server when timing is off
 - Add own filter to count query
 - Fix issue where row is not defined on custom conditional

## 1.49.0
### Changed
 - Upgrade lodash@4.17.15, mongodb@3.2.7, config@3.2.2, formiojs@3.24.0, mongoose@5.6.7, nodemailer@6.3.0, semver@6.3.0, mocha@6.2.0, fs-extra@8.1.0, eslint@6.1.0, moment-timezone@0.5.26

### Fixed
 - Fix tests that fail with new config changes.

### Added
 - Added missing variables in custom validation.

## 1.48.2
### Reverted
 - Fix some issues with protecting password fields.

## 1.48.1
### Fixed
 - Wait for saves in setActionItemMessage function.

## 1.48.0
### Added
 - ActionItem resource for logging action information.

### Fixed
 - Fix some issues with protecting password fields.
 - On index, only return if a file is uploaded for base64 files.

### Changed
 - Update dependencies.

## 1.46.0
### Changed
 - Upgraded mongodb@3.2.4, mongoose@5.5.8, nodemailer@6.1.1, body-parser@1.19.0, formiojs@3.20.14, nodemon@1.19.0

### Fixed
 - Form properties in export.
 - Ensure that the loadSubForms honors the form revision settings within the form components.

## 1.45.0
### Added
 - Added more permissions hooks.

### Changes
 - Altered the interface for permissionSchema hook. Now it provides the full permission schema.

## 1.44.7
### Fixed
 - Dockerfile to correctly run.
 - Installation process to be able to run without prompts.
 - Docker-compose file to allow for complete bootup easily.

### Changed
 - Upgraded formiojs@3.19.9, mongoose@5.5.2, mocha@6.1.3, mssql@5.1.0

## 1.44.6
### Reverted
 - Encrypted values not available in emails. (Caused crashes with implementation)

## 1.44.5
### Fixed
 - Encrypted values not available in emails.

### Added
 - Ability to hook into email/webhook params.

## 1.44.4
### Fixed
 - An issue where a debug method was undefined.

### Changed
 - Upgraded mongodb@3.2.3, nodemon@1.18.11, config@3.1.0, formiojs@3.19.3, mongoose@5.5.0, nodemailer@6.1.0, mocha@6.1.2

## 1.44.3
### Fixed
 - Problems where sub-forms are submitting when "reference" is disabled on the component.

## 1.44.2
### Fixed
 - FOR-2143: Protected fields being exposed for SAR select resources

### Changed
 - Upgraded mongoose@5.4.22

## 1.44.1
### Fixed
 - Submission role tests for the enterprise server.

### Changed
 - Upgraded formiojs@3.18.4

## 1.44.0
### Added
 - Adding loading nested forms sub-submissions to cache methods.
 - Allowing the deletion of roles from a submission (but not adding)
 - Adding submissionQuery hooks for all submission queries being made.

### Changed
 - Making loadSubForms more performant and also adding a way to bulk load forms and submissions.
 - Upgraded nodemailer@6.0.0, semver@6.0.0, formiojs@3.18.3, mongoose@5.4.21, mssql@5.0.5, fast-json-patch@2.1.0, eslint@5.16.0
 - Moving the owner setting to submission handler so it works on all submissions.
 - Replace bcrypt with bcryptjs.

## 1.43.2
### Fixed
 - Fix permissions check on patch submission.
 - Fix issue with deploying projects with forms configured with nested forms attached to specific versions.

### Changed
 - formiojs@3.18.1, mongoose@5.4.20

## 1.43.1
### Fixed
 - The token handler to also call the user hooks for other kinds of tokens.

### Changed
 - Upgraded formiojs@3.18.0, mongodb@3.2.2

## 1.43.0
### Fixed
 - Added a more efficient and complete role checking mechanism for permission handling.

### Changed
 - Updated bcrypt@3.0.5, jsonwebtoken@8.5.1, mssql@5.0.3, eslint@5.15.3, supertest@4.0.2, formiojs@3.17.4

## 1.42.1
### Fixed
 - Patch requests incorrectly patching files with encrypted fields.

## 1.42.0
### Removed
 - Removed the macros from the email action since those are now added to the formio-workers library.

### Changed
 - Upgraded dependencies.

## 1.41.3
### Fixed
 - Problem with a subform put request.

## 1.41.2
### Fixed
 - Issues with the nested subform create and update when called from the API.

### Changed
 - Updated mocha@6.0.1

## 1.41.1
### Changed
 - Default the email action to have a default email template.
 - Upgraded mongoose@5.4.14, mssql@4.3.2, request-promise-native@1.0.7, formiojs@3.15.6, jsonwebtoken@8.5.0, eslint@5.14.1, mocha@6.0.0

### Fixed
 - Issue with subform validation to not include subforms that are conditionally hidden.
 - Issue with subform validation where it will not process the subform requests if the subform is not present within the data.
 - A potential crash within the subform validation where if the subform requests fails, it will cause the post request to not find a submission.
 - The mongoose schema definitions from removing the _id property incorrectly.

## 1.41.0
### Added
 - PATCH method support for submissions.
 - Now allow more than GET requests to be skipped for permissions checks.

### Changed
 - Upgraded async@2.6.2, bcrypt@3.0.4, mongoose@5.4.10, nodemon@1.18.10, formiojs@3.14.1

## 1.40.2
### Fixed
 - When resetting passwords, jwtIssuedAfter sometimes got set to wrong timestamp resulting in invalid tokens.

## 1.40.1
### Added
 - Ability to connect to SA enabled mongodb instances.

### Changed
 - Updated formiojs@3.13.9, mongoose@5.4.9, mssql@4.3.1, supertest@3.4.2, moment@2.24.0, eslint@5.13.0

## 1.40.0
### Added
 - reCAPTCHA API Endpoint

### Changed
 - mongodb@3.1.13, formiojs@3.13.0

## 1.39.2
### Fixed
 - The tests to work with extended systems.

## 1.39.1
### Fixed
 - Issue where read all permissions are ignored when resource submission access is established.

### Changed
 - Upgraded csv@5.1.1, mongodb@3.1.12, mongoose@5.4.5, formiojs@3.12.2, nodemailer@5.1.1, eslint@5.12.1, supertest@3.4.1

## 1.39.0
### Changed
 - Added more permissions form matching during import process to resolve conflicts.

## 1.38.0
### Added
 - Minimal support for running entire stack in docker-compose
 - FOR-644: Adding logging for form actions to help tracking execution and errors.

### Fixed
 - FOR-1908: Fixed problem where ID's could be set when creating records.
 - FOR-1977: Issues with the resource access permissions where indexes were not performant and giving 401 errors.

### Changed
 - Upgraded bcrypt@3.0.3, debug@4.1.1, formiojs@3.10.2, joi@14.3.1, mongoose@5.4.2, csv@5.1.0, eslint@5.11.1
 - Upgraded nodemailer to version 5: From their CHANGELOG - Start using dns.resolve() instead of dns.lookup() for resolving SMTP hostnames. Might be breaking change on some environments so upgrade with care

## 1.37.7
### Fixed
 - The formio-workers dependency from using dynamic require paths which messes up certain builds.

## 1.37.6
### Fixed
 - Issues with the resource permissions where it would only allow one resource per type.
 - The default.json configuration to point to the correct "databases" config.

### Changed
 - Changed the installation to say "setup" instead of "install".
 - Upgrade formiojs@3.9.3, mongoose@5.3.15, progress@2.0.3, chance@1.0.18, eslint@5.10.0

## 1.37.5
### Changed
 - Updated to resourcejs v1.33.0 which changes more 500 errors to 400s.

## 1.37.4
### Fixed
 - Potential issues with the recursive forms not loading correctly.

## 1.37.3
### Fixed
 - Potential crash with the subform responses.
 - Upgraded config@3.0.0, csv@5.0.0, mongoose@5.3.13, formiojs@3.9.0, joi@14.1.0, nodemailer@4.7.0

## 1.37.0
### Added
 - Logging for action failures

### Changed
 - Respond with 400 errors instead of 500 when an error occurs.

### Updated
 - resourcejs 1.30.0

## 1.36.0
### Removed
 - Merge form handler

## 1.35.2
### Changed
 - Code cleanup
 - API key regex.
 - Upgraded
   - JSONStream@1.3.5
   - bcrypt@3.0.2
   - express@4.16.4
   - formiojs@3.6.12
   - mongodb@3.1.8
   - mongoose@5.3.7
   - mssql@4.2.2
   - progress@2.0.1
   - nodemon@1.18.5
   - debug@4.1.0
   - resourcejs@1.28.0
   - semver@5.6.0
   - eslint@5.8.0

## 1.35.1
### Fixed
 - Issue where logging would sometimes crash when tokens do not contain user objects.

### Changed
 - Upgraded eslint@5.6.1, formiojs@3.6.4, joi@13.7.0, mongoose@5.3.2

## 1.35.0
### Added
 - basic request logging with DEBUG=formio:log.

### Fixed
 - Minor nested form reference issue.

## 1.34.6
### Changed
 - Syntax for including files using __dirname. This is maintenance only.

## 1.34.5
### Fixed
 - FOR-1719 Nested form SAR feature.

### Added
 - Schema collection is now a first class model.

## 1.34.4
### Fixed
 - Issues where an admin token generated with no logged in user would fail.
 - Issue with Email configurations overriding other emails with different settings.

## 1.34.3
### Fixed
 - Problem with the "current" user endpoint where it would not work if query parameters are provided.

## 1.34.1
### Changed
 - Upgraded the formio-workers library to v1.18.0
 - Upgraded formiojs library to v3.5.5

## 1.34.0
### Updated
 - Upgrade lodash@4.17.11, mongodb@3.1.6, mongoose@5.2.16, formiojs@3.5.3, mssql@4.2.1, eslint@5.6.0, resourcejs@1.26.0, and debug@4.0.1

### Fixed
 - Fixed the action condition checks to ensure it will not work for any empty conditionals.

### Changed
 - FOR-1603,FOR-1639: Improved Google CSV export
 - Add option to mark template imports to create only.
 - Expire all tokens when a password is reset.
 - Apply form update permissions when fetching actions.

## 1.33.6
### Fixed
 - A potential crash within the Validator.

### Added
 - Query parameters to the action execution.

### Changed
 - Upgrade dependencies.

## 1.33.5
### Changed
 - Upgrade formiojs@3.4.0, resourcejs@1.25.3, mongodb@3.1.4, mongoose@5.2.10

## 1.33.4
### Changed
 - Upgrade formiojs@3.3.6 resourcejs@1.25.2
 - Allow usage of Unauthorized certificates for SMTP servers.

## 1.33.3
### Changed
 - FOR-1533: Improved conditional Actions.

### Added
 - FOR-1556: Added timezone support for CSV downloads.

## 1.33.2
### Changed
 - Upgraded JSONStream@1.3.4, mongodb@3.1.3, mongoose@5.2.8

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
