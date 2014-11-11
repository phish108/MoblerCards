#!/usr/bin/env node


var strjson = "";

process.stdin.on('readable', function() {
    var chunk;
    while (null !== (chunk = process.stdin.read())) {

        if (chunk !== null) {
            // console.log(chunk);
            strjson += chunk;
        }
    }
});
process.stdin.on('end', function() {
    if (strjson && strjson.length) {
        var inO = JSON.parse(strjson);
        var outO = [];

        for(var i = 0 ; i < inO.length; i++) {
            if (inO[i].verb.id === "http://imsglobal.com/vocab/qti/item/respond") {
                if(inO[i].object.definition === undefined || inO[i].object.definition.name === undefined ) {
                    outO.push(inO[i]);
                }
                if(inO[i].agent.name === undefined){
                    outO.push(inO[i]);
                }
                if(!("scaled" in inO[i].result.score)) {
                    outO.push(inO[i]);
                }
            }
        }

        process.stdout.write(JSON.stringify(outO));
    }
});
