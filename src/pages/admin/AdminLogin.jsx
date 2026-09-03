import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

import { auth, db } from "../../firebase/firebase";
import Navbar from "../../components/layout/Navbar";

function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleAdminLogin = async (e) => {
    e.preventDefault();

    setLoading(true);

    try {
      // Firebase Authentication
      const userCredential =
        await signInWithEmailAndPassword(
          auth,
          email,
          password
        );

      const user = userCredential.user;

      // Get Firestore admin profile
      const userRef = doc(
        db,
        "users",
        user.uid
      );

      const userSnapshot = await getDoc(userRef);

      if (!userSnapshot.exists()) {
        alert("Admin profile not found.");
        setLoading(false);
        return;
      }

      const userData = userSnapshot.data();

      // Check admin role
      if (userData.role !== "admin") {
        alert(
          "Access Denied. This account is not an administrator."
        );
        setLoading(false);
        return;
      }

      console.log("ADMIN LOGIN SUCCESS");

      navigate("/admin-dashboard");

    } catch (error) {
      console.error("Admin Login Error:", error);

      alert(error.message);
    }

    setLoading(false);
  };

  return (
    <>
     

      <div className="container py-5">

        <div className="row justify-content-center">

          <div className="col-md-5">

            <div className="card shadow border-0 p-4">

              <div className="text-center mb-4">

                <div
                  className="bg-dark text-white rounded-circle d-flex align-items-center justify-content-center mx-auto mb-3"
                  style={{
                    width: "70px",
                    height: "70px",
                    fontSize: "2rem",
                  }}
                >
                  <i className="bi bi-shield-lock-fill"></i>
                </div>

                <h2 className="fw-bold">
                  Admin Login
                </h2>

                <p className="text-muted">
                  Login to access the administration panel.
                </p>

              </div>

              <form onSubmit={handleAdminLogin}>

                <div className="mb-3">

                  <label className="form-label fw-semibold">
                    Admin Email
                  </label>

                  <input
                    type="email"
                    className="form-control"
                    placeholder="Enter admin email"
                    value={email}
                    onChange={(e) =>
                      setEmail(e.target.value)
                    }
                    required
                  />

                </div>

                <div className="mb-4">

                  <label className="form-label fw-semibold">
                    Admin Password
                  </label>

                  <input
                    type="password"
                    className="form-control"
                    placeholder="Enter admin password"
                    value={password}
                    onChange={(e) =>
                      setPassword(e.target.value)
                    }
                    required
                  />

                </div>

                <button
                  type="submit"
                  className="btn btn-dark w-100"
                  disabled={loading}
                >

                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2"></span>
                      Verifying Admin...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-shield-check me-2"></i>
                      Admin Login
                    </>
                  )}

                </button>

              </form>

              <div className="text-center mt-4">

                <button
                  className="btn btn-link text-decoration-none"
                  onClick={() => navigate("/login")}
                >
                  <i className="bi bi-arrow-left me-1"></i>
                  Back to User Login
                </button>

              </div>

            </div>

          </div>

        </div>

      </div>
    </>
  );
}

export default AdminLogin;