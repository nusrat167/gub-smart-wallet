import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  where,
  writeBatch,
} from "firebase/firestore";

import { auth, db } from "../../firebase/firebase";

function Savings() {
  const [goals, setGoals] = useState([]);

  const [showGoalForm, setShowGoalForm] = useState(false);

  const [goalName, setGoalName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");

  const [activeGoalId, setActiveGoalId] = useState(null);
  const [savingAmount, setSavingAmount] = useState("");

  const [loading, setLoading] = useState(false);

  // ==========================================
  // LOAD SAVINGS GOALS
  // ==========================================

  useEffect(() => {
    let unsubscribeSavings = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (!user) {
        setGoals([]);
        return;
      }

      const savingsQuery = query(
        collection(db, "savings"),
        where("userId", "==", user.uid)
      );

      unsubscribeSavings = onSnapshot(
        savingsQuery,
        (snapshot) => {
          const savingsData = snapshot.docs.map((savingDoc) => ({
            id: savingDoc.id,
            ...savingDoc.data(),
          }));

          setGoals(savingsData);
        },
        (error) => {
          console.error("Savings loading error:", error);
        }
      );
    });

    return () => {
      unsubscribeAuth();

      if (unsubscribeSavings) {
        unsubscribeSavings();
      }
    };
  }, []);

  // ==========================================
  // CREATE NEW SAVINGS GOAL
  // ==========================================

  const handleCreateGoal = async () => {
    const user = auth.currentUser;
    const target = Number(targetAmount);

    if (!user) {
      alert("Please login first.");
      return;
    }

    if (!goalName.trim()) {
      alert("Please enter a goal name.");
      return;
    }

    if (!target || target <= 0) {
      alert("Please enter a valid target amount.");
      return;
    }

    try {
      setLoading(true);

      await addDoc(collection(db, "savings"), {
        userId: user.uid,
        goal: goalName.trim(),
        targetAmount: target,
        savedAmount: 0,
        createdAt: serverTimestamp(),
      });

      setGoalName("");
      setTargetAmount("");
      setShowGoalForm(false);

      alert("Savings goal created successfully!");
    } catch (error) {
      console.error("Create goal error:", error);
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // ADD MONEY TO SAVINGS GOAL
  // ==========================================

  const handleAddSavings = async (goal) => {
    const user = auth.currentUser;
    const amount = Number(savingAmount);

    if (!user) {
      alert("Please login first.");
      return;
    }

    if (!amount || amount <= 0) {
      alert("Please enter a valid amount.");
      return;
    }

    const saved = Number(goal.savedAmount) || 0;
    const target = Number(goal.targetAmount) || 0;

    if (saved + amount > target) {
      const remaining = target - saved;

      alert(
        `You can save maximum ৳${remaining.toFixed(2)} more for this goal.`
      );

      return;
    }

    try {
      setLoading(true);

      // Get user wallet
      const userRef = doc(db, "users", user.uid);
      const userSnapshot = await getDoc(userRef);

      if (!userSnapshot.exists()) {
        alert("User data not found.");
        return;
      }

      const userData = userSnapshot.data();

      const currentBalance =
        Number(userData.walletBalance) || 0;

      // Check wallet balance
      if (amount > currentBalance) {
        alert(
          `Insufficient wallet balance.\nAvailable balance: ৳${currentBalance.toFixed(
            2
          )}`
        );

        return;
      }

      const newBalance = currentBalance - amount;
      const newSavedAmount = saved + amount;

      const savingsRef = doc(db, "savings", goal.id);

      const transactionRef = doc(
        collection(db, "transactions")
      );

      const batch = writeBatch(db);

      // Deduct money from wallet
      batch.update(userRef, {
        walletBalance: newBalance,
      });

      // Update savings
      batch.update(savingsRef, {
        savedAmount: newSavedAmount,
      });

      // Create transaction
      batch.set(transactionRef, {
        userId: user.uid,
        type: "debit",
        amount: amount,
        description: `Savings: ${goal.goal}`,
        createdAt: serverTimestamp(),
      });

      await batch.commit();

      setSavingAmount("");
      setActiveGoalId(null);

      alert(
        `৳${amount.toFixed(2)} added to "${goal.goal}" successfully!`
      );
    } catch (error) {
      console.error("Add savings error:", error);
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // CALCULATE PROGRESS
  // ==========================================

  const calculateProgress = (saved, target) => {
    if (!target || target <= 0) {
      return 0;
    }

    return Math.min((saved / target) * 100, 100);
  };

  // ==========================================
  // UI
  // ==========================================

  return (
    <div className="card shadow-sm mt-4">
      <div className="card-body">

        {/* HEADER */}

        <div className="d-flex justify-content-between align-items-center mb-4">

          <div>
            <h4 className="mb-1">
              <i className="bi bi-piggy-bank me-2"></i>
              Savings Management
            </h4>

            <p className="text-muted mb-0">
              Create and manage your savings goals.
            </p>
          </div>

          <button
            className="btn btn-primary"
            onClick={() =>
              setShowGoalForm(!showGoalForm)
            }
          >
            <i className="bi bi-plus-circle me-2"></i>
            Create Goal
          </button>

        </div>


        {/* CREATE GOAL FORM */}

        {showGoalForm && (
          <div className="card bg-light border-0 p-4 mb-4">

            <h5 className="fw-bold mb-3">
              Create New Savings Goal
            </h5>

            <div className="row g-3">

              <div className="col-md-6">

                <label className="form-label">
                  Goal Name
                </label>

                <input
                  type="text"
                  className="form-control"
                  placeholder="Example: New Laptop"
                  value={goalName}
                  onChange={(e) =>
                    setGoalName(e.target.value)
                  }
                />

              </div>


              <div className="col-md-6">

                <label className="form-label">
                  Target Amount
                </label>

                <div className="input-group">

                  <span className="input-group-text">
                    ৳
                  </span>

                  <input
                    type="number"
                    min="1"
                    className="form-control"
                    placeholder="50000"
                    value={targetAmount}
                    onChange={(e) =>
                      setTargetAmount(e.target.value)
                    }
                  />

                </div>

              </div>

            </div>


            <div className="mt-3 d-flex gap-2">

              <button
                className="btn btn-primary"
                onClick={handleCreateGoal}
                disabled={loading}
              >
                {loading
                  ? "Creating..."
                  : "Create Goal"}
              </button>

              <button
                className="btn btn-outline-secondary"
                onClick={() => {
                  setShowGoalForm(false);
                  setGoalName("");
                  setTargetAmount("");
                }}
              >
                Cancel
              </button>

            </div>

          </div>
        )}


        {/* SAVINGS GOALS */}

        {goals.length === 0 ? (

          <div className="text-center text-muted py-5">

            <i
              className="bi bi-piggy-bank"
              style={{ fontSize: "3rem" }}
            ></i>

            <h5 className="mt-3">
              No Savings Goals Yet
            </h5>

            <p>
              Create your first savings goal to start
              tracking your financial progress.
            </p>

          </div>

        ) : (

          <div className="row g-4">

            {goals.map((goal) => {

              const saved =
                Number(goal.savedAmount) || 0;

              const target =
                Number(goal.targetAmount) || 0;

              const progress =
                calculateProgress(saved, target);

              const remaining =
                Math.max(target - saved, 0);

              const completed =
                progress >= 100;

              return (
                <div
                  className="col-md-6"
                  key={goal.id}
                >

                  <div className="card h-100 border">

                    <div className="card-body">

                      {/* GOAL TITLE */}

                      <div className="d-flex justify-content-between align-items-start">

                        <div>

                          <h5 className="fw-bold mb-1">
                            {goal.goal}
                          </h5>

                          <small className="text-muted">
                            Target: ৳
                            {target.toFixed(2)}
                          </small>

                        </div>

                        <span
                          className={`badge ${
                            completed
                              ? "bg-success"
                              : "bg-primary"
                          }`}
                        >
                          {completed
                            ? "Completed"
                            : `${progress.toFixed(0)}%`}
                        </span>

                      </div>


                      {/* SAVED AMOUNT */}

                      <div className="mt-4">

                        <div className="d-flex justify-content-between mb-2">

                          <span className="text-muted">
                            Saved
                          </span>

                          <strong>
                            ৳{saved.toFixed(2)}
                          </strong>

                        </div>


                        {/* PROGRESS BAR */}

                        <div
                          className="progress"
                          style={{ height: "10px" }}
                        >

                          <div
                            className={`progress-bar ${
                              completed
                                ? "bg-success"
                                : ""
                            }`}
                            style={{
                              width: `${progress}%`,
                            }}
                          ></div>

                        </div>


                        <div className="d-flex justify-content-between mt-2">

                          <small className="text-muted">
                            {progress.toFixed(0)}%
                            completed
                          </small>

                          <small className="text-muted">
                            ৳{remaining.toFixed(2)}
                            {" "}remaining
                          </small>

                        </div>

                      </div>


                      {/* ADD SAVINGS */}

                      {!completed && (

                        <div className="mt-4">

                          {activeGoalId === goal.id ? (

                            <div className="input-group">

                              <span className="input-group-text">
                                ৳
                              </span>

                              <input
                                type="number"
                                min="1"
                                className="form-control"
                                placeholder="Amount"
                                value={savingAmount}
                                onChange={(e) =>
                                  setSavingAmount(
                                    e.target.value
                                  )
                                }
                              />

                              <button
                                className="btn btn-success"
                                onClick={() =>
                                  handleAddSavings(
                                    goal
                                  )
                                }
                                disabled={loading}
                              >
                                {loading
                                  ? "Saving..."
                                  : "Save"}
                              </button>

                              <button
                                className="btn btn-outline-secondary"
                                onClick={() => {
                                  setActiveGoalId(
                                    null
                                  );
                                  setSavingAmount("");
                                }}
                              >
                                Cancel
                              </button>

                            </div>

                          ) : (

                            <button
                              className="btn btn-info text-white w-100"
                              onClick={() => {
                                setActiveGoalId(
                                  goal.id
                                );
                                setSavingAmount("");
                              }}
                            >
                              <i className="bi bi-plus-circle me-2"></i>
                              Add Savings
                            </button>

                          )}

                        </div>

                      )}

                    </div>

                  </div>

                </div>
              );
            })}

          </div>

        )}

      </div>
    </div>
  );
}

export default Savings;