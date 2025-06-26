# Change Log

>All significant changes to formsflow-forms will be clearly documented in this file. The following labels are used to categorize the changes:

- `Added`: New features, enhancements, or functionalities added to the project.
- `Changed`: Modifications, improvements, or updates made to existing features or behaviors.
- `Fixed`: Resolved issues, bug fixes, or error corrections.
- `Removed`: Elimination of features, functionalities, or components from the project.
- `Untested Features`: Newly introduced features or components that are yet to be thoroughly tested.
- `Upcoming Features`: Planned features or enhancements that will be available in future releases.
- `Known Issues`: Existing issues or problems that are acknowledged and will be addressed in subsequent updates.

# Version 7.1.0
### Added
- Added FORMIO_JWT_EXPIRE env for handling token expire time
- Added tenant_key in logger
- Added New /submissions POST API Allows listing submissions by passing submissionIds in the request body. Ensures access control by verifying form access before returning submissions.

# Version 7.0.0
### Added
- Added the formIds query parameter in the /form endpoint to retrieve form components, accessible only to admin users.
- Added a custom property displayForRole to display specific data based on the assigned role.
- Added a new endpoint `forms/search` for listing forms based on their path, name, or title.

### Fixed
- Fixed the authorization logic for fetching bundle submission data. Now, only the data of the currently viewed form in a bundle is returned, instead of sending all form data.

### Changed
- Disabled role mapping for all form access permissions when a new role is created.
 
# Version 6.0.0

### Added
- Added new endpoint `/form/formid/metadata` to retrieve form metadata.
- Added logs into formio to support ELK
### Changed
- Formsflow-forms version upgrade
- formio version upgraded to 2.4.1 to 3.2.0
# Version 5.3.0
### Changed
- Formsflow-forms version upgrade

# Version 5.2.2
### Fixed
- Fixed most of the vulnerabilities.

## Version 5.2.1
### Fixed
- Fixed most of the vulnerabilities.

# Version 5.2.0
### Added
- The `skip-sanitize` option added to the header, allowing the skipping of form submission sanitization.

### Fixed
- Corrected the data type of the `NO_INSTALL` value from string to boolean.

### Changed
- The Client.zip file is now included in the repository rather than being downloaded.

# Version 5.1.1
### Removed
- Deprecated the use of the `FORMIO_CLIENT_UI` environment variable. Instead, use the `NO_INSTALL` environment variable.

# Version 5.1.0
### Added
- Introduced a new environment variable, `FORMIO_CLIENT_UI`, providing additional configuration options.
- Implemented a Health Check API endpoint at `/checkpoint` for improved system health monitoring.

# Version 5.0.0
### Added
- Enabled multi-tenancy support, allowing the application to serve multiple tenants simultaneously.

By following this revised format, the change log provides clear and concise information about each version's changes and helps users and developers understand the updates made to formsflow-forms easily.
