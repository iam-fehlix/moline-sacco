import React from "react";
import withdrawalRequestPDF from "../assets/MOLINE_withdrawal_request.pdf";

const ExitSacco = () => {
  return (
    <div>
      <section className="text-center">
        <div className="signup-card-container">
          <div
            className="card mx-4 mx-md-5 signup-card shadow-5-strong bg-body-tertiary"
            style={{ marginTop: "50px", backdropFilter: "blur(30px)" }}
          >
            <div className="card-body py-5 px-md-5">
              <div className="row d-flex justify-content-center">
                <div className="col-lg-8">
                  <h1 className="text-center">Exit SACCO</h1>
                  <p className="text-center">
                    Please fill out the form below to request withdrawal from the SACCO.
                  </p>
                  <form>
                    <div className="form-group">
                      <label htmlFor="fullName">Full Name</label>
                      <input
                        type="text"
                        className="form-control"
                        id="fullName"
                        placeholder="Enter your full name"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="email_address">email address</label>
                      <input
                        type="text"
                        className="form-control"
                        id="email_address"
                        placeholder="Enter your email address"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="reason">Reason for Withdrawal</label>
                      <textarea
                        className="form-control"
                        id="reason"
                        rows="3"
                        placeholder="Enter your reason for withdrawal"
                        required
                      ></textarea>
                    </div>
                    <button type="submit" className="btn btn-primary w-100">
                      Submit
                    </button>
                  </form>
                  <div className="mt-4 text-center">
                    <p>
                      If you prefer, you can download the withdrawal request form, fill it
                      out manually, and submit it to the office.
                    </p>
                    <a href={withdrawalRequestPDF} download className="btn btn-secondary">
                      Download Withdrawal Request Form
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ExitSacco;
