import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  TextField,
  InputAdornment,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Avatar,
  Chip,
  IconButton,
  Tooltip,
  Button,
  Pagination,
  Stack,
} from '@mui/material';
import {
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Edit as EditIcon,
  Block as DeactivateIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import {
  useGetUsersQuery,
  useUpdateUserRoleMutation,
  useDeactivateUserMutation,
  AdminUser,
} from '../../services/adminApi';
import { RoleChangeDialog } from '../../components/admin/RoleChangeDialog';
import { UserRole } from '../../types';

export const UsersPage: React.FC = () => {
  const { enqueueSnackbar } = useSnackbar();

  const [selectedRoleTab, setSelectedRoleTab] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [roleDialogOpen, setRoleDialogOpen] = useState<boolean>(false);

  const queryParams = {
    page,
    limit: 15,
    role: selectedRoleTab !== 'all' ? selectedRoleTab : undefined,
  };

  const { data, isLoading, refetch } = useGetUsersQuery(queryParams);
  const [updateRole, { isLoading: isUpdatingRole }] = useUpdateUserRoleMutation();
  const [deactivateUser] = useDeactivateUserMutation();

  const users = data?.data?.users || [];
  const totalCount = data?.data?.total || 0;
  const totalPages = data?.data?.totalPages || 1;

  const filteredUsers = users.filter((u) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return u.name.toLowerCase().includes(term) || u.email.toLowerCase().includes(term);
  });

  const handleOpenRoleDialog = (user: AdminUser) => {
    setSelectedUser(user);
    setRoleDialogOpen(true);
  };

  const handleSaveRole = async (userId: string, newRole: UserRole) => {
    try {
      await updateRole({ id: userId, role: newRole }).unwrap();
      enqueueSnackbar(`Role successfully updated to ${newRole.toUpperCase()}`, { variant: 'success' });
      refetch();
    } catch (err: any) {
      enqueueSnackbar(err?.data?.message || 'Failed to update role', { variant: 'error' });
    }
  };

  const handleDeactivate = async (user: AdminUser) => {
    if (window.confirm(`Are you sure you want to deactivate ${user.name} (${user.email})?`)) {
      try {
        await deactivateUser(user.id).unwrap();
        enqueueSnackbar(`User account ${user.email} deactivated`, { variant: 'info' });
        refetch();
      } catch (err: any) {
        enqueueSnackbar(err?.data?.message || 'Failed to deactivate user', { variant: 'error' });
      }
    }
  };

  const roleColors: Record<string, 'default' | 'primary' | 'secondary' | 'warning' | 'error' | 'info'> = {
    customer: 'info',
    agent: 'primary',
    reviewer: 'warning',
    admin: 'error',
  };

  return (
    <Box sx={{ maxWidth: 1400, mx: 'auto' }}>
      {/* Top Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5 }}>
            User & Access Management
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage system users, customer accounts, and staff role permissions ({totalCount} total accounts).
          </Typography>
        </Box>

        <Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => refetch()}>
          Refresh
        </Button>
      </Box>

      {/* Filter Paper */}
      <Paper elevation={0} sx={{ p: 2, mb: 3, border: (theme) => `1px solid ${theme.palette.divider}`, borderRadius: 2 }}>
        <Tabs
          value={selectedRoleTab}
          onChange={(_e, val) => {
            setSelectedRoleTab(val);
            setPage(1);
          }}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ mb: 2, borderBottom: (theme) => `1px solid ${theme.palette.divider}` }}
        >
          <Tab label="All Accounts" value="all" sx={{ fontWeight: 600 }} />
          <Tab label="Customers" value="customer" sx={{ fontWeight: 600 }} />
          <Tab label="Support Agents" value="agent" sx={{ fontWeight: 600 }} />
          <Tab label="Supervisors / Reviewers" value="reviewer" sx={{ fontWeight: 600 }} />
          <Tab label="Administrators" value="admin" sx={{ fontWeight: 600 }} />
        </Tabs>

        <TextField
          size="small"
          placeholder="Search by name or email address..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          fullWidth
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="action" fontSize="small" />
              </InputAdornment>
            ),
          }}
        />
      </Paper>

      {/* Users Table */}
      <TableContainer
        component={Paper}
        elevation={0}
        sx={{ border: (theme) => `1px solid ${theme.palette.divider}`, borderRadius: 2, overflow: 'hidden' }}
      >
        <Table sx={{ minWidth: 650 }}>
          <TableHead sx={{ bgcolor: 'action.hover' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 700 }}>User</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Role</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Joined Date</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700 }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                  Loading users...
                </TableCell>
              </TableRow>
            ) : filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                  No users found matching criteria.
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((u) => (
                <TableRow key={u.id} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Avatar sx={{ width: 34, height: 34, bgcolor: 'primary.main', fontSize: 14, fontWeight: 700 }}>
                        {u.name ? u.name[0].toUpperCase() : 'U'}
                      </Avatar>
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                          {u.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {u.email}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>

                  <TableCell>
                    <Chip
                      size="small"
                      label={u.role.toUpperCase()}
                      color={roleColors[u.role] || 'default'}
                      sx={{ fontWeight: 700, fontSize: '0.675rem' }}
                    />
                  </TableCell>

                  <TableCell>
                    <Chip
                      size="small"
                      variant="outlined"
                      label={u.is_active ? 'ACTIVE' : 'DEACTIVATED'}
                      color={u.is_active ? 'success' : 'default'}
                      sx={{ fontWeight: 600, fontSize: '0.675rem' }}
                    />
                  </TableCell>

                  <TableCell>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(u.created_at).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </Typography>
                  </TableCell>

                  <TableCell align="right">
                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                      <Tooltip title="Update Role & Permissions">
                        <IconButton size="small" color="primary" onClick={() => handleOpenRoleDialog(u)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>

                      <Tooltip title="Deactivate Account">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDeactivate(u)}
                          disabled={!u.is_active || u.role === 'admin'}
                        >
                          <DeactivateIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      {totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={(_e, val) => setPage(val)}
            color="primary"
            shape="rounded"
          />
        </Box>
      )}

      {/* Edit Role Dialog */}
      <RoleChangeDialog
        open={roleDialogOpen}
        onClose={() => setRoleDialogOpen(false)}
        user={selectedUser}
        onSaveRole={handleSaveRole}
        isLoading={isUpdatingRole}
      />
    </Box>
  );
};
