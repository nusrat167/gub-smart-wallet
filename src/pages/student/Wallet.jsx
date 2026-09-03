import { useEffect, useState } from "react";
import Navbar from "../../components/layout/Navbar";

import { onAuthStateChanged } from "firebase/auth";

import {
  doc,
  onSnapshot,
  writeBatch,
  increment,
  serverTimestamp,
  collection,
  query,
  where,
  orderBy,
  limit,
} from "firebase/firestore";

import { auth, db } from "../../firebase/firebase";

function Wallet() {
  const [balance, setBalance] = useState(0);
  const [amount, setAmount] = useState("");
  const [showAddMoney, setShowAddMoney] = useState(false);

  const [user, setUser] = useState(null);
  const [transactions, setTransactions] = useState([]);

  const [loading, setLoading] = useState(false);

  // ========================================
  // GET LOGGED IN USER
  // ========================================

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (currentUser) => {
        setUser(currentUser);
      }
    );

    return () => unsubscribe();
  }, []);

  // ========================================
  // LISTEN TO WALLET BALANCE
  // ========================================

  useEffect(() => {
    if (!user) return;

    const userRef = doc(db, "users", user.uid);

    const unsubscribe = onSnapshot(
      userRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();

          setBalance(
            Number(data.walletBalance || 0)
          );
        }
      },
      (error) => {
        console.error(
          "Wallet Listener Error:",
          error
        );
      }
    );

    return () => unsubscribe();
  }, [user]);

  // ========================================
  // LISTEN TO USER'S TRANSACTIONS
  // ========================================

  useEffect(() => {
    if (!user) return;

    const transactionsRef =
      collection(db, "transactions");

    // IMPORTANT:
    // Only request current user's transactions
    const transactionsQuery = query(
      transactionsRef,
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc"),
      limit(5)
    );

    const unsubscribe = onSnapshot(
      transactionsQuery,
      (snapshot) => {
        const userTransactions =
          snapshot.docs.map((transactionDoc) => ({
            id: transactionDoc.id,
            ...transactionDoc.data(),
          }));

        setTransactions(userTransactions);
      },
      (error) => {
        console.error(
          "Transaction Listener Error:",
          error
        );
      }
    );

    return () => unsubscribe();
  }, [user]);

  // ========================================
  // ADD MONEY
  // ========================================

  const handleAddMoney = async () => {
    const money = Number(amount);

    if (!money || money <= 0) {
      alert("Please enter a valid amount.");
      return;
    }

    if (!user) {
      alert("Please login first.");
      return;
    }

    setLoading(true);

    try {
      const userRef = doc(
        db,
        "users",
        user.uid
      );

      const transactionRef = doc(
        collection(db, "transactions")
      );

      const batch = writeBatch(db);

      // ====================================
      // UPDATE WALLET
      // ====================================

      batch.update(userRef, {
        walletBalance: increment(money),
      });

      // ====================================
      // CREATE TRANSACTION
      // ====================================

      batch.set(transactionRef, {
        userId: user.uid,
        type: "credit",
        amount: money,
        description: "Money Added to Wallet",
        createdAt: serverTimestamp(),
      });

      await batch.commit();

      setAmount("");
      setShowAddMoney(false);

      alert(
        `৳${money.toFixed(
          2
        )} added successfully!`
      );

    } catch (error) {
      console.error(
        "Add Money Error:",
        error
      );

      alert(
        `Failed to add money.\n\n${error.message}`
      );
    }

    setLoading(false);
  };

  // ========================================
  // FORMAT DATE
  // ========================================

  const formatDate = (timestamp) => {
    if (!timestamp?.toDate) {
      return "Just now";
    }

    return timestamp
      .toDate()
      .toLocaleString();
  };

  // ========================================
  // UI
  // ========================================

  return (
    <>
      

      <div className="container py-5">

        {/* PAGE HEADER */}

        <div className="mb-4">
          <h2 className="fw-bold">
            Wallet
          </h2>

          <p className="text-muted">
            Manage your wallet balance and
            transactions.
          </p>
        </div>

        <div className="row g-4">

          {/* BALANCE CARD */}

          <div className="col-lg-4">

            <div className="card border-0 shadow-sm rounded-4 h-100">

              <div className="card-body text-center p-4">

                <div
                  className="bg-success bg-opacity-10 rounded-circle d-flex align-items-center justify-content-center mx-auto"
                  style={{
                    width: "80px",
                    height: "80px",
                  }}
                >
                  <i
                    className="bi bi-wallet2 text-success"
                    style={{
                      fontSize: "2.5rem",
                    }}
                  ></i>
                </div>

                <h6 className="text-muted mt-4">
                  Current Balance
                </h6>

                <h1 className="fw-bold text-success">
                  ৳ {balance.toFixed(2)}
                </h1>

              </div>

            </div>

          </div>

          {/* WALLET ACTIONS */}

          <div className="col-lg-8">

            <div className="card border-0 shadow-sm rounded-4">

              <div className="card-body p-4">

                <h4 className="mb-4">
                  Wallet Actions
                </h4>

                <div className="row g-3">

                  {/* ADD MONEY */}

                  <div className="col-md-4">

                    <button
                      className="btn btn-success w-100 py-3"
                      onClick={() =>
                        setShowAddMoney(true)
                      }
                    >
                      <i className="bi bi-plus-circle me-2"></i>
                      Add Money
                    </button>

                  </div>

                  {/* SEND MONEY */}

                  <div className="col-md-4">

                    <button
                      className="btn btn-primary w-100 py-3"
                      onClick={() =>
                        alert(
                          "Please use the Send Money section on the Dashboard."
                        )
                      }
                    >
                      <i className="bi bi-send me-2"></i>
                      Send Money
                    </button>

                  </div>

                  {/* RECEIVE MONEY */}

                  <div className="col-md-4">

                    <button
                      className="btn btn-warning text-white w-100 py-3"
                      onClick={() =>
                        alert(
                          "You can receive money from another student."
                        )
                      }
                    >
                      <i className="bi bi-arrow-down-circle me-2"></i>
                      Receive Money
                    </button>

                  </div>

                </div>

              </div>

            </div>

          </div>

        </div>

        {/* ADD MONEY FORM */}

        {showAddMoney && (
          <div className="card border-0 shadow-sm rounded-4 mt-4">

            <div className="card-body p-4">

              <div className="d-flex justify-content-between align-items-center mb-4">

                <h4 className="mb-0">
                  Add Money
                </h4>

                <button
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() =>
                    setShowAddMoney(false)
                  }
                >
                  <i className="bi bi-x-lg"></i>
                </button>

              </div>

              <div className="row g-3 align-items-end">

                <div className="col-md-8">

                  <label className="form-label">
                    Amount
                  </label>

                  <div className="input-group">

                    <span className="input-group-text">
                      ৳
                    </span>

                    <input
                      type="number"
                      className="form-control"
                      placeholder="Enter amount"
                      value={amount}
                      onChange={(e) =>
                        setAmount(
                          e.target.value
                        )
                      }
                      min="1"
                    />

                  </div>

                </div>

                <div className="col-md-4">

                  <button
                    className="btn btn-success w-100"
                    onClick={handleAddMoney}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2"></span>
                        Processing...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-check-circle me-2"></i>
                        Add Money
                      </>
                    )}
                  </button>

                </div>

              </div>

            </div>

          </div>
        )}

        {/* TRANSACTIONS */}

        <div className="card border-0 shadow-sm rounded-4 mt-4">

          <div className="card-body p-4">

            <h4 className="mb-4">
              Recent Transactions
            </h4>

            {transactions.length === 0 ? (

              <div className="text-center text-muted py-5">

                <i
                  className="bi bi-clock-history"
                  style={{
                    fontSize: "2rem",
                  }}
                ></i>

                <p className="mt-3 mb-0">
                  No transactions available.
                </p>

              </div>

            ) : (

              <div className="list-group list-group-flush">

                {transactions.map(
                  (transaction) => (

                    <div
                      key={transaction.id}
                      className="list-group-item px-0 py-3 d-flex justify-content-between align-items-center"
                    >

                      <div className="d-flex align-items-center">

                        <div
                          className={`rounded-circle d-flex align-items-center justify-content-center me-3 ${
                            transaction.type ===
                            "credit"
                              ? "bg-success bg-opacity-10"
                              : "bg-danger bg-opacity-10"
                          }`}
                          style={{
                            width: "45px",
                            height: "45px",
                          }}
                        >

                          <i
                            className={`bi ${
                              transaction.type ===
                              "credit"
                                ? "bi-plus-lg text-success"
                                : "bi-dash-lg text-danger"
                            }`}
                          ></i>

                        </div>

                        <div>

                          <h6 className="mb-1">
                            {transaction.description ||
                              "Transaction"}
                          </h6>

                          <small className="text-muted">
                            {formatDate(
                              transaction.createdAt
                            )}
                          </small>

                        </div>

                      </div>

                      <strong
                        className={
                          transaction.type ===
                          "credit"
                            ? "text-success"
                            : "text-danger"
                        }
                      >
                        {transaction.type ===
                        "credit"
                          ? "+"
                          : "-"}
                        ৳{" "}
                        {Number(
                          transaction.amount ||
                            0
                        ).toFixed(2)}
                      </strong>

                    </div>

                  )
                )}

              </div>

            )}

          </div>

        </div>

      </div>
    </>
  );
}

export default Wallet;