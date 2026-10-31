import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Box,
  Alert,
} from '@mui/material';
import { AdminUser } from '../../services/adminApi';
import { UserRole } from '../../types';

interface RoleChangeDialogProps {
  open: boolean;
  onClose: () => void;
  user: AdminUser | null;
  onSaveRole: (userId: string, newRole: UserRole) => Promise<void>;
  isLoading?: boolean;
}

export const RoleChangeDialog: React.FC<RoleChangeDialogProps> = ({
  open,
  onClose,
  user,
  onSaveRole,
  isLoading = false,
}) => {
  const [role, setRole] = useState<UserRole>('agent');

  useEffect(() => {
    if (user) {
      setRole(user.role);
    }
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    await onSaveRole(user.id, role);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>Update User Role & Access</DialogTitle>
      <DialogContent>
        {user && (
          <Box sx={{ mb: 2.5 }}>
            <Typography variant="body2" color="text.secondary">
              Managing permissions for:
            </Typography>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              {user.name} ({user.email})
            </Typography>
          </Box>
        )}

        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel id="user-role-select-label">Assigned Role</InputLabel>
          <Select
            labelId="user-role-select-label"
            label="Assigned Role"
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
          >
            <MenuItem value="customer">Customer (Chat & Orders Only)</MenuItem>
            <MenuItem value="agent">Support Agent (Cases Directory & Notes)</MenuItem>
            <MenuItem value="reviewer">Supervisor / Reviewer (HITL Approvals Gate)</MenuItem>
            <MenuItem value="admin">Administrator (Full System & User Control)</MenuItem>
          </Select>
        </FormControl>

        <Alert severity="info" sx={{ fontSize: '0.8rem' }}>
          Changing a user to <strong>Reviewer</strong> allows them to approve and execute financial refunds.
        </Alert>
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} disabled={isLoading}>
          Cancel
        </Button>
        <Button variant="contained" onClick={handleSave} disabled={isLoading}>
          {isLoading ? 'Saving...' : 'Update Role'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
