import { BrowserRouter, Routes, Route } from "react-router-dom";

import Navbar from "../components/layout/Navbar";

import Home from "../pages/Home";

import Login from "../pages/auth/Login";
import Register from "../pages/auth/Register";

import Dashboard from "../pages/student/Dashboard";
import Wallet from "../pages/student/Wallet";
import Expense from "../pages/student/Expense";
import Payment from "../pages/student/Payment";
import Profile from "../pages/student/Profile";
import TransactionHistory from "../pages/student/TransactionHistory";

import ParentDashboard from "../pages/parent/ParentDashboard";

import AdminDashboard from "../pages/admin/AdminDashboard";
import AdminLogin from "../pages/admin/AdminLogin";

function AppRoutes() {
  return (
    <BrowserRouter>

      {}
      <Navbar />

      <Routes>

        {/* ==============================
            HOME
        ============================== */}

        <Route
          path="/"
          element={<Home />}
        />


        {/* ==============================
            AUTH
        ============================== */}

        <Route
          path="/login"
          element={<Login />}
        />

        <Route
          path="/register"
          element={<Register />}
        />


        {/* ==============================
            STUDENT
        ============================== */}

        <Route
          path="/dashboard"
          element={<Dashboard />}
        />

        <Route
          path="/wallet"
          element={<Wallet />}
        />

        <Route
          path="/expense"
          element={<Expense />}
        />

        <Route
          path="/payment"
          element={<Payment />}
        />

        <Route
          path="/transactions"
          element={<TransactionHistory />}
        />

        <Route
          path="/profile"
          element={<Profile />}
        />


        {/* ==============================
            PARENT
        ============================== */}

        <Route
          path="/parent-dashboard"
          element={<ParentDashboard />}
        />


        {/* ==============================
            ADMIN
        ============================== */}

        <Route
          path="/admin-dashboard"
          element={<AdminDashboard />}
        />

        <Route
          path="/admin-login"
          element={<AdminLogin />}
        />

      </Routes>

    </BrowserRouter>
  );
}

export default AppRoutes;