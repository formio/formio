'use strict';
const { parse } = require('url');

const STORAGE_ROUTE = /^(?:\/project\/[^/]+)?\/form\/[^/]+\/storage\/(.+?)\/?$/i;

const STORAGE_PROVIDER = /^(?:s3(?:\/multipart\/(?:complete|abort))?|azure|dropbox|gdrive)$/i;

// Express routes on the path as sent, up to "?". Only a URL that doesn't start with "/", or holds
// "#" or whitespace, goes through url.parse, which also turns backslashes into slashes. Read the
// path the same way so the route and this check always agree.
const NEEDS_FULL_PARSE = /[\t\n\f\r # ﻿]/;
const routePath = (req) => {
  const url = req?.url || '';
  if (!url.startsWith('/') || NEEDS_FULL_PARSE.test(url)) {
    return parse(url).pathname || '';
  }
  return url.split('?')[0];
};

// req.url must already have been resolved from any form alias.
const isStorageRequest = (req) => {
  const match = STORAGE_ROUTE.exec(routePath(req));

  return Boolean(match && STORAGE_PROVIDER.test(match[1]));
};

module.exports = isStorageRequest;
module.exports.routePath = routePath;
