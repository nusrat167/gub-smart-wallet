import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";

import { auth, db } from "../../firebase/firebase";

function TransactionHistory() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeTransactions = null;

    const unsubscribeAuth = onAuthStateChanged(
      auth,
      (user) => {
        if (!user) {
          setTransactions([]);
          setLoading(false);
          return;
        }

        const transactionsQuery = query(
          collection(db, "transactions"),
          where("userId", "==", user.uid)
        );

        unsubscribeTransactions = onSnapshot(
          transactionsQuery,
          (snapshot) => {
            const transactionData = snapshot.docs.map(
              (transactionDoc) => ({
                id: transactionDoc.id,
                ...transactionDoc.data(),
              })
            );

            // Newest transaction first
            transactionData.sort((a, b) => {
              const dateA = a.createdAt?.toDate
                ? a.createdAt.toDate()
                : new Date(0);

              const dateB = b.createdAt?.toDate
                ? b.createdAt.toDate()
                : new Date(0);

              return dateB - dateA;
            });

            setTransactions(transactionData);
            setLoading(false);
          },
          (error) => {
            console.error(
              "Transaction History Error:",
              error
            );
            setLoading(false);
          }
        );
      }
    );

    return () => {
      unsubscribeAuth();

      if (unsubscribeTransactions) {
        unsubscribeTransactions();
      }
    };
  }, []);

  // ========================================
  // FORMAT DATE
  // ========================================

  const formatDate = (timestamp) => {
    if (!timestamp?.toDate) {
      return "Processing...";
    }

    const date = timestamp.toDate();

    return date.toLocaleString("en-BD", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // ========================================
  // TRANSACTION TYPE
  // ========================================

  const getTransactionInfo = (type) => {
    switch (type) {
      case "credit":
        return {
          label: "Money Added",
          icon: "bi-plus-circle",
          badge: "bg-success",
          amountClass: "text-success",
          sign: "+",
        };

      case "debit":
        return {
          label: "Expense",
          icon: "bi-receipt",
          badge: "bg-danger",
          amountClass: "text-danger",
          sign: "-",
        };

      case "transfer_out":
        return {
          label: "Money Sent",
          icon: "bi-arrow-up-right-circle",
          badge: "bg-warning text-dark",
          amountClass: "text-danger",
          sign: "-",
        };

      case "transfer_in":
        return {
          label: "Money Received",
          icon: "bi-arrow-down-left-circle",
          badge: "bg-primary",
          amountClass: "text-success",
          sign: "+",
        };

      default:
        return {
          label: "Transaction",
          icon: "bi-clock-history",
          badge: "bg-secondary",
          amountClass: "text-dark",
          sign: "",
        };
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
            Loading transactions...
          </p>
        </div>
      </div>
    );
  }

  // ========================================
  // PAGE
  // ========================================

  return (
    <div className="container py-5">

      {/* Header */}

      <div className="mb-4">
        <h2 className="fw-bold">
          <i className="bi bi-clock-history me-2"></i>
          Transaction History
        </h2>

        <p className="text-muted">
          View all your wallet transactions in one place.
        </p>
      </div>

      {/* Transaction Card */}

      <div className="card shadow-sm">

        <div className="card-body">

          {transactions.length === 0 ? (
            <div className="text-center text-muted py-5">

              <i
                className="bi bi-receipt"
                style={{ fontSize: "3rem" }}
              ></i>

              <h5 className="mt-3">
                No Transactions Yet
              </h5>

              <p>
                Your wallet transactions will appear here.
              </p>

            </div>
          ) : (
            <div className="table-responsive">

              <table className="table table-hover align-middle">

                <thead className="table-light">

                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Description</th>
                    <th className="text-end">
                      Amount
                    </th>
                  </tr>

                </thead>

                <tbody>

                  {transactions.map((transaction) => {
                    const info =
                      getTransactionInfo(
                        transaction.type
                      );

                    return (
                      <tr key={transaction.id}>

                        {/* Date */}

                        <td>
                          <small>
                            {formatDate(
                              transaction.createdAt
                            )}
                          </small>
                        </td>

                        {/* Type */}

                        <td>
                          <span
                            className={`badge ${info.badge}`}
                          >
                            <i
                              className={`bi ${info.icon} me-1`}
                            ></i>

                            {info.label}
                          </span>
                        </td>

                        {/* Description */}

                        <td>
                          {transaction.description ||
                            "No description"}
                        </td>

                        {/* Amount */}

                        <td
                          className={`text-end fw-bold ${info.amountClass}`}
                        >
                          {info.sign}৳
                          {Number(
                            transaction.amount
                          ).toFixed(2)}
                        </td>

                      </tr>
                    );
                  })}

                </tbody>

              </table>

            </div>
          )}

        </div>

      </div>

    </div>
  );
}

export default TransactionHistory;