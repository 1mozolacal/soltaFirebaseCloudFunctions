
const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp(functions.config().firebase);

// [START import]
//const functions = require('firebase-functions');
const gcs = require('@google-cloud/storage')();
const spawn = require('child-process-promise').spawn;
const path = require('path');
const os = require('os');
const fs = require('fs');
//IMPORTANT import using
//npm install child-process-promise --save
//npm install @google-cloud/storage --save

exports.multiRead = functions.database.ref('FluxCalc/StoredInfo').onWrite(event => {
    const hits = event.after.child("number").val();
    const time = event.after.child("time").val();
    const addTime = event.after.child("addTime").val();
    const otherText = event.after.child("new").val();

    //console.log("bool:" + (event.after.child("time").val() ===  event.before.child("time").val()) );
    //console.log("bool:" + (event.after.child("time") ===  event.before.child("time")) );

    if(event.after.child("addTime").val() ===  event.before.child("addTime").val()){
        return event.after.ref.child('new').set(otherText);
    }

    console.log("Num:" + hits + "  Time:" + time);


    var calcedFlux;
    if( !isNaN(Number(hits)) && !isNaN(Number(time)) && !isNaN(Number(addTime)) ){
        calcedFlux = (Number(hits)+1) / (Number(time)+Number(addTime) ) ;
        console.log("Calculation:" + calcedFlux);
        const db = admin.database().refFromURL('https://tester-4992.firebaseio.com/FluxCalc/StoredInfo');
        db.child("flux").set(calcedFlux);
        db.child("number").set(Number(hits)+1);
        db.child("time").set(Number(time)+Number(addTime));
    } else {
        calcedFlux = 0;
        console.log("WARMING Flux calculation error");
    }

    return event.after.ref.child('new').set(otherText);//"somewhere over the mountain, skies are blue"
});

exports.getDeltaTime = functions.database.ref('FluxCalc/TempUser').onWrite(event =>{


        const newTime = event.after.child("hit").val();
        const oldTime = event.after.child("last").val();
    if(newTime > oldTime) {
        var delta;
        if (!isNaN(Number(newTime)) && !isNaN(Number(oldTime))) {
            delta = Number(newTime) - Number(oldTime);
            const db = admin.database().refFromURL('https://tester-4992.firebaseio.com/FluxCalc/StoredInfo');
            db.child("addTime").set(Number(delta));
        } else {
            console.log("ERROR in delta calculation")
        }
    }
    return event.after.ref.child("last").set(newTime);
});


//Credit for generate thumbnail function: https://github.com/firebase/functions-samples/blob/master/quickstarts/thumbnails/functions/index.js
exports.generateThumbnail = functions.storage.object().onFinalize((object) => {
// [END generateThumbnailTrigger]
    // [START eventAttributes]
    const fileBucket = object.bucket; // The Storage bucket that contains the file.
    const filePath = object.name; // File path in the bucket.
    const contentType = object.contentType; // File content type.
    const metageneration = object.metageneration; // Number of times metadata has been generated. New objects have a value of 1.
    // [END eventAttributes]

    // [START stopConditions]
    // Exit if this is triggered on a file that is not an image.
    if (!contentType.startsWith('image/')) {
        console.log('This is not an image.');
        return null;
    }

    // Get the file name.
    const fileName = path.basename(filePath);
    // Exit if the image is already a thumbnail.
    if (fileName.startsWith('thumb_')) {
        console.log('Already a Thumbnail.');
        return null;
    }
    // [END stopConditions]

    // [START thumbnailGeneration]
    // Download file from bucket.
    const bucket = gcs.bucket(fileBucket);
    const tempFilePath = path.join(os.tmpdir(), fileName);
    const metadata = {
        contentType: contentType,
    };
    return bucket.file(filePath).download({
        destination: tempFilePath,
    }).then(() => {
        console.log('Image downloaded locally to', tempFilePath);
        // Generate a thumbnail using ImageMagick.
        return spawn('convert', [tempFilePath, '-thumbnail', '200x200>', tempFilePath]);
    }).then(() => {
        console.log('Thumbnail created at', tempFilePath);
        // We add a 'thumb_' prefix to thumbnails file name. That's where we'll upload the thumbnail.
        const thumbFileName = `thumb_${fileName}`;
        const thumbFilePath = path.join(path.dirname(filePath), thumbFileName);
        // Uploading the thumbnail.
        return bucket.upload(tempFilePath, {
            destination: thumbFilePath,
            metadata: metadata,
        });
        // Once the thumbnail has been uploaded delete the local file to free up disk space.
    }).then(() => fs.unlinkSync(tempFilePath));
    // [END thumbnailGeneration]
});
// [END generateThumbnail]
