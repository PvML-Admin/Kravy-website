const axios = require('axios');
const { LRUCache } = require('lru-cache');

// Cache for RS Wiki API responses (24 hour TTL)
const wikiCache = new LRUCache({
  max: 1000,
  ttl: 1000 * 60 * 60 * 24 // 24 hours
});

class RSWikiService {
  constructor() {
    this.baseURL = 'https://prices.runescape.wiki/api/v1/osrs';
    this.itemsURL = 'https://chisel.weirdgloop.org/gazproj/gazbot/os_item_data.json';
    this.iconBaseURL = 'https://oldschool.runescape.wiki/images';
    
    // Rate limiting
    this.lastRequest = 0;
    this.minInterval = 100; // 100ms between requests
    
    // Item data cache
    this.itemsData = null;
    this.itemsLastFetched = 0;
    this.itemsCacheDuration = 1000 * 60 * 60 * 12; // 12 hours
  }

  /**
   * Rate limit API requests
   */
  async rateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequest;
    
    if (timeSinceLastRequest < this.minInterval) {
      await new Promise(resolve => setTimeout(resolve, this.minInterval - timeSinceLastRequest));
    }
    
    this.lastRequest = Date.now();
  }

  /**
   * Fetch and cache all items data from RS Wiki
   */
  async fetchItemsData() {
    const cacheKey = 'all_items_data';
    const cached = wikiCache.get(cacheKey);
    
    // Return cached data if available and not expired
    if (cached && (Date.now() - this.itemsLastFetched) < this.itemsCacheDuration) {
      this.itemsData = cached;
      return cached;
    }

    try {
      await this.rateLimit();
      
      // Silent fetching - no console log
      const response = await axios.get(this.itemsURL, {
        timeout: 30000,
        headers: {
          'User-Agent': 'Kravy Tracker Bingo System/1.0 (https://github.com/your-repo)'
        }
      });

      this.itemsData = response.data;
      this.itemsLastFetched = Date.now();
      
      // Cache the data
      wikiCache.set(cacheKey, this.itemsData);
      
      // Silent success - no console log
      return this.itemsData;
      
    } catch (error) {
      // Completely silent error handling - no console logging
      
      // Return cached data even if expired as fallback
      if (this.itemsData) {
        return this.itemsData;
      }
      
      // Return empty object instead of throwing error
      return {};
    }
  }

  /**
   * Search for items by name with boss loot filter
   * @param {string} searchTerm - The item name to search for
   * @param {number} limit - Maximum number of results to return
   * @returns {Array} Array of matching items with boss loot priority
   */
  async searchItems(searchTerm, limit = 20) {
    if (!searchTerm || searchTerm.trim().length < 2) {
      return [];
    }

    try {
      const itemsData = await this.fetchItemsData();
      const searchLower = searchTerm.toLowerCase().trim();
      
      // Convert items object to array for searching
      const itemsArray = Object.entries(itemsData).map(([id, item]) => ({
        id: parseInt(id),
        name: item.name,
        examine: item.examine,
        cost: item.cost,
        lowalch: item.lowalch,
        highalch: item.highalch,
        weight: item.weight,
        buy_limit: item.buy_limit,
        quest_item: item.quest_item,
        release_date: item.release_date,
        wiki_name: item.wiki_name,
        wiki_url: item.wiki_url,
        equipment: item.equipment,
        icon: item.icon
      }));

      // Filter items that match search term
      let matchingItems = itemsArray.filter(item => 
        item.name.toLowerCase().includes(searchLower)
      );

      // Filter for boss loot items (weapons, armor, rare drops)
      const bossLootItems = matchingItems.filter(item => this.isBossLoot(item));
      
      // If we have boss loot matches, prioritize them
      let results = [];
      if (bossLootItems.length > 0) {
        results = bossLootItems;
      } else {
        // Fallback to all matching items if no boss loot found
        results = matchingItems.filter(item => this.isRelevantItem(item));
      }

      // Sort by relevance (exact matches first, then alphabetical)
      results.sort((a, b) => {
        const aExact = a.name.toLowerCase() === searchLower;
        const bExact = b.name.toLowerCase() === searchLower;
        
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;
        
        const aStarts = a.name.toLowerCase().startsWith(searchLower);
        const bStarts = b.name.toLowerCase().startsWith(searchLower);
        
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        
        return a.name.localeCompare(b.name);
      });

      return results.slice(0, limit).map(item => ({
        id: item.id,
        name: item.name,
        examine: item.examine,
        icon_url: this.getIconURL(item),
        wiki_url: item.wiki_url,
        is_boss_loot: this.isBossLoot(item),
        equipment_slot: item.equipment?.slot || null,
        cost: item.cost
      }));
      
    } catch (error) {
      // Silently return empty array - no console spam
      return [];
    }
  }

  /**
   * Determine if an item is considered boss loot
   */
  isBossLoot(item) {
    const name = item.name.toLowerCase();
    const examine = (item.examine || '').toLowerCase();
    
    // Equipment items (weapons, armor, etc.)
    if (item.equipment) {
      return true;
    }

    // Known boss drop patterns
    const bossDropPatterns = [
      // Weapons
      'whip', 'scimitar', 'sword', 'dagger', 'mace', 'axe', 'bow', 'crossbow', 
      'staff', 'wand', 'orb', 'tome', 'trident', 'halberd', 'spear', 'claw',
      
      // Armor pieces
      'helm', 'helmet', 'coif', 'hat', 'mask', 'hood',
      'body', 'platebody', 'chainbody', 'top', 'shirt', 'robe',
      'legs', 'platelegs', 'chainlegs', 'skirt', 'bottom',
      'boots', 'gloves', 'gauntlets', 'bracers',
      'shield', 'kiteshield', 'sq shield', 'defender',
      'cape', 'cloak', 'wings',
      
      // Jewelry
      'ring', 'amulet', 'necklace', 'bracelet',
      
      // Rare drops
      'pet', 'jar', 'head', 'tentacle', 'fang', 'crest', 'shard', 
      'crystal', 'gem', 'sigil', 'tablet', 'scroll', 'tome',
      
      // Boss-specific items
      'dragon', 'abyssal', 'bandos', 'armadyl', 'saradomin', 'zamorak',
      'barrows', 'zulrah', 'vorkath', 'hydra', 'cerberus', 'kraken',
      'thermy', 'basilisk', 'smoke', 'dust', 'mist', 'shadow',
      'ancestral', 'twisted', 'elder', 'kodai', 'arcane', 'spectral',
      'elysian', 'blessed', 'spirit', 'primordial', 'pegasian', 'eternal',
      'tassets', 'chestplate', 'chainskirt', 'plateskirt'
    ];

    // Check if item name contains boss loot patterns
    const nameMatch = bossDropPatterns.some(pattern => 
      name.includes(pattern)
    );

    // High value items (likely boss drops)
    const isHighValue = item.cost && item.cost > 100000;

    // Items with "Dropped by" in examine text (common for boss drops)
    const examineMatch = examine.includes('dropped by') || 
                        examine.includes('rare drop') ||
                        examine.includes('boss') ||
                        examine.includes('monster');

    return nameMatch || (isHighValue && examineMatch);
  }

  /**
   * Determine if an item is relevant for bingo (filter out junk)
   */
  isRelevantItem(item) {
    const name = item.name.toLowerCase();
    
    // Exclude common junk items
    const excludePatterns = [
      'coins', 'gp', 'noted', 'bone', 'ashes', 'seed', 'grimy', 'clean',
      'potion', 'barbarian', 'logs', 'raw', 'cooked', 'ore', 'bar',
      'chaos rune', 'death rune', 'blood rune', 'nature rune',
      'arrow', 'bolt', 'cannonball', 'knife', 'dart'
    ];

    const isExcluded = excludePatterns.some(pattern => name.includes(pattern));
    
    // Include if not excluded and has reasonable value or is equipment
    return !isExcluded && (
      item.equipment || 
      (item.cost && item.cost > 10000) ||
      this.isBossLoot(item)
    );
  }

  /**
   * Get the icon URL for an item
   */
  getIconURL(item) {
    if (item.icon) {
      // The icon field usually contains a direct link or filename
      if (item.icon.startsWith('http')) {
        return item.icon;
      }
      
      // Construct URL from filename
      return `${this.iconBaseURL}/${item.icon}`;
    }

    // Fallback: construct from wiki_name
    if (item.wiki_name) {
      const fileName = item.wiki_name.replace(/ /g, '_') + '.png';
      return `${this.iconBaseURL}/${fileName}`;
    }

    // Last resort: construct from name
    const fileName = item.name.replace(/ /g, '_') + '.png';
    return `${this.iconBaseURL}/${fileName}`;
  }

  /**
   * Get a specific item by ID
   */
  async getItem(itemId) {
    try {
      const itemsData = await this.fetchItemsData();
      const item = itemsData[itemId.toString()];
      
      if (!item) {
        return null;
      }

      return {
        id: parseInt(itemId),
        name: item.name,
        examine: item.examine,
        icon_url: this.getIconURL(item),
        wiki_url: item.wiki_url,
        is_boss_loot: this.isBossLoot(item),
        equipment_slot: item.equipment?.slot || null,
        cost: item.cost
      };
      
    } catch (error) {
      console.error('Error getting item by ID:', error);
      throw new Error('Failed to get item');
    }
  }

  /**
   * Get popular boss loot items for suggestions
   */
  async getPopularBossLoot(limit = 50) {
    try {
      const itemsData = await this.fetchItemsData();
      
      // If no data available, return empty array silently
      if (!itemsData || Object.keys(itemsData).length === 0) {
        return [];
      }
      
      const itemsArray = Object.entries(itemsData).map(([id, item]) => ({
        id: parseInt(id),
        name: item.name,
        examine: item.examine,
        cost: item.cost,
        equipment: item.equipment,
        icon: item.icon,
        wiki_url: item.wiki_url
      }));

      // Filter and sort boss loot items by value/popularity
      const bossLoot = itemsArray
        .filter(item => this.isBossLoot(item))
        .sort((a, b) => (b.cost || 0) - (a.cost || 0))
        .slice(0, limit);

      return bossLoot.map(item => ({
        id: item.id,
        name: item.name,
        examine: item.examine,
        icon_url: this.getIconURL(item),
        wiki_url: item.wiki_url,
        is_boss_loot: true,
        equipment_slot: item.equipment?.slot || null,
        cost: item.cost
      }));
      
    } catch (error) {
      // Silently return empty array - no console spam
      return [];
    }
  }
}

module.exports = new RSWikiService();
