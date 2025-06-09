import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Button,
  Paper,
  Stack,
  useTheme,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import CreditCardIcon from "@mui/icons-material/CreditCard";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import PhoneAndroidIcon from "@mui/icons-material/PhoneAndroid";
import PaymentIcon from "@mui/icons-material/Payment";
import CancelIcon from "@mui/icons-material/Cancel";
import StylishPopup from "../components/StylishPopup";

const paymentMethods = [
  { label: "UPI", icon: <PhoneAndroidIcon /> },
  { label: "Credit Card", icon: <CreditCardIcon /> },
  { label: "Debit Card", icon: <CreditCardIcon /> },
  { label: "Net Banking", icon: <AccountBalanceIcon /> },
  { label: "Wallet", icon: <AccountBalanceWalletIcon /> },
  { label: "EMI", icon: <PaymentIcon /> },
];

const methodMap = {
  UPI: ["upi"],
  "Credit Card": ["card"],
  "Debit Card": ["card"],
  "Net Banking": ["netbanking"],
  Wallet: ["wallet"],
  EMI: ["emi"],
};

const Payment = ({ isDarkMode, setSubscribePage }) => {
  const theme = useTheme();
  const [selectedMethod, setSelectedMethod] = useState(null);

  // Popup state
  const [popupOpen, setPopupOpen] = useState(false);
  const [popupTitle, setPopupTitle] = useState("");
  const [popupMessage, setPopupMessage] = useState("");
  const [popupConfirmCallback, setPopupConfirmCallback] = useState(null);

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const openPopup = (title, message, onConfirm = null) => {
    setPopupTitle(title);
    setPopupMessage(message);
    setPopupConfirmCallback(() => onConfirm);
    setPopupOpen(true);
  };

  const closePopup = () => {
    setPopupOpen(false);
    setPopupConfirmCallback(null);
  };

  const showPopup = (message) => {
    setPopupMessage(message);
    setPopupOpen(true);
  };

  const handlePayment = async () => {
    if (!selectedMethod) {
      openPopup("Please select a payment method first.");
      return;
    }

    try {
      // Create order via backend
      const res = await fetch("/create-subscription/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: 19900 }), // ₹199.00 in paise
      });

      if (!res.ok) {
        openPopup("Failed to create order, please try again.");
        return;
      }

      const data = await res.json();

      const options = {
        key: data.razorpay_key,
        amount: 19900,
        currency: "INR",
        name: "SmartChat AI",
        description: `SmartChat Premium - ${selectedMethod}`,
        order_id: data.order_id,
        handler: (response) => {
          openPopup("Payment successful!");
          setSubscribePage(false);
        },
        theme: {
          color: theme.palette.primary.main,
          mode: isDarkMode ? "dark" : "light",
        },
        modal: {
          ondismiss: () => openPopup("Payment Cancelled."),
        },
        prefill: {
          name: "Sarankumar",
          email: "sarankumar.anbalagan.18@gmail.com",
          contact: "9025648431",
        },
        method: {
          netbanking: false,
          card: false,
          upi: false,
          wallet: false,
          emi: false,
        },
      };

      // Enable only selected payment method
      methodMap[selectedMethod].forEach((m) => {
        options.method[m] = true;
      });

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error) {
      openPopup("Error", "An unexpected error occurred. Please try again.");

      console.error(error);
    }
  };

  return (
    <>
      <Box
        sx={{
          minHeight: "100vh",
          bgcolor: "background.default",
          color: "text.primary",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          p: 3,
        }}
      >
        <Paper
          elevation={10}
          sx={{
            maxWidth: 400,
            width: "100%",
            p: 4,
            borderRadius: 3,
            boxShadow: theme.shadows[8],
            bgcolor: "background.paper",
          }}
        >
          <Typography variant="h5" fontWeight="bold" mb={3} textAlign="center">
            Subscribe to SmartChat Premium
          </Typography>

          <Typography
            variant="subtitle1"
            mb={2}
            textAlign="center"
            color="text.secondary"
          >
            Select your preferred payment method
          </Typography>

          <Stack spacing={2} mb={3}>
            {paymentMethods.map(({ label, icon }) => (
              <Tooltip key={label} title={label}>
                <Button
                  variant={selectedMethod === label ? "contained" : "outlined"}
                  startIcon={icon}
                  onClick={() => setSelectedMethod(label)}
                  sx={{
                    justifyContent: "flex-start",
                    textTransform: "none",
                    fontWeight: selectedMethod === label ? "bold" : "normal",
                    bgcolor:
                      selectedMethod === label
                        ? theme.palette.primary.main
                        : "transparent",
                    color:
                      selectedMethod === label
                        ? "#fff"
                        : theme.palette.text.primary,
                    borderColor:
                      selectedMethod === label
                        ? theme.palette.primary.main
                        : undefined,
                    "&:hover": {
                      bgcolor:
                        selectedMethod === label
                          ? theme.palette.primary.dark
                          : theme.palette.action.hover,
                    },
                  }}
                >
                  {label}
                </Button>
              </Tooltip>
            ))}
          </Stack>

          <Stack direction="row" spacing={2} justifyContent="center">
            <Button
              variant="contained"
              size="large"
              onClick={handlePayment}
              disabled={!selectedMethod}
              sx={{ flex: 1 }}
            >
              Pay ₹199
            </Button>

            <Button
              variant="outlined"
              size="large"
              startIcon={<CancelIcon />}
              onClick={() => setSubscribePage(false)}
              sx={{
                flex: 1,
                borderColor: theme.palette.text.secondary,
                color: theme.palette.text.secondary,
                "&:hover": {
                  bgcolor: theme.palette.action.hover,
                  borderColor: theme.palette.primary.main,
                  color: theme.palette.primary.main,
                },
              }}
            >
              Cancel
            </Button>
          </Stack>
        </Paper>
      </Box>

      {/* Popup Modal */}
      <StylishPopup
        open={popupOpen}
        onClose={closePopup}
        title={popupTitle}
        message={popupMessage}
        onConfirm={popupConfirmCallback}
      />
    </>
  );
};

export default Payment;
