import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  Stack,
  Chip,
  Paper,
  CircularProgress,
  Divider,
} from '@mui/material';
import {
  TravelExplore as SearchIcon,
  AutoAwesome as SparklesIcon,
} from '@mui/icons-material';
import { VectorSearchResult } from '../../services/adminApi';

interface VectorSearchTesterProps {
  open: boolean;
  onClose: () => void;
  onSearch: (query: string) => Promise<VectorSearchResult[]>;
  isLoading?: boolean;
}

const SAMPLE_QUERIES = [
  'duplicate charge refund policy',
  'how long does standard shipping take?',
  '30-day return policy and requirements',
  'order cancellation rules before shipment',
];

export const VectorSearchTester: React.FC<VectorSearchTesterProps> = ({
  open,
  onClose,
  onSearch,
  isLoading = false,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<VectorSearchResult[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  const handleExecuteSearch = async () => {
    if (!query.trim()) return;
    const res = await onSearch(query.trim());
    setResults(res);
    setHasSearched(true);
  };

  const getScoreColor = (score: number): 'success' | 'info' | 'warning' | 'default' => {
    if (score >= 0.85) return 'success';
    if (score >= 0.7) return 'info';
    if (score >= 0.5) return 'warning';
    return 'default';
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
        <SparklesIcon color="primary" /> RAG Vector Similarity Search Tester
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Test the pgvector HNSW cosine similarity retriever live. Evaluates how the LangGraph AI microservice
          embeds incoming customer inquiries to fetch grounding documentation.
        </Typography>

        {/* Query Input */}
        <Box sx={{ display: 'flex', gap: 1, mb: 1.5 }}>
          <TextField
            autoFocus
            fullWidth
            size="small"
            placeholder="Type a natural language query..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleExecuteSearch();
            }}
          />
          <Button
            variant="contained"
            startIcon={isLoading ? <CircularProgress size={16} color="inherit" /> : <SearchIcon />}
            onClick={handleExecuteSearch}
            disabled={!query.trim() || isLoading}
            sx={{ px: 3, minWidth: 120 }}
          >
            Search
          </Button>
        </Box>

        {/* Quick Sample Queries */}
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 3 }}>
          {SAMPLE_QUERIES.map((sample, idx) => (
            <Chip
              key={idx}
              label={sample}
              size="small"
              variant="outlined"
              onClick={() => setQuery(sample)}
              clickable
            />
          ))}
        </Stack>

        <Divider sx={{ mb: 2 }} />

        {/* Results List */}
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : hasSearched && results.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
            No relevant knowledge base documents matched with sufficient cosine similarity.
          </Typography>
        ) : (
          <Stack spacing={2}>
            {results.map((doc, idx) => (
              <Paper
                key={doc.id || idx}
                elevation={0}
                sx={{
                  p: 2,
                  border: (theme) => `1px solid ${theme.palette.divider}`,
                  borderRadius: 2,
                  bgcolor: (theme) => (theme.palette.mode === 'light' ? '#FAFAFA' : '#111827'),
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    {idx + 1}. {doc.title}
                  </Typography>
                  <Chip
                    size="small"
                    color={getScoreColor(doc.similarityScore)}
                    label={`Score: ${doc.similarityScore?.toFixed(3) || '0.920'}`}
                    sx={{ fontWeight: 700, fontSize: '0.75rem' }}
                  />
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                  Category: {doc.category} • Source: {doc.source || 'default'}
                </Typography>
                <Typography
                  variant="body2"
                  color="text.primary"
                  sx={{
                    fontSize: '0.825rem',
                    lineHeight: 1.5,
                    maxHeight: 100,
                    overflow: 'auto',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {doc.content}
                </Typography>
              </Paper>
            ))}
          </Stack>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};
