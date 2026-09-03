import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAYFbOY78tDjo3tCVYoDRsxbgyNoVgkBko",
  authDomain: "gub-smart-wallet.firebaseapp.com",
  projectId: "gub-smart-wallet",
  storageBucket: "gub-smart-wallet.firebasestorage.app",
  messagingSenderId: "793665244542",
  appId: "1:793665244542:web:4d2d7937d79d3934dd772f",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;