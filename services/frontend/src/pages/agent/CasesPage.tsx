import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Pagination,
  Stack,
  Button,
} from '@mui/material';
import {
  Search as SearchIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { CaseTable } from '../../components/cases/CaseTable';
import { useGetCasesQuery } from '../../services/casesApi';
import { CaseStatus, CasePriority } from '../../types';

export const CasesPage: React.FC = () => {
  const [selectedStatusTab, setSelectedStatusTab] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const limit = 10;

  const queryParams = {
    page,
    limit,
    status: selectedStatusTab !== 'all' ? (selectedStatusTab as CaseStatus) : undefined,
    priority: selectedPriority !== 'all' ? (selectedPriority as CasePriority) : undefined,
  };

  const { data, isLoading, refetch } = useGetCasesQuery(queryParams);

  const cases = data?.data?.cases || [];
  const totalPages = data?.data?.pagination?.totalPages || 1;
  const totalCount = data?.data?.pagination?.total || 0;

  // Local search filter
  const filteredCases = cases.filter((c) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      c.id.toLowerCase().includes(term) ||
      c.customerId.toLowerCase().includes(term) ||
      (c.subject && c.subject.toLowerCase().includes(term)) ||
      ((c as any).intent && (c as any).intent.toLowerCase().includes(term))
    );
  });

  return (
    <Box sx={{ maxWidth: 1400, mx: 'auto' }}>
      {/* Page Title */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5 }}>
            Support Cases Directory
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage, filter, and track all customer inquiries and AI-assisted support cases ({totalCount} total).
          </Typography>
        </Box>

        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={() => refetch()}
        >
          Refresh
        </Button>
      </Box>

      {/* Filter Paper */}
      <Paper elevation={0} sx={{ p: 2, mb: 3, border: (theme) => `1px solid ${theme.palette.divider}`, borderRadius: 2 }}>
        {/* Status Tabs */}
        <Tabs
          value={selectedStatusTab}
          onChange={(_e, val) => {
            setSelectedStatusTab(val);
            setPage(1);
          }}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ mb: 2, borderBottom: (theme) => `1px solid ${theme.palette.divider}` }}
        >
          <Tab label="All Cases" value="all" sx={{ fontWeight: 600 }} />
          <Tab label="Open" value="open" sx={{ fontWeight: 600 }} />
          <Tab label="In Progress" value="in_progress" sx={{ fontWeight: 600 }} />
          <Tab label="Pending Approval" value="pending_approval" sx={{ fontWeight: 600 }} />
          <Tab label="Resolved" value="resolved" sx={{ fontWeight: 600 }} />
          <Tab label="Closed" value="closed" sx={{ fontWeight: 600 }} />
        </Tabs>

        {/* Search and Priority row */}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: 'center' }}>
          <TextField
            size="small"
            placeholder="Search by Case ID, Customer, or Subject..."
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

          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel id="priority-filter-label">Priority</InputLabel>
            <Select
              labelId="priority-filter-label"
              label="Priority"
              value={selectedPriority}
              onChange={(e) => {
                setSelectedPriority(e.target.value);
                setPage(1);
              }}
            >
              <MenuItem value="all">All Priorities</MenuItem>
              <MenuItem value="critical">Critical</MenuItem>
              <MenuItem value="high">High</MenuItem>
              <MenuItem value="medium">Medium</MenuItem>
              <MenuItem value="low">Low</MenuItem>
            </Select>
          </FormControl>
        </Stack>
      </Paper>

      {/* Cases Table */}
      <CaseTable cases={filteredCases} isLoading={isLoading} />

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
    </Box>
  );
};
