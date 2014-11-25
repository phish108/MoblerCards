#!/usr/bin/env node
// this script must not be executed!

///**
// * This script copies Android-style manifest files to the platform location.
// */
//
//var fs = require('fs');
//var path = require('path');
//
//var rootdir = process.argv[2];
//
//var sdir = path.join(rootdir, 'build');
//
//var wdirs = {
//    'android' : 'AndroidManifest.xml'
//};
//
//if (fs.existsSync(sdir)) {
//    fs.readdir(sdir, function (err, files) {
//        files.forEach(function(f) {
//            var scdir = path.join(sdir, f);
//            if (fs.statSync(scdir).isDirectory()) {
//                var tcdir = path.join(rootdir, 'platforms', f);
//                if (fs.existsSync(tcdir) && wdirs[f] && wdirs[f].length) {
//                    var sf = path.join(scdir, wdirs[f]);
//                    var tf = path.join(tcdir, wdirs[f]);
//
//                    // copy the manifest files
//                    if (fs.existsSync(sf)) {
//                        fs.createReadStream(sf).pipe(fs.createWriteStream(tf));
//                    }
//                }
//            }
//        });
//    });
//}
