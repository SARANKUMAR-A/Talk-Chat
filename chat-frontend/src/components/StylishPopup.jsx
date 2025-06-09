import React from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography } from "@mui/material";

const StylishPopup = ({ open, onClose, title, message, onConfirm }) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Typography variant="body1">{message}</Typography>
      </DialogContent>
      <DialogActions>
        {onConfirm ? (
          <>
            <Button onClick={onClose} color="secondary">
              Cancel
            </Button>
            <Button onClick={onConfirm} variant="contained" color="primary">
              OK
            </Button>
          </>
        ) : (
          <Button onClick={onClose} variant="contained" color="primary" fullWidth>
            Close
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default StylishPopup;
