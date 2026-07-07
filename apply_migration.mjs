import { readFileSync } from 'fs';

const token = 'sbp_6d9d1da0b03a3effc48ec999991d96834bed1363';
const sql = readFileSync('F:/home/homeino-main/supabase/migrations/apply_missing_patch.sql', 'utf8');

const response = await fetch(
  'https://api.supabase.com/v1/projects/tljdihejjoepkcgftian/database/query',
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  }
);

const text = await response.text();
console.log(`Status: ${response.status}`);
console.log(`Response: ${text.substring(0, 500)}`);
