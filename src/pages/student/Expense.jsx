import { useEffect, useState } from "react";

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  writeBatch,
  serverTimestamp,
} from "firebase/firestore";

import { onAuthStateChanged } from "firebase/auth";

import { auth, db } from "../../firebase/firebase";

import Navbar from "../../components/layout/Navbar";

function Expense() {
  const [user, setUser] = useState(null);

  const [expenses, setExpenses] = useState([]);

  const [balance, setBalance] = useState(0);

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  const [showForm, setShowForm] = useState(false);

  const [title, setTitle] = useState("");

  const [category, setCategory] = useState("");

  const [amount, setAmount] = useState("");

  const [description, setDescription] = useState("");


  // =====================================================
  // LOAD DATA
  // =====================================================

  const loadData = async (firebaseUser) => {
    if (!firebaseUser) {
      setLoading(false);
      return;
    }

    try {
      // Get user profile
      const userRef = doc(
        db,
        "users",
        firebaseUser.uid
      );

      const userSnapshot = await getDoc(userRef);

      if (!userSnapshot.exists()) {
        throw new Error("User profile not found.");
      }

      const userData = userSnapshot.data();

      if (userData.role !== "student") {
        throw new Error(
          "Only students can manage expenses."
        );
      }

      setBalance(
        Number(userData.walletBalance || 0)
      );


      // Get expenses
      const expenseQuery = query(
        collection(db, "expenses"),
        where(
          "userId",
          "==",
          firebaseUser.uid
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
        const dateA =
          a.createdAt?.toDate?.() ||
          new Date(0);

        const dateB =
          b.createdAt?.toDate?.() ||
          new Date(0);

        return dateB - dateA;
      });

      setExpenses(expenseList);

    } catch (error) {
      console.error(
        "Expense Load Error:",
        error
      );

      alert(
        "Failed to load expenses.\n\n" +
        error.message
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
          setUser(firebaseUser);

          if (firebaseUser) {
            await loadData(firebaseUser);
          } else {
            setLoading(false);
          }
        }
      );

    return () => unsubscribe();
  }, []);


  // =====================================================
  // ADD EXPENSE
  // =====================================================

  const handleAddExpense = async (e) => {
    e.preventDefault();

    const money = Number(amount);


    // Validation
    if (!title.trim()) {
      alert("Please enter an expense title.");
      return;
    }

    if (!category) {
      alert("Please select a category.");
      return;
    }

    if (!amount || money <= 0) {
      alert("Please enter a valid amount.");
      return;
    }

    if (!user) {
      alert("Please login first.");
      return;
    }


    try {
      setSaving(true);


      // ================================================
      // GET CURRENT USER DATA
      // ================================================

      const userRef = doc(
        db,
        "users",
        user.uid
      );

      const userSnapshot =
        await getDoc(userRef);

      if (!userSnapshot.exists()) {
        throw new Error(
          "User profile not found."
        );
      }

      const userData =
        userSnapshot.data();


      const currentBalance =
        Number(
          userData.walletBalance || 0
        );


      // ================================================
      // CHECK BALANCE
      // ================================================

      if (money > currentBalance) {
        alert(
          `Insufficient balance.\n\n` +
          `Current Balance: ৳${currentBalance.toFixed(2)}\n` +
          `Expense Amount: ৳${money.toFixed(2)}`
        );

        setSaving(false);
        return;
      }


      // ================================================
      // NEW BALANCE
      // ================================================

      const newBalance =
        currentBalance - money;


      // ================================================
      // CREATE FIRESTORE REFERENCES
      // ================================================

      const expenseRef = doc(
        collection(db, "expenses")
      );

      const expenseActionRef = doc(
        collection(db, "expenseActions")
      );

      const transactionRef = doc(
        collection(db, "transactions")
      );


      // ================================================
      // BATCH
      // ================================================

      const batch = writeBatch(db);


      // ================================================
      // UPDATE WALLET
      // ================================================

      batch.update(
        userRef,
        {
          walletBalance: newBalance,

          lastExpenseActionId:
            expenseActionRef.id,
        }
      );


      // ================================================
      // CREATE EXPENSE ACTION
      // ================================================

      batch.set(
        expenseActionRef,
        {
          userId: user.uid,

          type: "add",

          amount: money,

          expenseId: expenseRef.id,

          createdAt:
            serverTimestamp(),
        }
      );


      // ================================================
      // CREATE EXPENSE
      // ================================================

      batch.set(
        expenseRef,
        {
          userId: user.uid,

          title: title.trim(),

          amount: money,

          category: category,

          description:
            description.trim(),

          createdAt:
            serverTimestamp(),
        }
      );


      // ================================================
      // CREATE TRANSACTION
      // ================================================

      batch.set(
        transactionRef,
        {
          userId: user.uid,

          type: "debit",

          amount: money,

          description:
            description.trim()
              ? `${title.trim()} - ${description.trim()}`
              : title.trim(),

          category: category,

          expenseId: expenseRef.id,

          createdAt:
            serverTimestamp(),
        }
      );


      // ================================================
      // COMMIT
      // ================================================

      await batch.commit();


      // ================================================
      // RESET FORM
      // ================================================

      setTitle("");

      setCategory("");

      setAmount("");

      setDescription("");

      setShowForm(false);


      alert(
        `Expense of ৳${money.toFixed(2)} added successfully!`
      );


      // Reload
      await loadData(user);

    } catch (error) {
      console.error(
        "Add Expense Error:",
        error
      );

      alert(
        "Failed to add expense.\n\n" +
        error.message
      );

    } finally {
      setSaving(false);
    }
  };


  // =====================================================
  // DELETE EXPENSE + REFUND
  // =====================================================

  const handleDeleteExpense = async (
    expense
  ) => {
    if (!user) {
      return;
    }


    const confirmed =
      window.confirm(
        `Delete "${expense.title}"?\n\n` +
        `৳${Number(
          expense.amount || 0
        ).toFixed(2)} will be refunded to your wallet.`
      );


    if (!confirmed) {
      return;
    }


    try {
      setSaving(true);


      // ================================================
      // GET USER
      // ================================================

      const userRef = doc(
        db,
        "users",
        user.uid
      );

      const userSnapshot =
        await getDoc(userRef);

      if (!userSnapshot.exists()) {
        throw new Error(
          "User profile not found."
        );
      }


      const currentBalance =
        Number(
          userSnapshot.data()
            .walletBalance || 0
        );


      const refundAmount =
        Number(
          expense.amount || 0
        );


      if (refundAmount <= 0) {
        throw new Error(
          "Invalid expense amount."
        );
      }


      const newBalance =
        currentBalance +
        refundAmount;


      // ================================================
      // REFERENCES
      // ================================================

      const expenseRef = doc(
        db,
        "expenses",
        expense.id
      );

      const refundActionRef = doc(
        collection(db, "expenseActions")
      );

      const transactionRef = doc(
        collection(db, "transactions")
      );


      // ================================================
      // BATCH
      // ================================================

      const batch = writeBatch(db);


      // ================================================
      // UPDATE WALLET
      // ================================================

      batch.update(
        userRef,
        {
          walletBalance: newBalance,

          lastExpenseActionId:
            refundActionRef.id,
        }
      );


      // ================================================
      // REFUND ACTION
      // ================================================

      batch.set(
        refundActionRef,
        {
          userId: user.uid,

          type: "refund",

          amount: refundAmount,

          expenseId: expense.id,

          createdAt:
            serverTimestamp(),
        }
      );


      // ================================================
      // DELETE EXPENSE
      // ================================================

      batch.delete(
        expenseRef
      );


      // ================================================
      // REFUND TRANSACTION
      // ================================================

      batch.set(
        transactionRef,
        {
          userId: user.uid,

          type: "credit",

          amount: refundAmount,

          description:
            `Expense refund: ${expense.title}`,

          category:
            expense.category || "Other",

          expenseId: expense.id,

          createdAt:
            serverTimestamp(),
        }
      );


      // ================================================
      // COMMIT
      // ================================================

      await batch.commit();


      alert(
        `৳${refundAmount.toFixed(2)} refunded successfully!`
      );


      await loadData(user);

    } catch (error) {
      console.error(
        "Delete Expense Error:",
        error
      );

      alert(
        "Failed to delete expense.\n\n" +
        error.message
      );

    } finally {
      setSaving(false);
    }
  };


  // =====================================================
  // FORMAT DATE
  // =====================================================

  const formatDate = (timestamp) => {
    if (!timestamp) {
      return "Just now";
    }

    try {
      if (timestamp.toDate) {
        return timestamp
          .toDate()
          .toLocaleString();
      }

      return new Date(
        timestamp
      ).toLocaleString();

    } catch {
      return "N/A";
    }
  };


  // =====================================================
  // TOTAL EXPENSE
  // =====================================================

  const totalExpense =
    expenses.reduce(
      (total, expense) =>
        total +
        Number(expense.amount || 0),
      0
    );


  // =====================================================
  // CATEGORY TOTALS
  // =====================================================

  const categoryTotals = {};

  expenses.forEach((expense) => {
    const cat =
      expense.category || "Other";

    categoryTotals[cat] =
      (categoryTotals[cat] || 0) +
      Number(expense.amount || 0);
  });


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
              Loading expenses...
            </p>

          </div>

        </div>
      </>
    );
  }


  // =====================================================
  // NOT LOGGED IN
  // =====================================================

  if (!user) {
    return (
      <>
     

        <div className="container py-5">

          <div className="alert alert-warning">
            Please login to manage expenses.
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

        {/* HEADER */}

        <div className="d-flex justify-content-between align-items-center mb-4">

          <div>

            <h2 className="fw-bold mb-1">
              Expense Management
            </h2>

            <p className="text-muted mb-0">
              Track and manage your daily expenses.
            </p>

          </div>


          <button
            className="btn btn-primary"
            onClick={() =>
              setShowForm(!showForm)
            }
          >

            <i
              className={
                showForm
                  ? "bi bi-x-lg me-2"
                  : "bi bi-plus-lg me-2"
              }
            ></i>

            {showForm
              ? "Cancel"
              : "Add Expense"}

          </button>

        </div>


        {/* SUMMARY */}

        <div className="row g-3 mb-4">

          <div className="col-md-4">

            <div className="card border-0 shadow-sm h-100">

              <div className="card-body">

                <div className="d-flex justify-content-between">

                  <div>

                    <small className="text-muted">
                      Current Balance
                    </small>

                    <h3 className="fw-bold text-success mb-0">
                      ৳ {balance.toFixed(2)}
                    </h3>

                  </div>

                  <i className="bi bi-wallet2 text-success fs-2"></i>

                </div>

              </div>

            </div>

          </div>


          <div className="col-md-4">

            <div className="card border-0 shadow-sm h-100">

              <div className="card-body">

                <div className="d-flex justify-content-between">

                  <div>

                    <small className="text-muted">
                      Total Expense
                    </small>

                    <h3 className="fw-bold text-danger mb-0">
                      ৳ {totalExpense.toFixed(2)}
                    </h3>

                  </div>

                  <i className="bi bi-receipt text-danger fs-2"></i>

                </div>

              </div>

            </div>

          </div>


          <div className="col-md-4">

            <div className="card border-0 shadow-sm h-100">

              <div className="card-body">

                <div className="d-flex justify-content-between">

                  <div>

                    <small className="text-muted">
                      Number of Expenses
                    </small>

                    <h3 className="fw-bold mb-0">
                      {expenses.length}
                    </h3>

                  </div>

                  <i className="bi bi-list-check text-primary fs-2"></i>

                </div>

              </div>

            </div>

          </div>

        </div>


        {/* ADD EXPENSE FORM */}

        {showForm && (

          <div className="card border-0 shadow-sm mb-4">

            <div className="card-body">

              <h5 className="fw-bold mb-4">

                <i className="bi bi-plus-circle me-2"></i>

                Add New Expense

              </h5>


              <form
                onSubmit={handleAddExpense}
              >

                <div className="row g-3">

                  <div className="col-md-6">

                    <label className="form-label fw-semibold">
                      Expense Title
                    </label>

                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Lunch"
                      value={title}
                      onChange={(e) =>
                        setTitle(
                          e.target.value
                        )
                      }
                    />

                  </div>


                  <div className="col-md-6">

                    <label className="form-label fw-semibold">
                      Category
                    </label>

                    <select
                      className="form-select"
                      value={category}
                      onChange={(e) =>
                        setCategory(
                          e.target.value
                        )
                      }
                    >

                      <option value="">
                        Select Category
                      </option>

                      <option value="Food">
                        Food
                      </option>

                      <option value="Transport">
                        Transport
                      </option>

                      <option value="Academic">
                        Academic
                      </option>

                      <option value="Hostel">
                        Hostel
                      </option>

                      <option value="Shopping">
                        Shopping
                      </option>

                      <option value="Entertainment">
                        Entertainment
                      </option>

                      <option value="Other">
                        Other
                      </option>

                    </select>

                  </div>


                  <div className="col-md-6">

                    <label className="form-label fw-semibold">
                      Amount
                    </label>

                    <div className="input-group">

                      <span className="input-group-text">
                        ৳
                      </span>

                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        className="form-control"
                        placeholder="Enter amount"
                        value={amount}
                        onChange={(e) =>
                          setAmount(
                            e.target.value
                          )
                        }
                      />

                    </div>

                  </div>


                  <div className="col-md-6">

                    <label className="form-label fw-semibold">
                      Description
                      <span className="text-muted fw-normal">
                        {" "} (Optional)
                      </span>
                    </label>

                    <input
                      type="text"
                      className="form-control"
                      placeholder="Optional description"
                      value={description}
                      onChange={(e) =>
                        setDescription(
                          e.target.value
                        )
                      }
                    />

                  </div>


                  <div className="col-12">

                    <button
                      type="submit"
                      className="btn btn-primary"
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

                          Save Expense
                        </>
                      )}

                    </button>

                  </div>

                </div>

              </form>

            </div>

          </div>

        )}


        {/* CATEGORY SUMMARY */}

        {Object.keys(categoryTotals).length > 0 && (

          <div className="card border-0 shadow-sm mb-4">

            <div className="card-body">

              <h5 className="fw-bold mb-3">

                <i className="bi bi-pie-chart me-2"></i>

                Expense by Category

              </h5>


              <div className="row g-3">

                {Object.entries(
                  categoryTotals
                ).map(
                  ([cat, total]) => (

                    <div
                      className="col-sm-6 col-md-4 col-lg-3"
                      key={cat}
                    >

                      <div className="border rounded-3 p-3">

                        <div className="text-muted small">
                          {cat}
                        </div>

                        <div className="fw-bold text-danger">
                          ৳ {total.toFixed(2)}
                        </div>

                      </div>

                    </div>

                  )
                )}

              </div>

            </div>

          </div>

        )}


        {/* EXPENSE HISTORY */}

        <div className="card border-0 shadow-sm">

          <div className="card-body">

            <div className="d-flex justify-content-between align-items-center mb-3">

              <h5 className="fw-bold mb-0">

                <i className="bi bi-clock-history me-2"></i>

                Expense History

              </h5>

              <span className="badge bg-primary">
                {expenses.length} Records
              </span>

            </div>


            {expenses.length === 0 ? (

              <div className="text-center py-5">

                <i
                  className="bi bi-receipt text-muted"
                  style={{
                    fontSize: "50px"
                  }}
                ></i>

                <h5 className="mt-3">
                  No Expenses Yet
                </h5>

                <p className="text-muted">
                  Add your first expense to start
                  tracking your spending.
                </p>

                <button
                  className="btn btn-primary"
                  onClick={() =>
                    setShowForm(true)
                  }
                >

                  <i className="bi bi-plus-lg me-2"></i>

                  Add Expense

                </button>

              </div>

            ) : (

              <div className="table-responsive">

                <table className="table table-hover align-middle">

                  <thead>

                    <tr>

                      <th>#</th>

                      <th>Title</th>

                      <th>Category</th>

                      <th>Description</th>

                      <th>Amount</th>

                      <th>Date</th>

                      <th>Action</th>

                    </tr>

                  </thead>


                  <tbody>

                    {expenses.map(
                      (expense, index) => (

                        <tr
                          key={expense.id}
                        >

                          <td>
                            {index + 1}
                          </td>

                          <td className="fw-semibold">
                            {expense.title}
                          </td>

                          <td>

                            <span className="badge bg-light text-dark">
                              {expense.category ||
                                "Other"}
                            </span>

                          </td>

                          <td className="text-muted">
                            {expense.description ||
                              "-"}
                          </td>

                          <td className="text-danger fw-bold">

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

                          <td>

                            <button
                              className="btn btn-sm btn-outline-danger"
                              onClick={() =>
                                handleDeleteExpense(
                                  expense
                                )
                              }
                              disabled={saving}
                            >

                              <i className="bi bi-trash"></i>

                            </button>

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

      </div>
    </>
  );
}

export default Expense;