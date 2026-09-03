import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

import { auth, db } from "../../firebase/firebase";

function Navbar() {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  // ========================================
  // AUTH + ROLE CHECK
  // ========================================

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (currentUser) => {
        setUser(currentUser);

        if (!currentUser) {
          setRole(null);
          setLoading(false);
          return;
        }

        try {
          const userRef = doc(
            db,
            "users",
            currentUser.uid
          );

          const userSnapshot = await getDoc(userRef);

          if (userSnapshot.exists()) {
            const userData = userSnapshot.data();

            setRole(userData.role || null);
          } else {
            setRole(null);
          }
        } catch (error) {
          console.error(
            "Navbar Role Error:",
            error
          );

          setRole(null);
        }

        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // ========================================
  // LOGOUT
  // ========================================

  const handleLogout = async () => {
    try {
      await signOut(auth);

      setUser(null);
      setRole(null);

      navigate("/login");
    } catch (error) {
      console.error("Logout Error:", error);

      alert(
        "Logout failed.\n\n" +
        error.message
      );
    }
  };

  // ========================================
  // ROLE NAME
  // ========================================

  const getRoleName = () => {
    if (role === "student") {
      return "Student";
    }

    if (role === "parent") {
      return "Parent";
    }

    if (role === "admin") {
      return "Administrator";
    }

    return "User";
  };

  // ========================================
  // NAVBAR
  // ========================================

  return (
    <nav className="navbar navbar-expand-lg bg-dark navbar-dark shadow-sm">

      <div className="container">

        {/* ====================================
            BRAND
        ==================================== */}

        <Link
          className="navbar-brand fw-bold"
          to="/"
        >
          <i className="bi bi-wallet2 me-2"></i>
          GUB Smart Wallet
        </Link>


        {/* ====================================
            MOBILE TOGGLE
        ==================================== */}

        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarContent"
          aria-controls="navbarContent"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon"></span>
        </button>


        {/* ====================================
            NAVBAR CONTENT
        ==================================== */}

        <div
          className="collapse navbar-collapse"
          id="navbarContent"
        >

          {/* ====================================
              LEFT SIDE
          ==================================== */}

          <ul className="navbar-nav me-auto mb-2 mb-lg-0">

            {/* HOME */}

            <li className="nav-item">
              <Link
                className="nav-link"
                to="/"
              >
                <i className="bi bi-house me-1"></i>
                Home
              </Link>
            </li>


            {/* ====================================
                STUDENT MENU
            ==================================== */}

            {user && role === "student" && (
              <>

                {/* DASHBOARD */}

                <li className="nav-item">
                  <Link
                    className="nav-link"
                    to="/dashboard"
                  >
                    <i className="bi bi-speedometer2 me-1"></i>
                    Dashboard
                  </Link>
                </li>


                {/* WALLET */}

                <li className="nav-item">
                  <Link
                    className="nav-link"
                    to="/wallet"
                  >
                    <i className="bi bi-wallet2 me-1"></i>
                    Wallet
                  </Link>
                </li>


                {/* EXPENSE */}

                <li className="nav-item">
                  <Link
                    className="nav-link"
                    to="/expense"
                  >
                    <i className="bi bi-receipt me-1"></i>
                    Expense
                  </Link>
                </li>


                {/* TRANSACTIONS */}

                <li className="nav-item">
                  <Link
                    className="nav-link"
                    to="/transactions"
                  >
                    <i className="bi bi-clock-history me-1"></i>
                    Transactions
                  </Link>
                </li>


                {/* PAYMENT */}

                <li className="nav-item">
                  <Link
                    className="nav-link"
                    to="/payment"
                  >
                    <i className="bi bi-credit-card me-1"></i>
                    Payment
                  </Link>
                </li>


                {/* PROFILE */}

                <li className="nav-item">
                  <Link
                    className="nav-link"
                    to="/profile"
                  >
                    <i className="bi bi-person me-1"></i>
                    Profile
                  </Link>
                </li>

              </>
            )}


            {/* ====================================
                PARENT MENU
            ==================================== */}

            {user && role === "parent" && (
              <>

                <li className="nav-item">
                  <Link
                    className="nav-link"
                    to="/parent-dashboard"
                  >
                    <i className="bi bi-speedometer2 me-1"></i>
                    Parent Dashboard
                  </Link>
                </li>


                <li className="nav-item">
                  <Link
                    className="nav-link"
                    to="/profile"
                  >
                    <i className="bi bi-person me-1"></i>
                    Profile
                  </Link>
                </li>

              </>
            )}


            {/* ====================================
                ADMIN MENU
            ==================================== */}

            {user && role === "admin" && (
              <>

                <li className="nav-item">
                  <Link
                    className="nav-link"
                    to="/admin-dashboard"
                  >
                    <i className="bi bi-shield-lock me-1"></i>
                    Admin Dashboard
                  </Link>
                </li>


                <li className="nav-item">
                  <Link
                    className="nav-link"
                    to="/profile"
                  >
                    <i className="bi bi-person me-1"></i>
                    Profile
                  </Link>
                </li>

              </>
            )}

          </ul>


          {/* ====================================
              RIGHT SIDE
          ==================================== */}

          <ul className="navbar-nav">

            {/* LOADING */}

            {loading ? (

              <li className="nav-item">
                <span className="nav-link">

                  <span
                    className="spinner-border spinner-border-sm me-2"
                    role="status"
                  ></span>

                  Loading...

                </span>
              </li>

            ) : user ? (

              /* ==================================
                 LOGGED-IN USER
              ================================== */

              <li className="nav-item dropdown">

                <button
                  className="nav-link dropdown-toggle btn btn-link text-white"
                  type="button"
                  data-bs-toggle="dropdown"
                  aria-expanded="false"
                >

                  <i className="bi bi-person-circle me-1"></i>

                  {user.email}

                </button>


                <ul className="dropdown-menu dropdown-menu-end">

                  {/* USER INFORMATION */}

                  <li>
                    <span className="dropdown-item-text">

                      <small className="text-muted">
                        Logged in as
                      </small>

                      <br />

                      <strong>
                        {getRoleName()}
                      </strong>

                    </span>
                  </li>


                  <li>
                    <hr className="dropdown-divider" />
                  </li>


                  {/* PROFILE */}

                  <li>
                    <Link
                      className="dropdown-item"
                      to="/profile"
                    >
                      <i className="bi bi-person me-2"></i>
                      My Profile
                    </Link>
                  </li>


                  {/* STUDENT DASHBOARD */}

                  {role === "student" && (
                    <li>
                      <Link
                        className="dropdown-item"
                        to="/dashboard"
                      >
                        <i className="bi bi-speedometer2 me-2"></i>
                        Dashboard
                      </Link>
                    </li>
                  )}


                  {/* PARENT DASHBOARD */}

                  {role === "parent" && (
                    <li>
                      <Link
                        className="dropdown-item"
                        to="/parent-dashboard"
                      >
                        <i className="bi bi-speedometer2 me-2"></i>
                        Parent Dashboard
                      </Link>
                    </li>
                  )}


                  {/* ADMIN DASHBOARD */}

                  {role === "admin" && (
                    <li>
                      <Link
                        className="dropdown-item"
                        to="/admin-dashboard"
                      >
                        <i className="bi bi-shield-lock me-2"></i>
                        Admin Panel
                      </Link>
                    </li>
                  )}


                  <li>
                    <hr className="dropdown-divider" />
                  </li>


                  {/* LOGOUT */}

                  <li>
                    <button
                      className="dropdown-item text-danger"
                      onClick={handleLogout}
                    >
                      <i className="bi bi-box-arrow-right me-2"></i>
                      Logout
                    </button>
                  </li>

                </ul>

              </li>

            ) : (

              /* ==================================
                 LOGGED-OUT USER
              ================================== */

              <>

                {/* LOGIN */}

                <li className="nav-item">
                  <Link
                    className="nav-link"
                    to="/login"
                  >
                    <i className="bi bi-box-arrow-in-right me-1"></i>
                    Login
                  </Link>
                </li>


                {/* REGISTER */}

                <li className="nav-item">
                  <Link
                    className="nav-link"
                    to="/register"
                  >
                    <i className="bi bi-person-plus me-1"></i>
                    Register
                  </Link>
                </li>


                {/* ADMIN LOGIN */}

                <li className="nav-item">
                  <Link
                    className="nav-link"
                    to="/admin-login"
                  >
                    <i className="bi bi-shield-lock me-1"></i>
                    Admin Login
                  </Link>
                </li>

              </>

            )}

          </ul>

        </div>

      </div>

    </nav>
  );
}

export default Navbar;