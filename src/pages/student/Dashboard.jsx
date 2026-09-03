import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  doc,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";

import { auth, db } from "../../firebase/firebase";

import DashboardCard from "../../components/dashboard/DashboardCard";
import QuickActions from "../../components/dashboard/QuickActions";
import Savings from "../../components/dashboard/Savings";
import RecentTransactions from "../../components/dashboard/RecentTransactions";

function Dashboard() {
  const [walletBalance, setWalletBalance] = useState(0);
  const [todayExpense, setTodayExpense] = useState(0);
  const [transactionCount, setTransactionCount] = useState(0);

  useEffect(() => {
    let unsubscribeUser = null;
    let unsubscribeExpenses = null;
    let unsubscribeTransactions = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      // User logged out
      if (!user) {
        setWalletBalance(0);
        setTodayExpense(0);
        setTransactionCount(0);
        return;
      }

      // =====================================
      // WALLET BALANCE
      // =====================================

      const userRef = doc(db, "users", user.uid);

      unsubscribeUser = onSnapshot(
        userRef,
        (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data();

            setWalletBalance(
              Number(data.walletBalance) || 0
            );
          } else {
            setWalletBalance(0);
          }
        },
        (error) => {
          console.error("Wallet error:", error);
        }
      );

      // =====================================
      // TODAY'S EXPENSE
      // =====================================

      const expensesQuery = query(
        collection(db, "expenses"),
        where("userId", "==", user.uid)
      );

      unsubscribeExpenses = onSnapshot(
        expensesQuery,
        (snapshot) => {
          const now = new Date();

          const startOfToday = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate(),
            0,
            0,
            0,
            0
          );

          const endOfToday = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate(),
            23,
            59,
            59,
            999
          );

          let total = 0;

          snapshot.forEach((expenseDoc) => {
            const data = expenseDoc.data();

            if (!data.createdAt) {
              return;
            }

            const expenseDate = data.createdAt.toDate();

            if (
              expenseDate >= startOfToday &&
              expenseDate <= endOfToday
            ) {
              total += Number(data.amount) || 0;
            }
          });

          setTodayExpense(total);
        },
        (error) => {
          console.error("Today's expense error:", error);
        }
      );

      // =====================================
      // TRANSACTION COUNT
      // =====================================

      const transactionsQuery = query(
        collection(db, "transactions"),
        where("userId", "==", user.uid)
      );

      unsubscribeTransactions = onSnapshot(
        transactionsQuery,
        (snapshot) => {
          setTransactionCount(snapshot.size);
        },
        (error) => {
          console.error(
            "Transaction count error:",
            error
          );
        }
      );
    });

    // =====================================
    // CLEANUP
    // =====================================

    return () => {
      unsubscribeAuth();

      if (unsubscribeUser) {
        unsubscribeUser();
      }

      if (unsubscribeExpenses) {
        unsubscribeExpenses();
      }

      if (unsubscribeTransactions) {
        unsubscribeTransactions();
      }
    };
  }, []);

  return (
    <div className="container py-5">

      {/* =====================================
          DASHBOARD HEADER
      ===================================== */}

      <div className="mb-5">
        <h2 className="fw-bold">
          Student Dashboard
        </h2>

        <p className="text-muted">
          Manage your university expenses, wallet
          and savings from one place.
        </p>
      </div>


      {/* =====================================
          DASHBOARD CARDS
      ===================================== */}

      <div className="row">

        <DashboardCard
          title="Wallet Balance"
          value={`৳ ${walletBalance.toFixed(2)}`}
          color="success"
          icon="bi-wallet2"
        />

        <DashboardCard
          title="Today's Expense"
          value={`৳ ${todayExpense.toFixed(2)}`}
          color="danger"
          icon="bi-cash-stack"
        />

        <DashboardCard
          title="Savings Goal"
          value="Manage Below"
          color="primary"
          icon="bi-piggy-bank"
        />

        <DashboardCard
          title="Transactions"
          value={transactionCount}
          color="warning"
          icon="bi-clock-history"
        />

      </div>


      {/* =====================================
          QUICK ACTIONS
      ===================================== */}

      <QuickActions />


      {/* =====================================
          SAVINGS MANAGEMENT
      ===================================== */}

      <div id="savings-section">
        <Savings />
      </div>


      {/* =====================================
          RECENT TRANSACTIONS
      ===================================== */}

      <RecentTransactions />

    </div>
  );
}

export default Dashboard;