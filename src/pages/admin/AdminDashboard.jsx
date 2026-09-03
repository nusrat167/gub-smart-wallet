import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";

import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  updateDoc,
} from "firebase/firestore";

import { auth, db } from "../../firebase/firebase";
import Navbar from "../../components/layout/Navbar";

function AdminDashboard() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const [users, setUsers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [expenses, setExpenses] = useState([]);

  const [selectedParent, setSelectedParent] = useState("");
  const [selectedStudent, setSelectedStudent] = useState("");

  const [loading, setLoading] = useState(true);

  // ========================================
  // AUTH + ADMIN CHECK
  // ========================================
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (currentUser) => {
        if (!currentUser) {
          setUser(null);
          setLoading(false);
          return;
        }

        setUser(currentUser);

        try {
          const userRef = doc(
            db,
            "users",
            currentUser.uid
          );

          const userSnapshot = await getDoc(userRef);

          if (
            userSnapshot.exists() &&
            userSnapshot.data().role === "admin"
          ) {
            setIsAdmin(true);
          } else {
            setIsAdmin(false);
          }
        } catch (error) {
          console.error("Admin Check Error:", error);
          setIsAdmin(false);
        } finally {
          setLoading(false);
        }
      }
    );

    return () => unsubscribe();
  }, []);

  // ========================================
  // LOAD USERS
  // ========================================
  useEffect(() => {
    if (!isAdmin) return;

    const unsubscribe = onSnapshot(
      collection(db, "users"),
      (snapshot) => {
        const userData = snapshot.docs.map(
          (userDoc) => ({
            id: userDoc.id,
            ...userDoc.data(),
          })
        );

        setUsers(userData);
      },
      (error) => {
        console.error("Users Error:", error);
      }
    );

    return () => unsubscribe();
  }, [isAdmin]);

  // ========================================
  // LOAD TRANSACTIONS
  // ========================================
  useEffect(() => {
    if (!isAdmin) return;

    const unsubscribe = onSnapshot(
      collection(db, "transactions"),
      (snapshot) => {
        const transactionData =
          snapshot.docs.map((transactionDoc) => ({
            id: transactionDoc.id,
            ...transactionDoc.data(),
          }));

        setTransactions(transactionData);
      },
      (error) => {
        console.error(
          "Transactions Error:",
          error
        );
      }
    );

    return () => unsubscribe();
  }, [isAdmin]);

  // ========================================
  // LOAD EXPENSES
  // ========================================
  useEffect(() => {
    if (!isAdmin) return;

    const unsubscribe = onSnapshot(
      collection(db, "expenses"),
      (snapshot) => {
        const expenseData = snapshot.docs.map(
          (expenseDoc) => ({
            id: expenseDoc.id,
            ...expenseDoc.data(),
          })
        );

        setExpenses(expenseData);
      },
      (error) => {
        console.error("Expenses Error:", error);
      }
    );

    return () => unsubscribe();
  }, [isAdmin]);

  // ========================================
  // PARENT & STUDENT DATA
  // ========================================
  const parents = users.filter(
    (user) => user.role === "parent"
  );

  const students = users.filter(
    (user) => user.role === "student"
  );

  // ========================================
  // STATISTICS
  // ========================================
  const totalStudents = students.length;

  const totalParents = parents.length;

  const linkedStudents = students.filter(
    (student) => student.parentId
  ).length;

  const totalWalletBalance = students.reduce(
    (total, student) =>
      total +
      Number(student.walletBalance || 0),
    0
  );

  const totalExpenseAmount = expenses.reduce(
    (total, expense) =>
      total + Number(expense.amount || 0),
    0
  );

  const totalTransactions =
    transactions.length;

  // ========================================
  // EXPENSE CATEGORY ANALYTICS
  // ========================================
  const categoryTotals = {};

  expenses.forEach((expense) => {
    const category =
      expense.category || "Other";

    categoryTotals[category] =
      (categoryTotals[category] || 0) +
      Number(expense.amount || 0);
  });

  const categoryData = Object.entries(
    categoryTotals
  ).sort((a, b) => b[1] - a[1]);

  // ========================================
  // SORT TRANSACTIONS
  // ========================================
  const recentTransactions = [
    ...transactions,
  ]
    .sort((a, b) => {
      const dateA =
        a.createdAt?.toDate?.() || new Date(0);

      const dateB =
        b.createdAt?.toDate?.() || new Date(0);

      return dateB - dateA;
    })
    .slice(0, 8);

  // ========================================
  // LINK STUDENT
  // ========================================
  const handleLinkStudent = async () => {
    if (!selectedParent) {
      alert("Please select a parent.");
      return;
    }

    if (!selectedStudent) {
      alert("Please select a student.");
      return;
    }

    try {
      await updateDoc(
        doc(db, "users", selectedStudent),
        {
          parentId: selectedParent,
        }
      );

      alert(
        "Student linked with parent successfully!"
      );

      setSelectedParent("");
      setSelectedStudent("");
    } catch (error) {
      console.error(
        "Link Student Error:",
        error
      );

      alert(error.message);
    }
  };

  // ========================================
  // REMOVE LINK
  // ========================================
  const handleRemoveLink = async (
    studentId
  ) => {
    const confirmRemove = window.confirm(
      "Are you sure you want to remove this parent link?"
    );

    if (!confirmRemove) return;

    try {
      await updateDoc(
        doc(db, "users", studentId),
        {
          parentId: null,
        }
      );

      alert("Parent link removed.");
    } catch (error) {
      console.error(
        "Remove Link Error:",
        error
      );

      alert(error.message);
    }
  };

  // ========================================
  // FORMAT DATE
  // ========================================
  const formatDate = (timestamp) => {
    if (!timestamp?.toDate) {
      return "N/A";
    }

    return timestamp
      .toDate()
      .toLocaleString();
  };

  // ========================================
  // TRANSACTION INFO
  // ========================================
  const getTransactionInfo = (type) => {
    switch (type) {
      case "credit":
        return {
          text: "Money Added",
          badge: "bg-success",
          icon: "bi-plus-circle",
        };

      case "debit":
        return {
          text: "Expense",
          badge: "bg-danger",
          icon: "bi-dash-circle",
        };

      case "transfer_out":
        return {
          text: "Money Sent",
          badge: "bg-warning text-dark",
          icon: "bi-arrow-up-right",
        };

      case "transfer_in":
        return {
          text: "Money Received",
          badge: "bg-primary",
          icon: "bi-arrow-down-left",
        };

      default:
        return {
          text: type || "Transaction",
          badge: "bg-secondary",
          icon: "bi-arrow-left-right",
        };
    }
  };

  // ========================================
  // LOADING
  // ========================================
  if (loading) {
    return (
      <>
       

        <div className="container py-5">
          <div className="text-center py-5">
            <div
              className="spinner-border text-primary"
              role="status"
            ></div>

            <p className="text-muted mt-3">
              Loading admin dashboard...
            </p>
          </div>
        </div>
      </>
    );
  }

  // ========================================
  // ACCESS DENIED
  // ========================================
  if (!user || !isAdmin) {
    return (
      <>
       

        <div className="container py-5">
          <div className="alert alert-danger">
            <i className="bi bi-shield-lock-fill me-2"></i>

            <strong>Access Denied</strong>

            <p className="mb-0 mt-2">
              Only administrators can access
              this dashboard.
            </p>
          </div>
        </div>
      </>
    );
  }

  // ========================================
  // ADMIN DASHBOARD
  // ========================================
  return (
    <>
     

      <div className="container py-5">

        {/* HEADER */}
        <div className="mb-4">
          <h2 className="fw-bold">
            <i className="bi bi-speedometer2 me-2"></i>
            Admin Dashboard
          </h2>

          <p className="text-muted">
            Monitor users, wallets, expenses,
            transactions and parent-student
            relationships.
          </p>
        </div>

        {/* ================================= */}
        {/* STATISTICS */}
        {/* ================================= */}

        <div className="row g-4 mb-4">

          {/* STUDENTS */}
          <div className="col-md-6 col-lg-3">
            <div className="card shadow-sm border-0 h-100">
              <div className="card-body">

                <div className="d-flex justify-content-between align-items-center">

                  <div>
                    <p className="text-muted mb-1">
                      Total Students
                    </p>

                    <h2 className="fw-bold mb-0">
                      {totalStudents}
                    </h2>
                  </div>

                  <i
                    className="bi bi-mortarboard-fill text-primary"
                    style={{
                      fontSize: "2.5rem",
                    }}
                  ></i>

                </div>

              </div>
            </div>
          </div>

          {/* PARENTS */}
          <div className="col-md-6 col-lg-3">
            <div className="card shadow-sm border-0 h-100">
              <div className="card-body">

                <div className="d-flex justify-content-between align-items-center">

                  <div>
                    <p className="text-muted mb-1">
                      Total Parents
                    </p>

                    <h2 className="fw-bold mb-0">
                      {totalParents}
                    </h2>
                  </div>

                  <i
                    className="bi bi-people-fill text-info"
                    style={{
                      fontSize: "2.5rem",
                    }}
                  ></i>

                </div>

              </div>
            </div>
          </div>

          {/* LINKED */}
          <div className="col-md-6 col-lg-3">
            <div className="card shadow-sm border-0 h-100">
              <div className="card-body">

                <div className="d-flex justify-content-between align-items-center">

                  <div>
                    <p className="text-muted mb-1">
                      Linked Students
                    </p>

                    <h2 className="fw-bold mb-0">
                      {linkedStudents}
                    </h2>
                  </div>

                  <i
                    className="bi bi-link-45deg text-success"
                    style={{
                      fontSize: "2.5rem",
                    }}
                  ></i>

                </div>

              </div>
            </div>
          </div>

          {/* WALLET */}
          <div className="col-md-6 col-lg-3">
            <div className="card shadow-sm border-0 h-100">
              <div className="card-body">

                <div className="d-flex justify-content-between align-items-center">

                  <div>
                    <p className="text-muted mb-1">
                      Total Wallet Balance
                    </p>

                    <h3 className="fw-bold text-success mb-0">
                      ৳
                      {totalWalletBalance.toFixed(
                        2
                      )}
                    </h3>
                  </div>

                  <i
                    className="bi bi-wallet2 text-success"
                    style={{
                      fontSize: "2.5rem",
                    }}
                  ></i>

                </div>

              </div>
            </div>
          </div>

        </div>

        {/* ================================= */}
        {/* FINANCIAL STATISTICS */}
        {/* ================================= */}

        <div className="row g-4 mb-4">

          <div className="col-md-6">

            <div className="card shadow-sm border-0 h-100">
              <div className="card-body">

                <div className="d-flex justify-content-between align-items-center">

                  <div>
                    <p className="text-muted mb-1">
                      Total Expenses
                    </p>

                    <h2 className="fw-bold text-danger mb-0">
                      ৳
                      {totalExpenseAmount.toFixed(
                        2
                      )}
                    </h2>
                  </div>

                  <i
                    className="bi bi-cash-stack text-danger"
                    style={{
                      fontSize: "2.5rem",
                    }}
                  ></i>

                </div>

              </div>
            </div>

          </div>

          <div className="col-md-6">

            <div className="card shadow-sm border-0 h-100">
              <div className="card-body">

                <div className="d-flex justify-content-between align-items-center">

                  <div>
                    <p className="text-muted mb-1">
                      Total Transactions
                    </p>

                    <h2 className="fw-bold mb-0">
                      {totalTransactions}
                    </h2>
                  </div>

                  <i
                    className="bi bi-arrow-left-right text-primary"
                    style={{
                      fontSize: "2.5rem",
                    }}
                  ></i>

                </div>

              </div>
            </div>

          </div>

        </div>

        {/* ================================= */}
        {/* PARENT STUDENT LINKING */}
        {/* ================================= */}

        <div className="card shadow-sm border-0 mb-4">

          <div className="card-header bg-primary text-white">
            <h5 className="mb-0">
              <i className="bi bi-link-45deg me-2"></i>
              Parent ↔ Student Management
            </h5>
          </div>

          <div className="card-body">

            <div className="row g-3 align-items-end">

              <div className="col-md-5">

                <label className="form-label fw-semibold">
                  Select Parent
                </label>

                <select
                  className="form-select"
                  value={selectedParent}
                  onChange={(e) =>
                    setSelectedParent(
                      e.target.value
                    )
                  }
                >
                  <option value="">
                    Choose Parent
                  </option>

                  {parents.map((parent) => (
                    <option
                      key={parent.id}
                      value={parent.id}
                    >
                      {parent.name ||
                        parent.email}
                    </option>
                  ))}
                </select>

              </div>

              <div className="col-md-5">

                <label className="form-label fw-semibold">
                  Select Student
                </label>

                <select
                  className="form-select"
                  value={selectedStudent}
                  onChange={(e) =>
                    setSelectedStudent(
                      e.target.value
                    )
                  }
                >
                  <option value="">
                    Choose Student
                  </option>

                  {students.map((student) => (
                    <option
                      key={student.id}
                      value={student.id}
                    >
                      {student.name ||
                        "Unnamed Student"}{" "}
                      -{" "}
                      {student.studentId ||
                        "No ID"}
                    </option>
                  ))}
                </select>

              </div>

              <div className="col-md-2">

                <button
                  className="btn btn-primary w-100"
                  onClick={handleLinkStudent}
                >
                  <i className="bi bi-link me-2"></i>
                  Link
                </button>

              </div>

            </div>

          </div>
        </div>

        {/* ================================= */}
        {/* EXPENSE ANALYTICS */}
        {/* ================================= */}

        <div className="row g-4 mb-4">

          <div className="col-lg-6">

            <div className="card shadow-sm border-0 h-100">

              <div className="card-header">
                <h5 className="mb-0 fw-bold">
                  <i className="bi bi-bar-chart-fill me-2"></i>
                  Expense Analytics
                </h5>
              </div>

              <div className="card-body">

                {categoryData.length === 0 ? (
                  <p className="text-muted text-center py-4 mb-0">
                    No expense data available.
                  </p>
                ) : (
                  categoryData.map(
                    ([category, amount]) => {

                      const percentage =
                        totalExpenseAmount > 0
                          ? (amount /
                              totalExpenseAmount) *
                            100
                          : 0;

                      return (
                        <div
                          key={category}
                          className="mb-4"
                        >

                          <div className="d-flex justify-content-between mb-1">

                            <strong>
                              {category}
                            </strong>

                            <span>
                              ৳
                              {amount.toFixed(
                                2
                              )}
                            </span>

                          </div>

                          <div
                            className="progress"
                            style={{
                              height: "10px",
                            }}
                          >
                            <div
                              className="progress-bar"
                              role="progressbar"
                              style={{
                                width: `${percentage}%`,
                              }}
                            ></div>
                          </div>

                          <small className="text-muted">
                            {percentage.toFixed(
                              1
                            )}
                            % of total expenses
                          </small>

                        </div>
                      );
                    }
                  )
                )}

              </div>
            </div>

          </div>

          {/* USER SUMMARY */}

          <div className="col-lg-6">

            <div className="card shadow-sm border-0 h-100">

              <div className="card-header">
                <h5 className="mb-0 fw-bold">
                  <i className="bi bi-pie-chart-fill me-2"></i>
                  User Overview
                </h5>
              </div>

              <div className="card-body">

                <div className="mb-4">

                  <div className="d-flex justify-content-between mb-2">
                    <span>
                      Students
                    </span>

                    <strong>
                      {totalStudents}
                    </strong>
                  </div>

                  <div className="progress">
                    <div
                      className="progress-bar bg-primary"
                      style={{
                        width: `${
                          users.length
                            ? (totalStudents /
                                users.length) *
                              100
                            : 0
                        }%`,
                      }}
                    ></div>
                  </div>

                </div>

                <div className="mb-4">

                  <div className="d-flex justify-content-between mb-2">
                    <span>
                      Parents
                    </span>

                    <strong>
                      {totalParents}
                    </strong>
                  </div>

                  <div className="progress">
                    <div
                      className="progress-bar bg-info"
                      style={{
                        width: `${
                          users.length
                            ? (totalParents /
                                users.length) *
                              100
                            : 0
                        }%`,
                      }}
                    ></div>
                  </div>

                </div>

                <div>

                  <div className="d-flex justify-content-between mb-2">
                    <span>
                      Linked Students
                    </span>

                    <strong>
                      {linkedStudents}
                    </strong>
                  </div>

                  <div className="progress">
                    <div
                      className="progress-bar bg-success"
                      style={{
                        width: `${
                          totalStudents
                            ? (linkedStudents /
                                totalStudents) *
                              100
                            : 0
                        }%`,
                      }}
                    ></div>
                  </div>

                </div>

              </div>
            </div>

          </div>

        </div>

        {/* ================================= */}
        {/* STUDENT TABLE */}
        {/* ================================= */}

        <div className="card shadow-sm border-0 mb-4">

          <div className="card-header bg-primary text-white">

            <h5 className="mb-0">
              <i className="bi bi-people-fill me-2"></i>
              Student Management
            </h5>

          </div>

          <div className="card-body p-0">

            <div className="table-responsive">

              <table className="table table-hover align-middle mb-0">

                <thead className="table-light">

                  <tr>
                    <th>Student</th>
                    <th>Student ID</th>
                    <th>Department</th>
                    <th>Semester</th>
                    <th>Parent</th>
                    <th>Wallet</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>

                </thead>

                <tbody>

                  {students.map((student) => {

                    const parent = parents.find(
                      (parent) =>
                        parent.id ===
                        student.parentId
                    );

                    return (
                      <tr key={student.id}>

                        <td>
                          <strong>
                            {student.name ||
                              "N/A"}
                          </strong>
                        </td>

                        <td>
                          <span className="badge bg-light text-dark border">
                            {student.studentId ||
                              "N/A"}
                          </span>
                        </td>

                        <td>
                          {student.department ||
                            "N/A"}
                        </td>

                        <td>
                          {student.semester ||
                            "N/A"}
                        </td>

                        <td>
                          {parent
                            ? parent.name ||
                              parent.email
                            : "Not Linked"}
                        </td>

                        <td>
                          <strong className="text-success">
                            ৳
                            {Number(
                              student.walletBalance ||
                                0
                            ).toFixed(2)}
                          </strong>
                        </td>

                        <td>
                          {student.parentId ? (
                            <span className="badge bg-success">
                              Linked
                            </span>
                          ) : (
                            <span className="badge bg-warning text-dark">
                              Not Linked
                            </span>
                          )}
                        </td>

                        <td>

                          {student.parentId && (
                            <button
                              className="btn btn-sm btn-outline-danger"
                              onClick={() =>
                                handleRemoveLink(
                                  student.id
                                )
                              }
                            >
                              <i className="bi bi-x-circle me-1"></i>
                              Remove
                            </button>
                          )}

                        </td>

                      </tr>
                    );
                  })}

                </tbody>

              </table>

            </div>
          </div>
        </div>

        {/* ================================= */}
        {/* RECENT TRANSACTIONS */}
        {/* ================================= */}

        <div className="card shadow-sm border-0">

          <div className="card-header bg-dark text-white">

            <h5 className="mb-0">
              <i className="bi bi-clock-history me-2"></i>
              Recent Transactions
            </h5>

          </div>

          <div className="card-body p-0">

            {recentTransactions.length ===
            0 ? (
              <div className="text-center py-5">
                <i
                  className="bi bi-receipt text-muted"
                  style={{
                    fontSize: "3rem",
                  }}
                ></i>

                <p className="text-muted mt-3 mb-0">
                  No transactions found.
                </p>
              </div>
            ) : (
              <div className="table-responsive">

                <table className="table table-hover align-middle mb-0">

                  <thead className="table-light">

                    <tr>
                      <th>Type</th>
                      <th>Description</th>
                      <th>Amount</th>
                      <th>User</th>
                      <th>Date</th>
                    </tr>

                  </thead>

                  <tbody>

                    {recentTransactions.map(
                      (transaction) => {

                        const info =
                          getTransactionInfo(
                            transaction.type
                          );

                        const transactionUser =
                          users.find(
                            (user) =>
                              user.id ===
                              transaction.userId
                          );

                        const isPositive =
                          transaction.type ===
                            "credit" ||
                          transaction.type ===
                            "transfer_in";

                        return (
                          <tr
                            key={
                              transaction.id
                            }
                          >

                            <td>

                              <span
                                className={`badge ${info.badge}`}
                              >
                                <i
                                  className={`bi ${info.icon} me-1`}
                                ></i>

                                {info.text}
                              </span>

                            </td>

                            <td>
                              {transaction.description ||
                                "N/A"}
                            </td>

                            <td>

                              <strong
                                className={
                                  isPositive
                                    ? "text-success"
                                    : "text-danger"
                                }
                              >
                                {isPositive
                                  ? "+"
                                  : "-"}
                                ৳
                                {Number(
                                  transaction.amount ||
                                    0
                                ).toFixed(2)}
                              </strong>

                            </td>

                            <td>
                              {transactionUser
                                ? transactionUser.name ||
                                  transactionUser.email
                                : "Unknown User"}
                            </td>

                            <td>
                              <small className="text-muted">
                                {formatDate(
                                  transaction.createdAt
                                )}
                              </small>
                            </td>

                          </tr>
                        );
                      }
                    )}

                  </tbody>

                </table>

              </div>
            )}

          </div>
        </div>

      </div>
    </>
  );
}

export default AdminDashboard;