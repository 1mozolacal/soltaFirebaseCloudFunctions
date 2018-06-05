
const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp(functions.config().firebase);



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