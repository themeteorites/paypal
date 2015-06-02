Package.describe({
    name: 'themeteorites:paypal',
    version: '0.0.1',
    // Brief, one-line summary of the package.
    summary: 'A PayPal rest api package for meteor',
    // URL to the Git repository containing the source code for this package.
    git: '',
    // By default, Meteor will default to using README.md for documentation.
    // To avoid submitting documentation, set this field to null.
    documentation: 'README.md'
});

Npm.depends({
    'paypal-rest-sdk': '1.5.3'
});

Package.onUse(function(api) {
    var path = Npm.require('path'), clientPath = path.join('client'), commonPath = path.join('lib'), serverPath = path.join('server');
    var tplPath = path.join(clientPath, 'templates');
    var clientFiles = [], commonFiles = [], serverFiles = [];

    api.versionsFrom('1.1.0.2');

    /* Dependencies */

    api.use(['templating', 'underscore', 'accounts-password', 'reactive-var', 'mongo', 'audit-argument-checks', 'check', 'themeteorites:payments', 'mquandalle:jade@0.4.3', 'grigio:babel']);

    api.use(['aldeed:collection2', 'aldeed:autoform@5.3.0']);

    // Client
    clientFiles.push(path.join(tplPath, '_paypalButton.tpl.jade'));
    clientFiles.push(path.join(tplPath, '_paypalConfig.tpl.jade'));
    clientFiles.push(path.join(clientPath, '_paypalConfig.es6'));
    clientFiles.push(path.join(clientPath, 'paypal-client.es6'));
    clientFiles.push(path.join(clientPath, '_paypalButton.es6'));

    // Common
    commonFiles.push(path.join(commonPath, 'paypal-common.es6'));
    commonFiles.push(path.join(commonPath, 'bluebird.min.js'));

    // Server
    serverFiles.push(path.join(serverPath, 'paypal-server.es6'));


    api.addFiles(clientFiles, 'client');
    api.addFiles(commonFiles);
    api.addFiles(serverFiles, 'server');

    api.export('PayPal');
});

Package.onTest(function(api) {
    api.use('tinytest');
    api.use('paypal');
    api.addFiles('paypal-tests.js');
});
