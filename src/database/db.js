import { initializeApp } from "firebase/app";
import { getDatabase, child, get, ref, set, update } from "firebase/database";
import {
  signInWithEmailAndPassword,
  getAuth,
  createUserWithEmailAndPassword,
  updateEmail,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthCredential,
  onAuthStateChanged
} from "firebase/auth";
import { getStorage } from "firebase/storage";
import { saveMediaToStorage } from "../storage/index.js";
import dotenv from "dotenv";
dotenv.config();

const app = initializeApp({
  apiKey: process.env.PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.PUBLIC_MEASUREMENT_ID,
});

export const db = getDatabase(app);
export const auth = getAuth(app);
export const storage = getStorage(app);


export const getUserBalance = async (uid) => {
  return get(child(ref(db), "balance/" + uid + "/value/")).then((snapshot) => {
    if (snapshot.exists()) {
      return Number(snapshot.val());
    } else {
      return 0;
    }
  });
};

export const setUserBalance = (uid, newValue) => {
  const balanceRef = ref(db, "balance/" + uid + "/value/");
  return set(balanceRef, newValue);
};

export const topupBalance = async (uid, amount) => {
  return getUserBalance(uid).then((balance) => {
    return setUserBalance(uid, balance + amount);
  });
};

export const getUserOTP = async (uid) => {
  return get(child(ref(db), "otp/" + uid + "/value/")).then((snapshot) => {
    if (snapshot.exists()) {
      return snapshot.val();
    } else {
      return "";
    }
  });
};

export const setUserOTP = (uid, newValue) => {
  const otpRef = ref(db, "otp/" + uid + "/value/");
  return set(otpRef, newValue);
};

export const getUserInfo = async (uid) => {
  return get(child(ref(db), "users/" + uid + "/")).then((snapshot) =>
    snapshot.val()
  );
};

export const signIn = async (email, password) => {
  return signInWithEmailAndPassword(auth, email, password)
    .then(async (res) => {
      // setup balance for existing users
      get(child(ref(db), "balance/" + res.user.uid + "/value/")).then(
        (snapshot) => {
          if (!snapshot.exists()) {
            set(ref(db, "balance/" + res.user.uid + "/value/"), 0);
          }
        }
      );
      return get(child(ref(db), "users/" + res.user.uid + "/")).then(
        (snapshot) => snapshot.val()
      );
    })
    .catch(() => {
      return "failed";
    });
};

export const createUser = async (email, password, fullName) => {
  return createUserWithEmailAndPassword(auth, email, password)
    .then(async (credentials) => {
      const userRef = ref(db, "users/" + credentials.user.uid + "/");
      const data = {
        fullName: fullName,
        email: email,
        uid: credentials.user.uid,
      };
      const balanceRef = ref(db, "balance/" + credentials.user.uid, "/value/");
      return set(userRef, data)
        .then(() => set(balanceRef, 0))
        .then(() => ({
          ...data,
          message: "success",
        }));
    })
    .catch(() => ({
      message: "email already in use",
    }));
};

export const isLoggedIn = async (uid) => {
  return get(child(ref(db), "balance/" + uid + "/value/")).then((snapshot) =>
    snapshot.exists()
  );
  
};

export const saveUserProfileWImage = (fullName, email, phoneNumber, image, uid) => new Promise((resolve, reject) => {
  saveMediaToStorage(image, `profileImage/${uid}`)
      .then(async (downloadUrl) => {
          const userRef = ref(db, "users/" + uid + "/");
          const data = { 
            fullName: fullName,
            email: email,
            phoneNumber: phoneNumber,
            photoUrl: downloadUrl
           };
          update(userRef, data)
            .then(() => {
              resolve({
                ...data,
                message: 'success'
              })
            })
            .catch((error) => {
              // handle database update error
              console.error('Error updating user data:', error);
              reject('Error setting user data.')
            });
      })
      .catch((error) => {
        // Handle the media storage error
        console.error('Error uploading picture:', error);
        reject('Error uploading picture.');
      });
});


export const saveUserProfile = (fullName, email, phoneNumber, uid) => new Promise((resolve, reject) => {
  const userRef = ref(db, "users/" + uid + "/");
  const data = { 
    fullName: fullName,
    email: email,
    phoneNumber: phoneNumber,
  };
  update(userRef, data)
    .then(() => {
      resolve({
        ...data,
        message: 'success'
      })
    })
  .catch((error) => {
    // handle database update error
    console.error('Error updating user data:', error);
    reject('Error setting user data.')
  });
});

export const changeEmail = (currentEmail, password, newEmail)  => new Promise((resolve, reject) => {
  signInWithEmailAndPassword(auth, currentEmail, password)
    .then((credential) => {
      updateEmail(credential.user, newEmail)
      .then(() => {
        const userRef = ref(db, "users/" + auth.currentUser.uid + "/");
        const data = { email: newEmail };
        update(userRef, data)
          .then(() => {
            console.log('Email updated in DB')
          })
          .catch((error) => {
            console.log('Error updating email in DB:' + error)
          })
        resolve({
          message: 'success',
          newEmail: newEmail
        })
      }).catch((error) => {
        console.log('Error updating email:'+ error)
        reject('Error updating email')
      })
    })
    .catch((error) => {
      console.log('Error signing in: ' + error)
    })
})

export const changePassword = (email, currentPassword, newPassword)  => new Promise((resolve, reject) => {
  if (email != null) {
    signInWithEmailAndPassword(auth, email, currentPassword)
    .then((credential) => {
      updatePassword(credential.user, newPassword)
      .then(() => {
        console.log('success')
        resolve({
          message: 'success',
        })
      }).catch((error) => {
        console.log('Error updating password:'+ error)
        reject('Error updating password')
      })
    })
    .catch((error) => {
      console.log('Error signing in: ' + error)
    })
  }
  
})

