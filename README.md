# JawApp

This is a collection of front-ends running off of a Firebase backend with the intended goal of running the absolute simplest instant messaging system. In a world where applications are getting more and more complicated with a billion features in them the JawApp is built with a simpler, minimalistic, vision. The goal is to have Android, iOS, and Web clients so that the simple messaging experience can be shared across most devices. 

## Getting Started

There are different development environment needs depending on which part of the project you are working on:

### Android
For the JawAndroid project:

1. Download [Android Studio](https://developer.android.com/studio/index.html)
2. Request [Firebase](https://firebase.google.com/) permissions
3. Generate a google-services.json file from [Firebase](https://firebase.google.com/)
4. Copy the json file from step 3 into /JawApp/JawAndroid/app
5. Vòla you should be able to run the Android application (either by an emulator or a connected device)

### Web
For the JawWeb project:
1. Install [npm](https://www.npmjs.com/) (different depending on your OS)
2. Install the Firebase CLI tools by running ```npm -g install firebase-tools```
3. Authorize the Firebase CLI by running ```firebase login```
4. Make sure you are in the JawWeb directory then run ```firebase use --add``` and set the alias to your branch name

To run the nodejs project in the local environment run ```firebase serve``` from the JawWeb project. You should be able to see the project at ```localhost:5000```

### iOS
The iOS project has not been started yet :(

## Built With

* [Firebase](https://firebase.google.com/)
* [Android Studio](https://developer.android.com/studio/index.html)



## Contributing

Please read [CONTRIBUTING.md](https://gist.github.com/PurpleBooth/b24679402957c63ec426) for details on our code of conduct, and the process for submitting pull requests to us.

## History

### April 2017
- Started JawAndroid application
- Got basic version working

### May 2017
- Started JawWeb application
- JawWeb application working
- Current user and user read status on both JawAndroid and JawWeb

## Authors

* **Tyler Moon** - *Main Developer / Owner* - [tmoon8730](https://github.com/tmoon8730)
* **Lawton Mizell** - *Main Developer* - [alcamech](https://github.com/Alcamech)

See also the list of [contributors](https://github.com/tmoon8730/JawApp/blob/master/CONTRIBUTORS.txt) who participated in this project.

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details

## Acknowledgments

* Hat tip to anyone who's code was used
* Inspiration
* Coffee
* etc
