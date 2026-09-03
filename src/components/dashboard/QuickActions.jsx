import { useState } from "react";

import {
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  query,
  serverTimestamp,
  where,
  writeBatch,
} from "firebase/firestore";

import { auth, db } from "../../firebase/firebase";

function QuickActions() {
  const [showAddMoney, setShowAddMoney] = useState(false);
  const [showExpense, setShowExpense] = useState(false);
  const [showSendMoney, setShowSendMoney] = useState(false);

  // ADD MONEY
  const [amount, setAmount] = useState("");

  // ADD EXPENSE
  const [expenseTitle, setExpenseTitle] = useState("");
  const [expenseCategory, setExpenseCategory] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");

  // SEND MONEY
  const [recipient, setRecipient] = useState("");
  const [sendAmount, setSendAmount] = useState("");
  const [sendDescription, setSendDescription] = useState("");

  const [loading, setLoading] = useState(false);

  // ========================================
  // ADD MONEY
  // ========================================

  const handleAddMoney = async () => {
    const money = Number(amount);

    if (!amount || money <= 0) {
      alert("Please enter a valid amount.");
      return;
    }

    const user = auth.currentUser;

    if (!user) {
      alert("Please login first.");
      return;
    }

    try {
      setLoading(true);

      const userRef = doc(db, "users", user.uid);
      const userSnapshot = await getDoc(userRef);

      if (!userSnapshot.exists()) {
        alert("User data not found.");
        return;
      }

      const currentBalance =
        Number(userSnapshot.data().walletBalance) || 0;

      const newBalance = currentBalance + money;

      const batch = writeBatch(db);

      batch.update(userRef, {
        walletBalance: newBalance,
      });

      const transactionRef = doc(
        collection(db, "transactions")
      );

      batch.set(transactionRef, {
        userId: user.uid,
        type: "credit",
        amount: money,
        description: "Money Added",
        createdAt: serverTimestamp(),
      });

      await batch.commit();

      alert(`৳${money.toFixed(2)} added successfully!`);

      setAmount("");
      setShowAddMoney(false);

      window.location.reload();
    } catch (error) {
      console.error("Add Money Error:", error);
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  // ========================================
  // ADD EXPENSE
  // ========================================

  const handleAddExpense = async () => {
    const money = Number(expenseAmount);

    if (!expenseTitle.trim()) {
      alert("Please enter an expense title.");
      return;
    }

    if (!expenseCategory) {
      alert("Please select an expense category.");
      return;
    }

    if (!expenseAmount || money <= 0) {
      alert("Please enter a valid expense amount.");
      return;
    }

    const user = auth.currentUser;

    if (!user) {
      alert("Please login first.");
      return;
    }

    try {
      setLoading(true);

      const userRef = doc(db, "users", user.uid);

      const userSnapshot = await getDoc(userRef);

      if (!userSnapshot.exists()) {
        alert("User data not found.");
        return;
      }

      const currentBalance =
        Number(userSnapshot.data().walletBalance) || 0;

      if (money > currentBalance) {
        alert(
          `Insufficient balance. Your current balance is ৳${currentBalance.toFixed(
            2
          )}.`
        );
        return;
      }

      const newBalance = currentBalance - money;

      const batch = writeBatch(db);

      // Update wallet
      batch.update(userRef, {
        walletBalance: newBalance,
      });

      // Create expense
      const expenseRef = doc(
        collection(db, "expenses")
      );

      batch.set(expenseRef, {
        userId: user.uid,
        title: expenseTitle.trim(),
        amount: money,
        category: expenseCategory,
        createdAt: serverTimestamp(),
      });

      // Create transaction
      const transactionRef = doc(
        collection(db, "transactions")
      );

      batch.set(transactionRef, {
        userId: user.uid,
        type: "debit",
        amount: money,
        description: expenseTitle.trim(),
        createdAt: serverTimestamp(),
      });

      await batch.commit();

      alert(
        `Expense of ৳${money.toFixed(
          2
        )} added successfully!`
      );

      setExpenseTitle("");
      setExpenseCategory("");
      setExpenseAmount("");
      setShowExpense(false);

      window.location.reload();
    } catch (error) {
      console.error("Add Expense Error:", error);
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  // ========================================
  // SEND MONEY
  // ========================================

  const handleSendMoney = async () => {
    const money = Number(sendAmount);
    const recipientValue = recipient.trim();

    // ========================================
    // VALIDATION
    // ========================================

    if (!recipientValue) {
      alert("Please enter recipient Student ID or Email.");
      return;
    }

    if (!sendAmount || money <= 0) {
      alert("Please enter a valid amount.");
      return;
    }

    const user = auth.currentUser;

    if (!user) {
      alert("Please login first.");
      return;
    }

    try {
      setLoading(true);

      // ========================================
      // 1. GET SENDER
      // ========================================

      const senderRef = doc(db, "users", user.uid);

      const senderSnapshot = await getDoc(senderRef);

      if (!senderSnapshot.exists()) {
        alert("Your user data was not found.");
        return;
      }

      const senderData = senderSnapshot.data();

      const senderBalance =
        Number(senderData.walletBalance) || 0;

      // ========================================
      // 2. CHECK SENDER BALANCE
      // ========================================

      if (money > senderBalance) {
        alert(
          `Insufficient wallet balance.\nYour current balance is ৳${senderBalance.toFixed(
            2
          )}.`
        );
        return;
      }

      // ========================================
      // 3. FIND RECIPIENT
      // ========================================
      // IMPORTANT:
      // We use studentDirectory instead of users.
      // Students are allowed to read studentDirectory.

      const directoryRef = collection(
        db,
        "studentDirectory"
      );

      const emailQuery = query(
        directoryRef,
        where("email", "==", recipientValue)
      );

      const studentIdQuery = query(
        directoryRef,
        where("studentId", "==", recipientValue)
      );

      const [emailResult, studentIdResult] =
        await Promise.all([
          getDocs(emailQuery),
          getDocs(studentIdQuery),
        ]);

      let recipientDoc = null;

      if (!emailResult.empty) {
        recipientDoc = emailResult.docs[0];
      } else if (!studentIdResult.empty) {
        recipientDoc = studentIdResult.docs[0];
      }

      // ========================================
      // 4. RECIPIENT NOT FOUND
      // ========================================

      if (!recipientDoc) {
        alert(
          "Recipient not found.\nPlease check the Student ID or Email."
        );
        return;
      }

      const recipientData = recipientDoc.data();

      const recipientId = recipientData.userId;

      // ========================================
      // 5. PREVENT SELF TRANSFER
      // ========================================

      if (recipientId === user.uid) {
        alert("You cannot send money to yourself.");
        return;
      }

      // ========================================
      // 6. CREATE REFERENCES
      // ========================================

      const recipientRef = doc(
        db,
        "users",
        recipientId
      );

      const transferRef = doc(
        collection(db, "transfers")
      );

      const senderTransactionRef = doc(
        collection(db, "transactions")
      );

      const recipientTransactionRef = doc(
        collection(db, "transactions")
      );

      // ========================================
      // 7. CALCULATE SENDER BALANCE
      // ========================================

      const newSenderBalance =
        senderBalance - money;

      // ========================================
      // 8. CREATE BATCH
      // ========================================

      const batch = writeBatch(db);

      // ========================================
      // TRANSFER RECORD
      // ========================================

      batch.set(transferRef, {
        senderId: user.uid,
        recipientId: recipientId,
        amount: money,
        description:
          sendDescription.trim() ||
          `Money sent to ${
            recipientData.name || "Student"
          }`,
        createdAt: serverTimestamp(),
      });

      // ========================================
      // SENDER WALLET
      // ========================================

      batch.update(senderRef, {
        walletBalance: newSenderBalance,
        lastTransferId: transferRef.id,
      });

      // ========================================
      // RECIPIENT WALLET
      // ========================================

      batch.update(recipientRef, {
        walletBalance: increment(money),
        lastTransferId: transferRef.id,
      });

      // ========================================
      // SENDER TRANSACTION
      // ========================================

      batch.set(senderTransactionRef, {
        userId: user.uid,
        type: "transfer_out",
        amount: money,
        description:
          sendDescription.trim() ||
          `Sent money to ${
            recipientData.name || "Student"
          }`,
        transferId: transferRef.id,
        recipientId: recipientId,
        createdAt: serverTimestamp(),
      });

      // ========================================
      // RECIPIENT TRANSACTION
      // ========================================

      batch.set(recipientTransactionRef, {
        userId: recipientId,
        type: "transfer_in",
        amount: money,
        description:
          sendDescription.trim() ||
          `Received money from ${
            senderData.name || "Student"
          }`,
        transferId: transferRef.id,
        senderId: user.uid,
        createdAt: serverTimestamp(),
      });

      // ========================================
      // 9. COMMIT
      // ========================================

      await batch.commit();

      // ========================================
      // 10. SUCCESS
      // ========================================

      alert(
        `৳${money.toFixed(
          2
        )} sent successfully to ${
          recipientData.name || "Student"
        }!`
      );

      // Clear form
      setRecipient("");
      setSendAmount("");
      setSendDescription("");
      setShowSendMoney(false);

      window.location.reload();
    } catch (error) {
      console.error("Send Money Error:", error);

      alert(
        `Failed to send money.\n\n${error.message}`
      );
    } finally {
      setLoading(false);
    }
  };

  // ========================================
  // SAVINGS
  // ========================================

  const handleSavingsClick = () => {
    const savingsSection =
      document.getElementById("savings-section");

    if (savingsSection) {
      savingsSection.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  };

  // ========================================
  // RETURN
  // ========================================

  return (
    <div className="card shadow-sm mt-4">
      <div className="card-body">

        <h4 className="mb-4">
          Quick Actions
        </h4>

        {/* ========================================
            ADD MONEY FORM
        ======================================== */}

        {showAddMoney && (
          <div className="card bg-light border-0 p-3 mb-4">

            <h6 className="fw-bold mb-3">
              Add Money
            </h6>

            <div className="input-group">

              <span className="input-group-text">
                ৳
              </span>

              <input
                type="number"
                min="1"
                className="form-control"
                placeholder="Enter amount"
                value={amount}
                onChange={(e) =>
                  setAmount(e.target.value)
                }
              />

              <button
                className="btn btn-success"
                onClick={handleAddMoney}
                disabled={loading}
              >
                {loading ? "Adding..." : "Add"}
              </button>

              <button
                className="btn btn-outline-secondary"
                onClick={() => {
                  setShowAddMoney(false);
                  setAmount("");
                }}
                disabled={loading}
              >
                Cancel
              </button>

            </div>

          </div>
        )}

        {/* ========================================
            SEND MONEY FORM
        ======================================== */}

        {showSendMoney && (
          <div className="card bg-light border-0 p-3 mb-4">

            <h6 className="fw-bold mb-3">
              <i className="bi bi-send me-2"></i>
              Send Money
            </h6>

            {/* Recipient */}

            <label className="form-label">
              Recipient Student ID or Email
            </label>

            <input
              type="text"
              className="form-control mb-3"
              placeholder="Example: 242002123 or student@gmail.com"
              value={recipient}
              onChange={(e) =>
                setRecipient(e.target.value)
              }
            />

            {/* Amount */}

            <label className="form-label">
              Amount
            </label>

            <div className="input-group mb-3">

              <span className="input-group-text">
                ৳
              </span>

              <input
                type="number"
                min="1"
                step="0.01"
                className="form-control"
                placeholder="Enter amount"
                value={sendAmount}
                onChange={(e) =>
                  setSendAmount(e.target.value)
                }
              />

            </div>

            {/* Description */}

            <label className="form-label">
              Description
            </label>

            <input
              type="text"
              className="form-control mb-3"
              placeholder="Example: Lunch payment"
              value={sendDescription}
              onChange={(e) =>
                setSendDescription(e.target.value)
              }
            />

            {/* Buttons */}

            <div className="d-flex gap-2">

              <button
                className="btn btn-primary"
                onClick={handleSendMoney}
                disabled={loading}
              >
                {loading ? (
                  "Sending..."
                ) : (
                  <>
                    <i className="bi bi-send me-2"></i>
                    Send Money
                  </>
                )}
              </button>

              <button
                className="btn btn-outline-secondary"
                onClick={() => {
                  setShowSendMoney(false);
                  setRecipient("");
                  setSendAmount("");
                  setSendDescription("");
                }}
                disabled={loading}
              >
                Cancel
              </button>

            </div>

          </div>
        )}

        {/* ========================================
            ADD EXPENSE FORM
        ======================================== */}

        {showExpense && (
          <div className="card bg-light border-0 p-3 mb-4">

            <h6 className="fw-bold mb-3">
              Add Expense
            </h6>

            {/* Expense Title */}

            <input
              type="text"
              className="form-control mb-3"
              placeholder="Expense title"
              value={expenseTitle}
              onChange={(e) =>
                setExpenseTitle(e.target.value)
              }
            />

            {/* Category */}

            <select
              className="form-select mb-3"
              value={expenseCategory}
              onChange={(e) =>
                setExpenseCategory(e.target.value)
              }
            >

              <option value="">
                Select Category
              </option>

              <option value="Food">
                Food
              </option>

              <option value="Transportation">
                Transportation
              </option>

              <option value="Education">
                Education
              </option>

              <option value="Shopping">
                Shopping
              </option>

              <option value="Other">
                Other
              </option>

            </select>

            {/* Amount */}

            <div className="input-group mb-3">

              <span className="input-group-text">
                ৳
              </span>

              <input
                type="number"
                min="1"
                className="form-control"
                placeholder="Expense amount"
                value={expenseAmount}
                onChange={(e) =>
                  setExpenseAmount(e.target.value)
                }
              />

            </div>

            {/* Buttons */}

            <div className="d-flex gap-2">

              <button
                className="btn btn-warning text-white"
                onClick={handleAddExpense}
                disabled={loading}
              >
                {loading
                  ? "Saving..."
                  : "Add Expense"}
              </button>

              <button
                className="btn btn-outline-secondary"
                onClick={() => {
                  setShowExpense(false);
                  setExpenseTitle("");
                  setExpenseCategory("");
                  setExpenseAmount("");
                }}
                disabled={loading}
              >
                Cancel
              </button>

            </div>

          </div>
        )}

        {/* ========================================
            QUICK ACTION BUTTONS
        ======================================== */}

        <div className="row g-3">

          {/* ADD MONEY */}

          <div className="col-md-3">

            <button
              className="btn btn-success w-100 py-3"
              onClick={() => {
                setShowAddMoney(!showAddMoney);
                setShowExpense(false);
                setShowSendMoney(false);
              }}
            >

              <i className="bi bi-plus-circle me-2"></i>

              Add Money

            </button>

          </div>

          {/* SEND MONEY */}

          <div className="col-md-3">

            <button
              className="btn btn-primary w-100 py-3"
              onClick={() => {
                setShowSendMoney(!showSendMoney);
                setShowAddMoney(false);
                setShowExpense(false);
              }}
            >

              <i className="bi bi-send me-2"></i>

              Send Money

            </button>

          </div>

          {/* ADD EXPENSE */}

          <div className="col-md-3">

            <button
              className="btn btn-warning text-white w-100 py-3"
              onClick={() => {
                setShowExpense(!showExpense);
                setShowAddMoney(false);
                setShowSendMoney(false);
              }}
            >

              <i className="bi bi-receipt me-2"></i>

              Add Expense

            </button>

          </div>

          {/* SAVINGS */}

          <div className="col-md-3">

            <button
              className="btn btn-info text-white w-100 py-3"
              onClick={handleSavingsClick}
            >

              <i className="bi bi-piggy-bank me-2"></i>

              Savings

            </button>

          </div>

        </div>

      </div>
    </div>
  );
}

export default QuickActions;