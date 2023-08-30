const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp(functions.config().firebase);

const secret = "Wb7cJrvZFUHEarua7mSRXF87X8ZyEQ9x";

exports.processSignUp = functions.auth.user().onCreate((user) => {
  const customClaims = {
    "https://hasura.io/jwt/claims": {
      "x-hasura-default-role": "user",
      "x-hasura-allowed-roles": ["user"],
      "x-hasura-user-id": user.uid,
    },
  };
  return admin
      .auth()
      .setCustomUserClaims(user.uid, customClaims)
      .then(() => {
        const metadataRef = admin.database().ref("metadata/" + user.uid);
        return metadataRef.set({refreshTime: new Date().getTime()});
      })
      .catch((error) => {
        console.log(error);
      });
});

exports.actionHandler = functions.https.onRequest(async (req, res) => {
  const reqHeader = req.get("x-secret");
  if (reqHeader != secret) {
    res.status(403).send("Wrong secret");
    return;
  }
  const action = req.body.action.name;
  if (action == "createUser") {
    const email = req.body.input.email;
    const password = req.body.input.password;
    const fullname = req.body.input.fullname;
    console.log(req.body);
    admin.auth().createUser({
      email: email,
      emailVerified: true,
      password: password,
      displayName: fullname,
    })
        .then((userRecord) => {
        // See the UserRecord reference doc for the contents of userRecord.
        // console.log('Successfully created new user:', userRecord.uid);
          return res.status(200).send({uid: userRecord.uid});
        })
        .catch((error) => {
        // console.log('Error creating new user:', error);
          return res.status(400).json({
            message: error,
          });
        });
  } else if (action == "changePassword") {
    const uid = req.body.input.uid;
    const password = req.body.input.password;
    // console.log(req.body);
    admin.auth().updateUser(uid, {
      password: password,
    })
        .then((userRecord) => {
        // See the UserRecord reference doc for the contents of userRecord.
        // console.log('Successfully change user:', userRecord.uid);
          return res.status(200).send({uid: userRecord.uid});
        })
        .catch((error) => {
        // console.log('Error creating new user:', error);
          return res.status(400).json({
            message: error,
          });
        });
  } else {
    res.status(404).json({
      message: "Action not found",
    });
  }
});
