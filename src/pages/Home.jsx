import Navbar from "../components/layout/Navbar";

function Home() {
  return (
    <>
   

      <div className="container py-5 text-center">

        <h1 className="display-3 fw-bold text-primary">
          Welcome to GUB Smart Wallet
        </h1>

        <p className="lead mt-3">
          Smart Student Financial Management System
        </p>

        <button className="btn btn-primary btn-lg mt-3">
          Get Started
        </button>

      </div>
    </>
  );
}

export default Home;