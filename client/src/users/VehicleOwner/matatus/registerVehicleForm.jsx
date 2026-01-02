import React, { useEffect, useState } from "react";
import { registerVehicle, getRoutes } from "../../components/fleet";
import "../../../pages/auth/Register.css";
import matisLogo from "../../../assets/moline-logo.png";

const vehicleTypes = ["Toyota Hiace", "Nissan van"];
const seatingCapacities = [14, 15, 25, 33, 34];
const yearsOfMake = Array.from(
  { length: 30 },
  (_, i) => new Date().getFullYear() - i
);

function VehicleRegistrationForm() {
  const [routes, setRoutes] = useState([]); // State for available routes
  const [formData, setFormData] = useState({
    numberPlate: "",
    vehicleLogbook: null,
    vehicleType: "",
    seatingCapacity: "",
    chassisNumber: "",
    yearOfMake: "",
    route_id: "",
  });

  useEffect(() => {
    async function fetchRoutes() {
      const availableRoutes = await getRoutes();
      setRoutes(availableRoutes);
    }
    fetchRoutes();
  }, []);

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    setFormData((prevFormData) => ({
      ...prevFormData,
      [name]: files ? files[0] : value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    await registerVehicle(formData);
  };

  return (
    <div className="content-wrapper">
      <div className="row">
        <section className="text-center">
          <div
            className="p-5 bg-image"
            style={{ backgroundImage: `url(${matisLogo})`, height: 300 }}
          />
          <div className="signup-card-container">
            <div
              className="card mx-4 mx-md-5 signup-card shadow-5-strong bg-body-tertiary"
              style={{ marginTop: "-100px", backdropFilter: "blur(30px)" }}
            >
              <div className="card-body py-5 px-md-5">
                <div className="row d-flex justify-content-center">
                  <div className="col-lg-30">
                    <h2 className="fw-bold mb-5">Register Vehicle</h2>
                    <form onSubmit={handleSubmit} encType="multipart/form-data">
                      <div className="row">
                        <div className="col-md-6 mb-4">
                          <div className="form-outline custom-input">
                            <input
                              type="text"
                              id="numberPlate"
                              name="numberPlate"
                              className="form-control custom-input"
                              value={formData.numberPlate}
                              onChange={handleChange}
                              required
                            />
                            <label className="form-label" htmlFor="numberPlate">
                              Number Plate
                            </label>
                          </div>
                        </div>
                        <div className="col-md-6 mb-4">
                          <div className="form-outline custom-input">
                            <input
                              type="file"
                              id="vehicleLogbook"
                              name="vehicleLogbook"
                              className="form-control custom-input"
                              onChange={handleChange}
                              required
                            />
                            <label
                              className="form-label"
                              htmlFor="vehicleLogbook"
                            >
                              Vehicle Logbook
                            </label>
                          </div>
                        </div>
                      </div>
                      <div className="row">
                        <div className="col-md-6 mb-4">
                          <div className="form-outline custom-input">
                            <select
                              name="vehicleType"
                              id="vehicleType"
                              className="form-control custom-input"
                              value={formData.vehicleType}
                              onChange={handleChange}
                              required
                            >
                              <option value="">Select Vehicle Type</option>
                              {vehicleTypes.map((type, index) => (
                                <option key={index} value={type}>
                                  {type}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <div className="col-md-6 mb-4">
                          <div className="form-outline custom-input">
                            <select
                              name="seatingCapacity"
                              id="seatingCapacity"
                              className="form-control custom-input"
                              value={formData.seatingCapacity}
                              onChange={handleChange}
                              required
                            >
                              <option value="">Select Seating Capacity</option>
                              {seatingCapacities.map((capacity, index) => (
                                <option key={index} value={capacity}>
                                  {capacity}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                      <div className="row">
                        <div className="col-md-6 mb-4">
                          <div className="form-outline custom-input">
                            <input
                              type="text"
                              id="chassisNumber"
                              name="chassisNumber"
                              className="form-control custom-input"
                              value={formData.chassisNumber}
                              onChange={handleChange}
                              required
                            />
                            <label
                              className="form-label"
                              htmlFor="chassisNumber"
                            >
                              Chassis Number
                            </label>
                          </div>
                        </div>
                        <div className="col-md-6 mb-4">
                          <div className="form-outline custom-input">
                            <select
                              name="yearOfMake"
                              id="yearOfMake"
                              className="form-control custom-input"
                              value={formData.yearOfMake}
                              onChange={handleChange}
                              required
                            >
                              <option value="">Select Year of Make</option>
                              {yearsOfMake.map((year, index) => (
                                <option key={index} value={year}>
                                  {year}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                      <div className="row">
                        <div className="col-md-6 mb-4">
                          <div className="form-outline custom-input">
                            <select
                              name="route_id"
                              id="route_id"
                              className="form-control custom-input"
                              value={formData.route_id}
                              onChange={handleChange}
                              required
                            >
                              <option value="">Select a Route</option>
                              {routes.map((route) => (
                                <option
                                  key={route.route_id}
                                  value={route.route_id}
                                >
                                  {route.route_name} ({route.start_location} -{" "}
                                  {route.end_location})
                                </option>
                              ))}
                            </select>
                            <label className="form-label" htmlFor="route_id">
                              Select Route
                            </label>
                          </div>
                        </div>
                      </div>
                      <button
                        type="submit"
                        className="btn btn-primary btn-block mb-2"
                      >
                        Submit
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default VehicleRegistrationForm;
