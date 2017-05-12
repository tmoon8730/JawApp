/**
 * Copyright 2015 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';


// Initializes JawApp.
function JawApp() {
  this.checkSetup();

  // Shortcuts to DOM Elements.
  this.messageList = document.getElementById('messages');
  this.messageForm = document.getElementById('message-form');
  this.messageInput = document.getElementById('message');
  this.submitButton = document.getElementById('submit');
  this.submitImageButton = document.getElementById('submitImage');
  this.imageForm = document.getElementById('image-form');
  this.mediaCapture = document.getElementById('mediaCapture');
  this.userPic = document.getElementById('user-pic');
  this.userName = document.getElementById('user-name');
  this.signInButton = document.getElementById('sign-in');
  this.signOutButton = document.getElementById('sign-out');
  this.signInSnackbar = document.getElementById('must-signin-snackbar');

  // Saves message on form submit.
  this.messageForm.addEventListener('submit', this.saveMessage.bind(this));
  this.signOutButton.addEventListener('click', this.signOut.bind(this));
  this.signInButton.addEventListener('click', this.signIn.bind(this));

  // Toggle for the button.
  var buttonTogglingHandler = this.toggleButton.bind(this);
  this.messageInput.addEventListener('keyup', buttonTogglingHandler);
  this.messageInput.addEventListener('change', buttonTogglingHandler);

  // Events for image upload.
  this.submitImageButton.addEventListener('click', function(e) {
    e.preventDefault();
    this.mediaCapture.click();
  }.bind(this));
  this.mediaCapture.addEventListener('change', this.saveImageMessage.bind(this));

  this.initFirebase();
}

// Sets up shortcuts to Firebase features and initiate firebase auth.
JawApp.prototype.initFirebase = function() {
  // Shortcuts to Firebase SDK features.
  this.auth = firebase.auth();
  this.database = firebase.database();
  this.storage = firebase.storage();
  // Initiates Firebase auth and listen to auth state changes.
  this.auth.onAuthStateChanged(this.onAuthStateChanged.bind(this));

};

// Loads chat messages history and listens for upcoming ones.
JawApp.prototype.loadMessages = function() {
  // Reference to the /messages/ database path.
  this.messagesRef = this.database.ref('messages');
  // Make sure we remove all previous listeners.
  this.messagesRef.off();
  // Loads the last 12 messages and listen for new ones.
  var setMessage = function(data) {
    var val = data.val();
    this.displayMessage(data.key, val.name, val.text, val.photoUrl, val.imageUrl, val.sentDate); // Show the image in the view
    this.saveKey(data.key); // Save the key to the currentUser as the most recently read
  }.bind(this);
  this.messagesRef.limitToLast(50).on('child_added', setMessage); // Event listener for added elements
  this.messagesRef.limitToLast(50).on('child_changed', setMessage); // Event listener for changed elements
};

// Template for the current users
JawApp.USER_TEMPLATE =
  '<div class="user">' +
    '<div class="mdl-layout_content">' +
      '<div class="mdl-grid">' +
        '<div class="mdl-cell mdl-cell--1-col">' +
          '<div class="pic"></div>'+
        '</div>' +
        '<div class="mdl-cell mdl-cell--5-col">' +
          '<div class="name"></div>' +
        '</div>' +
      '</div>' +
    '</div>' +
  '</div>'
// Method for setting a user as currently viewing the chat
JawApp.prototype.setCurrentUsers = function(){
  // Set connect and disconnect for current users dialog
  this.currentUser = this.auth.currentUser;

  // Reference to .info/connected which returns if a database connection is present or not
  this.connectedRef = firebase.database().ref(".info/connected");
  this.connectedRef.off();
  // Reference for /currentUsers/<currentUser> to set the present flag
  this.currentUsersRef = firebase.database().ref("/currentUsers").child(this.currentUser.displayName);;
  this.currentUsersRef.off();

  // Bind function for changes in the connection reference
  var setPresent = function(data){
    if(data.val() === true){
      // Connected
      this.currentUsersRef.update({
          present: true
        });
    }
  }.bind(this);
  this.connectedRef.on("value", setPresent);
  this.currentUsersRef.onDisconnect().update({present: false});

  // A reference to the /currentUsers database path
  this.currentRef = this.database.ref('currentUsers');
  // Make sure all the previous listeners are off
  this.currentRef.off();

  // Bind function for changing the present users textbox on the bottom of the screen
  var setText = function(data){
    var div = document.getElementById('currentUsersText');

    if(data.val().present == true){
      var checkName = '.' + data.val().name.replace(' ','');
      var queryCheck = div.querySelector(checkName);
      console.log("checkName " + checkName + " check " + queryCheck);
      if(queryCheck == null){
        var user = document.createElement('div');
        user.innerHTML = JawApp.USER_TEMPLATE;
        user.setAttribute('class',data.val().name.replace(' ',''));

        if(data.val().photoUrl)
          user.querySelector('.pic').style.content = 'url(' + data.val().photoUrl /* "https:\/\/lh3.googleusercontent.com/-GblqLhBzE2Y/AAAAAAAAAAI/AAAAAAAAkG0/zz7dLUckhto/photo.jpg"*/ + ')';
        user.querySelector('.name').textContent = data.val().name;

        div.appendChild(user);
      }
    }else{
      console.log("eh");
    }
  }.bind(this);

  // Set binds for when a user is changed or added to the /currentUsers location
  this.currentRef.on('child_changed', setText);
  this.currentRef.on('child_added', setText);

}

// Saves a new message on the Firebase DB.
JawApp.prototype.saveMessage = function(e) {
  e.preventDefault();
  // Check that the user entered a message and is signed in.
  if (this.messageInput.value && this.checkSignedInWithMessage()) {
    var currentUser = this.auth.currentUser;
    // Get the current date for the date-stamp
    var date = new Date().toLocaleString();
    // Encrypt the text using the security module
    var encryptedMessage = JawAppSecurity.encrypt(this.messageInput.value);
    // Add a new message entry to the Firebase Database.
    this.messagesRef.push({
      name: currentUser.displayName,
      text: encryptedMessage,
      photoUrl: currentUser.photoURL || '/images/profile_placeholder.png',
      sentDate: date
    }).then(function() {
      // Clear message text field and SEND button state.
      JawApp.resetMaterialTextfield(this.messageInput);
      this.toggleButton();
    }.bind(this)).catch(function(error) {
      console.error('Error writing new message to Firebase Database', error);
    });
  }
};

// Sets the current user to the read status
//TODO: This may be redudant lol
JawApp.prototype.readStatus = function(){
  // Check that the user is signed in
  if(this.checkSignedInWithMessage()){
    var currentUser = this.auth.currentUser;

    // Add entry to the Firebase Database.
    firebase.database().ref('currentUsers').child(currentUser.displayName)
      .update({
        name:currentUser.displayName,
        photoUrl: currentUser.photoURL || '/images/profile_placeholder.png'
      });
  }
};
// Sets the key of a message to the user so that the read status can be determined
JawApp.prototype.saveKey = function(key){

  var currentUser = this.auth.currentUser;

  firebase.database().ref('/currentUsers').child(currentUser.displayName)
    .update({
      name: currentUser.displayName,
      photoUrl: currentUser.photoUrl || '/images/profile_placeholder.png',
      lastMsgKey: key,
      present: true
    });
}
// Sets the URL of the given img element with the URL of the image stored in Firebase Storage.
JawApp.prototype.setImageUrl = function(imageUri, imgElement) {
  // If the image is a Firebase Storage URI we fetch the URL.
  if (imageUri.startsWith('gs://')) {
    imgElement.src = JawApp.LOADING_IMAGE_URL; // Display a loading image first.
    this.storage.refFromURL(imageUri).getMetadata().then(function(metadata) {
      imgElement.src = metadata.downloadURLs[0];
    });
  } else {
    imgElement.src = imageUri;
  }
};

// Saves a new message containing an image URI in Firebase.
// This first saves the image in Firebase storage.
JawApp.prototype.saveImageMessage = function(event) {
  event.preventDefault();
  var file = event.target.files[0];

  // Clear the selection in the file picker input.
  this.imageForm.reset();

  // Check if the file is an image.
  if (!file.type.match('image.*')) {
    var data = {
      message: 'You can only share images',
      timeout: 2000
    };
    this.signInSnackbar.MaterialSnackbar.showSnackbar(data);
    return;
  }

  // Check if the user is signed-in
  if (this.checkSignedInWithMessage()) {

    // We add a message with a loading icon that will get updated with the shared image.
    var currentUser = this.auth.currentUser;
    this.messagesRef.push({
      name: currentUser.displayName,
      imageUrl: JawApp.LOADING_IMAGE_URL,
      photoUrl: currentUser.photoURL || '/images/profile_placeholder.png'
    }).then(function(data) {

      // Upload the image to Firebase Storage.
      var filePath = currentUser.uid + '/' + data.key + '/' + file.name;
      return this.storage.ref(filePath).put(file).then(function(snapshot) {

        // Get the file's Storage URI and update the chat message placeholder.
        var fullPath = snapshot.metadata.fullPath;
        return data.update({imageUrl: this.storage.ref(fullPath).toString()});
      }.bind(this));
    }.bind(this)).catch(function(error) {
      console.error('There was an error uploading a file to Firebase Storage:', error);
    });
  }
};

// Signs-in Friendly Chat.
JawApp.prototype.signIn = function() {
  // Sign in Firebase using popup auth and Google as the identity provider.
  var provider = new firebase.auth.GoogleAuthProvider();
  this.auth.signInWithPopup(provider);
};

// Signs-out of Friendly Chat.
JawApp.prototype.signOut = function() {
  // Sign out of Firebase.
  this.auth.signOut();
};

// Triggers when the auth state change for instance when the user signs-in or signs-out.
JawApp.prototype.onAuthStateChanged = function(user) {
  if (user) { // User is signed in!
    // Get profile pic and user's name from the Firebase user object.
    var profilePicUrl = user.photoURL;
    var userName = user.displayName;

    // Set the user's profile pic and name.
    this.userPic.style.backgroundImage = 'url(' + (profilePicUrl || '/images/profile_placeholder.png') + ')';
    this.userName.textContent = userName;

    // Show user's profile and sign-out button.
    this.userName.removeAttribute('hidden');
    this.userPic.removeAttribute('hidden');
    this.signOutButton.removeAttribute('hidden');

    // Hide sign-in button.
    this.signInButton.setAttribute('hidden', 'true');

    // We load currently existing chant messages.
    this.loadMessages();
    this.setCurrentUsers();
    this.readStatus();

    // We save the Firebase Messaging Device token and enable notifications.
    this.saveMessagingDeviceToken();
  } else { // User is signed out!
    // Hide user's profile and sign-out button.
    this.userName.setAttribute('hidden', 'true');
    this.userPic.setAttribute('hidden', 'true');
    this.signOutButton.setAttribute('hidden', 'true');

    // Show sign-in button.
    this.signInButton.removeAttribute('hidden');
  }
};

// Returns true if user is signed-in. Otherwise false and displays a message.
JawApp.prototype.checkSignedInWithMessage = function() {
  // Return true if the user is signed in Firebase
  if (this.auth.currentUser) {
    return true;
  }

  // Display a message to the user using a Toast.
  var data = {
    message: 'You must sign-in first',
    timeout: 2000
  };
  this.signInSnackbar.MaterialSnackbar.showSnackbar(data);
  return false;
};

// Saves the messaging device token to the datastore.
JawApp.prototype.saveMessagingDeviceToken = function() {
  firebase.messaging().getToken().then(function(currentToken) {
    if (currentToken) {
      console.log('Got FCM device token:', currentToken);
      // Saving the Device Token to the datastore.
      firebase.database().ref('/fcmTokens').child(currentToken)
          .set(firebase.auth().currentUser.uid);
    } else {
      // Need to request permissions to show notifications.
      this.requestNotificationsPermissions();
    }
  }.bind(this)).catch(function(error){
    console.error('Unable to get messaging token.', error);
  });
};

// Requests permissions to show notifications.
JawApp.prototype.requestNotificationsPermissions = function() {
  console.log('Requesting notifications permission...');
  firebase.messaging().requestPermission().then(function() {
    // Notification permission granted.
    this.saveMessagingDeviceToken();
  }.bind(this)).catch(function(error) {
    console.error('Unable to get permission to notify.', error);
  });
};

// Resets the given MaterialTextField.
JawApp.resetMaterialTextfield = function(element) {
  element.value = '';
  element.parentNode.MaterialTextfield.boundUpdateClassesHandler();
};

// Template for messages.
JawApp.MESSAGE_TEMPLATE =
    '<div class="message-container">' +
      '<div class="spacing"><div class="pic"></div></div>' +
      '<div class="message"></div>' +
      '<div class="name"></div>' +
      '<div class="date"></div>' +
      '<div class="readStatus"></div>'
    '</div>';

// A loading image URL.
JawApp.LOADING_IMAGE_URL = 'https://www.google.com/images/spin-32.gif';

// Displays a Message in the UI.
JawApp.prototype.displayMessage = function(key, name, text, picUrl, imageUri, sentDate) {
  var div = document.getElementById(key);
  // If an element for that message does not exists yet we create it.
  if (!div) {
    var container = document.createElement('div');
    container.innerHTML = JawApp.MESSAGE_TEMPLATE;
    div = container.firstChild;
    div.setAttribute('id', key);
    this.messageList.appendChild(div);
  }
  if (picUrl) {
    div.querySelector('.pic').style.backgroundImage = 'url(' + picUrl + ')';
  }
  div.querySelector('.name').textContent = name;
  div.querySelector('.date').textContent = sentDate;

  // Query currentUsers to see if any user has the key of this current message
  this.currentUsersRef = this.database.ref('currentUsers');
  this.currentUser = this.auth.currentUser;
  this.currentUsersRef.once("value", function(snapshot){
    snapshot.forEach(function(data){
      if(data.val().lastMsgKey == key){
        // Set the readStatus field to the current users name if the name is not already in the querySelector
        if(!div.querySelector('.readStatus').textContent.includes(data.val().name)){
          div.querySelector('.readStatus').textContent = div.querySelector('.readStatus').textContent + " " + data.val().name;
          console.log(data.key + " " + JSON.stringify(data.val()));
        }
      };
    });
  });

  var messageElement = div.querySelector('.message');
  if (text) { // If the message is text.
    messageElement.textContent = text;
    // Replace all line breaks by <br>.
    messageElement.innerHTML = messageElement.innerHTML.replace(/\n/g, '<br>');
  } else if (imageUri) { // If the message is an image.
    var image = document.createElement('img');
    image.addEventListener('load', function() {
      this.messageList.scrollTop = this.messageList.scrollHeight;
    }.bind(this));
    this.setImageUrl(imageUri, image);
    messageElement.innerHTML = '';
    messageElement.appendChild(image);
  }
  // Show the card fading-in and scroll to view the new message.
  setTimeout(function() {div.classList.add('visible')}, 1);
  this.messageList.scrollTop = this.messageList.scrollHeight;
  this.messageInput.focus();
};
// Enables or disables the submit button depending on the values of the input
// fields.
JawApp.prototype.toggleButton = function() {
  if (this.messageInput.value) {
    this.submitButton.removeAttribute('disabled');
  } else {
    this.submitButton.setAttribute('disabled', 'true');
  }
};

// Checks that the Firebase SDK has been correctly setup and configured.
JawApp.prototype.checkSetup = function() {
  if (!window.firebase || !(firebase.app instanceof Function) || !firebase.app().options) {
    window.alert('You have not configured and imported the Firebase SDK. ' +
        'Make sure you go through the codelab setup instructions and make ' +
        'sure you are running the codelab using `firebase serve`');
  }
};

// Function for encrypting messages and converting them to hex for storage
JawApp.prototype.encryptMessage = function(message) {
  // Set the key to any 128 or 256 bit key
  var key = [ 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16 ];
  // Convert the string to bytes
  var textBytes = aesjs.utils.utf8.toBytes(message);
  // Setup encrytor
  var aesCtr = new aesjs.ModeOfOperation.ctr(key, new aesjs.Counter(5));
  // Encrypt the bytes
  var encryptedBytes = aesCtr.encrypt(textBytes);
  // Convert to hex for storage
  var encryptedHex = aesjs.utils.hex.fromBytes(encryptedBytes);
  // Return the encrypted hex string
  return encryptedHex;
}

// Decrypt messages when received
JawApp.prototype.decryptMessage = function(encryptedMessage){
  // Set the key to any 128 or 256 bit key
  var key = [ 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16 ];
  // Decrypt
  var encryptedBytes = aesjs.utils.hex.toBytes(encryptedMessage);
  // Must set a new decrypted instance because of the internal state of the
  // counter mode
  var aesCtr = new aesjs.ModeOfOperation.ctr(key, new aesjs.Counter(5));
  var decryptedBytes = aesCtr.decrypt(encryptedBytes);
  // Convert the bytes into text
  var decryptedText = aesjs.utils.utf8.fromBytes(decryptedBytes);
  // Return the decrypted message
  return decryptedText;
}

window.onload = function() {
  window.jawApp = new JawApp();
};
