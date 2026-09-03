import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  addDoc,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";

import { auth, db } from "../../firebase/firebase";

function Payment() {
  const [user, setUser] = useState(null);
  const [walletBalance, setWalletBalance] = useState(0);

  const [paymentType, setPaymentType] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");

  const [paymentHistory, setPaymentHistory] = useState([]);

  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");

  // ========================================
  // LOAD USER, WALLET & PAYMENT HISTORY
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
          // -----------------------------
          // Load user wallet
          // -----------------------------

          const userRef = doc(
            db,
            "users",
            currentUser.uid
          );

          const userSnap = await getDoc(userRef);

          if (userSnap.exists()) {
            const data = userSnap.data();

            setWalletBalance(
              Number(data.walletBalance || 0)
            );
          }

          // -----------------------------
          // Load payment history
          // -----------------------------

          const transactionQuery = query(
            collection(db, "transactions"),
            where("userId", "==", currentUser.uid)
          );

          const transactionSnap = await getDocs(
            transactionQuery
          );

          const payments = transactionSnap.docs
            .map((transactionDoc) => ({
              id: transactionDoc.id,
              ...transactionDoc.data(),
            }))
            .filter(
              (transaction) =>
                transaction.type === "debit" &&
                transaction.description?.startsWith(
                  "University Payment - "
                )
            )
            .sort((a, b) => {
              const dateA =
                a.createdAt?.toDate?.() || new Date(0);

              const dateB =
                b.createdAt?.toDate?.() || new Date(0);

              return dateB - dateA;
            });

          setPaymentHistory(payments);
        } catch (error) {
          console.error(
            "Payment Page Load Error:",
            error
          );
        }

        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // ========================================
  // PAYMENT
  // ========================================

  const handlePayment = async (e) => {
    e.preventDefault();

    setMessage("");
    setMessageType("");

    if (!user) {
      setMessage("Please login first.");
      setMessageType("danger");
      return;
    }

    if (!paymentType) {
      setMessage("Please select a payment type.");
      setMessageType("danger");
      return;
    }

    const paymentAmount = Number(amount);

    if (!paymentAmount || paymentAmount <= 0) {
      setMessage("Please enter a valid amount.");
      setMessageType("danger");
      return;
    }

    if (paymentAmount > walletBalance) {
      setMessage("Insufficient wallet balance.");
      setMessageType("danger");
      return;
    }

    setPaying(true);

    try {
      const userRef = doc(
        db,
        "users",
        user.uid
      );

      const transactionRef = doc(
        collection(db, "transactions")
      );

      const newBalance =
        walletBalance - paymentAmount;

      const batch = writeBatch(db);

      // -----------------------------
      // Update wallet balance
      // -----------------------------

      batch.update(userRef, {
        walletBalance: newBalance,
      });

      // -----------------------------
      // Create payment transaction
      // -----------------------------

      batch.set(transactionRef, {
        userId: user.uid,
        type: "debit",
        amount: paymentAmount,
        description:
          `University Payment - ${paymentType}` +
          (description
            ? ` - ${description}`
            : ""),
        paymentType: paymentType,
        createdAt: serverTimestamp(),
      });

      // Commit both operations
      await batch.commit();

      // -----------------------------
      // Update local balance
      // -----------------------------

      setWalletBalance(newBalance);

      // -----------------------------
      // Add payment to history
      // -----------------------------

      const newPayment = {
        id: transactionRef.id,
        userId: user.uid,
        type: "debit",
        amount: paymentAmount,
        description:
          `University Payment - ${paymentType}` +
          (description
            ? ` - ${description}`
            : ""),
        paymentType: paymentType,
        createdAt: {
          toDate: () => new Date(),
        },
      };

      setPaymentHistory((prev) => [
        newPayment,
        ...prev,
      ]);

      // -----------------------------
      // Clear form
      // -----------------------------

      setPaymentType("");
      setAmount("");
      setDescription("");

      // -----------------------------
      // Success message
      // -----------------------------

      setMessage(
        `Payment of ৳${paymentAmount.toFixed(
          2
        )} completed successfully!`
      );

      setMessageType("success");
    } catch (error) {
      console.error(
        "University Payment Error:",
        error
      );

      setMessage(
        "Payment failed. Please try again."
      );

      setMessageType("danger");
    }

    setPaying(false);
  };

  // ========================================
  // FORMAT DATE
  // ========================================

  const formatDate = (timestamp) => {
    if (!timestamp) {
      return "Processing...";
    }

    try {
      const date = timestamp.toDate
        ? timestamp.toDate()
        : new Date(timestamp);

      return date.toLocaleString();
    } catch (error) {
      return "Unknown date";
    }
  };

  // ========================================
  // LOADING
  // ========================================

  if (loading) {
    return (
      <div className="container py-5">
        <div className="text-center py-5">
          <div
            className="spinner-border text-primary"
            role="status"
          ></div>

          <p className="text-muted mt-3">
            Loading payment page...
          </p>
        </div>
      </div>
    );
  }

  // ========================================
  // NOT LOGGED IN
  // ========================================

  if (!user) {
    return (
      <div className="container py-5">
        <div className="alert alert-warning">
          <i className="bi bi-exclamation-circle me-2"></i>
          Please login to make a university payment.
        </div>
      </div>
    );
  }

  // ========================================
  // PAYMENT PAGE
  // ========================================

  return (
    <div className="container py-5">

      {/* Header */}

      <div className="mb-4">
        <h2 className="fw-bold">
          <i className="bi bi-credit-card me-2"></i>
          University Payment
        </h2>

        <p className="text-muted">
          Pay your university fees directly from
          your GUB Smart Wallet.
        </p>
      </div>

      <div className="row g-4">

        {/* ============================== */}
        {/* PAYMENT FORM */}
        {/* ============================== */}

        <div className="col-lg-8">

          <div className="card shadow-sm">

            <div className="card-header bg-primary text-white">
              <h5 className="mb-0">
                <i className="bi bi-wallet2 me-2"></i>
                Make a Payment
              </h5>
            </div>

            <div className="card-body">

              {/* Message */}

              {message && (
                <div
                  className={`alert alert-${messageType}`}
                >
                  <i
                    className={`bi ${
                      messageType === "success"
                        ? "bi-check-circle"
                        : "bi-exclamation-circle"
                    } me-2`}
                  ></i>

                  {message}
                </div>
              )}

              <form onSubmit={handlePayment}>

                {/* Payment Type */}

                <div className="mb-3">

                  <label className="form-label fw-semibold">
                    Payment Type
                  </label>

                  <select
                    className="form-select"
                    value={paymentType}
                    onChange={(e) =>
                      setPaymentType(e.target.value)
                    }
                    required
                  >
                    <option value="">
                      Select payment type
                    </option>

                    <option value="Tuition Fee">
                      Tuition Fee
                    </option>

                    <option value="Exam Fee">
                      Exam Fee
                    </option>

                    <option value="Library Fee">
                      Library Fee
                    </option>

                    <option value="Lab Fee">
                      Lab Fee
                    </option>

                    <option value="Other">
                      Other
                    </option>
                  </select>

                </div>

                {/* Amount */}

                <div className="mb-3">

                  <label className="form-label fw-semibold">
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
                      min="1"
                      step="0.01"
                      value={amount}
                      onChange={(e) =>
                        setAmount(e.target.value)
                      }
                      required
                    />

                  </div>

                </div>

                {/* Description */}

                <div className="mb-4">

                  <label className="form-label fw-semibold">
                    Description
                    <span className="text-muted fw-normal">
                      {" "}
                      (Optional)
                    </span>
                  </label>

                  <textarea
                    className="form-control"
                    rows="3"
                    placeholder="Add payment details..."
                    value={description}
                    onChange={(e) =>
                      setDescription(e.target.value)
                    }
                  ></textarea>

                </div>

                {/* Submit */}

                <button
                  type="submit"
                  className="btn btn-primary w-100"
                  disabled={paying}
                >
                  {paying ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2"></span>
                      Processing Payment...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-check-circle me-2"></i>
                      Pay Now
                    </>
                  )}
                </button>

              </form>

            </div>
          </div>

        </div>

        {/* ============================== */}
        {/* WALLET SUMMARY */}
        {/* ============================== */}

        <div className="col-lg-4">

          <div className="card shadow-sm">

            <div className="card-body text-center">

              <div
                className="bg-success text-white rounded-circle d-inline-flex align-items-center justify-content-center mb-3"
                style={{
                  width: "75px",
                  height: "75px",
                  fontSize: "2rem",
                }}
              >
                <i className="bi bi-wallet2"></i>
              </div>

              <h6 className="text-muted">
                Available Wallet Balance
              </h6>

              <h2 className="fw-bold text-success">
                ৳{walletBalance.toFixed(2)}
              </h2>

              <hr />

              <div className="text-start">

                <p className="mb-2">
                  <i className="bi bi-check-circle text-success me-2"></i>
                  Secure wallet payment
                </p>

                <p className="mb-2">
                  <i className="bi bi-lightning text-warning me-2"></i>
                  Instant transaction
                </p>

                <p className="mb-0">
                  <i className="bi bi-clock-history text-primary me-2"></i>
                  Saved in transaction history
                </p>

              </div>

            </div>
          </div>

        </div>

      </div>

      {/* ======================================== */}
      {/* UNIVERSITY PAYMENT HISTORY */}
      {/* ======================================== */}

      <div className="card shadow-sm mt-5">

        <div className="card-header bg-dark text-white">

          <h5 className="mb-0">
            <i className="bi bi-receipt me-2"></i>
            University Payment History
          </h5>

        </div>

        <div className="card-body">

          {paymentHistory.length === 0 ? (

            <div className="text-center py-4">

              <i
                className="bi bi-receipt text-muted"
                style={{ fontSize: "3rem" }}
              ></i>

              <p className="text-muted mt-3 mb-0">
                No university payments yet.
              </p>

            </div>

          ) : (

            <div className="table-responsive">

              <table className="table table-hover align-middle">

                <thead>

                  <tr>
                    <th>#</th>
                    <th>Payment Type</th>
                    <th>Description</th>
                    <th>Amount</th>
                    <th>Date</th>
                    <th>Status</th>
                  </tr>

                </thead>

                <tbody>

                  {paymentHistory.map(
                    (payment, index) => (

                      <tr key={payment.id}>

                        <td>
                          {index + 1}
                        </td>

                        <td>
                          <span className="badge bg-primary">
                            {payment.paymentType}
                          </span>
                        </td>

                        <td>
                          {payment.description
                            ?.replace(
                              `University Payment - ${payment.paymentType}`,
                              ""
                            )
                            .replace(/^ - /, "") ||
                            "University Fee Payment"}
                        </td>

                        <td>
                          <strong className="text-danger">
                            -৳
                            {Number(
                              payment.amount || 0
                            ).toFixed(2)}
                          </strong>
                        </td>

                        <td>
                          <small>
                            {formatDate(
                              payment.createdAt
                            )}
                          </small>
                        </td>

                        <td>
                          <span className="badge bg-success">
                            <i className="bi bi-check-circle me-1"></i>
                            Paid
                          </span>
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
  );
}

export default Payment;