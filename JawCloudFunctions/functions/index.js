const functions = require('firebase-functions');
const admin = require('firebase-admin');
const request = require('request');

var API_KEY = "AAAAP6c2Acg:APA91bEE-8XLwSgxmtZ6TPPE0hFs0XcHCWDoUoPSBmzgi9saie8-C0nAUui7ebPSfDI2-75sSYl81XOjnl55PQWC8vustEFwhtHcdYGcSP6yhFkkvtJABTBxjR7E9LLRPjNkM9xYxlFK";

//admin.initializeApp(functions.config().firebase);

// Fetch the service account key JSON file contents
var serviceAccount = require('./JawApp-9c35d6285a07.json');

// Initialize the app with a service account and admin privlages
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://jawapp-e22c1.firebaseio.com"
});

ref = admin.database().ref();

function listenForNotificationRequests() {
  var requests = ref.child('messages');
  requests.on('child_added', function(requestSnapshot) {
    var request = requestSnapshot.val();
    sendNotificationToUser(
      request.name,
      request.text,
      function() {
        //requestSnapshot.ref.remove();
        // TODO: Figure out what to do onSuccess
      }
    );
  }, function(error) {
    console.error(error);
  });
};

function sendNotificationToUser(username, message, onSuccess) {
  request({
    url: 'https://fcm.googleapis.com/fcm/send',
    method: 'POST',
    headers: {
      'Content-Type' :' application/json',
      'Authorization': 'key='+API_KEY
    },
    body: JSON.stringify({
      notification: {
        title: message
      },
      to : 'friendly_engage' // TODO: Change this when there is more than one topic
    })
  }, function(error, response, body) {
    if (error) { console.error(error); }
    else if (response.statusCode >= 400) {
      console.error('HTTP Error: '+response.statusCode+' - '+response.statusMessage);
    }
    else {
      onSuccess();
    }
  });
}

// start listening
listenForNotificationRequests();

exports.notifications = functions.database.ref('/messages').onWrite(event => {
  var eventSnapshot = event.data;
  if(eventSnapshot.changed()){
    request({
      url: 'https://fcm.googleapis.com/fcm/send',
      method: 'POST',
      headers: {
        'Content-Type' :' application/json',
        'Authorization': 'key='+API_KEY
      },
      body: JSON.stringify({
        notification: {
          title: "yay"
        },
        to : 'friendly_engage' // TODO: Change this when there is more than one topic
      })
    }, function(error, response, body) {
      if (error) { console.error(error); }
      else if (response.statusCode >= 400) {
        console.error('HTTP Error: '+response.statusCode+' - '+response.statusMessage);
      }
      else {
        console.log("Success!")
      }
    });
  }
})

// Take the text parameter passed to this HTTP endpoint and insert it into the
// Realtime Database under the path /messages/:pushId/original
exports.addMessage = functions.https.onRequest((req, res) => {
  // Grab the text parameter.
  const original = req.query.text;
  // Push it into the Realtime Database then send a response
  admin.database().ref('/messages').push({original: original}).then(snapshot => {
    // Redirect with 303 SEE OTHER to the URL of the pushed object in the Firebase console.
    res.redirect(303, snapshot.ref);
  });
})
