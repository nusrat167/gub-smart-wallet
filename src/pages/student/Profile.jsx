import { useEffect, useState } from "react";

import {
  doc,
  getDoc,
  updateDoc,
} from "firebase/firestore";

import {
  onAuthStateChanged,
  updatePassword,
} from "firebase/auth";

import { auth, db } from "../../firebase/firebase";

import Navbar from "../../components/layout/Navbar";


function Profile() {

  // =====================================================
  // STATE
  // =====================================================

  const [user, setUser] = useState(null);

  const [profile, setProfile] = useState(null);

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");

  const [error, setError] = useState("");

  const [formData, setFormData] = useState({

    name: "",

    studentId: "",

    department: "",

    semester: "",

    newPassword: "",

  });


  // =====================================================
  // LOAD PROFILE
  // =====================================================

  const loadProfile = async (firebaseUser) => {

    if (!firebaseUser) {

      setLoading(false);

      return;

    }


    try {

      const userRef = doc(
        db,
        "users",
        firebaseUser.uid
      );

      const snapshot = await getDoc(userRef);


      if (!snapshot.exists()) {

        setError(
          "Profile information was not found."
        );

        setLoading(false);

        return;

      }


      const data = snapshot.data();


      setUser(firebaseUser);

      setProfile({
        id: snapshot.id,
        ...data,
      });


      setFormData({

        name: data.name || "",

        studentId: data.studentId || "",

        department: data.department || "",

        semester: data.semester || "",

        newPassword: "",

      });


    } catch (err) {

      console.error(
        "Profile Load Error:",
        err
      );

      setError(
        "Failed to load profile.\n" +
        err.message
      );

    } finally {

      setLoading(false);

    }

  };


  // =====================================================
  // AUTH LISTENER
  // =====================================================

  useEffect(() => {

    const unsubscribe =
      onAuthStateChanged(
        auth,
        async (firebaseUser) => {

          if (firebaseUser) {

            await loadProfile(
              firebaseUser
            );

          } else {

            setUser(null);

            setProfile(null);

            setLoading(false);

          }

        }
      );


    return () => unsubscribe();

  }, []);


  // =====================================================
  // INPUT CHANGE
  // =====================================================

  const handleChange = (e) => {

    const {
      name,
      value,
    } = e.target;


    setFormData((previous) => ({

      ...previous,

      [name]: value,

    }));


    setMessage("");

    setError("");

  };


  // =====================================================
  // UPDATE PROFILE
  // =====================================================

  const handleSubmit = async (e) => {

    e.preventDefault();


    if (!user || !profile) {

      return;

    }


    setSaving(true);

    setMessage("");

    setError("");


    try {

      // =================================================
      // BASIC VALIDATION
      // =================================================

      if (!formData.name.trim()) {

        throw new Error(
          "Name cannot be empty."
        );

      }


      // =================================================
      // DATA TO UPDATE
      // =================================================

      const updateData = {

        name: formData.name.trim(),

      };


      // =================================================
      // STUDENT ONLY FIELDS
      // =================================================

      if (profile.role === "student") {

        updateData.studentId =
          formData.studentId.trim();

        updateData.department =
          formData.department.trim();

        updateData.semester =
          formData.semester.trim();

      }


      // =================================================
      // UPDATE FIRESTORE
      // =================================================

      const userRef = doc(
        db,
        "users",
        user.uid
      );


      await updateDoc(
        userRef,
        updateData
      );


      // =================================================
      // UPDATE PASSWORD
      // =================================================

      if (
        formData.newPassword.trim()
      ) {

        if (
          formData.newPassword.length < 6
        ) {

          throw new Error(
            "Password must be at least 6 characters."
          );

        }


        await updatePassword(
          user,
          formData.newPassword
        );

      }


      // =================================================
      // UPDATE LOCAL STATE
      // =================================================

      setProfile((previous) => ({

        ...previous,

        ...updateData,

      }));


      setFormData((previous) => ({

        ...previous,

        newPassword: "",

      }));


      setMessage(
        "Profile updated successfully!"
      );


    } catch (err) {

      console.error(
        "Profile Update Error:",
        err
      );


      setError(
        err.message ||
        "Failed to update profile."
      );

    } finally {

      setSaving(false);

    }

  };


  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {

    return (
      <>
     

        <div className="container py-5">

          <div className="text-center">

            <div
              className="spinner-border text-primary"
              role="status"
            ></div>

            <p className="mt-3">
              Loading profile...
            </p>

          </div>

        </div>
      </>
    );

  }


  // =====================================================
  // NOT LOGGED IN
  // =====================================================

  if (!user || !profile) {

    return (
      <>
     

        <div className="container py-5">

          <div className="alert alert-warning">

            Please login to view your profile.

          </div>

        </div>
      </>
    );

  }


  // =====================================================
  // MAIN UI
  // =====================================================

  return (
    <>
    

      <div className="container py-4">

        {/* ================================================= */}
        {/* HEADER */}
        {/* ================================================= */}

        <div className="mb-4">

          <h2 className="fw-bold mb-1">

            <i className="bi bi-person-circle me-2"></i>

            My Profile

          </h2>

          <p className="text-muted mb-0">

            View and manage your account information.

          </p>

        </div>


        <div className="row">

          {/* ================================================= */}
          {/* PROFILE INFORMATION */}
          {/* ================================================= */}

          <div className="col-lg-4 mb-4">

            <div className="card shadow-sm border-0 h-100">

              <div className="card-body text-center">

                <div
                  className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center mx-auto mb-3"
                  style={{
                    width: "90px",
                    height: "90px",
                    fontSize: "38px",
                  }}
                >

                  <i className="bi bi-person"></i>

                </div>


                <h4 className="fw-bold mb-1">

                  {profile.name || "User"}

                </h4>


                <p className="text-muted mb-3">

                  {profile.email || user.email}

                </p>


                <span className="badge bg-primary px-3 py-2">

                  {profile.role
                    ? profile.role.toUpperCase()
                    : "USER"}

                </span>


                {/* ========================================= */}
                {/* WALLET - STUDENT ONLY */}
                {/* ========================================= */}

                {profile.role === "student" && (

                  <div className="mt-4 pt-4 border-top">

                    <small className="text-muted">
                      Wallet Balance
                    </small>

                    <h3 className="fw-bold text-success">

                      ৳
                      {Number(
                        profile.walletBalance || 0
                      ).toFixed(2)}

                    </h3>

                  </div>

                )}

              </div>

            </div>

          </div>


          {/* ================================================= */}
          {/* EDIT PROFILE */}
          {/* ================================================= */}

          <div className="col-lg-8 mb-4">

            <div className="card shadow-sm border-0">

              <div className="card-body">

                <h5 className="fw-bold mb-4">

                  <i className="bi bi-pencil-square me-2"></i>

                  Edit Profile

                </h5>


                {/* ========================================= */}
                {/* SUCCESS */}
                {/* ========================================= */}

                {message && (

                  <div className="alert alert-success">

                    <i className="bi bi-check-circle me-2"></i>

                    {message}

                  </div>

                )}


                {/* ========================================= */}
                {/* ERROR */}
                {/* ========================================= */}

                {error && (

                  <div className="alert alert-danger">

                    <i className="bi bi-exclamation-triangle me-2"></i>

                    {error}

                  </div>

                )}


                <form
                  onSubmit={handleSubmit}
                >

                  {/* ======================================= */}
                  {/* NAME */}
                  {/* ======================================= */}

                  <div className="mb-3">

                    <label className="form-label fw-semibold">

                      Name

                    </label>


                    <input
                      type="text"
                      className="form-control"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="Enter your name"
                    />

                  </div>


                  {/* ======================================= */}
                  {/* EMAIL */}
                  {/* ======================================= */}

                  <div className="mb-3">

                    <label className="form-label fw-semibold">

                      Email

                    </label>


                    <input
                      type="email"
                      className="form-control"
                      value={
                        profile.email ||
                        user.email ||
                        ""
                      }
                      disabled
                    />


                    <small className="text-muted">

                      Email cannot be changed here.

                    </small>

                  </div>


                  {/* ======================================= */}
                  {/* ROLE */}
                  {/* ======================================= */}

                  <div className="mb-3">

                    <label className="form-label fw-semibold">

                      Role

                    </label>


                    <input
                      type="text"
                      className="form-control"
                      value={
                        profile.role || ""
                      }
                      disabled
                    />

                  </div>


                  {/* ================================================= */}
                  {/* STUDENT FIELDS */}
                  {/* ================================================= */}

                  {profile.role === "student" && (

                    <>

                      {/* STUDENT ID */}

                      <div className="mb-3">

                        <label className="form-label fw-semibold">

                          Student ID

                        </label>


                        <input
                          type="text"
                          className="form-control"
                          name="studentId"
                          value={
                            formData.studentId
                          }
                          onChange={handleChange}
                          placeholder="Enter student ID"
                        />

                      </div>


                      {/* DEPARTMENT */}

                      <div className="mb-3">

                        <label className="form-label fw-semibold">

                          Department

                        </label>


                        <input
                          type="text"
                          className="form-control"
                          name="department"
                          value={
                            formData.department
                          }
                          onChange={handleChange}
                          placeholder="Enter department"
                        />

                      </div>


                      {/* SEMESTER */}

                      <div className="mb-3">

                        <label className="form-label fw-semibold">

                          Semester

                        </label>


                        <input
                          type="text"
                          className="form-control"
                          name="semester"
                          value={
                            formData.semester
                          }
                          onChange={handleChange}
                          placeholder="Enter semester"
                        />

                      </div>

                    </>

                  )}


                  {/* ================================================= */}
                  {/* PASSWORD */}
                  {/* ================================================= */}

                  <div className="mb-4">

                    <label className="form-label fw-semibold">

                      New Password

                    </label>


                    <input
                      type="password"
                      className="form-control"
                      name="newPassword"
                      value={
                        formData.newPassword
                      }
                      onChange={handleChange}
                      placeholder="Leave empty to keep current password"
                    />


                    <small className="text-muted">

                      Minimum 6 characters.
                      Leave empty if you don't
                      want to change the password.

                    </small>

                  </div>


                  {/* ================================================= */}
                  {/* SAVE BUTTON */}
                  {/* ================================================= */}

                  <button
                    type="submit"
                    className="btn btn-primary px-4"
                    disabled={saving}
                  >

                    {saving ? (

                      <>
                        <span
                          className="spinner-border spinner-border-sm me-2"
                        ></span>

                        Saving...

                      </>

                    ) : (

                      <>
                        <i className="bi bi-check-lg me-2"></i>

                        Save Changes

                      </>

                    )}

                  </button>

                </form>

              </div>

            </div>

          </div>

        </div>

      </div>
    </>
  );
}


export default Profile;