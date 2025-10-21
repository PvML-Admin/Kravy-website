import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
  withCredentials: true, // Enable sending cookies with requests
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
  toggleDiscordBooster: (id, isBooster) => api.patch(`/members/${id}/discord-booster`, { isBooster }),
  toggleGrandmasterCA: (id, isGrandmasterCA) => api.patch(`/members/${id}/grandmaster-ca`, { isGrandmasterCA }),
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
  getCurrentDailyClanXp: () => api.get(`/leaderboard/current-daily-clan-xp`),
  getCurrentWeeklyClanXp: () => api.get(`/leaderboard/current-weekly-clan-xp`),
  getCurrentMonthlyClanXp: () => api.get(`/leaderboard/current-monthly-clan-xp`),
  getClanStats: () => api.get('/leaderboard/clan/stats'),
};

export const activitiesAPI = {
  getClanActivities: (limit = 200) => api.get(`/activities/clan?limit=${limit}`),
  getMemberActivities: (memberName) => api.get(`/activities/member/${memberName}`),
};

export const eventsAPI = {
  getRecent: (limit = 10) => api.get(`/events?limit=${limit}`),
};

export const twitterAPI = {
  getRecentTweets: (limit = 5) => api.get(`/twitter/recent-tweets?limit=${limit}`),
  getStatus: () => api.get('/twitter/status'),
  refresh: (limit = 5) => api.post(`/twitter/refresh?limit=${limit}`),
  clearCache: () => api.post('/twitter/clear-cache'),
};

export const adminAPI = {
  getStats: () => api.get('/admin/stats'),
  getSyncProgress: () => api.get('/admin/sync/progress'),
  getSyncLogs: (limit = 50) => api.get(`/admin/sync/logs?limit=${limit}`),
  clearDailyXp: () => api.post('/admin/data/clear-daily-xp'),
  clearWeeklyXp: () => api.post('/admin/data/clear-weekly-xp'),
  getInactiveMembers: (days = 30) => api.get(`/admin/members/inactive?days=${days}`),
  getSystemInfo: () => api.get('/admin/system/info'),
  getRecentEvents: (limit = 20) => api.get(`/admin/events/recent?limit=${limit}`),
  clearTwitterCache: () => api.post('/admin/twitter/clear-cache'),
  getTwitterStatus: () => api.get('/admin/twitter/status'),
  toggleMasterQuestCape: (id, hasCape) => api.patch(`/admin/members/${id}/master-quest-cape`, { hasCape }),
  toggleCompletionistCape: (id, hasCape) => api.patch(`/admin/members/${id}/completionist-cape`, { hasCape }),
  toggleTrimmedCompletionistCape: (id, hasCape) => api.patch(`/admin/members/${id}/trimmed-completionist-cape`, { hasCape }),
};

export default api;
