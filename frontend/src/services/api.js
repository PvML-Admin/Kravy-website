import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'https://kravy-website.onrender.com/api',
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
  sync: (id) => api.post(`/members/${id}/sync`),
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
  getByPeriod: (period, limit = 50, skill = 'Overall') => api.get(`/leaderboard/${period}?limit=${limit}&skill=${encodeURIComponent(skill)}`),
  getTopGainers: (count = 10) => api.get(`/leaderboard/top/gainers?count=${count}`),
  getDailyClanXpHistory: (limit = 15) => api.get(`/leaderboard/daily-clan-xp?limit=${limit}`),
  getClanStats: () => api.get('/leaderboard/clan/stats'),
};

export const activitiesAPI = {
  getClanActivities: (limit = 100) => api.get(`/activities/clan?limit=${limit}`),
  getMemberActivities: (memberName) => api.get(`/activities/member/${memberName}`),
};

export const eventsAPI = {
  getRecent: (limit = 10) => api.get(`/events?limit=${limit}`),
};

export default api;
