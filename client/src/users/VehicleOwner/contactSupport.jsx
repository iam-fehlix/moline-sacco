import React, { useState } from 'react';
import Swal from 'sweetalert2';
import axiosInstance from '../../context/axiosInstance';
import 'bootstrap/dist/css/bootstrap.min.css';
import './ContactSupport.css'; // Import your CSS file for styling

function ContactSupport({ show, onClose }) {
  const [formData, setFormData] = useState({
    subject: '',
    category: '',
    priority: '',
    message: '',
    attachment: null,
  });

  const categories = [
    'Registration Problem',
    'Payment Issue',
    'Loan Inquiry',
    'Vehicle Registration Issue',
    'Technical Problem',
    'Other',
  ];

  const priorities = ['Low', 'Medium', 'High'];

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: files ? files[0] : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.subject || !formData.category || !formData.priority || !formData.message) {
      Swal.fire({
        icon: 'error',
        title: 'Missing Fields',
        text: 'Please fill in all required fields.',
      });
      return;
    }

    const data = new FormData();
    for (const [key, value] of Object.entries(formData)) {
      data.append(key, value);
    }

    try {
      const response = await axiosInstance.post('/users/support/tickets', data);
      if (response.status === 200) {
        Swal.fire({
          icon: 'success',
          title: 'Support Request Sent',
          text: 'Our team will get back to you shortly.',
        });
        setFormData({
          subject: '',
          category: '',
          priority: '',
          message: '',
          attachment: null,
        });
        onClose(); // Close the modal after successful submission
      }
    } catch (error) {
      console.error('Error sending support request:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'There was an issue submitting your request. Please try again later.',
      });
    }
  };

  if (!show) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h5 className="modal-title">Contact Support</h5>
          <button type="button" className="btn-close" onClick={onClose}></button>
        </div>
        <div className="modal-body">
          <form onSubmit={handleSubmit} encType="multipart/form-data">
            <div className="form-outline mb-4">
              <input
                type="text"
                className="form-control"
                placeholder="Subject"
                name="subject"
                value={formData.subject}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-outline mb-4">
              <select
                className="form-control"
                name="category"
                value={formData.category}
                onChange={handleChange}
                required
              >
                <option value="">Select Category</option>
                {categories.map((cat, index) => (
                  <option key={index} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-outline mb-4">
              <select
                className="form-control"
                name="priority"
                value={formData.priority}
                onChange={handleChange}
                required
              >
                <option value="">Select Priority</option>
                {priorities.map((pri, index) => (
                  <option key={index} value={pri}>
                    {pri}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-outline mb-4">
              <textarea
                className="form-control"
                name="message"
                placeholder="Describe your issue here..."
                value={formData.message}
                onChange={handleChange}
                rows="5"
                required
              />
            </div>
            <div className="form-outline mb-4">
              <input
                type="file"
                name="attachment"
                onChange={handleChange}
                className="form-control"
                accept=".jpg,.jpeg,.png,.pdf"
              />
              <small className="text-muted">Optional: Upload screenshot or supporting document.</small>
            </div>
            <button type="submit" className="btn btn-primary btn-block mb-4">
              Submit Request
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default ContactSupport;