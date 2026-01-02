import Swal from "sweetalert2";
import axiosInstance from "../../context/axiosInstance";
import { useNavigate } from "react-router-dom";

const registerVehicle = async (formData) => {
  const navigate = useNavigate();
  const dataToSend = new FormData();
  for (const [key, value] of Object.entries(formData)) {
    dataToSend.append(key, value);
  }

  try {
    const response = await axiosInstance.post("/matatus/register", dataToSend);

    if (response.status === 200) {
      Swal.fire({
        icon: "success",
        title: "Registration Successful",
        text: "The vehicle has been successfully registered.",
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
      });
      navigate("/users/vehicles");
    } else {
      const responseData = await response.data;
      Swal.fire({
        icon: "error",
        title: "Registration Failed",
        text:
          responseData.statusText ||
          "There was an error registering the vehicle.",
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
      });
    }
  } catch (error) {
    console.error("Error:", error);
    Swal.fire({
      icon: "error",
      title: "Registration Failed",
      text: "There was an error registering the vehicle.",
      toast: true,
      position: "top-end",
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true,
    });
  }
};

const getRoutes = async () => {
  try {
    const response = await axiosInstance.get("/matatus/routes");
    return response.data;
  } catch (error) {
    console.error("Error fetching routes:", error);
    return [];
  }
};

const getUserDetails = async () => {
  try {
    const response = await axiosInstance.get("/users/userDetails");
    return response.data;
  } catch (error) {
    console.error("Error fetching user details:", error);
    return null;
  }
}

export { 
    registerVehicle, 
    getRoutes,
    getUserDetails 
};
