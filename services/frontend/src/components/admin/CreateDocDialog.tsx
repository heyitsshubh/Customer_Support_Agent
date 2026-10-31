import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
} from '@mui/material';

interface CreateDocDialogProps {
  open: boolean;
  onClose: () => void;
  onCreateDoc: (doc: { title: string; content: string; category: string; source?: string }) => Promise<void>;
  isLoading?: boolean;
}

export const CreateDocDialog: React.FC<CreateDocDialogProps> = ({
  open,
  onClose,
  onCreateDoc,
  isLoading = false,
}) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('policy');
  const [source, setSource] = useState('manual_ingest');
  const [content, setContent] = useState('');

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) return;
    await onCreateDoc({
      title: title.trim(),
      content: content.trim(),
      category,
      source: source.trim() || undefined,
    });
    setTitle('');
    setContent('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>Ingest Knowledge Base Document</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          New documents will be embedded into a 1536-dimensional vector space and indexed in PostgreSQL using
          the pgvector HNSW index for instant similarity matching.
        </Typography>

        <TextField
          autoFocus
          label="Document Title"
          fullWidth
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. 2026 Duplicate Billing Resolution Policy"
          sx={{ mb: 2 }}
        />

        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel id="category-select-label">Category</InputLabel>
          <Select
            labelId="category-select-label"
            label="Category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <MenuItem value="policy">Company Policy</MenuItem>
            <MenuItem value="billing">Billing & Refunds</MenuItem>
            <MenuItem value="shipping">Shipping & Fulfillment</MenuItem>
            <MenuItem value="faq">General FAQ</MenuItem>
          </Select>
        </FormControl>

        <TextField
          label="Source Identifier (Optional)"
          fullWidth
          value={source}
          onChange={(e) => setSource(e.target.value)}
          placeholder="e.g. legal_sop_2026.pdf"
          sx={{ mb: 2 }}
        />

        <TextField
          label="Document Content"
          fullWidth
          multiline
          rows={6}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Enter the full policy or FAQ text that the LangGraph agent should retrieve..."
        />
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} disabled={isLoading}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={!title.trim() || !content.trim() || isLoading}
        >
          {isLoading ? 'Embedding...' : 'Ingest & Index'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
