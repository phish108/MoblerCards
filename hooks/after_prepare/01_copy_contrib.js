#!/usr/bin/env node

var fs = require('fs');
var path = require('path');

var rootdir = process.argv[2];

function copyDir(source, target) {
    if (fs.existsSync(source)) {
        if (!fs.existsSync(target)) {
            // create the target directory if it does not exist
            fs.mkdirSync(target);
        }

        // read the directory
        fs.readdir(source, function (err, files) {
            files.forEach(function(f) {
                var sfile = path.join(source, f);
                if (fs.statSync(sfile).isDirectory()) {
                    // copy directoy
                    copyDir(path.join(source, f),
                            path.join(target, f));
                }
                else if (fs.statSync(sfile).isFile()) {
                    // copy file
                    fs.createReadStream(sfile).pipe(fs.createWriteStream(path.join(target, f)));
                }
            });
        });
    }
}

var wdirs = {
    'android' : 'assets/www',
    'ios': 'www'
};

var pdirs = [];

// check which platforms are supported by the project
for (var k in wdirs) {
    var tf = path.join(rootdir, 'platforms', k, wdirs[k]);
    if (fs.existsSync(tf)) {
        pdirs.push(tf);
    }
}

var cdir = path.join(rootdir, 'contrib');
if (fs.existsSync(cdir)) {
    // read the directories in the contrib file
    fs.readdir(cdir, function (err, files) {
        files.forEach(function(f) {
            var scdir = path.join(cdir, f);
            if (fs.statSync(scdir).isDirectory()) {
                pdirs.forEach(function (dd) {
                    var tdd = path.join(dd, f, 'contrib');
                    copyDir(scdir, tdd);
                });
            }
        });
    });
}
