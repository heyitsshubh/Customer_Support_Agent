import React, { useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Stack,
  Chip,
  Tabs,
  Tab,
  Paper,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
} from '@mui/material';
import {
  MenuBook as KnowledgeIcon,
  Add as AddIcon,
  TravelExplore as VectorTestIcon,
  Refresh as RefreshIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import {
  useGetDocsQuery,
  useGetDocByIdQuery,
  useCreateDocMutation,
  useDeleteDocMutation,
  useSearchDocsMutation,
  KnowledgeDoc,
  VectorSearchResult,
} from '../../services/adminApi';
import { CreateDocDialog } from '../../components/admin/CreateDocDialog';
import { VectorSearchTester } from '../../components/admin/VectorSearchTester';

export const KnowledgeBasePage: React.FC = () => {
  const { enqueueSnackbar } = useSnackbar();

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [createDialogOpen, setCreateDialogOpen] = useState<boolean>(false);
  const [vectorTesterOpen, setVectorTesterOpen] = useState<boolean>(false);

  const [viewDocId, setViewDocId] = useState<string | null>(null);

  const queryCategory = selectedCategory !== 'all' ? selectedCategory : undefined;
  const { data, isLoading, refetch } = useGetDocsQuery({ category: queryCategory, limit: 100 });

  const { data: viewDocData, isLoading: isLoadingSingleDoc } = useGetDocByIdQuery(viewDocId || '', {
    skip: !viewDocId,
  });

  const [createDoc, { isLoading: isCreating }] = useCreateDocMutation();
  const [deleteDoc] = useDeleteDocMutation();
  const [searchDocs, { isLoading: isSearching }] = useSearchDocsMutation();

  const docs = data?.data?.documents || [];
  const totalCount = data?.data?.total || docs.length;

  const handleCreateDoc = async (newDoc: { title: string; content: string; category: string; source?: string }) => {
    try {
      await createDoc(newDoc).unwrap();
      enqueueSnackbar('Document ingested and embedded into pgvector successfully', { variant: 'success' });
      refetch();
    } catch (err: any) {
      enqueueSnackbar(err?.data?.message || 'Failed to ingest document', { variant: 'error' });
    }
  };

  const handleDeleteDoc = async (id: string, title: string) => {
    if (window.confirm(`Are you sure you want to delete "${title}" from the knowledge base?`)) {
      try {
        await deleteDoc(id).unwrap();
        enqueueSnackbar('Document deleted from vector store', { variant: 'info' });
        refetch();
      } catch (err: any) {
        enqueueSnackbar(err?.data?.message || 'Failed to delete document', { variant: 'error' });
      }
    }
  };

  const handleVectorSearch = async (query: string): Promise<VectorSearchResult[]> => {
    try {
      const res = await searchDocs({ query, topK: 4 }).unwrap();
      return res.data?.results || [];
    } catch {
      enqueueSnackbar('Vector search query failed', { variant: 'error' });
      return [];
    }
  };

  return (
    <Box sx={{ maxWidth: 1400, mx: 'auto' }}>
      {/* Top Header */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', md: 'center' },
          gap: 2,
          mb: 3,
        }}
      >
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
            <Typography variant="h4" sx={{ fontWeight: 800 }}>
              Knowledge Base & Vector Store
            </Typography>
            <Chip
              icon={<KnowledgeIcon sx={{ fontSize: 16 }} />}
              label={`${totalCount} DOCUMENTS`}
              color="primary"
              sx={{ fontWeight: 700 }}
            />
          </Box>
          <Typography variant="body2" color="text.secondary">
            PostgreSQL 16 + pgvector HNSW index. Grounding source for LangGraph autonomous customer support retrieval.
          </Typography>
        </Box>

        <Stack direction="row" spacing={1.5} flexWrap="wrap">
          <Button
            variant="outlined"
            color="primary"
            startIcon={<VectorTestIcon />}
            onClick={() => setVectorTesterOpen(true)}
            size="small"
          >
            Test Vector Search
          </Button>

          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialogOpen(true)}
            size="small"
          >
            Ingest Document
          </Button>

          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => refetch()}
            size="small"
          >
            Refresh
          </Button>
        </Stack>
      </Box>

      {/* Category Tabs */}
      <Paper elevation={0} sx={{ p: 1.5, mb: 3, border: (theme) => `1px solid ${theme.palette.divider}`, borderRadius: 2 }}>
        <Tabs
          value={selectedCategory}
          onChange={(_e, val) => setSelectedCategory(val)}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label="All Documents" value="all" sx={{ fontWeight: 600 }} />
          <Tab label="Company Policies" value="policy" sx={{ fontWeight: 600 }} />
          <Tab label="Billing & Refunds" value="billing" sx={{ fontWeight: 600 }} />
          <Tab label="Shipping" value="shipping" sx={{ fontWeight: 600 }} />
          <Tab label="FAQs" value="faq" sx={{ fontWeight: 600 }} />
        </Tabs>
      </Paper>

      {/* Documents Grid */}
      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : docs.length === 0 ? (
        <Paper
          elevation={0}
          sx={{
            py: 8,
            px: 4,
            textAlign: 'center',
            border: (theme) => `1px dashed ${theme.palette.divider}`,
            borderRadius: 3,
          }}
        >
          <KnowledgeIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1.5 }} />
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
            No Documents Ingested in this Category
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Add policy documents or FAQ articles to enable RAG retrieval for the agent.
          </Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateDialogOpen(true)}>
            Ingest First Document
          </Button>
        </Paper>
      ) : (
        <Grid container spacing={2.5}>
          {docs.map((doc: KnowledgeDoc) => (
            <Grid item xs={12} sm={6} lg={4} key={doc.id}>
              <Card
                elevation={0}
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  border: (theme) => `1px solid ${theme.palette.divider}`,
                  borderRadius: 2,
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: (theme) =>
                      theme.palette.mode === 'light'
                        ? '0 8px 16px rgba(0,0,0,0.06)'
                        : '0 8px 16px rgba(0,0,0,0.4)',
                  },
                }}
              >
                <CardContent sx={{ p: 2.5, flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    <Chip
                      size="small"
                      label={doc.category.toUpperCase()}
                      color="primary"
                      variant="outlined"
                      sx={{ fontWeight: 700, fontSize: '0.675rem' }}
                    />
                    <Typography variant="caption" color="text.secondary">
                      {doc.createdAt
                        ? new Date(doc.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })
                        : ''}
                    </Typography>
                  </Box>

                  <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1, lineHeight: 1.3 }}>
                    {doc.title}
                  </Typography>

                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                    Source: {doc.source || 'internal_seed'}
                  </Typography>

                  <Box sx={{ mt: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Button
                      size="small"
                      startIcon={<ViewIcon />}
                      onClick={() => setViewDocId(doc.id)}
                      sx={{ textTransform: 'none' }}
                    >
                      Read Content
                    </Button>

                    <Tooltip title="Delete Document">
                      <IconButton size="small" color="error" onClick={() => handleDeleteDoc(doc.id, doc.title)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Read Document Modal */}
      <Dialog open={Boolean(viewDocId)} onClose={() => setViewDocId(null)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          {viewDocData?.data?.document?.title || 'Knowledge Base Document'}
        </DialogTitle>
        <DialogContent>
          {isLoadingSingleDoc ? (
            <CircularProgress />
          ) : (
            <Paper
              variant="outlined"
              sx={{
                p: 2.5,
                bgcolor: (theme) => (theme.palette.mode === 'light' ? '#FAFAFA' : '#111827'),
                borderRadius: 2,
                whiteSpace: 'pre-wrap',
                lineHeight: 1.7,
                fontSize: '0.9rem',
              }}
            >
              {viewDocData?.data?.document?.content || 'No text content available.'}
            </Paper>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setViewDocId(null)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Create Document Dialog */}
      <CreateDocDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onCreateDoc={handleCreateDoc}
        isLoading={isCreating}
      />

      {/* Vector Similarity Search Tester Modal */}
      <VectorSearchTester
        open={vectorTesterOpen}
        onClose={() => setVectorTesterOpen(false)}
        onSearch={handleVectorSearch}
        isLoading={isSearching}
      />
    </Box>
  );
};
