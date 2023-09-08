import { initializeApp } from 'firebase/app';
import { getDatabase, child, get, ref, set, push, remove, orderByChild, startAt, endAt, query, equalTo } from 'firebase/database';
import { signInWithEmailAndPassword, getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import dotenv from 'dotenv';
import bcrypt from "bcrypt";

// Now you can use bcrypt as usual, for example:
const saltRounds = 10;
const plainTextPassword = "your_password_here";
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

const db = getDatabase(app);
const auth = getAuth(app);

export const getUserBalance = async (uid) => {
  return get(child(ref(db), "balance/" + uid + "/value/")).then((snapshot) => {
    if (snapshot.exists()) {
      return Number(snapshot.val());
    } else {
      return 0;
    }
  });
};

export const getUserPin = async (uid) => {
  return get(child(ref(db), "users/" + uid + "/hashed/")).then((snapshot) => {
    if (snapshot.exists()) {
      return (snapshot.val());
    } else {
      return 0;
    }
  });
};

export const setUserScore = async (uid, value) => {
  const riskRef = ref(db, "users/" + uid + "/risk/");
  return set(riskRef, value);
};



export const setUserBalance = (uid, newValue) => {
  const balanceRef = ref(db, "balance/" + uid + "/value/");
  return set(balanceRef, newValue);
};

export const changeBalance = async (uid, amount) => {
  return getUserBalance(uid).then((balance) => {
    return setUserBalance(uid, balance + amount);
  });
};

export const topupBalance = async (uid, amount) => {
  return changeBalance(uid, amount)
    .then(() => addTransaction(null, 'topup', uid, amount));
};

export const deductBalance = async (uid, amount) => {
  return changeBalance(uid, -amount)
    .then(() => addTransaction(uid, 'withdraw', null, amount));
};

export const transferAmount = async (senderUid, receiverUid, amount) => {
  return changeBalance(senderUid, -amount)
    .then(() => changeBalance(receiverUid, amount))
    .then(() => addTransaction(senderUid, 'transfer', receiverUid, amount));
}

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

function randomString(length) {
  let result = '';
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

const generateWalletId = (digits) => {
  let uuid = [];
  for (let i = 0; i < digits; i++) {
    uuid.push(Math.floor(Math.random() * 10));
  }
  return uuid.join('');
}

const setupSession = (uid) => {
  const session = randomString(20);
  const expiry = 1000 * 3600 * 24; // one day
  set(ref(db, 'sessions/' + session + '/'), {
    uid: uid,
    expiry: new Date().getTime() + expiry,
  });
  return session;
}

export const signIn = async (email, password) => {
  return signInWithEmailAndPassword(auth, email, password)
    .then(async (res) => {
      // setup balance for existing users
      get(child(ref(db), "balance/" + res.user.uid + "/value/")).then(
        (snapshot) => {
          if (!snapshot.exists()) {
            set(ref(db, "balance/" + res.user.uid + "/value/"), 0);
          }
        });
      // setup session
      const session = setupSession(res.user.uid);
      return get(child(ref(db), 'users/' + res.user.uid + '/'))
        .then(snapshot => ({
          ...snapshot.val(),
          session: session,
        }));
    })
    .catch(() => 'failed');
}

async function checkWalletIdExists() {
  const walletSnapshot = await get(child(ref(db), 'wallet/'));

  if (walletSnapshot.exists()) {
    walletId = generateWalletId(12);
    await checkWalletIdExists(); // Recursive call to check the new walletId
  } else {
    return walletId;
  }
}

export const createUser = async (email, password, fullName, pin, account_id, account_link) => {
  let walletId = generateWalletId(12);
  //onsole.log(account_link)
  let walletRef = ref(db, 'wallet/')

  // checkWalletIdExists()
  //   .then((res) => {
  //     // Use the walletId once it's confirmed to be unique
  //     console.log("Unique walletId:", walletId);
  //   })
  //   .catch((err) => {
  //     console.error("Error checking walletId:", err);
  //   });



  return createUserWithEmailAndPassword(auth, email, password)
    .then(async (credentials) => {
      const userRef = ref(db, "users/" + credentials.user.uid + "/");


      const hashedPass = await bcrypt.hash(pin, saltRounds);

      const data = {
        fullName: fullName,
        email: email,
        uid: credentials.user.uid,
        walletId: walletId,
        hashed: hashedPass,
        account_id: account_id,
        risk: 0,
      }
      const walletData = {
        [data.uid]: walletId,
      };
      set(ref(db, "wallet/" + data.uid), walletData)

      const balanceRef = ref(db, 'balance/' + credentials.user.uid, '/value/')


      const session = setupSession(credentials.user.uid);
      return set(userRef, data)
        .then(() => set(balanceRef, 0))
        .then(() => ({
          ...data,
          session: session,
          walletId: walletId,
          message: 'success',
          account_link: account_link
        }));
    })
    .catch((e) => ({
      message: e.message,
    }));
};

export const getUser = async (token) => {
  return get(child(ref(db), 'sessions/' + token + '/'))
    .then(snapshot => {
      if (snapshot.exists()) {
        if (new Date().getTime() > snapshot.val().expiry) {
          remove(ref(db, 'sessions/' + token));
          return null;
        }
        return get(child(ref(db), 'users/' + snapshot.val().uid + '/'))
          .then(snapshot => snapshot.val());
      } else {
        return null;
      }
    });
}

export const confirmPin = async (pin, uid) => {
  return bcrypt.compare(pin, await getUserPin(uid))
    .then(res => {
      if (!res) {
        return {
          message: 'wrong PIN',
        }
      } else {
        return {
          message: 'success'
        }
      }
    })
    .catch(e => ({
      message: e.message,
    }));
}

export const clearSession = async (session) => {
  const userNode = ref(db, 'sessions/' + session, '/');
  return remove(userNode)
    .then(() => ({
      message: 'success',
    }));
}

export const getUserFrom = async (email, name) => {
  if (email !== undefined) {
    return get(query(
      ref(db, 'users/'),
      orderByChild('email'),
      startAt(email),
      endAt(email + "\uf8ff"),
    ))
      .then(snapshot => snapshot.val());
  } else {
    return get(query(
      ref(db, 'users/'),
      orderByChild('fullName'),
      startAt(name),
      endAt(name + "\uf8ff"),
    ))
      .then(snapshot => snapshot.val());
  }
}

export const getTransactionsByUser = async (uid) => {
  try {
    // Get transactions where the user is the sender or the receiver
    const senderTransactionsSnapshot = await get(query(ref(db, 'transaction/'), orderByChild('sender'), equalTo(uid)));
    const receiverTransactionsSnapshot = await get(query(ref(db, 'transaction/'), orderByChild('receiver'), equalTo(uid)));

    // Convert snapshots to objects
    const senderTransactions = senderTransactionsSnapshot.val() || {};
    const receiverTransactions = receiverTransactionsSnapshot.val() || {};

    // Combine sender and receiver transactions
    const combinedTransactions = {
      ...senderTransactions,
      ...receiverTransactions,
    };

    // Sort transactions by timestamp (latest first)
    const sortedTransactions = Object.values(combinedTransactions).sort((a, b) => b.timestamp - a.timestamp);

    // Fetch all user information at once
    const allUsersSnapshot = await get(ref(db, 'users/'));
    const allUsersInfo = allUsersSnapshot.val() || {};

    // Function to get necessary user info fields
    const getUserInfo = (user) => {
      if (!user) return null;
      return {
        email: user.email,
        fullName: user.fullName,
        walletId: user.walletId,
      };
    };

    // Return the transactions
    return Object.values(sortedTransactions).map(transaction => {
      let contact = null;
      if (transaction.transactionType === 'transfer') {
        contact = transaction.sender === uid ? getUserInfo(allUsersInfo[transaction.receiver]) : getUserInfo(allUsersInfo[transaction.sender]);
      }
      return {
        transactionType: transaction.transactionType,
        contact: contact,
        amount: transaction.sender === uid ? -transaction.amount : transaction.amount,
        timestamp: transaction.timestamp,
      };
    });
  } catch (error) {
    console.error("Error fetching transactions:", error);
    throw error;
  }
};

export const addTransaction = async (senderUid, transactionType, receiverUid, amount) => {
  const transactionRef = ref(db, 'transaction/');
  const newTransactionRef = push(transactionRef);
  const timestamp = new Date().getTime();
  return set(newTransactionRef, {
    amount: amount,
    receiver: receiverUid,
    timestamp: timestamp,
    transactionType: transactionType,
    sender: senderUid,
  });
};