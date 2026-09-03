import { useState } from "react";
import { registerUser } from "../../firebase/auth";
import Navbar from "../../components/layout/Navbar";

function Register() {
  const [role, setRole] = useState("student");

  const [name, setName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [department, setDepartment] = useState("");
  const [semester, setSemester] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleRegister = async (e) => {
    e.preventDefault();

    try {
      await registerUser(
        name,
        studentId,
        department,
        semester,
        email,
        password,
        role
      );

      alert("Registration Successful!");

      // Clear form
      setName("");
      setStudentId("");
      setDepartment("");
      setSemester("");
      setEmail("");
      setPassword("");

    } catch (error) {
      console.log("REGISTER ERROR:", error);
      alert(error.message);
    }
  };

  return (
    <>
     

      <div className="container py-5">
        <div className="row justify-content-center">
          <div className="col-md-6">

            <div className="card shadow p-4">

              <h2 className="text-center mb-4">
                Create Account
              </h2>

              <form onSubmit={handleRegister}>

                {/* Account Type */}
                <label className="form-label">
                  Account Type
                </label>

                <select
                  className="form-select mb-3"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                >
                  <option value="student">Student</option>
                  <option value="parent">Parent</option>
                </select>

                {/* Name */}
                <input
                  className="form-control mb-3"
                  type="text"
                  placeholder="Full Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />

                {/* Student Fields */}
                {role === "student" && (
                  <>
                    <input
                      className="form-control mb-3"
                      type="text"
                      placeholder="Student ID"
                      value={studentId}
                      onChange={(e) => setStudentId(e.target.value)}
                      required
                    />

                    <input
                      className="form-control mb-3"
                      type="text"
                      placeholder="Department"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      required
                    />

                    <input
                      className="form-control mb-3"
                      type="text"
                      placeholder="Semester"
                      value={semester}
                      onChange={(e) => setSemester(e.target.value)}
                      required
                    />
                  </>
                )}

                {/* Email */}
                <input
                  className="form-control mb-3"
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />

                {/* Password */}
                <input
                  className="form-control mb-3"
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />

                <button className="btn btn-success w-100">
                  Register as {role === "student" ? "Student" : "Parent"}
                </button>

              </form>

            </div>

          </div>
        </div>
      </div>
    </>
  );
}

export default Register;