import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { signInWithEmailAndPassword } from "firebase/auth";

import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";

import { auth, db } from "../../firebase/firebase";
import Navbar from "../../components/layout/Navbar";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      // ========================================
      // FIREBASE LOGIN
      // ========================================

      const userCredential =
        await signInWithEmailAndPassword(
          auth,
          email,
          password
        );

      const user = userCredential.user;

      // ========================================
      // GET USER ROLE FROM FIRESTORE
      // ========================================

      const userDoc = await getDoc(
        doc(db, "users", user.uid)
      );

      if (!userDoc.exists()) {
        alert("User profile not found.");
        return;
      }

      const userData = userDoc.data();

      const role = userData.role;

      console.log("LOGIN ROLE:", role);

      // ========================================
      // CREATE / UPDATE STUDENT DIRECTORY
      // ========================================

      if (role === "student") {
        await setDoc(
          doc(db, "studentDirectory", user.uid),
          {
            userId: user.uid,
            name: userData.name || "",
            email: userData.email || user.email,
            studentId: userData.studentId || "",
            role: "student",
            updatedAt: serverTimestamp(),
          },
          {
            merge: true,
          }
        );

        console.log(
          "STUDENT DIRECTORY UPDATED"
        );
      }

      // ========================================
      // REDIRECT BASED ON ROLE
      // ========================================

      if (role === "admin") {
        navigate("/admin-dashboard");
      }

      else if (role === "parent") {
        navigate("/parent-dashboard");
      }

      else if (role === "student") {
        navigate("/dashboard");
      }

      else {
        alert("Invalid user role.");
      }

    } catch (error) {
      console.log("LOGIN ERROR:", error);

      alert(error.message);
    }
  };

  return (
    <>
      

      <div className="container py-5">

        <div className="row justify-content-center">

          <div className="col-md-5">

            <div className="card shadow p-4">

              <h2 className="text-center mb-4">
                Login
              </h2>

              <form onSubmit={handleLogin}>

                {/* EMAIL */}

                <input
                  className="form-control mb-3"
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) =>
                    setEmail(e.target.value)
                  }
                  required
                />

                {/* PASSWORD */}

                <input
                  className="form-control mb-3"
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) =>
                    setPassword(e.target.value)
                  }
                  required
                />

                {/* LOGIN BUTTON */}

                <button
                  type="submit"
                  className="btn btn-primary w-100"
                >
                  <i className="bi bi-box-arrow-in-right me-2"></i>
                  Login
                </button>

              </form>

            </div>

          </div>

        </div>

      </div>
    </>
  );
}

export default Login;