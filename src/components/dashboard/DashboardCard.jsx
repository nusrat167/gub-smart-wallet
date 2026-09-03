function DashboardCard({ title, value, color, icon }) {
  return (
    <div className="col-md-6 col-lg-3 mb-4">

      <div className="card border-0 shadow-sm h-100 rounded-4">

        <div className="card-body">

          <div className="d-flex justify-content-between align-items-center">

            <div>

              <h6 className="text-muted mb-2">
                {title}
              </h6>

              <h2 className={`fw-bold text-${color}`}>
                {value}
              </h2>

            </div>

            <div
              className={`bg-${color} bg-opacity-10 rounded-circle d-flex justify-content-center align-items-center`}
              style={{
                width: "60px",
                height: "60px",
              }}
            >
              <i
                className={`bi ${icon} text-${color}`}
                style={{ fontSize: "1.8rem" }}
              ></i>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}

export default DashboardCard;