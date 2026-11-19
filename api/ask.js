'use strict';
// Legacy name, same governed execution path as /api/workspace.
// No model credential or direct provider request belongs in this surface.
module.exports = require('../lib/workspace-handler').createHandler({runOnly:true});
