# Change Log 
All notable changes to this project will be documented in this file

The format is based on [Keep a Changelog](http://keepachangelog.com/)
and this project adheres to [Semantic Versioning](http://semver.org/).

## [Unreleased]
### Added
 - Template import / export tests
 - git pre commit hooks for linting

### Changed

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
