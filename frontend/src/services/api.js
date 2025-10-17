import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3001/api',
});

export const membersAPI = {
  getAll: (activeOnly = true, inactivityFilter = null) => {
    let url = `/members?active=${activeOnly}`;
    if (inactivityFilter) {
      url += `&inactive_days=${inactivityFilter}`;
    }
    return api.get(url);
  },
  getAllHiscores: () => api.get('/members/all-hiscores'),
  getHiscoresXpBrackets: () => api.get('/members/hiscores/xp-brackets'),
  getHighestRanks: (limit = 5) => api.get(`/members/highest-ranks?limit=${limit}`),
  getById: (id) => api.get(`/members/${id}`),
  getByName: (name) => api.get(`/members/${name}`),
  create: (name, sync = false) => api.post('/members', { name, sync }),
  bulkCreate: (names) => api.post('/members/bulk', { names }),
  delete: (id) => api.delete(`/members/${id}`),
  deleteAll: () => api.delete('/members/all'),
  getStats: (id) => api.get(`/members/${id}/stats`),
};

export const syncAPI = {
  syncAll: () => api.post('/sync/all'),
  syncAllAsync: () => api.post('/sync/all/async'),
  syncUnsyncedAsync: () => api.post('/sync/unsynced/async'),
  getSyncProgress: (syncId) => api.get(`/sync/progress/${syncId}`),
};

export const clanAPI = {
  importMembers: (clanName) => api.post('/clan/import-members', { clanName }),
  syncMembership: (clanName) => api.post('/clan/sync-membership', { clanName }),
};

export const leaderboardAPI = {
  getByPeriod: (period, limit = 50) => api.get(`/leaderboard/${period}?limit=${limit}`),
  getTopGainers: (count = 10) => api.get(`/leaderboard/top/gainers?count=${count}`),
  getClanStats: () => api.get('/leaderboard/clan/stats'),
};

export const activitiesAPI = {
  getClanActivities: (limit = 20) => api.get(`/activities/clan?limit=${limit}`),
  getMemberActivities: (name) => api.get(`/activities/member/${name}`),
};

export const eventsAPI = {
  getRecent: (limit = 10) => api.get(`/events?limit=${limit}`),
};

export default api;
