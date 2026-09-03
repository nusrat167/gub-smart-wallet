const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

setGlobalOptions({
  maxInstances: 10,
});

initializeApp();

const db = getFirestore();

exports.sendMoney = onCall(async (request) => {
  // Check login
  if (!request.auth) {
    throw new HttpsError(
      "unauthenticated",
      "Please login first."
    );
  }

  const senderId = request.auth.uid;

  // Get input data
  const recipient =
    typeof request.data?.recipient === "string"
      ? request.data.recipient.trim()
      : "";

  const amount = Number(request.data?.amount);

  const description =
    typeof request.data?.description === "string"
      ? request.data.description.trim()
      : "";

  // Validate recipient
  if (!recipient) {
    throw new HttpsError(
      "invalid-argument",
      "Recipient Student ID or Email is required."
    );
  }

  // Validate amount
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new HttpsError(
      "invalid-argument",
      "Please enter a valid amount."
    );
  }

  // Find sender
  const senderRef = db
    .collection("users")
    .doc(senderId);

  const senderSnapshot = await senderRef.get();

  if (!senderSnapshot.exists) {
    throw new HttpsError(
      "not-found",
      "Sender profile not found."
    );
  }

  const senderData = senderSnapshot.data();

  // Only students can send money
  if (senderData.role !== "student") {
    throw new HttpsError(
      "permission-denied",
      "Only students can send money."
    );
  }

  // Find recipient by email
  const usersRef = db.collection("users");

  const emailSnapshot = await usersRef
    .where("email", "==", recipient)
    .limit(1)
    .get();

  let recipientSnapshot = null;

  if (!emailSnapshot.empty) {
    recipientSnapshot = emailSnapshot.docs[0];
  } else {
    // Find recipient by Student ID
    const studentIdSnapshot = await usersRef
      .where("studentId", "==", recipient)
      .limit(1)
      .get();

    if (!studentIdSnapshot.empty) {
      recipientSnapshot = studentIdSnapshot.docs[0];
    }
  }

  // Recipient not found
  if (!recipientSnapshot) {
    throw new HttpsError(
      "not-found",
      "Recipient not found. Check Student ID or Email."
    );
  }

  const recipientId = recipientSnapshot.id;
  const recipientData = recipientSnapshot.data();

  // Cannot send to yourself
  if (recipientId === senderId) {
    throw new HttpsError(
      "invalid-argument",
      "You cannot send money to yourself."
    );
  }

  // Only student-to-student transfer
  if (recipientData.role !== "student") {
    throw new HttpsError(
      "failed-precondition",
      "Money can only be sent to another student."
    );
  }

  const recipientRef = db
    .collection("users")
    .doc(recipientId);

  // Transaction documents
  const senderTransactionRef = db
    .collection("transactions")
    .doc();

  const recipientTransactionRef = db
    .collection("transactions")
    .doc();

  const transferId =
    `${senderId}_${recipientId}_${Date.now()}`;

  // Atomic Firestore transaction
  await db.runTransaction(async (transaction) => {
    const senderDoc = await transaction.get(senderRef);
    const recipientDoc = await transaction.get(recipientRef);

    if (!senderDoc.exists) {
      throw new HttpsError(
        "not-found",
        "Sender profile not found."
      );
    }

    if (!recipientDoc.exists) {
      throw new HttpsError(
        "not-found",
        "Recipient profile not found."
      );
    }

    const currentSenderData = senderDoc.data();
    const currentRecipientData = recipientDoc.data();

    const senderBalance =
      Number(currentSenderData.walletBalance) || 0;

    const recipientBalance =
      Number(currentRecipientData.walletBalance) || 0;

    // Check latest balance
    if (amount > senderBalance) {
      throw new HttpsError(
        "failed-precondition",
        `Insufficient balance. Available balance: ৳${senderBalance.toFixed(
          2
        )}`
      );
    }

    const newSenderBalance =
      senderBalance - amount;

    const newRecipientBalance =
      recipientBalance + amount;

    // Update sender wallet
    transaction.update(senderRef, {
      walletBalance: newSenderBalance,
    });

    // Update recipient wallet
    transaction.update(recipientRef, {
      walletBalance: newRecipientBalance,
    });

    // Sender transaction
    transaction.set(senderTransactionRef, {
      userId: senderId,
      type: "transfer_out",
      amount: amount,
      description:
        description ||
        `Sent money to ${
          currentRecipientData.name || "Student"
        }`,
      transferId: transferId,
      createdAt: FieldValue.serverTimestamp(),
    });

    // Recipient transaction
    transaction.set(recipientTransactionRef, {
      userId: recipientId,
      type: "transfer_in",
      amount: amount,
      description:
        description ||
        `Received money from ${
          currentSenderData.name || "Student"
        }`,
      transferId: transferId,
      createdAt: FieldValue.serverTimestamp(),
    });
  });

  return {
    success: true,
    amount: amount,
    recipientName:
      recipientData.name || "Student",
    transferId: transferId,
  };
});