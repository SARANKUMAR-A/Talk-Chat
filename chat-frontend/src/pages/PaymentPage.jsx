import React, { useState } from "react";

const PaymentPage = ({ isDarkMode, setSubscribePage }) => {
  const [selectedMethod, setSelectedMethod] = useState(null);

  const paymentMethods = [
    "UPI",
    "Credit Card",
    "Debit Card",
    "Net Banking",
    "Wallet",
    "EMI",
  ];

  const handlePayment = (method) => {
    setSelectedMethod(method);
    alert(`Proceeding with payment method: ${method}`);
    // You can extend this to integrate payment API here.
  };

  const backgroundStyle = isDarkMode
    ? "linear-gradient(to bottom right, #1e293b, #334155)"
    : "linear-gradient(to bottom right, #dbeafe, #c7d2fe)";

  const containerStyle = {
    minHeight: "100vh",
    background: backgroundStyle,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "column",
    padding: 20,
    color: isDarkMode ? "#e0e0e0" : "#000",
    transition: "all 0.3s ease",
  };

  const cardStyle = {
    marginTop: 30,
    backgroundColor: isDarkMode ? "#334155" : "#fff",
    padding: 20,
    borderRadius: 10,
    boxShadow: isDarkMode
      ? "0 0 10px rgba(100, 100, 100, 0.5)"
      : "0 0 10px rgba(0,0,0,0.1)",
    width: 300,
    textAlign: "center",
    color: isDarkMode ? "#e0e0e0" : "#000",
  };

  const buttonStyle = (method) => ({
    margin: "10px 0",
    padding: "10px 15px",
    width: "100%",
    cursor: "pointer",
    backgroundColor:
      selectedMethod === method
        ? "#1976d2"
        : isDarkMode
        ? "#475569"
        : "#e0e0e0",
    color: selectedMethod === method ? "#fff" : isDarkMode ? "#e0e0e0" : "#000",
    border: "none",
    borderRadius: 4,
    transition: "all 0.3s ease",
  });

  const cancelButtonStyle = {
    marginTop: 20,
    padding: "8px 12px",
    backgroundColor: isDarkMode ? "#64748b" : "#ccc",
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
    color: isDarkMode ? "#e0e0e0" : "#000",
    transition: "all 0.3s ease",
  };

  const headingStyle = {
    color: isDarkMode ? "#e0e0e0" : "#000",
  };

  return (
    <div style={containerStyle}>
      <h2 style={headingStyle}>Subscribe to SmartChat Premium</h2>
      <div style={cardStyle}>
        <h3 style={headingStyle}>Select Payment Method</h3>
        {paymentMethods.map((method) => (
          <button
            key={method}
            style={buttonStyle(method)}
            onClick={() => handlePayment(method)}
          >
            {method}
          </button>
        ))}
        <button
          style={cancelButtonStyle}
          onClick={() => setSubscribePage(false)}
          aria-label="Cancel subscription"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default PaymentPage;
