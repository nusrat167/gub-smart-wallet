import { useEffect, useState } from "react";

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";

import { onAuthStateChanged } from "firebase/auth";

import { auth, db } from "../../firebase/firebase";

import Navbar from "../../components/layout/Navbar";


function ParentDashboard() {

  const [parent, setParent] = useState(null);

  const [student, setStudent] = useState(null);

  const [expenses, setExpenses] = useState([]);

  const [transactions, setTransactions] = useState([]);

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);


  // =====================================================
  // LOAD PARENT DASHBOARD DATA
  // =====================================================

  const loadParentData = async (user) => {

    if (!user) {
      setLoading(false);
      return;
    }

    try {

      // =================================================
      // 1. GET PARENT PROFILE
      // =================================================

      const parentRef = doc(
        db,
        "users",
        user.uid
      );

      const parentSnapshot = await getDoc(
        parentRef
      );


      if (!parentSnapshot.exists()) {

        setParent(null);

        throw new Error(
          "Parent profile was not found in Firestore."
        );

      }


      const parentData =
        parentSnapshot.data();


      // Check role
      if (parentData.role !== "parent") {

        throw new Error(
          "This account is not registered as a parent."
        );

      }


      setParent({
        id: parentSnapshot.id,
        ...parentData,
      });


      // =================================================
      // 2. FIND LINKED STUDENT
      // =================================================

      const studentQuery = query(
        collection(db, "users"),
        where(
          "parentId",
          "==",
          user.uid
        )
      );


      const studentSnapshot =
        await getDocs(studentQuery);


      // No linked student
      if (studentSnapshot.empty) {

        setStudent(null);

        setExpenses([]);

        setTransactions([]);

        return;

      }


      // =================================================
      // 3. GET LINKED STUDENT
      // =================================================

      const studentDoc =
        studentSnapshot.docs[0];


      const studentData =
        studentDoc.data();


      const studentInfo = {
        id: studentDoc.id,
        ...studentData,
      };


      setStudent(studentInfo);


      // =================================================
      // 4. LOAD STUDENT EXPENSES
      // =================================================

      const expenseQuery = query(
        collection(db, "expenses"),
        where(
          "userId",
          "==",
          studentDoc.id
        )
      );


      const expenseSnapshot =
        await getDocs(expenseQuery);


      const expenseList =
        expenseSnapshot.docs.map(
          (expenseDoc) => ({
            id: expenseDoc.id,
            ...expenseDoc.data(),
          })
        );


      // Sort newest first
      expenseList.sort((a, b) => {

        const timeA =
          a.createdAt?.seconds || 0;

        const timeB =
          b.createdAt?.seconds || 0;

        return timeB - timeA;

      });


      setExpenses(expenseList);


      // =================================================
      // 5. LOAD STUDENT TRANSACTIONS
      // =================================================

      const transactionQuery = query(
        collection(db, "transactions"),
        where(
          "userId",
          "==",
          studentDoc.id
        )
      );


      const transactionSnapshot =
        await getDocs(transactionQuery);


      const transactionList =
        transactionSnapshot.docs.map(
          (transactionDoc) => ({
            id: transactionDoc.id,
            ...transactionDoc.data(),
          })
        );


      // Sort newest first
      transactionList.sort((a, b) => {

        const timeA =
          a.createdAt?.seconds || 0;

        const timeB =
          b.createdAt?.seconds || 0;

        return timeB - timeA;

      });


      setTransactions(
        transactionList
      );


    } catch (error) {

      console.error(
        "Parent Dashboard Error:",
        error
      );

      alert(
        "Failed to load parent dashboard.\n\n" +
        error.message
      );

    }

  };


  // =====================================================
  // AUTH LISTENER
  // =====================================================

  useEffect(() => {

    const unsubscribe =
      onAuthStateChanged(
        auth,
        async (user) => {

          if (user) {

            await loadParentData(user);

          } else {

            setParent(null);

            setStudent(null);

            setExpenses([]);

            setTransactions([]);

          }

          setLoading(false);

        }
      );


    return () => {
      unsubscribe();
    };

  }, []);


  // =====================================================
  // REFRESH
  // =====================================================

  const handleRefresh = async () => {

    if (!auth.currentUser) {
      return;
    }

    try {

      setRefreshing(true);

      await loadParentData(
        auth.currentUser
      );

    } finally {

      setRefreshing(false);

    }

  };


  // =====================================================
  // FORMAT DATE
  // =====================================================

  const formatDate = (timestamp) => {

    if (!timestamp) {
      return "N/A";
    }


    try {

      const date =
        timestamp.toDate
          ? timestamp.toDate()
          : new Date(timestamp);


      return date.toLocaleString();

    } catch {

      return "N/A";

    }

  };


  // =====================================================
  // TOTAL EXPENSE
  // =====================================================

  const totalExpenses =
    expenses.reduce(
      (sum, expense) =>
        sum +
        Number(
          expense.amount || 0
        ),
      0
    );


  // =====================================================
  // LOADING SCREEN
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
              Loading parent dashboard...
            </p>

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

        <div className="d-flex justify-content-between align-items-center mb-4">

          <div>

            <h2 className="fw-bold mb-1">
              Parent Dashboard
            </h2>

            <p className="text-muted mb-0">
              Monitor your linked student's
              financial activity.
            </p>

          </div>


          <button
            className="btn btn-outline-primary"
            onClick={handleRefresh}
            disabled={refreshing}
          >

            {refreshing ? (
              <>
                <span
                  className="spinner-border spinner-border-sm me-2"
                ></span>

                Refreshing...
              </>
            ) : (
              <>
                <i className="bi bi-arrow-clockwise me-2"></i>

                Refresh
              </>
            )}

          </button>

        </div>


        {/* ================================================= */}
        {/* PARENT INFORMATION */}
        {/* ================================================= */}

        <div className="card shadow-sm border-0 mb-4">

          <div className="card-body">

            <h5 className="fw-bold mb-3">

              <i className="bi bi-person-circle me-2"></i>

              Parent Information

            </h5>


            <div className="row">

              <div className="col-md-4 mb-3">

                <small className="text-muted">
                  Name
                </small>

                <div className="fw-semibold">
                  {parent?.name || "N/A"}
                </div>

              </div>


              <div className="col-md-4 mb-3">

                <small className="text-muted">
                  Email
                </small>

                <div className="fw-semibold">
                  {parent?.email ||
                    auth.currentUser?.email ||
                    "N/A"}
                </div>

              </div>


              <div className="col-md-4 mb-3">

                <small className="text-muted">
                  Role
                </small>

                <div>

                  <span className="badge bg-primary">
                    {parent?.role || "parent"}
                  </span>

                </div>

              </div>

            </div>

          </div>

        </div>


        {/* ================================================= */}
        {/* NO LINKED STUDENT */}
        {/* ================================================= */}

        {!student && (

          <div className="card shadow-sm border-0">

            <div className="card-body text-center py-5">

              <i
                className="bi bi-person-x text-muted"
                style={{
                  fontSize: "50px"
                }}
              ></i>


              <h5 className="mt-3">
                No Student Linked
              </h5>


              <p className="text-muted mb-0">

                No student has been linked to
                your parent account yet.

              </p>

            </div>

          </div>

        )}


        {/* ================================================= */}
        {/* LINKED STUDENT */}
        {/* ================================================= */}

        {student && (

          <>

            {/* ============================================= */}
            {/* STUDENT INFORMATION */}
            {/* ============================================= */}

            <div className="card shadow-sm border-0 mb-4">

              <div className="card-body">

                <div className="d-flex justify-content-between align-items-center mb-3">

                  <h5 className="fw-bold mb-0">

                    <i className="bi bi-mortarboard-fill me-2"></i>

                    Linked Student

                  </h5>


                  <span className="badge bg-success">
                    Linked
                  </span>

                </div>


                <div className="row">

                  <div className="col-md-4 mb-3">

                    <small className="text-muted">
                      Student Name
                    </small>

                    <div className="fw-semibold">
                      {student.name || "N/A"}
                    </div>

                  </div>


                  <div className="col-md-4 mb-3">

                    <small className="text-muted">
                      Student ID
                    </small>

                    <div className="fw-semibold">
                      {student.studentId || "N/A"}
                    </div>

                  </div>


                  <div className="col-md-4 mb-3">

                    <small className="text-muted">
                      Department
                    </small>

                    <div className="fw-semibold">
                      {student.department || "N/A"}
                    </div>

                  </div>


                  <div className="col-md-4 mb-3">

                    <small className="text-muted">
                      Semester
                    </small>

                    <div className="fw-semibold">
                      {student.semester || "N/A"}
                    </div>

                  </div>


                  <div className="col-md-4 mb-3">

                    <small className="text-muted">
                      Email
                    </small>

                    <div className="fw-semibold">
                      {student.email || "N/A"}
                    </div>

                  </div>


                  <div className="col-md-4 mb-3">

                    <small className="text-muted">
                      Wallet Balance
                    </small>

                    <div className="fs-4 fw-bold text-success">

                      ৳
                      {Number(
                        student.walletBalance || 0
                      ).toFixed(2)}

                    </div>

                  </div>

                </div>

              </div>

            </div>


            {/* ============================================= */}
            {/* SUMMARY CARDS */}
            {/* ============================================= */}

            <div className="row mb-4">

              {/* Total Expenses */}
              <div className="col-md-4 mb-3">

                <div className="card shadow-sm border-0 h-100">

                  <div className="card-body">

                    <div className="d-flex justify-content-between">

                      <div>

                        <small className="text-muted">
                          Total Expenses
                        </small>

                        <h3 className="fw-bold mb-0">

                          ৳
                          {totalExpenses.toFixed(2)}

                        </h3>

                      </div>


                      <div className="text-danger fs-2">

                        <i className="bi bi-wallet2"></i>

                      </div>

                    </div>

                  </div>

                </div>

              </div>


              {/* Expense Count */}
              <div className="col-md-4 mb-3">

                <div className="card shadow-sm border-0 h-100">

                  <div className="card-body">

                    <div className="d-flex justify-content-between">

                      <div>

                        <small className="text-muted">
                          Expense Count
                        </small>

                        <h3 className="fw-bold mb-0">
                          {expenses.length}
                        </h3>

                      </div>


                      <div className="text-warning fs-2">

                        <i className="bi bi-receipt"></i>

                      </div>

                    </div>

                  </div>

                </div>

              </div>


              {/* Transactions */}
              <div className="col-md-4 mb-3">

                <div className="card shadow-sm border-0 h-100">

                  <div className="card-body">

                    <div className="d-flex justify-content-between">

                      <div>

                        <small className="text-muted">
                          Transactions
                        </small>

                        <h3 className="fw-bold mb-0">
                          {transactions.length}
                        </h3>

                      </div>


                      <div className="text-primary fs-2">

                        <i className="bi bi-arrow-left-right"></i>

                      </div>

                    </div>

                  </div>

                </div>

              </div>

            </div>


            {/* ============================================= */}
            {/* EXPENSE HISTORY */}
            {/* ============================================= */}

            <div className="card shadow-sm border-0 mb-4">

              <div className="card-body">

                <h5 className="fw-bold mb-3">

                  <i className="bi bi-receipt me-2"></i>

                  Student Expense History

                </h5>


                {expenses.length === 0 ? (

                  <div className="text-center py-4">

                    <i
                      className="bi bi-receipt text-muted"
                      style={{
                        fontSize: "40px"
                      }}
                    ></i>


                    <p className="text-muted mt-2 mb-0">
                      No expenses found.
                    </p>

                  </div>

                ) : (

                  <div className="table-responsive">

                    <table className="table table-hover align-middle">

                      <thead>

                        <tr>

                          <th>
                            #
                          </th>

                          <th>
                            Title
                          </th>

                          <th>
                            Category
                          </th>

                          <th>
                            Amount
                          </th>

                          <th>
                            Date
                          </th>

                        </tr>

                      </thead>


                      <tbody>

                        {expenses.map(
                          (expense, index) => (

                            <tr key={expense.id}>

                              <td>
                                {index + 1}
                              </td>


                              <td className="fw-semibold">
                                {expense.title || "N/A"}
                              </td>


                              <td>

                                <span className="badge bg-light text-dark">

                                  {expense.category ||
                                    "Other"}

                                </span>

                              </td>


                              <td className="text-danger fw-semibold">

                                - ৳
                                {Number(
                                  expense.amount || 0
                                ).toFixed(2)}

                              </td>


                              <td className="text-muted">

                                {formatDate(
                                  expense.createdAt
                                )}

                              </td>

                            </tr>

                          )
                        )}

                      </tbody>

                    </table>

                  </div>

                )}

              </div>

            </div>


            {/* ============================================= */}
            {/* TRANSACTION HISTORY */}
            {/* ============================================= */}

            <div className="card shadow-sm border-0 mb-4">

              <div className="card-body">

                <h5 className="fw-bold mb-3">

                  <i className="bi bi-clock-history me-2"></i>

                  Recent Transactions

                </h5>


                {transactions.length === 0 ? (

                  <div className="text-center py-4">

                    <i
                      className="bi bi-clock-history text-muted"
                      style={{
                        fontSize: "40px"
                      }}
                    ></i>


                    <p className="text-muted mt-2 mb-0">
                      No transactions found.
                    </p>

                  </div>

                ) : (

                  <div className="table-responsive">

                    <table className="table table-hover align-middle">

                      <thead>

                        <tr>

                          <th>
                            #
                          </th>

                          <th>
                            Type
                          </th>

                          <th>
                            Description
                          </th>

                          <th>
                            Amount
                          </th>

                          <th>
                            Date
                          </th>

                        </tr>

                      </thead>


                      <tbody>

                        {transactions.map(
                          (transaction, index) => {

                            const isIncome =
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
                                  {index + 1}
                                </td>


                                <td>

                                  {transaction.type ===
                                    "transfer_in" ? (

                                    <span className="badge bg-success">
                                      Money Received
                                    </span>

                                  ) : transaction.type ===
                                    "transfer_out" ? (

                                    <span className="badge bg-danger">
                                      Money Sent
                                    </span>

                                  ) : transaction.type ===
                                    "credit" ? (

                                    <span className="badge bg-success">
                                      Credit
                                    </span>

                                  ) : (

                                    <span className="badge bg-danger">
                                      Debit
                                    </span>

                                  )}

                                </td>


                                <td>

                                  {transaction.description ||
                                    transaction.title ||
                                    "Transaction"}

                                </td>


                                <td
                                  className={
                                    isIncome
                                      ? "text-success fw-semibold"
                                      : "text-danger fw-semibold"
                                  }
                                >

                                  {isIncome
                                    ? "+"
                                    : "-"}

                                  ৳
                                  {Number(
                                    transaction.amount ||
                                      0
                                  ).toFixed(2)}

                                </td>


                                <td className="text-muted">

                                  {formatDate(
                                    transaction.createdAt
                                  )}

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

          </>

        )}

      </div>

    </>
  );
}


export default ParentDashboard;