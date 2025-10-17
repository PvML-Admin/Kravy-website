# Importing Clan Members

This guide explains different methods to import your 490 clan members into Kravy Tracker.

## Problem: No Official Clan API

Unfortunately, RuneScape doesn't provide a public API to fetch all clan members automatically. However, there are several ways to import your members:

## Method 1: Manual Export from Game (Recommended)

### Step 1: In-Game Clan List
1. Open RuneScape
2. Go to Clan Settings
3. View the member list
4. Copy member names

### Step 2: Create a Text File
Create a file called `members.txt` with one name per line:
```
PlayerName1
PlayerName2
PlayerName3
...
```

### Step 3: Import via UI
1. Open Kravy Tracker (http://localhost:3000)
2. Go to "Members" page
3. Click "Bulk Add"
4. Copy all names from your text file
5. Paste into the text area
6. Click "Add All"
7. Click "Sync All" to fetch their data

## Method 2: Using RuneScape Clan Page

If your clan has a RuneScape clan page:

1. Visit: `https://secure.runescape.com/m=clan-hiscores/members.ws?clanName=YourClanName`
2. Copy the member list
3. Clean up the data (remove ranks, activity, etc.)
4. Save names only (one per line)
5. Import via Kravy Tracker UI

## Method 3: API Import (For Developers)

If you have a list of names in a file, you can use the API directly:

### Using curl (bash/PowerShell)

```bash
# From a file with names (one per line)
names=$(cat members.txt | jq -R . | jq -s .)
curl -X POST http://localhost:3001/api/members/bulk \
  -H "Content-Type: application/json" \
  -d "{\"names\": $names}"
```

### Using Node.js Script

Create `import.js`:

```javascript
const axios = require('axios');
const fs = require('fs');

const members = fs.readFileSync('members.txt', 'utf-8')
  .split('\n')
  .map(name => name.trim())
  .filter(name => name);

axios.post('http://localhost:3001/api/members/bulk', { names: members })
  .then(response => {
    console.log('Import complete:', response.data);
  })
  .catch(error => {
    console.error('Import failed:', error.message);
  });
```

Run:
```bash
node import.js
```

### Using Python Script

Create `import.py`:

```python
import requests

with open('members.txt', 'r') as f:
    members = [line.strip() for line in f if line.strip()]

response = requests.post(
    'http://localhost:3001/api/members/bulk',
    json={'names': members}
)

print('Import complete:', response.json())
```

Run:
```bash
python import.py
```

## Method 4: Third-Party Tools

Some community tools can extract clan member lists:

1. **RuneClan**: Visit RuneClan.com, search for your clan
2. **RS3 Clans Python Library**: For Python users
   ```bash
   pip install rs3clans
   ```
   
   ```python
   from rs3clans import get_clan_list
   
   members = get_clan_list('Kravy')
   print(members)
   ```

## After Importing

Once members are imported:

1. **Sync All Members**: Click "Sync All" on the Members page
   - This fetches actual XP data from RuneMetrics
   - Takes ~8-10 minutes for 490 members
   
2. **Verify Import**: Check that all members appear in the list

3. **Handle Errors**: 
   - Some members may not be found (privacy settings)
   - Review sync logs for failed members
   - Manually remove or mark inactive

## Import Tips

### Formatting Names
- Names are case-insensitive
- Spaces in names are allowed
- Special characters are supported

### Handling Failed Imports
If a member fails:
- Check username spelling
- Verify they have RuneMetrics enabled
- Ensure they're not banned/inactive

### Large Clan Import
For 490 members:
1. Import in batches if UI is slow
2. First batch: 100 members, sync, verify
3. Then import the rest
4. Or import all at once (recommended)

## Automated Sync

After initial import, the system automatically syncs every 6 hours:
- Updates XP for all members
- Creates historical snapshots
- Tracks gains over time

You can also manually sync:
- Individual member: Click sync button
- All members: Click "Sync All"

## Sample Members File

Here's an example `members.txt`:

```
Zezima
Suomi
Drumgun
Alkan
Maikeru
PlayerName6
PlayerName7
PlayerName8
...
```

## Troubleshooting

### "Member already exists" error
- The member is already in the database
- They'll be listed in "skipped" in the results

### "Player not found" error
- Username might be misspelled
- Player might have RuneMetrics disabled
- Account might be banned or deleted

### Import is slow
- This is normal for large batches
- Consider splitting into smaller batches
- Or import all and sync overnight

### Missing members after import
- Check "Active" filter on Members page
- Review sync logs for errors
- Verify names in original file

## Need Help?

If you're having trouble importing members:
1. Check that backend is running
2. Verify API is accessible
3. Review browser console for errors
4. Check backend logs for detailed error messages

## Future Enhancement

In a future version, we could add:
- CSV file upload
- Direct RuneClan integration
- Automated clan page scraping
- Excel import support


