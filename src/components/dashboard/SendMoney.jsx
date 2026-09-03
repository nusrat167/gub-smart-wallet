import { useEffect, useState } from "react";
import { auth, db } from "../../firebase/firebase";

import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  writeBatch,
  serverTimestamp,
  increment,
} from "firebase/firestore";

function SendMoney() {
  const [student, setStudent] = useState(null);

  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");

  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);

  const [balance, setBalance] = useState(0);

  // ============================================
  // GET CURRENT USER BALANCE
  // ============================================

  useEffect(() => {
    const currentUser = auth.currentUser;

    if (!currentUser) return;

    setStudent(currentUser);

    const loadBalance = async () => {
      try {
        const userRef = doc(
          db,
          "users",
          currentUser.uid
        );

        const snapshot = await getDoc(userRef);

        if (snapshot.exists()) {
          const data = snapshot.data();

          setBalance(
            Number(data.walletBalance || 0)
          );
        }
      } catch (error) {
        console.error(
          "Balance Error:",
          error
        );
      }
    };

    loadBalance();
  }, []);

  // ============================================
  // FIND RECIPIENT
  // ============================================

  const findRecipient = async () => {
    if (!recipient.trim()) {
      alert(
        "Enter student's email or student ID."
      );
      return;
    }

    setSearching(true);

    try {
      const value = recipient.trim();

      const directoryRef = collection(
        db,
        "studentDirectory"
      );

      // Search by email
      const emailQuery = query(
        directoryRef,
        where("email", "==", value)
      );

      const emailSnapshot =
        await getDocs(emailQuery);

      if (!emailSnapshot.empty) {
        const data =
          emailSnapshot.docs[0].data();

        if (
          data.userId === auth.currentUser.uid
        ) {
          alert(
            "You cannot send money to yourself."
          );
          setSearching(false);
          return;
        }

        setRecipientUser(data);
        setSearching(false);
        return;
      }

      // Search by Student ID
      const studentIdQuery = query(
        directoryRef,
        where("studentId", "==", value)
      );

      const studentIdSnapshot =
        await getDocs(studentIdQuery);

      if (!studentIdSnapshot.empty) {
        const data =
          studentIdSnapshot.docs[0].data();

        if (
          data.userId === auth.currentUser.uid
        ) {
          alert(
            "You cannot send money to yourself."
          );
          setSearching(false);
          return;
        }

        setRecipientUser(data);
        setSearching(false);
        return;
      }

      alert("Student not found.");

    } catch (error) {
      console.error(
        "Recipient Search Error:",
        error
      );

      alert(error.message);
    }

    setSearching(false);
  };

  // ============================================
  // RECIPIENT STATE
  // ============================================

  const [recipientUser, setRecipientUser] =
    useState(null);

  // ============================================
  // SEND MONEY
  // ============================================

  const handleSendMoney = async () => {
    const money = Number(amount);

    if (!student) {
      alert("Please login first.");
      return;
    }

    if (!recipientUser) {
      alert("Please find a recipient first.");
      return;
    }

    if (!money || money <= 0) {
      alert("Enter a valid amount.");
      return;
    }

    if (money > balance) {
      alert(
        `Insufficient balance.\n\nYour balance is ৳${balance.toFixed(
          2
        )}.`
      );
      return;
    }

    if (
      recipientUser.userId ===
      student.uid
    ) {
      alert(
        "You cannot send money to yourself."
      );
      return;
    }

    setLoading(true);

    try {
      // ========================================
      // REFERENCES
      // ========================================

      const senderRef = doc(
        db,
        "users",
        student.uid
      );

      const receiverRef = doc(
        db,
        "users",
        recipientUser.userId
      );

      const transferRef = doc(
        collection(db, "transfers")
      );

      const senderTransactionRef = doc(
        collection(db, "transactions")
      );

      const receiverTransactionRef = doc(
        collection(db, "transactions")
      );

      // ========================================
      // BATCH
      // ========================================

      const batch = writeBatch(db);

      // ========================================
      // CREATE TRANSFER RECORD
      // ========================================

      batch.set(transferRef, {
        senderId: student.uid,
        recipientId: recipientUser.userId,
        amount: money,
        description: `Money sent to ${
          recipientUser.name || "Student"
        }`,
        createdAt: serverTimestamp(),
      });

      // ========================================
      // SENDER WALLET
      // ========================================

      batch.update(senderRef, {
        walletBalance: increment(-money),
        lastTransferId: transferRef.id,
      });

      // ========================================
      // RECEIVER WALLET
      // ========================================

      batch.update(receiverRef, {
        walletBalance: increment(money),
        lastTransferId: transferRef.id,
      });

      // ========================================
      // SENDER TRANSACTION
      // ========================================

      batch.set(senderTransactionRef, {
        userId: student.uid,
        type: "transfer_out",
        amount: money,
        description: `Sent to ${
          recipientUser.name || "Student"
        }`,
        transferId: transferRef.id,
        recipientId: recipientUser.userId,
        createdAt: serverTimestamp(),
      });

      // ========================================
      // RECEIVER TRANSACTION
      // ========================================

      batch.set(receiverTransactionRef, {
        userId: recipientUser.userId,
        type: "transfer_in",
        amount: money,
        description: `Received from ${
          student.displayName || "Student"
        }`,
        transferId: transferRef.id,
        senderId: student.uid,
        createdAt: serverTimestamp(),
      });

      // ========================================
      // COMMIT
      // ========================================

      await batch.commit();

      alert(
        `৳${money.toFixed(
          2
        )} sent successfully to ${
          recipientUser.name
        }!`
      );

      // Reset
      setAmount("");
      setRecipient("");
      setRecipientUser(null);

      setBalance(
        (prev) => prev - money
      );

    } catch (error) {
      console.error(
        "Send Money Error:",
        error
      );

      alert(
        `Failed to send money.\n\n${error.message}`
      );
    }

    setLoading(false);
  };

  // ============================================
  // UI
  // ============================================

  return (
    <div className="card border-0 shadow-sm rounded-4">

      <div className="card-body p-4">

        <div className="d-flex justify-content-between align-items-center mb-4">

          <div>
            <h4 className="fw-bold mb-1">
              Send Money
            </h4>

            <small className="text-muted">
              Transfer money to another student
            </small>
          </div>

          <div className="text-end">

            <small className="text-muted">
              Available Balance
            </small>

            <h5 className="text-success fw-bold mb-0">
              ৳ {balance.toFixed(2)}
            </h5>

          </div>

        </div>

        {/* ====================================
            RECIPIENT
        ==================================== */}

        <div className="mb-3">

          <label className="form-label fw-semibold">
            Student Email / Student ID
          </label>

          <div className="input-group">

            <input
              type="text"
              className="form-control"
              placeholder="Enter email or student ID"
              value={recipient}
              onChange={(e) => {
                setRecipient(e.target.value);
                setRecipientUser(null);
              }}
            />

            <button
              className="btn btn-outline-primary"
              onClick={findRecipient}
              disabled={searching}
            >
              {searching ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2"></span>
                  Searching
                </>
              ) : (
                <>
                  <i className="bi bi-search me-1"></i>
                  Find
                </>
              )}
            </button>

          </div>

        </div>

        {/* ====================================
            RECIPIENT CARD
        ==================================== */}

        {recipientUser && (

          <div className="alert alert-success">

            <div className="d-flex align-items-center">

              <div
                className="bg-success text-white rounded-circle d-flex align-items-center justify-content-center me-3"
                style={{
                  width: "45px",
                  height: "45px",
                }}
              >
                <i className="bi bi-person-fill"></i>
              </div>

              <div>

                <strong>
                  {recipientUser.name}
                </strong>

                <br />

                <small>
                  {recipientUser.studentId ||
                    recipientUser.email}
                </small>

              </div>

            </div>

          </div>

        )}

        {/* ====================================
            AMOUNT
        ==================================== */}

        <div className="mb-4">

          <label className="form-label fw-semibold">
            Amount
          </label>

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

          </div>

        </div>

        {/* ====================================
            SEND BUTTON
        ==================================== */}

        <button
          className="btn btn-primary w-100 py-3"
          onClick={handleSendMoney}
          disabled={
            loading || !recipientUser
          }
        >

          {loading ? (
            <>
              <span className="spinner-border spinner-border-sm me-2"></span>
              Sending...
            </>
          ) : (
            <>
              <i className="bi bi-send me-2"></i>
              Send Money
            </>
          )}

        </button>

      </div>

    </div>
  );
}

export default SendMoney;