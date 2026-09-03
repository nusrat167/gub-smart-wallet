import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";

import {
  doc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";

import { auth, db } from "./firebase";


// ===============================
// REGISTER USER
// ===============================

export const registerUser = async (
  name,
  studentId,
  department,
  semester,
  email,
  password,
  role = "student"
) => {

  // Create Firebase Authentication account
  const userCredential =
    await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );

  const user = userCredential.user;

  // Create Firestore user document
  await setDoc(doc(db, "users", user.uid), {

    name: name,

    studentId:
      role === "student"
        ? studentId
        : "",

    department:
      role === "student"
        ? department
        : "",

    semester:
      role === "student"
        ? semester
        : "",

    email: email,

    role: role,

    walletBalance: 0,

    createdAt: serverTimestamp(),

  });

  return user;
};


// ===============================
// LOGIN USER
// ===============================

export const loginUser = async (
  email,
  password
) => {

  const userCredential =
    await signInWithEmailAndPassword(
      auth,
      email,
      password
    );

  return userCredential.user;
};


// ===============================
// LOGOUT USER
// ===============================

export const logoutUser = async () => {

  await signOut(auth);

};