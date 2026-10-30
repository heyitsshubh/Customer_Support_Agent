import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface UiState {
  themeMode: 'light' | 'dark';
  sidebarOpen: boolean;
  notificationsCount: number;
}

const savedTheme = localStorage.getItem('themeMode') as 'light' | 'dark' | null;

const initialState: UiState = {
  themeMode: savedTheme === 'dark' || savedTheme === 'light' ? savedTheme : 'light',
  sidebarOpen: true,
  notificationsCount: 0,
};

export const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleThemeMode: (state) => {
      state.themeMode = state.themeMode === 'light' ? 'dark' : 'light';
      localStorage.setItem('themeMode', state.themeMode);
    },
    setThemeMode: (state, action: PayloadAction<'light' | 'dark'>) => {
      state.themeMode = action.payload;
      localStorage.setItem('themeMode', state.themeMode);
    },
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
    },
    setSidebarOpen: (state, action: PayloadAction<boolean>) => {
      state.sidebarOpen = action.payload;
    },
    setNotificationsCount: (state, action: PayloadAction<number>) => {
      state.notificationsCount = action.payload;
    },
  },
});

export const {
  toggleThemeMode,
  setThemeMode,
  toggleSidebar,
  setSidebarOpen,
  setNotificationsCount,
} = uiSlice.actions;

export default uiSlice.reducer;
