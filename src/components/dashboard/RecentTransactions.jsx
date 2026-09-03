import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";

import { auth, db } from "../../firebase/firebase";

function RecentTransactions() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeTransactions = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (!user) {
        setTransactions([]);
        setLoading(false);
        return;
      }

      const transactionsQuery = query(
        collection(db, "transactions"),
        where("userId", "==", user.uid),
        orderBy("createdAt", "desc")
      );

      unsubscribeTransactions = onSnapshot(
        transactionsQuery,
        (snapshot) => {
          const transactionData = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));

          setTransactions(transactionData);
          setLoading(false);
        },
        (error) => {
          console.error("Transaction loading error:", error);
          setLoading(false);
        }
      );
    });

    return () => {
      unsubscribeAuth();

      if (unsubscribeTransactions) {
        unsubscribeTransactions();
      }
    };
  }, []);

  const formatDate = (timestamp) => {
    if (!timestamp) {
      return "Processing...";
    }

    return timestamp.toDate().toLocaleDateString();
  };

  return (
    <div className="card shadow-sm mt-4">
      <div className="card-body">

        <h4 className="mb-4">
          Recent Transactions
        </h4>

        <div className="table-responsive">

          <table className="table table-hover align-middle">

            <thead className="table-light">
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>

              {loading ? (

                <tr>
                  <td
                    colSpan="4"
                    className="text-center text-muted py-5"
                  >
                    Loading transactions...
                  </td>
                </tr>

              ) : transactions.length === 0 ? (

                <tr>
                  <td
                    colSpan="4"
                    className="text-center text-muted py-5"
                  >
                    <i
                      className="bi bi-clock-history"
                      style={{ fontSize: "2rem" }}
                    ></i>

                    <br />

                    No transactions available.
                  </td>
                </tr>

              ) : (

                transactions.map((transaction) => (

                  <tr key={transaction.id}>

                    <td>
                      {formatDate(transaction.createdAt)}
                    </td>

                    <td>
                      {transaction.type === "credit"
                        ? "Money Added"
                        : transaction.type}
                    </td>

                    <td
                      className={
                        transaction.type === "credit"
                          ? "text-success fw-semibold"
                          : "text-danger fw-semibold"
                      }
                    >
                      {transaction.type === "credit" ? "+" : "-"}
                      ৳{Number(transaction.amount).toFixed(2)}
                    </td>

                    <td>
                      <span className="badge bg-success">
                        Completed
                      </span>
                    </td>

                  </tr>

                ))

              )}

            </tbody>

          </table>

        </div>

      </div>
    </div>
  );
}

export default RecentTransactions;